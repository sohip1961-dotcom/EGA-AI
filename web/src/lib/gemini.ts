const EDENAI_API_KEY = process.env.EDENAI_API_KEY || '';
const EDENAI_BASE = 'https://api.edenai.run/v2';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QueryIntelligence {
  queryType: 'direct' | 'inferential' | 'overview' | 'problem_solving';
  arabicKeywords: string[];   // for Arabic FTS (tsvector 'simple')
  englishKeywords: string[];  // for English FTS (tsvector 'english')
  hydePassage: string;        // hypothetical passage for vector embedding
  searchAnnouncement: string; // Arabic UI text: "سأبحث الآن عن..."
  metadata?: {
    gradeLevel?: string;
    subject?: string;
    unit?: string;
    chapter?: string;
  };
}

export interface ContextGapAssessment {
  sufficient: boolean;
  confidence: number;         // 0 to 1
  missingTopics: string[];
  followUpAnnouncement: string; // Arabic UI text for follow-up step
}

// ─── Core EdenAI Caller ───────────────────────────────────────────────────────

export async function callGeminiFlash(prompt: string, maxTokens: number = 600): Promise<string> {
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
      texts: [text.slice(0, 8000)],
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
  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    batches.push(texts.slice(i, i + BATCH_SIZE).map(t => t.slice(0, 8000)));
  }

  const promises = batches.map(async (batch, index) => {
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
        console.error(`Batch embedding error for batch ${index}: ${response.status}`);
        return batch.map(() => []);
      }

      const data = await response.json();
      const googleKey = Object.keys(data).find(k => k.startsWith('google'));
      const items: { embedding: number[] }[] = googleKey ? (data[googleKey]?.items ?? []) : [];
      
      const batchResults: number[][] = [];
      for (let j = 0; j < batch.length; j++) {
        batchResults.push(items[j]?.embedding ?? []);
      }
      return batchResults;
    } catch (err) {
      console.error(`Batch embedding exception for batch ${index}:`, err);
      return batch.map(() => []);
    }
  });

  const resolvedBatches = await Promise.all(promises);
  return resolvedBatches.flat();
}

// ─── Query Intelligence (ONE combined call) ───────────────────────────────────

/**
 * Analyzes the student query in ONE Gemini API call using efficient English instructions.
 * Operates on Arabic curriculum data and returns bilingual keywords, HyDE passage, and search announcement.
 */
export async function analyzeQueryIntelligence(
  query: string,
  subject: string,
  grade: string
): Promise<QueryIntelligence> {
  const prompt = `You are an expert Query Intelligence and Curriculum Search Engine specialized in the Egyptian National Curriculum for Preparatory and Secondary stages (المناهج المصرية للإعدادية والثانوية).
Analyze the student's question against the curriculum subject to extract precise textbook keywords, search terms, and a hypothetical textbook paragraph (HyDE).

Active Subject: "${subject}"
Active Grade Level: "${grade}"
Student Query: "${query}"

Return strict JSON ONLY (no markdown fences, no conversational text):
{
  "queryType": "direct|inferential|overview|problem_solving",
  "arabicKeywords": ["list of 3-7 core academic, scientific, or historical keywords directly from the Egyptian curriculum textbook without conversational words"],
  "englishKeywords": ["corresponding scientific terms in English if relevant, e.g. acceleration, isotope, atom"],
  "hydePassage": "A 2-3 sentence hypothetical textbook passage written in formal Arabic as if extracted directly from the official Egyptian Ministry of Education textbook to answer the query accurately",
  "searchAnnouncement": "سأبحث الآن عن: [الموضوع أو المفهوم المحدد]",
  "metadata": {
    "gradeLevel": "Explicit grade mentioned ('1_middle'|'2_middle'|'3_middle'|'1_high'|'2_high') or null",
    "subject": "Explicit subject mentioned in Arabic or null",
    "unit": "Unit title or number if specified (e.g. 'الوحدة الأولى') or null",
    "chapter": "Lesson or chapter title if specified (e.g. 'الدرس الأول: تركيب الذرة') or null"
  }
}

Guidelines:
- arabicKeywords: Extract substantive curriculum terms (e.g. 'قانون نيوتن الثاني', 'القوة', 'الكتلة', 'التسارع', 'الروابط التساهمية', 'مندليف', 'كوش', 'المفعول المطلق'). Exclude stop words and conversational filler.
- hydePassage: Must use genuine textbook terminology, laws, and definitions matching Egyptian curriculum standards.
- searchAnnouncement: Polite, encouraging phrase in Egyptian educational Arabic informing the student of the targeted search.`;

  try {
    const raw = await callGeminiFlash(prompt, 600);
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
        : query,
      searchAnnouncement: typeof parsed.searchAnnouncement === 'string'
        ? parsed.searchAnnouncement
        : `سأبحث الآن في منهج ${subject}...`,
      metadata: parsed.metadata ? {
        gradeLevel: typeof parsed.metadata.gradeLevel === 'string' && parsed.metadata.gradeLevel.trim() ? parsed.metadata.gradeLevel.trim() : undefined,
        subject: typeof parsed.metadata.subject === 'string' && parsed.metadata.subject.trim() ? parsed.metadata.subject.trim() : undefined,
        unit: typeof parsed.metadata.unit === 'string' && parsed.metadata.unit.trim() ? parsed.metadata.unit.trim() : undefined,
        chapter: typeof parsed.metadata.chapter === 'string' && parsed.metadata.chapter.trim() ? parsed.metadata.chapter.trim() : undefined,
      } : undefined
    };
  } catch (err) {
    console.error('analyzeQueryIntelligence failed, using fallback:', err);
    const STOP_WORDS = new Set([
      'ما', 'ماذا', 'هو', 'هي', 'هم', 'هن', 'كيف', 'لماذا', 'علل', 'بما', 'تفسر',
      'اشرح', 'وضح', 'معنى', 'مفهوم', 'عرف', 'قارن', 'ممكن', 'السؤال', 'في', 'من',
      'على', 'عن', 'مع', 'هل', 'يا', 'ده', 'دي', 'عايز', 'اعرف', 'قولي', 'ايه',
      'لو', 'سمحت', 'اريد', 'حل', 'مسألة', 'سؤال'
    ]);
    const words = query
      .replace(/[؟?!.،,;:]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 1 && !STOP_WORDS.has(w));

    return {
      queryType: 'direct',
      arabicKeywords: words.length > 0 ? words.slice(0, 7) : [query.slice(0, 30)],
      englishKeywords: [],
      hydePassage: query,
      searchAnnouncement: `سأبحث الآن في منهج ${subject}...`
    };
  }
}

// ─── Context Gap Analysis ─────────────────────────────────────────────────────

/**
 * Assesses whether the retrieved context is sufficient to answer the query.
 * Only called for 'inferential' or 'problem_solving' queries when chunk count < 3.
 */
export async function assessContextGap(
  query: string,
  context: string
): Promise<ContextGapAssessment> {
  const prompt = `You are a RAG Context Sufficiency Evaluator for the Egyptian National Curriculum.
Assess whether the retrieved curriculum context contains enough facts to answer the student's question.

Student Query:
"${query.slice(0, 500)}"

Retrieved Context:
"""
${context.slice(0, 2000)}
"""

Return strict JSON ONLY:
{
  "sufficient": true|false,
  "confidence": 0.0-1.0,
  "missingTopics": ["specific missing topic in Arabic (max 2)"],
  "followUpAnnouncement": "سأبحث أيضاً عن: [الموضوع الناقص]"
}

Rule: If the context contains relevant information to address the query even partially, set sufficient to true.`;

  try {
    const raw = await callGeminiFlash(prompt, 250);
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
 * Generates a semantic summary of the full curriculum.
 * Called once during curriculum upload and stored as a special chunk.
 */
export async function generateCurriculumSummary(fullText: string): Promise<string> {
  const prompt = `You are a curriculum architect for Egyptian secondary education.
Read the textbook content below and produce a comprehensive 400-600 word academic summary in clear, structured Arabic covering:
1. Main units and chapters (الموضوعات الرئيسية والفصول)
2. Core scientific laws, definitions, and formulas (أهم القوانين والمفاهيم العلمية)
3. Essential student competencies and problem-solving skills (المهارات المكتسبة)
4. Logical sequence of topics (الترتيب المنطقي للمحتوى)

Write directly in formal academic Arabic without meta-intro or filler.

Curriculum Content:
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

// ─── Student Engagement Classifier ───────────────────────────────────────────

/**
 * Classifies whether a chat turn represents genuine, meaningful student engagement.
 * Used for silent background points scoring (+3 points, max once per session).
 * Returns boolean. Fails open on errors for substantive messages.
 */
export async function classifyEngagement(
  userMessage: string,
  aiResponseText: string
): Promise<boolean> {
  const trimmed = userMessage.trim();
  if (!trimmed || trimmed.length < 2) return false;

  // Filter out superficial single-word greetings or acknowledgments
  const trivialPattern = /^(مرحبا|أهلا|اهلا|سلام|السلام عليكم|شكرا|شكراً|تمام|اوك|أوك|ماشى|ماشي|ok|okay|hi|hello|hey|thanks|thx|bye)[\s.!,]*$/i;
  if (trivialPattern.test(trimmed)) {
    return false;
  }

  const prompt = `You are an AI student engagement evaluator.
Read the student message and teacher response. Determine if the student is showing genuine academic engagement (asking conceptual questions, seeking clarification, solving problems) vs superficial chatter or single greetings (e.g. 'hi', 'thanks', 'ok').

Student Message: "${trimmed.slice(0, 400)}"
Teacher Response: "${aiResponseText.slice(0, 400)}"

Return strict JSON ONLY:
{
  "genuine_engagement": true|false
}`;

  if (EDENAI_API_KEY) {
    try {
      const raw = await callGeminiFlash(prompt, 120);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.genuine_engagement === 'boolean') {
          return parsed.genuine_engagement;
        }
      }
    } catch (err) {
      console.warn('classifyEngagement evaluator notice (failing open):', err);
    }
  }

  // Fail-open for meaningful student questions and prompts
  return trimmed.length >= 6;
}