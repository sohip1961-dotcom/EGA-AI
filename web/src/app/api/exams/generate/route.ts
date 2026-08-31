export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth_helpers';
import { getCurriculumContextForLesson } from '@/lib/curriculum_structure';
import { callGeminiFlash } from '@/lib/gemini';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

async function generateExamWithAI(systemPrompt: string, gradeLevel: string, subjectName: string): Promise<{ content: string; coinsCost: number }> {
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY || '';
  if (deepseekApiKey) {
    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekApiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate an exam for grade level ${gradeLevel} and subject ${subjectName}.` }
          ],
          temperature: 0.8
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content?.trim() || '';
        const promptTokens = data.usage?.prompt_tokens || 0;
        const completionTokens = data.usage?.completion_tokens || 0;
        const egpCost = (promptTokens / 1000000) * 30 + (completionTokens / 1000000) * 50;
        const coinsCost = egpCost * 12.5;
        return { content, coinsCost };
      } else {
        console.warn('DeepSeek exam generation returned status:', response.status, ', falling back to Gemini Flash.');
      }
    } catch (e) {
      console.warn('DeepSeek fetch error, falling back to Gemini Flash:', e);
    }
  }

  // Fallback to Gemini Flash via EdenAI
  const prompt = `${systemPrompt}\n\nUser request: Generate an exam for grade level ${gradeLevel} and subject ${subjectName}.`;
  const content = await callGeminiFlash(prompt, 1800);
  return { content, coinsCost: 0.5 };
}

function parseGeneratedExam(content: string): any {
  let cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const deviceIdHeader = req.headers.get('x-device-id');
    const body = await req.json();
    const { subject_name, grade_level, session_id, topic, mode, total_count, mcq_count, tf_count, essay_count } = body;

    if (!subject_name || !grade_level) {
      return NextResponse.json({ error: 'اسم المادة والسنة الدراسية مطلوبان' }, { status: 400 });
    }

    let userId: string | null = null;
    let deviceId: string | null = deviceIdHeader || null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      userId = verifySessionToken(token);
    }

    if (!userId) {
      return NextResponse.json({ error: 'تسجيل الدخول مطلوب لإنشاء الاختبارات' }, { status: 401 });
    }

    const profile = await db.getProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: 'لم يتم العثور على حساب المستخدم' }, { status: 404 });
    }

    const coins = profile.coins === undefined ? 0.0 : profile.coins;
    const hasUnlimitedCredit = profile.role === 'admin' || !!profile.unlimited_credit;
    if (!hasUnlimitedCredit && coins <= 0) {
      return NextResponse.json({ error: 'لقد استنفدت رصيدك من النقاط. يرجى تجديد اشتراكك لمتابعة الاختبارات.' }, { status: 402 });
    }

    // Retrieve targeted curriculum text for the selected topic/lesson
    const curriculumText = await getCurriculumContextForLesson(grade_level, subject_name, topic || '');

    const adherenceInstruction = (topic && topic !== 'المنهج بالكامل' && topic !== 'مراجعة المنهج بالكامل')
      ? `\nFOCUS TOPIC CONSTRAINT: All questions MUST focus specifically on this lesson/topic: "${topic}". Do not ask questions from unrelated chapters.`
      : '';

    let questionInstructions = "";
    if (mode === 'custom_types') {
      const mcqs = mcq_count ? parseInt(mcq_count, 10) : 0;
      const tfs = tf_count ? parseInt(tf_count, 10) : 0;
      const essays = essay_count ? parseInt(essay_count, 10) : 0;
      const total = mcqs + tfs + essays;
      
      questionInstructions = `Exam Question Counts: Exactly ${total} questions:
${mcqs > 0 ? `- Exactly ${mcqs} multiple-choice questions (multiple_choice) with 4 options in Arabic.\n` : ''}${tfs > 0 ? `- Exactly ${tfs} true/false questions (true_false) where correct_answer is strictly "true" or "false".\n` : ''}${essays > 0 ? `- Exactly ${essays} short essay questions (essay) where correct_answer is the concise model answer in Arabic.\n` : ''}`;
    } else if (mode === 'total_only') {
      const total = total_count ? parseInt(total_count, 10) : 5;
      questionInstructions = `Exam Question Counts: Exactly ${total} questions balanced across multiple_choice, true_false, and essay.`;
    } else {
      questionInstructions = `Exam Question Counts: Automatically generate a balanced, comprehensive exam (typically 4 to 6 questions) across multiple_choice, true_false, and essay.`;
    }

    const systemPrompt = `You are the Principal Exam Generator for the Egyptian National Curriculum (Middle & High School).
Generate a balanced, rigorous exam adhering strictly to Egyptian curriculum standards.

================================================================================
CRITICAL LANGUAGE & OUTPUT MANDATE:
- ALL USER-FACING TEXT (questions, options, explanations, model answers, titles) MUST BE IN PURE, CLEAR ARABIC.
- Format all mathematical, physical, and chemical formulas in standard LaTeX ($$ or $).
- Return strict JSON ONLY (no markdown fences, no conversational prose).
================================================================================

Target Curriculum Context:
"""
${curriculumText ? curriculumText.slice(0, 10000) : 'General Egyptian Curriculum for ' + subject_name}
"""
${adherenceInstruction}
${questionInstructions}

JSON Output Schema:
{
  "title": "عنوان الاختبار المقترح بالعربية (مثال: اختبار على تفاعلات الإحلال)",
  "subject_name": "${subject_name}",
  "grade_level": "${grade_level}",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "نص السؤال الأول؟",
      "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
      "correct_answer": "الخيار أ",
      "explanation": "شرح توضيحي للإجابة النموذجية"
    },
    {
      "id": "q2",
      "type": "true_false",
      "question": "نص السؤال؟",
      "correct_answer": "true",
      "explanation": "الشرح والتوضيح"
    },
    {
      "id": "q3",
      "type": "essay",
      "question": "نص السؤال المقالي؟",
      "correct_answer": "الإجابة النموذجية المختصرة",
      "explanation": "عناصر الإجابة الكاملة"
    }
  ]
}`;

    const { content: rawAiResponse, coinsCost } = await generateExamWithAI(systemPrompt, grade_level, subject_name);

    let parsedExam: any;
    try {
      parsedExam = parseGeneratedExam(rawAiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI exam response:', rawAiResponse, parseError);
      return NextResponse.json({ error: 'حدث خطأ في معالجة وتنسيق أسئلة الاختبار من الذكاء الاصطناعي.' }, { status: 500 });
    }

    if (!parsedExam || !Array.isArray(parsedExam.questions) || parsedExam.questions.length === 0) {
      return NextResponse.json({ error: 'لم يتم إنشاء أي أسئلة صالحة للاختبار.' }, { status: 500 });
    }

    const savedExam = await db.createExam({
      title: parsedExam.title || `اختبار ${subject_name}`,
      questions: parsedExam.questions,
      subject_name: subject_name,
      grade_level: grade_level,
      session_id: session_id,
      user_id: userId,
      device_id: deviceId || undefined
    });

    await db.deductCoins(userId, deviceId, coinsCost);

    // Strip answers from response
    const questionsWithoutAnswers = (savedExam.questions || []).map((q: any) => {
      const { correct_answer, explanation, ...rest } = q;
      return rest;
    });

    return NextResponse.json({
      success: true,
      exam: {
        ...savedExam,
        questions: questionsWithoutAnswers
      }
    });

  } catch (error: any) {
    console.error('Exam generation error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع أثناء إنشاء الاختبار.' }, { status: 500 });
  }
}