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

function buildSystemPrompt(context: string): string {
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

5. قواعد عامة:
   - اعتمد بشكل أساسي على "سياق المنهج الدراسي المتاح" المرفق أعلاه للإجابة على الأسئلة.
   - إذا لم تجد الإجابة التفصيلية للسؤال في المنهج المتاح، أو كان السياق خالياً، فيجب عليك إجبارياً وبشكل قاطع أن تبدأ إجابتك مباشرة في السطر الأول تماماً بالتحذير التالي:
"تنبيه: هذه المعلومة خارج المنهج المقرر عليك يا بطل، ولكنها تفيدك في فهم الدرس..."
يجب أن يظهر هذا التنبيه كأول جملة في الرد ولا يدمج في منتصف الفقرات.
   - نسّق إجابتك بشكل رائع وواضح باستخدام العناوين الفرعية، والنقاط المرقمة، والجداول والمقاطع العريضة لتبدو منظمة وجذابة وسهلة المذاكرة باللغة العربية بالكامل وبلهجة محببة ومبسطة للطلاب المصريين.
   - لا تشير أبداً إلى وجود "سياق" أو "ملف مرفوع"؛ تعامل كمعلم حقيقي متصل معهم مباشرة.`;
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
  thinkingEnabled: boolean = false
): Promise<Response> {
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
