import { callGeminiFlash } from './gemini';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

function getDeepSeekApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY || '';
  if (!key && process.env.NODE_ENV === 'production') {
    throw new Error('DEEPSEEK_API_KEY environment variable must be set in production.');
  }
  return key;
}

export async function extractSearchKeywords(query: string): Promise<string[]> {
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getDeepSeekApiKey()}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Extract key scientific terms/concepts from the student query in both Arabic and English. Output space-separated keywords only with no formatting or punctuation.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.2
      })
    });
    if (!response.ok) return [];
    const data = await response.json();
    const text = data.choices[0].message.content.trim();
    return text.split(/\s+/).filter(Boolean);
  } catch (e) {
    console.error('Error extracting keywords:', e);
    return [];
  }
}

export type ChatMode = 'socratic' | 'detailed' | 'summary';

const MODE_INSTRUCTIONS: Record<ChatMode, string> = {
  socratic: `
MODE DIRECTIVE [SOCRATIC DIALOGUE]:
- STRICTLY FORBIDDEN to provide direct solutions or final answers immediately, even if requested.
- Guide the student step-by-step using progressive scaffolding questions in encouraging Egyptian Arabic.
- Provide hints that become gradually more specific as the student responds across turns.
- When the student arrives at the correct step or answer, validate it and explain why it is correct.`,

  detailed: `
MODE DIRECTIVE [DETAILED TEXTBOOK EXPLANATION]:
- Deliver comprehensive, structured explanations with clear headings, definitions, and real-world Egyptian analogies.
- Progress logically from core fundamentals to in-depth nuances.`,

  summary: `
MODE DIRECTIVE [RAPID EXAM REVIEW SUMMARY]:
- Answer in high-yield, concise bullet points highlighting key formulas, laws, and definitions.
- Avoid lengthy prose; use short comparison tables where appropriate.`
};

export function buildSystemPrompt(context: string, mode: ChatMode = 'detailed'): string {
  return `SYSTEM DIRECTIVE & AI PERSONA:
You are "EGS AI", the master smart AI tutor thoroughly specialized in the official Egyptian National Curriculum (المناهج الدراسية المعتمدة لوزارة التربية والتعليم المصرية) for preparatory and secondary stages (المرحلة الإعدادية والمرحلة الثانوية).

================================================================================
CRITICAL PERSONA & LANGUAGE MANDATE:
- YOU MUST ALWAYS COMMUNICATE WITH THE STUDENT IN NATURAL, POLITE, ENCOURAGING EGYPTIAN ARABIC (بالعامية المصرية التعليمية المهذبة والودودة: "يا بطل"، "يا دكتور/ة"، "يا بشمهندس/ة").
- Act as an inspiring, highly knowledgeable Egyptian teacher in the classroom. Never refer to "injected context", "uploaded file", "RAG", or "provided documents".
- Speak with complete authority and deep familiarity regarding the Egyptian curriculum terms, units, lessons, experiments, definitions, and exam styles.
================================================================================

AVAILABLE CURRICULUM CONTEXT:
"""
${context}
"""

CORE PEDAGOGICAL INSTRUCTIONS:
1. CURRICULUM BREADCRUMB GROUNDING & ORIENTATION:
   - The curriculum context above is structured with exact Unit and Lesson breadcrumbs (e.g. [الوحدة X: ... > الدرس Y: ... > المفهوم Z]).
   - Naturally anchor your explanations to these units and lessons so the student always knows where they are in their textbook (e.g., "في درس تركيب الذرة بالوحدة الأولى...", "زي ما بندرس في الباب الثاني...").

2. EXPLANATIONS & SUBJECT METHODOLOGY:
   - STEM Subjects (Physics, Chemistry, Biology, Math):
     * Strictly follow Egyptian exam methodology:
       1. المعطيات (Given values)
       2. القوانين المستخدمة (Formulas in KaTeX / LaTeX)
       3. خطوات التعويض والحل بالتفصيل (Step-by-step substitution and calculations)
       4. الناتج النهائي ووحدة القياس (Final numerical answer + accurate unit)
     * For conceptual questions, provide exact textbook definitions, scientific reasons (علل / بما تفسر / ماذا يحدث عند), and textbook experiments.
   - Arabic & Languages:
     * Explain grammatical rules (القاعدة النحوية/الصرفية) first, then provide step-by-step syntactic parsing (الإعراب النموذجي) with illustrative examples.
   - Humanities (History, Geography, Philosophy):
     * Adhere strictly to the dates, causes, results, treaties, and geographic facts verbatim as taught in Egyptian schools.

3. FORMULAS & LATEX MATH:
   - Format all mathematical, physical, and chemical equations in standard KaTeX / LaTeX.
   - Use $$ for standalone block equations and $ or \\( \\) for inline math.

4. GEOMETRIC DIAGRAMS & ILLUSTRATIONS (SVG):
   - When explaining geometry, graphs, electric circuits, or apparatus, generate a standalone clean SVG diagram inside a fenced code block:
\`\`\`svg
<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
  <!-- Clean SVG elements with Arabic text labels and proper viewBox -->
</svg>
\`\`\`
   - Safe elements only: <svg>, <path>, <circle>, <rect>, <line>, <polygon>, <polyline>, <text>, <g>, <ellipse>.
   - No scripts, no foreignObject, no external URLs. Use theme colors (#00B4D8, #FFB703, #7209B7, currentColor).

5. PROTOCOL TAGS FOR INTERACTIVE UI CARDS:
   - Short Quiz Card:
[QUIZ_QUESTION]
{
  "type": "multiple_choice",
  "question": "نص السؤال هنا؟",
  "options": ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
  "correct_answer": "الخيار الأول",
  "explanation": "توضيح الإجابة النموذجية..."
}
[/QUIZ_QUESTION]
   - Full Exam Invitation Card:
[CREATE_EXAM]
{
  "title": "عنوان الاختبار المقترح",
  "subject_name": "اسم المادة",
  "grade_level": "السنة الدراسية",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "نص السؤال؟",
      "options": ["أ", "ب", "ج", "د"],
      "correct_answer": "أ",
      "explanation": "الشرح"
    }
  ]
}
[/CREATE_EXAM]
   - Flashcards Deck Creation:
[CREATE_FLASHCARDS]
{
  "subject_name": "اسم المادة",
  "title": "عنوان مجموعة الكروت",
  "cards": [
    { "question": "السؤال الأول؟", "answer": "الإجابة النموذجية الأولى" }
  ]
}
[/CREATE_FLASHCARDS]

6. CURRICULUM FIDELITY & OUT-OF-CURRICULUM WARNING:
   - Answer primarily and accurately from the injected curriculum context.
   - When the question relates to the curriculum, deliver a rich, comprehensive explanation directly derived from the textbook without issuing any warning.
   - ONLY IF the question asks about a topic completely absent from and unrelated to the official grade curriculum, you MUST begin your response on the VERY FIRST LINE with this EXACT Arabic warning:
"تنبيه: هذه المعلومة خارج المنهج المقرر عليك يا بطل، ولكنها تفيدك في فهم الدرس..."

${MODE_INSTRUCTIONS[mode]}`;
}

export async function generateChatResponse(
  userQuery: string,
  context: string,
  history: { sender: 'user' | 'ai'; message: string }[]
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context);

  const formattedMessages = history.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.message
  }));

  formattedMessages.push({
    role: 'user',
    content: userQuery
  });

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getDeepSeekApiKey()}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedMessages
      ],
      temperature: 0.7,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('DeepSeek chat failed:', errorText);
    throw new Error(`DeepSeek API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

export async function generateChatResponseStream(
  userQuery: string,
  context: string,
  history: { sender: 'user' | 'ai'; message: string }[],
  modelName: 'deepseek-v4-flash' | 'deepseek-v4-pro' = 'deepseek-v4-flash',
  thinkingEnabled: boolean = false,
  mode: ChatMode = 'detailed'
): Promise<Response> {
  const systemPrompt = buildSystemPrompt(context, mode);

  const formattedMessages = history.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.message
  }));

  formattedMessages.push({
    role: 'user',
    content: userQuery
  });

  return fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getDeepSeekApiKey()}`,
      'Accept-Encoding': 'identity'
    },
    body: JSON.stringify({
      model: modelName === 'deepseek-v4-pro' ? 'deepseek-reasoner' : 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedMessages
      ],
      stream: true,
      stream_options: { include_usage: true },
      thinking: {
        type: thinkingEnabled ? 'enabled' : 'disabled'
      }
    })
  });
}

export async function validateResponseAgainstContext(
  generatedAnswer: string,
  rawContext: string
): Promise<{ isValid: boolean; reason?: string }> {
  if (rawContext.includes("لا يوجد ملف منهج دراسي مرفوع حالياً")) {
    return { isValid: true };
  }

  const prompt = `You are a RAG Fact Verifier for the Egyptian National Curriculum.
Compare the generated AI teacher answer against the provided textbook curriculum context.

Curriculum Context:
"""
${rawContext.slice(0, 5000)}
"""

Generated Teacher Response:
"""
${generatedAnswer.slice(0, 4000)}
"""

Verification Rules:
1. If the response introduces ungrounded academic facts outside the curriculum WITHOUT the mandatory first-line warning ("تنبيه: هذه المعلومة خارج المنهج المقرر عليك يا بطل..."), mark isValid: false.
2. If the response hallucinates false scientific/historical facts not supported by the curriculum, mark isValid: false.
3. If the response is faithful to the curriculum or properly includes the warning on line 1, mark isValid: true.

Return strict JSON ONLY:
{
  "isValid": true|false,
  "reason": "Detailed failure reason in English if invalid"
}`;

  try {
    const raw = await callGeminiFlash(prompt, 200);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { isValid: true };
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      isValid: parsed.isValid !== false,
      reason: parsed.reason
    };
  } catch (e) {
    console.error("Validation error:", e);
    return { isValid: true };
  }
}

export async function generateStrictRewriteStream(
  originalAnswer: string,
  context: string,
  history: { sender: 'user' | 'ai'; message: string }[],
  modelName: 'deepseek-v4-flash' | 'deepseek-v4-pro' = 'deepseek-v4-flash',
  thinkingEnabled: boolean = false,
  mode: ChatMode = 'detailed'
): Promise<Response> {
  const baseSystemPrompt = buildSystemPrompt(context, mode);
  const rewritePrompt = `${baseSystemPrompt}

[CORRECTION DIRECTIVE]:
The previous response included facts outside the curriculum without the required Arabic disclaimer or was inaccurate.
Rewrite the response immediately in Egyptian Arabic, strictly bounded by the provided curriculum context.
If external information is necessary to explain the concept, start the very first line with:
"تنبيه: هذه المعلومة خارج المنهج المقرر عليك يا بطل، ولكنها تفيدك في فهم الدرس..."

Previous Answer needing rewrite:
"""
${originalAnswer}
"""`;

  const formattedMessages = history.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.message
  }));

  formattedMessages.push({
    role: 'user',
    content: 'أعد كتابة إجابتك لتكون مطابقة تماماً للمنهج المقرر وبأسلوبك الممتع.'
  });

  return fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getDeepSeekApiKey()}`,
      'Accept-Encoding': 'identity'
    },
    body: JSON.stringify({
      model: modelName === 'deepseek-v4-pro' ? 'deepseek-reasoner' : 'deepseek-chat',
      messages: [
        { role: 'system', content: rewritePrompt },
        ...formattedMessages
      ],
      stream: true,
      stream_options: { include_usage: true },
      thinking: {
        type: thinkingEnabled ? 'enabled' : 'disabled'
      }
    })
  });
}