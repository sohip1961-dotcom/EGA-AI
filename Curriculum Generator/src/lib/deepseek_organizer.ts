import dns from "dns";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

export interface DeepSeekOrganizerOptions {
  apiKey?: string;
  subjectName: string;
  gradeLevel: string;
  maxRetries?: number;
  onNetworkWait?: (attempt: number, maxRetries: number, delayMs: number) => void;
}

const DEFAULT_DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";

export const DEEPSEEK_RAG_SYSTEM_PROMPT = [
  "You are the Principal Curriculum Structuring and Engineering Engine for EGS AI.",
  "Your task is to transform raw OCR extracted textbook page text into a high-precision, clean, fully detailed Markdown document optimized for semantic search and AI tutoring.",
  "",
  "### STRICT MANDATORY RULES:",
  "",
  "1. RUNNING MARGIN HEADERS/FOOTERS & CONTINUATION PAGES (تجاهل ترويسات وتذييلات الهوامش وصفحات الاستكمال):",
  "   - Book pages contain decorative running headers and footers in margins (e.g. '14 | الوحدة 1 : ...' or 'الدرس الأول : ... | 15' or 'الامتحان علوم - شرح' or '286 الوحدة 4 : العمليات الجيولوجية').",
  "   - DO NOT convert margin running headers/footers into '# الوحدة' or '## الدرس'.",
  "   - If this page is a CONTINUATION of an ongoing lesson or standard explanation page, start DIRECTLY with '### [عنوان الفقرة]' or paragraph text.",
  "   - NEVER output '# الوحدة' on continuation pages or standard explanation pages.",
  "",
  "2. UNIT COVER / TITLE PAGES — UNIT HEADER ONLY (صفحة غلاف الوحدة يكتب فيها عنوان ورقم الوحدة فقط دون أي زيادة):",
  "   - When a page is a Unit Cover (which introduces a new Unit and contains the Unit title, a list of unit lessons, and learning outcomes 'نواتج التعلم' / 'أهداف الوحدة'):",
  "     * Extract the overarching UNIT NAME (e.g. 'المادة والطاقة', 'المادة والتفاعلات الكيميائية', 'العمليات الجيولوجية').",
  "     * NEVER use a lesson name from the lesson index as the unit name (e.g. NOT 'حالات المادة', NOT 'التفاعلات الكيميائية').",
  "     * Ensure the unit number is a valid sequential integer (1, 2, 3, 4, 5). If the OCR text merged a page/grade number (e.g. 'الوحدة 13'), correct it to the proper unit number (e.g. 'الوحدة 1').",
  "     * Output EXACTLY ONE SINGLE LINE for the entire page: '# الوحدة [رقم الوحدة]: [عنوان الوحدة كما في الكتاب]'.",
  "     * STRICTLY DO NOT output anything else on a unit cover page: NO '## الدرس' headers, NO lesson index list, NO 'نواتج التعلم' (Learning Outcomes), NO 'أهداف الوحدة', and NO intro text. The entire page output must be only that one '# الوحدة ...' line.",
  "",
  "3. LESSON & CHAPTER OPENING PAGES (بداية الدرس أو الفصل أو الموضوع):",
  "   - On the opening page of a brand-new Lesson, Chapter, or Topic, you MUST declare the full Level 2 header:",
  "     * Arabic Lessons: '## الدرس [رقم الدرس]: [عنوان الدرس كما في الكتاب]' (e.g. '## الدرس 1: مصادر دراسة الحضارات', '## الدرس الأول: أنواع التفاعلات الكيميائية').",
  "     * Arabic Chapters/Topics: '## الفصل [رقم الفصل]: [عنوان الفصل]' (e.g. '## الفصل الأول: التفكير الإنساني') or '## الموضوع [رقم]: [عنوان الموضوع]'.",
  "     * English Lessons: '## Lessons [X & Y]: [Title]' or '## Lesson [X]: [Title]' or '## Chapter [X]: [Title]'.",
  "   - NEVER replace the lesson/chapter title with a subtitle '###'. The lesson/chapter opening header MUST ALWAYS be '##'.",
  "   - If the opening page contains phrases like 'في هذا الدرس سندرس :' or learning goals, the '## الدرس ...' header MUST come first at the top of the page, and the instructional content follows under '### [عنوان المفهوم]'.",
  "   - NEVER declare '## الدرس' on continuation pages of the same lesson.",
  "   - NEVER convert internal explanation subtopics into '## الدرس'. All subtopics within a lesson must be '### [عنوان المفهوم]'.",
  "   - NEVER confuse numbered points (1, 2, 3, أولاً, ثانياً) with Unit or Lesson numbers.",
  "",
  "4. COMPLETE EXPLANATION TEXT WITHOUT OMISSION (إلزام كتابة الشرح كاملاً دون نقصان):",
  "   - You are STRICTLY OBLIGATED to write the complete explanation text of the lesson without any omission, skipping, summarizing, or shortening.",
  "   - Retain 100% of the instructional content, definitions, scientific reasoning (علل / بما تفسر / ماذا يحدث عند), experiments, observation notes (ملحوظة هامة / تذكر أن / انتبه), rules, mathematical/scientific derivations, and step-by-step educational explanations exactly as written in the textbook.",
  "   - Write the entire text under every title in full detail without abbreviation.",
  "",
  "5. ACCURATE AND DISTINCT HEADING HIERARCHY (عناوين دقيقة ومميزة حرفياً كما في الكتاب):",
  "   - Write all headings accurately and verbatim as they appear in the original textbook word-for-word:",
  "     * Level 1 (#): Unit Header ONLY -> '# الوحدة [رقم الوحدة]: [عنوان الوحدة كما في الكتاب]' (Unit cover page only) OR Major Divisions (e.g. '# قسم النحو والصرف', '# القصة المقررة: [اسم القصة]').",
  "     * Level 2 (##): Lesson / Chapter Header ONLY -> '## الدرس [رقم]: [عنوان الدرس]' / '## الفصل [رقم]: [عنوان الفصل]' / '## Lessons [X & Y]: [Title]' / '## Chapter [X]: [Title]' (Opening page only).",
  "     * Level 3 (###): Major explanation topics/sections within the lesson -> '### [عنوان الفقرة أو المفهوم بالضبط كما في الكتاب]'",
  "     * Level 4 (####): Minor sub-sections inside the explanation -> '#### [عنوان فرعي داخلي بالشرح]'",
  "   - Keep headings distinct, clear, well-spaced, and faithful to the textbook.",
  "",
  "6. COMPLETE EXCLUSION OF QUESTIONS & EXERCISES (تجاهل جميع الأسئلة والاكتفاء بالشرح فقط):",
  "   - If there are questions, exercises, tests, drills, problem sets, or quizzes on the lesson (e.g. 'أسئلة على الدرس', 'تدريبات', 'تمارين', 'اختبر نفسك', 'أسئلة تقويمية', 'الواجب المنزلي', multiple-choice questions, fill-in-the-blanks), you MUST COMPLETELY IGNORE AND EXCLUDE THEM.",
  "   - Output ONLY the educational explanation, rules, facts, and concepts.",
  "",
  "7. STRICT PROHIBITION OF META-LABELS & CONTENT CLASSIFICATION NOTES (حظر تام لملاحظات التصنيف والتمهيد):",
  "   - STRICTLY FORBIDDEN to write any meta-notes, editorial labels, content type tags, or commentary such as: '[نوع المحتوى: تمهيدي]', '[نوع المحتوى: شرح مفصل]', 'هذا محتوى تمهيدي', 'ملاحظة: هذا شرح', 'هذا تمهيد', 'محتوى تأسيسي', or any remarks describing whether content is introductory or explanatory.",
  "   - Do NOT label or categorize the content. Output the textbook content directly under its headings with ZERO meta-tags and ZERO AI commentary.",
  "",
  "8. LANGUAGE FIDELITY & LATEX FORMULAS:",
  "   - Preserve the exact language of the original curriculum text.",
  "   - Format all mathematical, physical, and chemical equations in standard LaTeX ($$ block, $ inline).",
  "",
  "9. PURE OUTPUT FORMAT:",
  "   - Output pure, clean Markdown directly with NO markdown code block fences (no ```markdown), NO conversational remarks, NO meta-notes, and NO introductory or concluding greetings."
].join("\n");

export async function organizeTextWithDeepSeek(
  rawText: string,
  options: DeepSeekOrganizerOptions
): Promise<string> {
  const rawKey = options.apiKey || process.env.DEEPSEEK_API_KEY || DEFAULT_DEEPSEEK_KEY;
  const cleanKey = rawKey.replace(/^Bearer\s+/i, "").trim();

  if (!rawText || rawText.trim().length === 0) {
    return "";
  }

  const maxRetries = options.maxRetries ?? 8;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const userPrompt = [
        `Subject: ${options.subjectName}`,
        `Grade Level: ${options.gradeLevel}`,
        "",
        "Raw Extracted Textbook Page Text:",
        "---",
        rawText,
        "---",
        "",
        "Structure this textbook page into pure Markdown following all system rules:",
        "1. IGNORE decorative margin footers/headers (e.g. '14 | الوحدة 1...', '286 الوحدة 4...'). On continuation pages and standard explanation pages, start directly with '### [عنوان الفقرة]' or text. NEVER output '# الوحدة' or '## الدرس' from margin footers.",
        "2. On Unit cover pages, write ONLY the Unit header (# الوحدة [الرقم]: [اسم الوحدة الكامل]) as a single line and NOTHING ELSE. Extract the actual Unit title (NOT the lesson title from the index). DO NOT output lesson headers, lesson index lists, or 'نواتج التعلم' / 'أهداف الوحدة'.",
        "3. Declare the full Level 2 header (## الدرس / ## الفصل / ## Lessons) on the opening page of every lesson/chapter. NEVER convert the lesson title into '###'. Introductory concepts or goals go under the '##' header as '###'.",
        "4. Write the COMPLETE explanation text without omission or abbreviation.",
        "5. IGNORE all questions, exercises, drills (أسئلة / تدريبات / اختبر نفسك), and objectives (أهداف الدرس / نواتج التعلم).",
        "6. STRICTLY DO NOT write meta-notes or labels saying this is introductory content or explanation.",
      ].join("\n");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleanKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: DEEPSEEK_RAG_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          stream: false,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || "";

      let cleanContent = content.trim();
      if (cleanContent.startsWith("```markdown")) {
        cleanContent = cleanContent.replace(/^```markdown\s*/, "").replace(/\s*```$/, "");
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      return cleanContent;
    } catch (error: any) {
      const isNetworkError =
        error.name === "AbortError" ||
        error.code === "UND_ERR_CONNECT_TIMEOUT" ||
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT" ||
        error.message?.includes("fetch failed") ||
        error.message?.includes("Timeout");

      const delayMs = Math.min(2000 * Math.pow(1.8, attempt - 1), 30000);

      if (options.onNetworkWait) {
        options.onNetworkWait(attempt, maxRetries, delayMs);
      }

      console.warn(
        `DeepSeek attempt ${attempt}/${maxRetries} (${
          isNetworkError ? "Network timeout/error" : error.message
        }) - Retrying after ${Math.round(delayMs / 1000)}s...`
      );

      if (attempt >= maxRetries) {
        return rawText.trim();
      }

      await new Promise((res) => setTimeout(res, delayMs));
    }
  }

  return rawText.trim();
}
