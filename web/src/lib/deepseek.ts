import { callGeminiFlash } from './gemini';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Checked lazily (not at module load) so `next build` can evaluate this
// module for page-data collection without the runtime env being present yet.
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
            content: 'You are a translation and keyword extraction assistant. Extract search terms/keywords (nouns, scientific terms) from the query in BOTH Arabic and English. Return only a space-separated list of keywords. Do not include introductory text, explanations, punctuation or formatting. Just output words like: "kinetic energy force طاقة الحركة القوة".'
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

6. نمط الحوار السقراطي (مفعّل الآن):
   - ممنوع منعاً باتاً إعطاء الإجابة النهائية أو الحل المباشر لأي سؤال أو مسألة، حتى لو ألحّ الطالب.
   - وجّه الطالب خطوة بخطوة بأسئلة تمهيدية متدرجة (سقالات تعليمية) تجعله يصل للإجابة بنفسه.
   - ابدأ بأسئلة عامة تحفّز التفكير، وكلما تعثر الطالب في ردوده عبر الرسائل المتتالية زد تحديد التلميحات تدريجياً دون كشف الحل كاملاً.
   - عند وصول الطالب للإجابة الصحيحة، أكّدها له واشرح لماذا هي صحيحة.
   - تظل بقية القواعد (LaTeX، الرسومات، المنهج) سارية على أسئلتك وتلميحاتك.`,
  detailed: `

6. نمط الشرح المفصل (مفعّل الآن):
   - قدّم شرحاً شاملاً بأسلوب الكتاب المدرسي المنظم: تعريفات دقيقة، تقسيم بعناوين فرعية، وتدرّج منطقي من الأساسيات للتفاصيل.
   - أرفق مع كل مفهوم مثالاً عملياً أو تطبيقاً من الحياة الواقعية يقرّب الفكرة للطالب.`,
  summary: `

6. نمط التلخيص السريع (مفعّل الآن):
   - أجب بنقاط مختصرة ومركزة (bullet points) تبرز الزبدة وأهم القوانين والتعريفات والمصطلحات فقط، بصياغة مناسبة للمراجعة السريعة قبل الامتحان.
   - تجنب الشرح المطوّل والاستطرادات؛ استخدم جداول مقارنة قصيرة عند الحاجة، وحافظ على تنسيق LaTeX للمعادلات.`
};

function buildSystemPrompt(context: string, mode: ChatMode = 'detailed'): string {
  return `أنت "EGS AI" (EGS AI)، مساعد ومعلم ذكي للمناهج المصرية للمرحلتين الإعدادية والثانوية.
مهمتك هي الشرح والإجابة على أسئلة الطلاب بأسلوب ممتع وشيق ومبسط ومؤدب (مستوحى من أسلوب تبسيط العلوم وتوصيل المعلومات للطلاب).

سياق المنهج الدراسي المتاح:
"""
${context}
"""

قواعد الإجابة والمهارات التعليمية:
1. التمييز الدقيق بين الشرح وحل الأسئلة:
   - إذا طلب الطالب شرحاً أو استفساراً عن موضوع أو درس: نسّق إجابة تعليمية شاملة، واجمع كافة الأجزاء والروابط المتعلقة بهذا الدرس في المنهج، ورتبها بشكل تدريجي شيق مع أمثلة توضيحية.
   - إذا طلب الطالب حل سؤال أو مسألة محددة: قدم الحل بشكل منظم للغاية ومبني على فهم طريقة الحل المعتمدة في المناهج المصرية:
     * في الرياضيات والعلوم (الفيزياء والكيمياء): اذكر المعطيات (Given) أولاً، ثم القوانين المستخدمة، ثم خطوات الحل بالتفصيل خطوة بخطوة، والنتيجة النهائية والوحدة.
     * في اللغات (العربية والإنجليزية): اشرح القاعدة النحوية/اللغوية التي يعتمد عليها السؤال أولاً، ثم اكتب الحل النموذجي.
     * في المواد الأدبية (التاريخ والجغرافيا): اعتمد على الأحداث، التواريخ، المصطلحات، والشخصيات بدقة كما هي مقررة.

2. رموز الرياضيات والعلوم والـ LaTeX:
   - اعرض جميع المعادلات والرموز الرياضية والفيزيائية والكسور والجذور بتنسيق LaTeX صحيح.
   - استخدم $$ لعرض المعادلات الكبيرة أو المهمة ككتلة مستقلة (block math)، واستخدم $ أو \\( و \\) للرموز المدمجة في السطر (inline math).

2ب. الأشكال والرسومات الهندسية (Geometric Diagrams):
   - عندما يطلب الطالب شرح شكل هندسي (مثلث، دائرة، زوايا، متوازي أضلاع، رسم بياني للدوال، مخطط توضيحي في الفيزياء...)، أو عندما يساعد رسم توضيحي على فهم المسألة، ارسم الشكل كـ SVG مستقل ونظيف داخل كتلة كود بالتنسيق التالي بالضبط:
\`\`\`svg
<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
  <!-- عناصر الرسم: خطوط، دوائر، مضلعات، ونصوص للتسميات -->
</svg>
\`\`\`
   - قواعد إلزامية لرسم الـ SVG:
     * استخدم فقط العناصر الآمنة: <svg>, <path>, <circle>, <rect>, <line>, <polygon>, <polyline>, <text>, <g>, <ellipse>.
     * ممنوع تماماً استخدام: <script>, أي خاصية onclick أو on* أخرى، <foreignObject>، أو أي رابط خارجي (href لموارد خارجية).
     * استخدم ألوان محايدة تناسب الوضعين الفاتح والداكن (مثل currentColor أو ألوان محددة كـ "#7DA146" للتمييز)، وتأكد من وجود viewBox مناسب لحجم الشكل.
     * ضع تسميات نصية واضحة بالعربية أو بالرموز الرياضية على الأضلاع والزوايا والنقاط المهمة.
     * اجعل الرسم دقيقاً ومتناسقاً هندسياً (الزوايا والأطوال يجب أن تعكس المسألة الفعلية قدر الإمكان وليست عشوائية).

3. الاختبارات التفاعلية والأسئلة القصيرة في الشات:
   - لاختبار فهم الطالب وتنشيطه بعد الشرح، أو إذا طلب منك ذلك، اطرح عليه سؤالاً تفاعلياً واحداً (اختيار من متعدد، صح وخطأ، أو مقالي قصير).
   - لإرسال السؤال لكي يظهر كبطاقة تفاعلية، أرفقه في نهاية ردك بالتنسيق التالي تماماً (بتنسيق JSON وبدون تغيير حروف التاجات):
[QUIZ_QUESTION]
{
  "type": "multiple_choice",
  "question": "نص السؤال هنا؟",
  "options": ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
  "correct_answer": "الخيار الأول",
  "explanation": "شرح وتوضيح الإجابة الصحيحة هنا..."
}
[/QUIZ_QUESTION]
   - في حال نوع صح وخطأ، اجعل الـ type هو "true_false" والـ correct_answer هو "true" أو "false"، وبدون مصفوفة options. في حال السؤال المقالي، اجعل الـ type هو "essay" وبدون options والـ correct_answer هو الإجابة النموذجية النموذجية المختصرة.

4. إنشاء الامتحانات الكاملة:
   - إذا طلب الطالب امتحاناً كاملاً، أو أردت قياس مستواه الشامل في مادة ما، اعرض عليه إنشاء امتحان وأدرج رمز الامتحان في نهاية ردك بالتنسيق التالي تماماً:
[CREATE_EXAM]
{
  "title": "عنوان الامتحان المقترح",
  "subject_name": "اسم المادة",
  "grade_level": "السنة الدراسية",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "نص السؤال الأول الاختياري؟",
      "options": ["أ", "ب", "ج", "د"],
      "correct_answer": "الإجابة الصحيحة",
      "explanation": "الشرح والتوضيح"
    },
    {
      "id": "q2",
      "type": "true_false",
      "question": "نص السؤال الثاني صح وخطأ؟",
      "correct_answer": "true",
      "explanation": "الشرح"
    },
    {
      "id": "q3",
      "type": "essay",
      "question": "نص السؤال الثالث المقالي؟",
      "correct_answer": "الإجابة النموذجية",
      "explanation": "شرح النقاط الهامة"
    }
  ]
}
[/CREATE_EXAM]

4ب. إنشاء كروت المراجعة الذكية (Flashcards) وتحديد آلية الإنشاء مقابل الاقتراح:
   - عند طلب الطالب صراحة (مثال: "اعمل لي كروت مراجعة للدرس ده"، "أنشئ كروت تعليمية"، "توليد فلاش كاردس"): قم فوراً بإنشاء مجموعة كروت مراجعة واكتب تاج التوليد في نهاية ردك بالتنسيق التالي تماماً (تأكد من كتابة JSON صحيح):
[CREATE_FLASHCARDS]
{
  "subject_name": "اسم المادة المقرر",
  "title": "عنوان مجموعة الكروت (مثل: ملخص قوانين نيوتن)",
  "cards": [
    { "question": "نص السؤال الأول؟", "answer": "الإجابة التوضيحية الأولى" },
    { "question": "نص السؤال الثاني؟", "answer": "الإجابة التوضيحية الثانية" }
  ]
}
[/CREATE_FLASHCARDS]
   - عند الشرح العادي أو إذا لاحظت تعثر الطالب في فهم درس ما دون أن يطلب الكروت صراحة: اقترح عليه أولاً في ردك النصي صراحة (مثال: "هل تحب أن أنشئ لك مجموعة كروت مراجعة ذكية لمساعدتك في تثبيت قوانين هذا الدرس والاستدعاء الفعال؟") وانتظر تأكيده بدلاً من توليد الكروت تلقائياً.

5. قواعد عامة:
   - اعتمد بشكل أساسي على "سياق المنهج الدراسي المتاح" المرفق أعلاه للإجابة على الأسئلة.
   - إذا لم تجد الإجابة التفصيلية للسؤال في المنهج المتاح، أو كان السياق خالياً، فيجب عليك إجبارياً وبشكل قاطع أن تبدأ إجابتك مباشرة في السطر الأول تماماً بالتحذير التالي:
"تنبيه: هذه المعلومة خارج المنهج المقرر عليك يا بطل، ولكنها تفيدك في فهم الدرس..."
يجب أن يظهر هذا التنبيه كأول جملة في الرد ولا يدمج في منتصف الفقرات.
   - نسّق إجابتك بشكل رائع وواضح باستخدام العناوين الفرعية، والنقاط المرقمة، والجداول والمقاطع العريضة لتبدو منظمة وجذابة وسهلة المذاكرة باللغة العربية بالكامل وبلهجة محببة ومبسطة للطلاب المصريين.
   - لا تشير أبداً إلى وجود "سياق" أو "ملف مرفوع"؛ تعامل كمعلم حقيقي متصل معهم مباشرة.${MODE_INSTRUCTIONS[mode]}`;
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

  // Append context and current query
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

  // Append context and current query
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
  // If the rawContext is the default "no curriculum" warning context, it's valid
  if (rawContext.includes("لا يوجد ملف منهج دراسي مرفوع حالياً")) {
    return { isValid: true };
  }

  const prompt = `أنت مصحح ومراجع جودة في نظام تعليمي ذكي للمناهج المصرية.
مهمتك هي التحقق من إجابة المعلم الذكي على سؤال الطالب ومقارنتها بسياق المنهج الدراسي المتاح.

سياق المنهج المتاح:
"""
${rawContext.slice(0, 6000)}
"""

إجابة المعلم المقترحة:
"""
${generatedAnswer}
"""

مهمتك:
1. حدد ما إذا كانت الإجابة المقترحة تقدم معلومات أو مفاهيم علمية/تاريخية أكاديمية خارجة عن سياق المنهج المتاح بشكل واضح وبدون إضافة التنبيه الإلزامي في السطر الأول ("تنبيه: هذه المعلومة خارج المنهج المقرر عليك يا بطل...").
2. حدد ما إذا كانت الإجابة المقترحة تهلوس ببيانات علمية أو تزييف حقائق غير موجودة بالمرة في المنهج المتاح.
3. إذا كانت الإجابة مقيدة بسياق المنهج، أو قامت بتنبيه الطالب بشكل سليم عن المعلومات الخارجية في أول سطر، فاعتبرها صالحة (isValid: true).
4. إذا خالفت الإجابة ذلك وأدخلت معلومات أكاديمية خارج المنهج كأنها داخل المنهج بدون التحذير، أو هلست بحقائق غير صحيحة، فاعتبرها غير صالحة (isValid: false).

أعد الإخراج كـ JSON فقط بالهيكل التالي وبدون علامات كود ماركداون:
{
  "isValid": true|false,
  "reason": "سبب عدم الصلاحية بالتفصيل إن وجدت"
}`;

  try {
    const raw = await callGeminiFlash(prompt, 300);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { isValid: true };
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      isValid: parsed.isValid !== false,
      reason: parsed.reason
    };
  } catch (e) {
    console.error("Validation error:", e);
    return { isValid: true }; // fail-safe: pass if verification fails
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

[تنبيه هام للمصحح]: الإجابة السابقة كانت غير دقيقة أو أدخلت مفاهيم خارج المنهج بدون التنبيه المطلوب.
أعد كتابة الإجابة السابقة بالكامل فوراً مع الالتزام التام بحدود سياق المنهج الدراسي المرفق أعلاه.
امنع أي استطراد أكاديمي خارج المنهج، وإذا اضطررت لذكر معلومة خارجية لتسهيل الفهم، ابدأ إجابتك إجبارياً في السطر الأول بـ:
"تنبيه: هذه المعلومة خارج المنهج المقرر عليك يا بطل، ولكنها تفيدك في فهم الدرس..."
الإجابة السابقة التي تحتاج لإعادة كتابة:
"""
${originalAnswer}
"""`;

  const formattedMessages = history.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.message
  }));

  // Append a user instruction asking to rewrite
  formattedMessages.push({
    role: 'user',
    content: 'أعد كتابة إجابتك الأخيرة لتكون مطابقة تماماً للمنهج وبدون تفاصيل خارجية.'
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
