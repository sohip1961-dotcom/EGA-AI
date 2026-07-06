export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth_helpers';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

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

    // Call DeepSeek to evaluate the student's submission
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

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Grade these answers for exam: ${exam_id}` }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      console.error('DeepSeek grading failed:', await response.text());
      return NextResponse.json({ error: 'فشل تصحيح الامتحان بواسطة الذكاء الاصطناعي' }, { status: 502 });
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();

    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      content = content.substring(firstBrace, lastBrace + 1);
    }

    const deviceId = deviceIdHeader || null;
    const gradingResult = JSON.parse(content);

    // Calculate coin cost based on DeepSeek API usage
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const egpCost = (promptTokens / 1000000) * 30 + (completionTokens / 1000000) * 50;
    const coinsCost = egpCost * 12.5;

    await db.deductCoins(userId, null, coinsCost);

    // Save submission to DB
    const submission = await db.createExamSubmission({
      exam_id,
      user_id: userId,
      device_id: deviceId || undefined,
      answers,
      score: Number(gradingResult.score),
      evaluation: gradingResult.evaluation
    });

    return NextResponse.json(submission);
  } catch (error: any) {
    console.error('Submit Exam Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تصحيح وحفظ الامتحان' }, { status: 500 });
  }
}
