export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth_helpers';
import { getCurriculumContextForLesson } from '@/lib/curriculum_structure';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'جلسة العمل غير مصرحة أو منتهية' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userId = verifySessionToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'جلسة العمل غير صالحة' }, { status: 401 });
    }

    const body = await req.json();
    const { subject_name, grade_level, topic, count = 5 } = body;

    if (!subject_name || !grade_level || !topic) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة (المادة، الصف الدراسي، الموضوع)' }, { status: 400 });
    }

    const profile = await db.getProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: 'لم يتم العثور على حساب المستخدم أو تم حذفه.', code: 'user_not_found' }, { status: 401 });
    }

    const coins = profile.coins === undefined ? 0.0 : profile.coins;
    const hasUnlimitedCredit = profile.role === 'admin' || !!profile.unlimited_credit;
    if (!hasUnlimitedCredit && coins <= 0) {
      return NextResponse.json({ error: 'لقد استنفدت رصيدك من النقاط. يرجى شحن باقتك للمتابعة.' }, { status: 402 });
    }

    // Retrieve targeted curriculum text for the selected topic/lesson
    const curriculumText = await getCurriculumContextForLesson(grade_level, subject_name, topic);

    const adherenceInstruction = (topic && topic !== 'المنهج بالكامل' && topic !== 'مراجعة المنهج بالكامل')
      ? `\nFOCUS TOPIC CONSTRAINT: All cards MUST focus strictly on this lesson: "${topic}". Do not pull concepts from other lessons.`
      : '';

    const systemPrompt = `You are the Flashcards Generation Engine for the Egyptian National Curriculum (Middle & High School).
Generate high-yield Active Recall flashcards to help students master key definitions, laws, and facts.

================================================================================
CRITICAL LANGUAGE & OUTPUT MANDATE:
- ALL USER-FACING TEXT (questions, answers, deck titles) MUST BE IN PURE, CLEAR ARABIC.
- Format all mathematical, physical, and chemical formulas in standard LaTeX ($$ or $).
- Return strict JSON ONLY (no markdown fences, no conversational prose).
================================================================================

Subject: ${subject_name}
Grade: ${grade_level}
Topic / Lesson: ${topic}${adherenceInstruction}
Required Count: ${count} cards

Curriculum Context:
"""
${curriculumText || 'General curriculum content for ' + subject_name}
"""

Card Design Rules:
1. Question: Clear, focused, single-concept question in Arabic.
2. Answer: Concise, accurate model answer highlighting key terms.
3. Strict Curriculum Adherence: Keep all facts strictly faithful to the textbook.

JSON Output Schema:
{
  "title": "عنوان مجموعة الكروت بالعربية (مثال: ملخص قوانين نيوتن)",
  "cards": [
    {
      "question": "نص السؤال أو المفهوم؟",
      "answer": "الإجابة النموذجية المركزة"
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
      return NextResponse.json({ error: 'فشل مزود الذكاء الاصطناعي في توليد الكروت' }, { status: 502 });
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();

    // Clean JSON markdown fences
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('Flashcards JSON parse error:', content);
      return NextResponse.json({ error: 'فشل في قراءة بيانات الكروت المولدة' }, { status: 500 });
    }

    if (!parsed.cards || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
      return NextResponse.json({ error: 'لم يتم توليد أي كروت صالحة' }, { status: 500 });
    }

    // Deduct coins for generation (standard flash rate)
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const egpCost = (promptTokens / 1000000) * 30 + (completionTokens / 1000000) * 50;
    const coinsCost = egpCost * 10.0;
    await db.deductCoins(userId, null, coinsCost);

    // Save deck and cards to database
    const deckTitle = parsed.title || `كروت: ${topic}`;
    const newDeck = await db.createFlashcardDeck(userId, subject_name, grade_level, deckTitle, parsed.cards);

    return NextResponse.json({
      success: true,
      deck: newDeck,
      cards: parsed.cards
    });

  } catch (error: any) {
    console.error('Generate flashcards error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع أثناء توليد الكروت.' }, { status: 500 });
  }
}