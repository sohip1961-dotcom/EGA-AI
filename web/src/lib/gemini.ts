const EDENAI_API_KEY = process.env.EDENAI_API_KEY || '';
const EDENAI_BASE = 'https://api.edenai.run/v2';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QueryIntelligence {
  queryType: 'direct' | 'inferential' | 'overview' | 'problem_solving';
  arabicKeywords: string[];   // for Arabic FTS (tsvector 'simple')
  englishKeywords: string[];  // for English FTS (tsvector 'english')
  hydePassage: string;        // hypothetical passage for vector embedding
  searchAnnouncement: string; // Arabic UI text: "سأبحث الآن عن..."
}

export interface ContextGapAssessment {
  sufficient: boolean;
  confidence: number;         // 0 to 1
  missingTopics: string[];
  followUpAnnouncement: string; // Arabic UI text for follow-up step
}

// ─── Core EdenAI Caller ───────────────────────────────────────────────────────

async function callGeminiFlash(prompt: string, maxTokens: number = 600): Promise<string> {
  if (!EDENAI_API_KEY) throw new Error('EDENAI_API_KEY is not set');

  const response = await fetch(`${EDENAI_BASE}/text/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${EDENAI_API_KEY}`
    },
    body: JSON.stringify({
      providers: 'google',
      model: 'gemini-2-5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`EdenAI Gemini error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();

  // EdenAI response structure: { google: { generated_text: "...", status: "success" } }
  const googleResult = data?.google;
  if (googleResult?.status === 'fail') {
    throw new Error(`Gemini via EdenAI failed: ${googleResult?.error?.message || 'unknown error'}`);
  }
  return (googleResult?.generated_text || '').trim();
}

// ─── Embeddings ───────────────────────────────────────────────────────────────

/**
 * Generates a single embedding vector using Google text-embedding-004 via EdenAI.
 * Returns a 768-dimensional float array.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!EDENAI_API_KEY) return [];

  const response = await fetch(`${EDENAI_BASE}/text/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${EDENAI_API_KEY}`
    },
    body: JSON.stringify({
      providers: 'google',
      texts: [text.slice(0, 8000)], // guard against oversized texts
      model: 'text-embedding-004'
    })
  });

  if (!response.ok) {
    console.error('EdenAI embedding error:', response.status);
    return [];
  }

  const data = await response.json();
  const googleKey = Object.keys(data).find(k => k.startsWith('google'));
  return googleKey ? (data[googleKey]?.items?.[0]?.embedding ?? []) : [];
}

/**
 * Batch-embeds up to 100 texts (batched in groups of 20).
 * Returns an array of embedding vectors in the same order as input.
 */
export async function generateEmbeddingBatch(texts: string[]): Promise<number[][]> {
  if (!EDENAI_API_KEY || texts.length === 0) return texts.map(() => []);

  const BATCH_SIZE = 20;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE).map(t => t.slice(0, 8000));

    try {
      const response = await fetch(`${EDENAI_BASE}/text/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EDENAI_API_KEY}`
        },
        body: JSON.stringify({
          providers: 'google',
          texts: batch,
          model: 'text-embedding-004'
        })
      });

      if (!response.ok) {
        console.error(`Batch embedding error for batch ${i}: ${response.status}`);
        results.push(...batch.map(() => []));
        continue;
      }

      const data = await response.json();
      const googleKey = Object.keys(data).find(k => k.startsWith('google'));
      const items: { embedding: number[] }[] = googleKey ? (data[googleKey]?.items ?? []) : [];
      // Ensure length matches batch
      for (let j = 0; j < batch.length; j++) {
        results.push(items[j]?.embedding ?? []);
      }
    } catch (err) {
      console.error(`Batch embedding exception for batch ${i}:`, err);
      results.push(...batch.map(() => []));
    }

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < texts.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
}

// ─── Query Intelligence (ONE combined call) ───────────────────────────────────

/**
 * Analyzes the student query in ONE Gemini API call.
 * Returns query type, bilingual keywords, HyDE passage, and search announcement.
 * The HyDE passage is what gets embedded for vector search (not the raw query).
 */
export async function analyzeQueryIntelligence(
  query: string,
  subject: string,
  grade: string
): Promise<QueryIntelligence> {
  const prompt = `أنت محلل ذكاء اصطناعي متخصص في تحليل أسئلة الطلاب في المناهج المصرية.

المادة: "${subject}"
الصف الدراسي: "${grade}"
سؤال الطالب: "${query}"

قم بتحليل السؤال وأعد JSON فقط (بدون markdown أو شرح):

{
  "queryType": "direct|inferential|overview|problem_solving",
  "arabicKeywords": ["كلمة1", "كلمة2", "كلمة3"],
  "englishKeywords": ["word1", "word2"],
  "hydePassage": "فقرة افتراضية من 2-3 جمل تمثل الإجابة المثالية التي قد توجد في الكتاب المدرسي لهذا السؤال، مكتوبة كأنها من المنهج مباشرة",
  "searchAnnouncement": "سأبحث الآن عن: [الموضوع المحدد]"
}

دليل queryType:
- "overview": يسأل عن محتوى المنهج كله أو ملخص عام أو قائمة الموضوعات
- "direct": يبحث عن تعريف أو قانون أو مصطلح محدد موجود في المنهج
- "inferential": يسأل عن تطبيق أو استنتاج أو علاقة بين مفاهيم
- "problem_solving": يطلب حل مسألة رياضية أو فيزيائية أو كيميائية

للـ arabicKeywords: استخرج الكلمات المفتاحية العربية الجوهرية (مصطلحات علمية، أسماء قوانين، مفاهيم)
للـ englishKeywords: استخرج المصطلحات العلمية الإنجليزية المقابلة فقط
للـ hydePassage: اكتبها كأنها جزء من الكتاب المدرسي مباشرة، تجيب على السؤال بشكل غير مباشر
للـ searchAnnouncement: جملة عربية قصيرة للعرض للطالب تخبره بما ستبحث عنه`;

  try {
    const raw = await callGeminiFlash(prompt, 600);

    // Extract JSON from response (handle possible surrounding text)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Gemini response');

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      queryType: ['direct', 'inferential', 'overview', 'problem_solving'].includes(parsed.queryType)
        ? parsed.queryType
        : 'direct',
      arabicKeywords: Array.isArray(parsed.arabicKeywords) ? parsed.arabicKeywords.slice(0, 8) : [],
      englishKeywords: Array.isArray(parsed.englishKeywords) ? parsed.englishKeywords.slice(0, 5) : [],
      hydePassage: typeof parsed.hydePassage === 'string' && parsed.hydePassage.length > 10
        ? parsed.hydePassage
        : query, // fallback: use original query
      searchAnnouncement: typeof parsed.searchAnnouncement === 'string'
        ? parsed.searchAnnouncement
        : `سأبحث الآن في منهج ${subject}...`
    };
  } catch (err) {
    console.error('analyzeQueryIntelligence failed, using fallback:', err);
    // Graceful fallback: extract simple keywords from query
    const words = query.replace(/[؟?!.،,]/g, '').split(/\s+/).filter(w => w.length > 2);
    return {
      queryType: 'direct',
      arabicKeywords: words.slice(0, 6),
      englishKeywords: [],
      hydePassage: query,
      searchAnnouncement: `سأبحث الآن في منهج ${subject}...`
    };
  }
}

// ─── Context Gap Analysis (conditional, only for inferential/thin results) ────

/**
 * Assesses whether the retrieved context is sufficient to answer the query.
 * Only called for 'inferential' or 'problem_solving' queries when chunk count < 3.
 */
export async function assessContextGap(
  query: string,
  context: string
): Promise<ContextGapAssessment> {
  const prompt = `أنت مقيّم نظام RAG. قيّم ما إذا كان السياق المسترجع كافياً للإجابة على سؤال الطالب.

سؤال الطالب: "${query.slice(0, 500)}"

السياق المسترجع:
"""
${context.slice(0, 2000)}
"""

أعد JSON فقط (بدون markdown):
{
  "sufficient": true|false,
  "confidence": 0.0-1.0,
  "missingTopics": ["موضوع ناقص 1", "موضوع ناقص 2"],
  "followUpAnnouncement": "سأبحث أيضاً عن: [الموضوع الناقص]"
}

إذا كان السياق يحتوي على معلومات ذات صلة بالسؤال ولو جزئياً، اعتبره كافياً (sufficient: true).
missingTopics لا يجب أن تتجاوز 2 عناصر.`;

  try {
    const raw = await callGeminiFlash(prompt, 300);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in gap analysis response');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      sufficient: !!parsed.sufficient,
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
      missingTopics: Array.isArray(parsed.missingTopics) ? parsed.missingTopics.slice(0, 2) : [],
      followUpAnnouncement: typeof parsed.followUpAnnouncement === 'string'
        ? parsed.followUpAnnouncement
        : 'سأبحث عن معلومات إضافية...'
    };
  } catch (err) {
    console.error('assessContextGap failed:', err);
    return { sufficient: true, confidence: 0.5, missingTopics: [], followUpAnnouncement: '' };
  }
}

// ─── Curriculum Summary Generator ─────────────────────────────────────────────

/**
 * Generates a 500-word semantic summary of the full curriculum.
 * Called once during curriculum upload and stored as a special chunk.
 */
export async function generateCurriculumSummary(fullText: string): Promise<string> {
  const prompt = `أنت خبير تربوي. اقرأ محتوى المنهج الدراسي التالي وأنشئ ملخصاً شاملاً من 400-600 كلمة عربية يغطي:
1. الموضوعات الرئيسية والفصول
2. أهم القوانين والمفاهيم العلمية
3. المهارات التي يكتسبها الطالب
4. الترتيب المنطقي للمحتوى

اكتب الملخص بأسلوب أكاديمي مباشر مناسب للمنهج المصري.

المنهج:
"""
${fullText.slice(0, 15000)}
"""`;

  try {
    return await callGeminiFlash(prompt, 800);
  } catch (err) {
    console.error('generateCurriculumSummary failed:', err);
    return '';
  }
}
