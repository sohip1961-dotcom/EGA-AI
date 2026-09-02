/**
 * Advanced Okapi BM25 Lexical Retrieval Engine with Arabic Morphological Analyzer
 * Designed specifically for the Egyptian Educational Curriculum.
 * Fully compatible with Next.js Edge Runtime and Node.js (pure TypeScript, zero native dependencies).
 */

export interface BM25Document {
  id: string;
  heading: string;
  content: string;
  parent_id?: string | null;
  position_index?: number;
  metadata?: Record<string, any>;
}

export interface BM25SearchResult {
  doc: BM25Document;
  score: number;
  rank: number;
  matchedTerms: string[];
}

// ─── Arabic Linguistic Normalization & Tokenization ──────────────────────────

const ARABIC_DIACRITICS_REGEX = /[\u064B-\u065F\u0670]/g;
const ARABIC_TATWEEL_REGEX = /\u0640/g;
const PUNCTUATION_REGEX = /[،؛؟?!.,:;()[\]{}<>"'`~#$%\^&*+=_\\/|\-]/g;

// Common Egyptian Arabic educational stop words that dilute search relevance
const ARABIC_EDUCATIONAL_STOP_WORDS = new Set([
  'في', 'من', 'إلى', 'الى', 'على', 'عن', 'مع', 'هذا', 'هذه', 'هؤلاء', 'ذلك', 'تلك',
  'الذي', 'التي', 'الذين', 'اللاتي', 'اللواتي', 'هو', 'هي', 'هم', 'هن', 'أنا', 'نحن',
  'أنت', 'انتم', 'أنتم', 'كان', 'كانت', 'يكون', 'تكون', 'أصبح', 'أمسى', 'صار', 'ليس',
  'ما', 'ماذا', 'لماذا', 'كيف', 'متى', 'أين', 'اين', 'كم', 'أي', 'اي', 'هل', 'لو',
  'إن', 'ان', 'أن', 'إذا', 'اذا', 'ثم', 'أو', 'او', 'بل', 'لكن', 'حتى', 'كل', 'بعض',
  'غير', 'سوى', 'فقط', 'جدا', 'أيضا', 'ايضا', 'يا', 'بطل', 'دكتور', 'مهندس', 'عايز',
  'اعرف', 'قولي', 'ايه', 'إيه', 'ده', 'دي', 'ممكن', 'حل', 'مسألة', 'سؤال', 'اشرح',
  'وضح', 'عرف', 'قارن', 'ما معنى', 'مفهوم'
]);

// Common prefixes to peel during morphological analysis
const ARABIC_PREFIX_CLITICS = [
  'كال', 'فال', 'وال', 'بال', 'لل',
  'ال', 'وا', 'فا',
  'و', 'ف', 'ب', 'ك', 'ل', 'س'
];

// Common suffixes to peel during morphological analysis
const ARABIC_SUFFIX_CLITICS = [
  'هما', 'كما', 'هم', 'هن', 'ها', 'نا', 'كم',
  'ات', 'ين', 'ون', 'ية', 'يه', 'ة', 'ه', 'ي'
];

/**
 * Standardizes Arabic characters, strips diacritics and tatweel.
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .replace(ARABIC_DIACRITICS_REGEX, '')
    .replace(ARABIC_TATWEEL_REGEX, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ؤئ]/g, 'ء')
    .trim();
}

/**
 * Strips leading clitics (e.g. "والقوة" -> "قوة", "بالسرعة" -> "سرعة").
 */
export function peelArabicPrefix(word: string): string {
  for (const prefix of ARABIC_PREFIX_CLITICS) {
    if (word.startsWith(prefix) && word.length - prefix.length >= 3) {
      return word.slice(prefix.length);
    }
  }
  return word;
}

/**
 * Strips trailing clitics (e.g. "حركتها" -> "حركت" / "حركة", "معادلاتهم" -> "معادلات").
 */
export function peelArabicSuffix(word: string): string {
  for (const suffix of ARABIC_SUFFIX_CLITICS) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, word.length - suffix.length);
    }
  }
  return word;
}

/**
 * Tokenizes Arabic and Latin text into normalized stems and terms.
 * Returns an array of clean, non-stopword tokens and morphological variants.
 */
export function tokenizeArabic(text: string): string[] {
  if (!text) return [];
  const normalized = normalizeArabic(text.toLowerCase());
  const rawWords = normalized
    .replace(PUNCTUATION_REGEX, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 1 && !ARABIC_EDUCATIONAL_STOP_WORDS.has(w));

  const tokens: string[] = [];
  const seen = new Set<string>();

  for (const word of rawWords) {
    if (!seen.has(word)) {
      tokens.push(word);
      seen.add(word);
    }

    // Morphological stem extraction
    const peeledPrefix = peelArabicPrefix(word);
    if (peeledPrefix !== word && peeledPrefix.length >= 2 && !seen.has(peeledPrefix)) {
      tokens.push(peeledPrefix);
      seen.add(peeledPrefix);
    }

    const peeledSuffix = peelArabicSuffix(peeledPrefix);
    if (peeledSuffix !== peeledPrefix && peeledSuffix.length >= 2 && !seen.has(peeledSuffix)) {
      tokens.push(peeledSuffix);
      seen.add(peeledSuffix);
    }
  }

  return tokens;
}

// ─── Okapi BM25 Index & Scorer ───────────────────────────────────────────────

export interface BM25Options {
  k1?: number;           // Term frequency saturation parameter (default: 1.2)
  b?: number;            // Document length normalization parameter (default: 0.75)
  headingBoost?: number; // Multiplier for heading token matches (default: 3.0)
  phraseBoost?: number;  // Multiplier for exact multi-token phrase match (default: 1.25)
}

export class BM25Index {
  private k1: number;
  private b: number;
  private headingBoost: number;
  private phraseBoost: number;

  private docs: BM25Document[] = [];
  private docLengths: number[] = [];
  private avgDocLength: number = 0;
  private totalDocs: number = 0;

  // Inverted index: term -> Map<docIndex, termFrequencyInDoc>
  private invertedIndex: Map<string, Map<number, number>> = new Map();
  // Inverted index for headings: term -> Map<docIndex, headingTermFrequency>
  private headingIndex: Map<string, Map<number, number>> = new Map();
  // Precomputed document frequencies: term -> count of docs containing term
  private docFreqs: Map<string, number> = new Map();

  constructor(docs: BM25Document[], options: BM25Options = {}) {
    this.k1 = options.k1 ?? 1.2;
    this.b = options.b ?? 0.75;
    this.headingBoost = options.headingBoost ?? 3.0;
    this.phraseBoost = options.phraseBoost ?? 1.25;

    this.buildIndex(docs);
  }

  private buildIndex(docs: BM25Document[]): void {
    this.docs = docs;
    this.totalDocs = docs.length;
    this.docLengths = new Array(this.totalDocs);
    this.invertedIndex.clear();
    this.headingIndex.clear();
    this.docFreqs.clear();

    if (this.totalDocs === 0) {
      this.avgDocLength = 0;
      return;
    }

    let totalTokens = 0;

    for (let i = 0; i < this.totalDocs; i++) {
      const doc = docs[i];
      const contentTokens = tokenizeArabic(doc.content || '');
      const headingTokens = tokenizeArabic(doc.heading || '');

      // Effective doc length considers content plus weighted heading
      const effectiveLength = contentTokens.length + (headingTokens.length * 2);
      this.docLengths[i] = effectiveLength;
      totalTokens += effectiveLength;

      // Index content
      const contentFreqMap = new Map<string, number>();
      for (const token of contentTokens) {
        contentFreqMap.set(token, (contentFreqMap.get(token) || 0) + 1);
      }

      for (const [token, freq] of contentFreqMap.entries()) {
        if (!this.invertedIndex.has(token)) {
          this.invertedIndex.set(token, new Map());
        }
        this.invertedIndex.get(token)!.set(i, freq);
      }

      // Index heading
      const headingFreqMap = new Map<string, number>();
      for (const token of headingTokens) {
        headingFreqMap.set(token, (headingFreqMap.get(token) || 0) + 1);
      }

      for (const [token, freq] of headingFreqMap.entries()) {
        if (!this.headingIndex.has(token)) {
          this.headingIndex.set(token, new Map());
        }
        this.headingIndex.get(token)!.set(i, freq);
      }

      // Track document frequencies (union of heading & content terms)
      const allDocTokens = new Set([...contentFreqMap.keys(), ...headingFreqMap.keys()]);
      for (const token of allDocTokens) {
        this.docFreqs.set(token, (this.docFreqs.get(token) || 0) + 1);
      }
    }

    this.avgDocLength = totalTokens / this.totalDocs;
  }

  /**
   * Calculates Robertson-Spärck Jones IDF with Robertson smoothing:
   * IDF(t) = ln(1 + (N - n(t) + 0.5) / (n(t) + 0.5))
   */
  public getIDF(term: string): number {
    const n = this.docFreqs.get(term) || 0;
    if (n === 0) return 0;
    return Math.log(1 + (this.totalDocs - n + 0.5) / (n + 0.5));
  }

  /**
   * Searches the indexed documents using Okapi BM25 with heading and phrase boosts.
   */
  public search(query: string, topK: number = 8): BM25SearchResult[] {
    if (this.totalDocs === 0 || !query.trim()) return [];

    const queryTokens = tokenizeArabic(query);
    if (queryTokens.length === 0) return [];

    const normQuery = normalizeArabic(query);
    const docScores = new Float64Array(this.totalDocs);
    const docMatchedTerms = new Array<Set<string>>(this.totalDocs);

    for (const term of queryTokens) {
      const idf = this.getIDF(term);
      if (idf <= 0) continue;

      const contentPosting = this.invertedIndex.get(term);
      const headingPosting = this.headingIndex.get(term);

      const candidateDocs = new Set<number>();
      if (contentPosting) {
        for (const docIdx of contentPosting.keys()) candidateDocs.add(docIdx);
      }
      if (headingPosting) {
        for (const docIdx of headingPosting.keys()) candidateDocs.add(docIdx);
      }

      for (const docIdx of candidateDocs) {
        const tfContent = contentPosting?.get(docIdx) || 0;
        const tfHeading = headingPosting?.get(docIdx) || 0;

        // Effective term frequency with heading boost
        const effectiveTF = tfContent + (tfHeading * this.headingBoost);
        const docLen = this.docLengths[docIdx];
        const lenNorm = 1 - this.b + (this.b * (docLen / (this.avgDocLength || 1)));

        // Okapi BM25 core term score
        const termScore = idf * ((effectiveTF * (this.k1 + 1)) / (effectiveTF + (this.k1 * lenNorm)));

        docScores[docIdx] += termScore;

        if (!docMatchedTerms[docIdx]) {
          docMatchedTerms[docIdx] = new Set();
        }
        docMatchedTerms[docIdx].add(term);
      }
    }

    // Exact phrase match bonus
    if (queryTokens.length > 1 && normQuery.length > 4) {
      for (let i = 0; i < this.totalDocs; i++) {
        if (docScores[i] === 0) continue;
        const doc = this.docs[i];
        const normDocHeading = normalizeArabic(doc.heading || '');
        const normDocContent = normalizeArabic(doc.content || '');

        if (normDocHeading.includes(normQuery)) {
          docScores[i] *= (this.phraseBoost * 1.5); // Major boost for exact match in heading
        } else if (normDocContent.includes(normQuery)) {
          docScores[i] *= this.phraseBoost;
        }
      }
    }

    const results: BM25SearchResult[] = [];
    for (let i = 0; i < this.totalDocs; i++) {
      if (docScores[i] > 0) {
        results.push({
          doc: this.docs[i],
          score: docScores[i],
          rank: 0,
          matchedTerms: Array.from(docMatchedTerms[i] || [])
        });
      }
    }

    // Sort descending by score
    results.sort((a, b) => b.score - a.score);

    // Assign 1-indexed ranks
    results.forEach((res, index) => {
      res.rank = index + 1;
    });

    return results.slice(0, topK);
  }
}
