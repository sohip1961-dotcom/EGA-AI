export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth_helpers';
import { callGeminiFlash } from '@/lib/gemini';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

async function evaluateExamWithAI(systemPrompt: string, examId: string): Promise<{ content: string; coinsCost: number }> {
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
            { role: 'user', content: `Grade these answers for exam: ${examId}` }
          ],
          temperature: 0.3
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
        console.warn('DeepSeek grading returned status:', response.status, ', falling back to Gemini Flash.');
      }
    } catch (e) {
      console.warn('DeepSeek fetch error, falling back to Gemini Flash:', e);
    }
  }

  // Fallback to Gemini Flash via EdenAI
  const prompt = `${systemPrompt}\n\nUser request: Grade these answers for exam ID ${examId}`;
  const content = await callGeminiFlash(prompt, 1200);
  return { content, coinsCost: 0.25 };
}

function parseGradingResult(content: string): { score: number; evaluation: string } {
  let cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(cleaned);
    const rawScore = Number(parsed.score);
    const score = isNaN(rawScore) ? 50 : Math.min(100, Math.max(0, Math.round(rawScore)));
    const evaluation = parsed.evaluation || 'تم تصحيح الامتحان وتقييم إجاباتك بنجاح.';
    return { score, evaluation };
  } catch (err) {
    const scoreMatch = cleaned.match(/"score"\s*:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;

    let evaluation = 'تم تقييم إجاباتك على الامتحان بنجاح.';
    const evalMatch = cleaned.match(/"evaluation"\s*:\s*"([\s\S]*?)"\s*[\},]/);
    if (evalMatch && evalMatch[1]) {
      evaluation = evalMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    } else if (cleaned.length > 20) {
      evaluation = cleaned;
    }

    return { score, evaluation };
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const deviceIdHeader = req.headers.get('x-device-id');
    const body = await req.json();
    const { exam_id, answers } = body;

    if (!exam_id || !answers) {
      return NextResponse.json({ error: 'معرف الامتحان والإجابات مطلوبة' }, { status: 400 });
    }

    const exam = await db.getExam(exam_id);
    if (!exam) {
      return NextResponse.json({ error: 'لم يتم العثور على الامتحان المطلوب' }, { status: 404 });
    }

    let userId: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      userId = verifySessionToken(token);
    }

    if (!userId) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول لتصحيح الامتحان' }, { status: 401 });
    }

    const profile = await db.getProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: 'لم يتم العثور على ملف المستخدم' }, { status: 404 });
    }

    const coins = profile.coins === undefined ? 50.0 : profile.coins;
    const hasUnlimitedCredit = profile.role === 'admin' || !!profile.unlimited_credit;
    if (!hasUnlimitedCredit && coins <= 0) {
      return NextResponse.json({ error: 'ليس لديك رصيد كافٍ من النقاط لتصحيح الامتحان.' }, { status: 402 });
    }

    const systemPrompt = `أنت معلم خبير ومصحح امتحانات للمناهج المصرية.
مهمتك هي تقييم إجابات الطالب على هذا الامتحان وإعطائه درجة نهائية من 100 وتقييم تفصيلي باللغة العربية.

تفاصيل الامتحان:
- العنوان: ${exam.title}
- المادة: ${exam.subject_name}
- الصف: ${exam.grade_level}

أسئلة الامتحان والإجابات الصحيحة النموذجية:
${JSON.stringify(exam.questions, null, 2)}

إجابات الطالب المرفوعة:
${JSON.stringify(answers, null, 2)}

قواعد التصحيح والتقييم:
1. الأسئلة الاختيارية وصح/خطأ: قيّمها بدقة وقارنها بالإجابات النموذجية.
2. الأسئلة المقالية: قيّم إجابة الطالب بمرونة بناءً على فهمه للمفهوم العلمي أو التاريخي أو اللغوي، ولا تشترط مطابقة الكلمات تماماً بل الفهم الصحيح.
3. احسب النتيجة الإجمالية كنسبة مئوية صحيحة (بين 0 و 100).
4. اكتب تقييماً تفصيلياً (evaluation) باللغة العربية بأسلوب المعلم المشجع والذكي "EGS AI"، يوضح النقاط الصحيحة والأخطاء وتصحيحها وكيفية التحسن.

أرجع المخرج بتنسيق JSON نظيف تماماً وخالٍ من أي ماركداون كودبلوك أو نصوص إضافية، مطابقاً للهيكل التالي:
{
  "score": 85,
  "evaluation": "تفاصيل التقييم والتصحيح بالكامل هنا بأسلوب تربوي رائع..."
}`;

    const { content, coinsCost } = await evaluateExamWithAI(systemPrompt, exam_id);
    const gradingResult = parseGradingResult(content);
    const deviceId = deviceIdHeader || null;

    await db.deductCoins(userId, null, coinsCost);

    const alreadySubmitted = await db.hasSubmittedExam(exam_id, userId, deviceId || undefined);
    const isFirstAttempt = !alreadySubmitted;
    const finalScore = gradingResult.score;

    let pointsAwarded = 0;
    if (isFirstAttempt) {
      if (finalScore === 100) pointsAwarded = 5;
      else if (finalScore > 90) pointsAwarded = 3;
      else if (finalScore > 70) pointsAwarded = 2;
      else if (finalScore > 50) pointsAwarded = 1;
      else pointsAwarded = 0;

      if (pointsAwarded > 0 && userId) {
        await db.addPoints(userId, pointsAwarded);
      }
    }

    // Save submission to DB
    const submission = await db.createExamSubmission({
      exam_id,
      user_id: userId,
      device_id: deviceId || undefined,
      answers,
      score: finalScore,
      evaluation: gradingResult.evaluation,
      points_awarded: pointsAwarded,
      is_first_attempt: isFirstAttempt
    });

    // Gamification reward: add coins on good scores
    let coinsRewarded = 0;
    if (finalScore >= 90) coinsRewarded = 10;
    else if (finalScore >= 80) coinsRewarded = 5;
    else if (finalScore >= 50) coinsRewarded = 2;

    if (coinsRewarded > 0 && userId) {
      await db.addCoins(userId, coinsRewarded);
    }

    const questionsReview = (exam.questions || []).map((q: any) => ({
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options,
      student_answer: answers[q.id] ?? null,
      correct_answer: q.correct_answer,
      explanation: q.explanation
    }));

    return NextResponse.json({ 
      ...submission, 
      questions_review: questionsReview,
      coins_rewarded: coinsRewarded
    });
  } catch (error: any) {
    console.error('Submit Exam Error:', error);
    return NextResponse.json({ error: error.message ? `حدث خطأ أثناء تصحيح وحفظ الامتحان: ${error.message}` : 'حدث خطأ أثناء تصحيح وحفظ الامتحان' }, { status: 500 });
  }
}
