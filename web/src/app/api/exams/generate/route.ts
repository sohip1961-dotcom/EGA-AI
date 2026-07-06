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
      return NextResponse.json({ error: 'يجب تسجيل الدخول لإنشاء امتحان' }, { status: 401 });
    }

    const profile = await db.getProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: 'لم يتم العثور على ملف المستخدم' }, { status: 404 });
    }

    const coins = profile.coins === undefined ? 50.0 : profile.coins;
    const hasUnlimitedCredit = profile.role === 'admin' || !!profile.unlimited_credit;
    if (!hasUnlimitedCredit && coins <= 0) {
      return NextResponse.json({ error: 'ليس لديك رصيد كافٍ من النقاط لإنشاء الامتحان.' }, { status: 402 });
    }

    // Retrieve some curriculum text for context
    let curriculumText = "";
    const curriculums = await db.getCurriculums();
    const targetCurr = curriculums.find(c => c.grade_level === grade_level && c.subject_name === subject_name);
    
    if (targetCurr) {
      // Fetch some chunks
      const allCurrs = await db.getCurriculums();
      // Since db.ts doesn't export a generic getChunks, we check if Supabase is enabled or read from local
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      const isSupabaseEnabled = supabaseUrl !== '' && supabaseServiceKey !== '';
      
      if (isSupabaseEnabled) {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: chunks } = await supabase
          .from('curriculum_chunks')
          .select('content')
          .eq('curriculum_id', targetCurr.id)
          .limit(6);
        if (chunks) {
          curriculumText = chunks.map((c: any) => c.content).join('\n\n');
        }
      } else {
        // Read local
        const fs = require('fs');
        const path = require('path');
        const DB_FILE = path.join(process.cwd(), 'db_data.json');
        if (fs.existsSync(DB_FILE)) {
          const raw = fs.readFileSync(DB_FILE, 'utf8');
          const parsed = JSON.parse(raw);
          const chunks = (parsed.curriculum_chunks || []).filter((cc: any) => cc.curriculum_id === targetCurr.id).slice(0, 6);
          curriculumText = chunks.map((c: any) => c.content).join('\n\n');
        }
      }
    }

    let questionInstructions = "";
    if (mode === 'custom_types') {
      const mcqs = mcq_count ? parseInt(mcq_count, 10) : 0;
      const tfs = tf_count ? parseInt(tf_count, 10) : 0;
      const essays = essay_count ? parseInt(essay_count, 10) : 0;
      const total = mcqs + tfs + essays;
      
      questionInstructions = `أنشئ امتحاناً مكوناً من ${total} أسئلة كالتالي:
${mcqs > 0 ? `- عدد ${mcqs} سؤال/أسئلة اختيار من متعدد (multiple_choice) ولديه 4 خيارات (options).\n` : ''}${tfs > 0 ? `- عدد ${tfs} سؤال/أسئلة صح وخطأ (true_false) والـ correct_answer يجب أن تكون إما "true" أو "false" نصياً.\n` : ''}${essays > 0 ? `- عدد ${essays} سؤال/أسئلة مقالية قصيرة (essay) تقيس الفهم، والـ correct_answer هو الخطوط العريضة للإجابة الصحيحة.\n` : ''}`;
    } else if (mode === 'total_only') {
      const total = total_count ? parseInt(total_count, 10) : 5;
      questionInstructions = `أنشئ امتحاناً مكوناً من بالضبط ${total} أسئلة. نوّع في الأسئلة بين الاختيار من متعدد (multiple_choice)، الصح والخطأ (true_false)، والأسئلة المقالية (essay) حسب ما تراه مناسباً للموضوع.`;
    } else {
      questionInstructions = `أنشئ امتحاناً شاملاً ومميزاً في الموضوع. تنوع بشكل تلقائي وممتاز بين أسئلة الاختيار من متعدد (multiple_choice)، أسئلة صح وخطأ (true_false)، وأسئلة مقالية (essay) بما يغطي الموضوع (من 4 إلى 6 أسئلة إجمالاً).`;
    }

    const systemPrompt = `أنت معلم خبير ذكي ومبتكر للمناهج المصرية للمرحلتين الإعدادية والثانوية.
مهمتك هي إنشاء امتحان قياسي ومميز لتلاميذ الصف الدراسي المحدد والمادة المحددة.

تفاصيل الامتحان المطلوبة:
- المادة: ${subject_name}
- الصف: ${grade_level}
- موضوع/نطاق الامتحان: ${topic || 'منهج المادة العام'}

سياق المنهج الدراسي المتاح لمساعدتك:
"""
${curriculumText || 'لا يتوفر سياق مباشر للمنهج، أنشئ أسئلة عامة نموذجية تناسب المنهج المصري لهذا الصف الدراسي.'}
"""

قواعد وهيكل الأسئلة:
${questionInstructions}

يجب أن تقوم بإرجاع النص المخرّج بتنسيق JSON نظيف تماماً وخالٍ من أي تعليقات أو علامات كود ماركداون (لا تضع \`\`\`json ولا تضع أي نصوص قبل أو بعد الجيسون). يجب أن يطابق تماماً الهيكل التالي:
{
  "title": "اسم الامتحان التقييمي للموضوع",
  "subject_name": "${subject_name}",
  "grade_level": "${grade_level}",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "نص السؤال هنا؟",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correct_answer": "خيار 1",
      "explanation": "التوضيح التفصيلي هنا"
    },
    {
      "id": "q2",
      "type": "true_false",
      "question": "نص السؤال هنا؟",
      "correct_answer": "true",
      "explanation": "شرح الإجابة"
    },
    {
      "id": "q3",
      "type": "essay",
      "question": "نص السؤال المقالي؟",
      "correct_answer": "النقاط الأساسية للإجابة النموذجية المعتمدة في الامتحان",
      "explanation": "توضيح إضافي"
    }
  ]
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
          { role: 'user', content: `Generate an exam for grade level ${grade_level} and subject ${subject_name}.` }
        ],
        temperature: 0.8
      })
    });

    if (!response.ok) {
      console.error('DeepSeek generation failed:', await response.text());
      return NextResponse.json({ error: 'فشل توليد الامتحان بواسطة الذكاء الاصطناعي' }, { status: 502 });
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // Cleanup any code block backticks if AI outputs them anyway
    if (content.startsWith('```')) {
      content = content.replace(/^```json/, '').replace(/```$/, '').trim();
    }

    const examData = JSON.parse(content);
    
    // Calculate coin cost based on DeepSeek API usage
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const egpCost = (promptTokens / 1000000) * 30 + (completionTokens / 1000000) * 50;
    const coinsCost = egpCost * 12.5;

    await db.deductCoins(userId, null, coinsCost);

    // Save to Database
    const newExam = await db.createExam({
      title: examData.title || `امتحان ذكي في ${subject_name}`,
      subject_name,
      grade_level,
      questions: examData.questions,
      session_id: session_id || undefined,
      user_id: userId,
      device_id: deviceId || undefined
    });

    return NextResponse.json(newExam);
  } catch (error: any) {
    console.error('Generate Exam Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء توليد وحفظ الامتحان' }, { status: 500 });
  }
}
