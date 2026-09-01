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
    const evaluation = parsed.evaluation || 'تم تقييم إجاباتك بنجاح من المعلم الذكي.';
    return { score, evaluation };
  } catch (err) {
    const scoreMatch = cleaned.match(/"score"\s*:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;

    let evaluation = 'تم تقييم إجاباتك بنجاح من المعلم الذكي.';
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
      return NextResponse.json({ error: 'معرف الاختبار والإجابات مطلوبان' }, { status: 400 });
    }

    const exam = await db.getExam(exam_id);
    if (!exam) {
      return NextResponse.json({ error: 'لم يتم العثور على هذا الاختبار' }, { status: 404 });
    }

    let userId: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      userId = verifySessionToken(token);
    }

    if (!userId) {
      return NextResponse.json({ error: 'تسجيل الدخول مطلوب لتسليم الاختبار' }, { status: 401 });
    }

    const profile = await db.getProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: 'لم يتم العثور على حساب المستخدم أو تم حذفه.', code: 'user_not_found' }, { status: 401 });
    }

    const coins = profile.coins === undefined ? 0.0 : profile.coins;
    const hasUnlimitedCredit = profile.role === 'admin' || !!profile.unlimited_credit;
    if (!hasUnlimitedCredit && coins <= 0) {
      return NextResponse.json({ error: 'لقد استنفدت رصيدك من النقاط. يرجى تجديد اشتراكك لمتابعة الاختبارات.' }, { status: 402 });
    }

    const systemPrompt = `You are the Official Academic Exam Grader for the Egyptian National Curriculum.
Evaluate the student answers accurately against the answer key. Provide a total score out of 100 and encouraging, pedagogical Egyptian Arabic feedback.

================================================================================
CRITICAL LANGUAGE & OUTPUT MANDATE:
- The "evaluation" feedback MUST be written in friendly, polite Egyptian Arabic from "EGS AI" teacher persona.
- Output strict JSON ONLY (no markdown fences, no conversational prose).
================================================================================

Exam Metadata:
- Title: ${exam.title}
- Subject: ${exam.subject_name}
- Grade: ${exam.grade_level}

Exam Questions & Answer Key:
${JSON.stringify(exam.questions, null, 2)}

Student Submitted Answers:
${JSON.stringify(answers, null, 2)}

Grading Guidelines:
1. Multiple Choice / True-False: Strict exact match against correct_answer.
2. Essay Questions: Fair partial credit based on core scientific keywords and conceptual understanding.
3. Compute aggregate percentage score (0 to 100).
4. Provide structured Arabic evaluation ("evaluation") celebrating correct answers and explaining misconceptions constructively.

JSON Output Schema:
{
  "score": 85,
  "evaluation": "تقييم تحفيزي شامل بالعربية يوضح نقاط القوة وكيفية معالجة الأخطاء..."
}`;

    const { content, coinsCost } = await evaluateExamWithAI(systemPrompt, exam_id);
    const gradingResult = parseGradingResult(content);
    const deviceId = deviceIdHeader || null;

    await db.deductCoins(userId, null, coinsCost);

    const alreadySubmitted = await db.hasSubmittedExam(exam_id, userId, deviceId || undefined);
    const isFirstAttempt = !alreadySubmitted;
    const finalScore = gradingResult.score;

    let pointsAwarded = 0;
    let totalPoints: number | undefined = undefined;

    if (isFirstAttempt) {
      if (finalScore === 100) pointsAwarded = 5;
      else if (finalScore > 90) pointsAwarded = 3;
      else if (finalScore > 70) pointsAwarded = 2;
      else if (finalScore > 50) pointsAwarded = 1;
      else pointsAwarded = 0;

      if (pointsAwarded > 0 && userId) {
        totalPoints = await db.addPoints(userId, pointsAwarded);
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
      success: true,
      submission,
      score: finalScore,
      evaluation: gradingResult.evaluation,
      points_awarded: pointsAwarded,
      total_points: totalPoints,
      questions_review: questionsReview
    });

  } catch (error: any) {
    console.error('Exam submit error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع أثناء تصحيح الاختبار.' }, { status: 500 });
  }
}