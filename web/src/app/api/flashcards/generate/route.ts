export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth_helpers';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول لإنشاء الكروت' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userId = verifySessionToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'جلسة العمل غير صالحة' }, { status: 401 });
    }

    const body = await req.json();
    const { subject_name, grade_level, topic, count = 5 } = body;

    if (!subject_name || !grade_level || !topic) {
      return NextResponse.json({ error: 'اسم المادة، السنة الدراسية، والموضوع مطلوبة' }, { status: 400 });
    }

    const profile = await db.getProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: 'لم يتم العثور على ملف المستخدم' }, { status: 404 });
    }

    const coins = profile.coins === undefined ? 50.0 : profile.coins;
    const hasUnlimitedCredit = profile.role === 'admin' || !!profile.unlimited_credit;
    if (!hasUnlimitedCredit && coins <= 0) {
      return NextResponse.json({ error: 'ليس لديك رصيد كافٍ من النقاط لإنشاء الكروت.' }, { status: 402 });
    }

    // Retrieve curriculum text
    let curriculumText = "";
    const curriculums = await db.getCurriculums();
    const targetCurr = curriculums.find(c => c.grade_level === grade_level && c.subject_name === subject_name);
    
    if (targetCurr) {
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
        if (process.env.NEXT_RUNTIME !== 'edge') {
          const fs = require('fs');
          const DB_FILE = './db_data.json';
          if (fs.existsSync(DB_FILE)) {
            const raw = fs.readFileSync(DB_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            const chunks = (parsed.curriculum_chunks || []).filter((cc: any) => cc.curriculum_id === targetCurr.id).slice(0, 6);
            curriculumText = chunks.map((c: any) => c.content).join('\n\n');
          }
        }
      }
    }

    const systemPrompt = `أنت معلم خبير ذكي ومبتكر للمناهج المصرية للمرحلتين الإعدادية والثانوية.
مهمتك هي إنشاء مجموعة كروت تعليمية تفاعلية (Flashcards) للاستدعاء الفعال والمذاكرة النشطة (Active Recall).

المادة: ${subject_name}
الصف: ${grade_level}
الموضوع المحدد: ${topic}
عدد الكروت المطلوب: ${count}

سياق المنهج الدراسي المساعد:
"""
${curriculumText || 'لا يتوفر سياق مباشر للمنهج، أنشئ كروت أسئلة عامة نموذجية تناسب المنهج المصري لهذا الصف الدراسي.'}
"""

قواعد صياغة الكروت:
1. السؤال يجب أن يكون قصيراً ومركزاً (مثال: "ما هو قانون السرعة؟" أو "ما تعريف الكيمياء الحرارية؟").
2. الإجابة يجب أن تكون مختصرة ومباشرة، لا تتجاوز جملة أو جملتين، تلخص المفهوم أو القانون مع الوحدات.
3. التزم تماماً بمخرجات اللغة العربية بلهجة محببة ومبسطة.

أرجع المخرج بتنسيق JSON نظيف تماماً بدون علامات ماركداون كودبلوك أو نصوص إضافية، مطابقاً للهيكل التالي:
{
  "title": "عنوان مجموعة الكروت (مثال: كروت المراجعة على الحركة والسرعة)",
  "cards": [
    {
      "question": "نص السؤال/المفهوم هنا؟",
      "answer": "الإجابة المختصرة والمركزة هنا"
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
          { role: 'user', content: `Generate ${count} flashcards for topic: ${topic}.` }
        ],
        temperature: 0.8
      })
    });

    if (!response.ok) {
      console.error('DeepSeek flashcard generation failed:', await response.text());
      return NextResponse.json({ error: 'فشل توليد الكروت بواسطة الذكاء الاصطناعي' }, { status: 502 });
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```json/, '').replace(/```$/, '').trim();
    }

    const deckData = JSON.parse(content);
    
    // Deduct coins
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const egpCost = (promptTokens / 1000000) * 30 + (completionTokens / 1000000) * 50;
    const coinsCost = Math.max(1.0, egpCost * 12.5); // Charge standard rate, min 1 coin

    await db.deductCoins(userId, null, coinsCost);

    // Save to Database
    const newDeck = await db.createFlashcardDeck(
      userId,
      subject_name,
      grade_level,
      deckData.title || `مجموعة كروت: ${topic}`,
      deckData.cards
    );

    return NextResponse.json({ success: true, deck: newDeck });
  } catch (error: any) {
    console.error('Generate Flashcards Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء توليد وحفظ الكروت التعليمية' }, { status: 500 });
  }
}
