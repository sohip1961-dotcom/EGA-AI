export interface DeepSeekOrganizerOptions {
  apiKey?: string;
  subjectName: string;
  gradeLevel: string;
  maxRetries?: number;
  onNetworkWait?: (attempt: number, maxRetries: number, delayMs: number) => void;
}

const DEFAULT_DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";

export const DEEPSEEK_RAG_SYSTEM_PROMPT = [
  "You are the Principal Curriculum Engineering and Structuring Engine for EGS AI (RAG Optimization).",
  "Your task is to transform raw OCR extracted textbook page text into a high-precision, clean, fully detailed Markdown document optimized for semantic search and AI tutoring.",
  "",
  "### STRICT GUIDELINES & RULES:",
  "",
  "1. LANGUAGE FIDELITY (CRITICAL):",
  "   - Preserve the exact language of the original curriculum text. If the source is in Arabic, write in Arabic. If in English, write in English. If in French/German, write in that language.",
  "   - Never translate content unless the source text explicitly teaches a vocabulary/translation lesson.",
  "",
  "2. UNIT & LESSON START ANNOUNCEMENTS (EXPLICIT HIERARCHY):",
  "   - Prominently declare the start of units and lessons using standard Markdown headings:",
  "     * Unit Start / Header: '# الوحدة [رقم الوحدة]: [عنوان الوحدة]' (or '# Unit [Number]: [Title]')",
  "     * Lesson Start / Header: '## الدرس [رقم الدرس]: [عنوان الدرس]' (or '## Lesson [Number]: [Title]')",
  "     * Subtopics / Concepts: '### [Concept / Subtopic Title]'",
  "   - If a page is a Unit cover or introduction, declare the unit number and title clearly.",
  "",
  "3. ZERO SUMMARIZATION & 100% CONTENT RETENTION:",
  "   - STRICTLY FORBIDDEN to summarize, abbreviate, or omit any explanations, examples, scientific details, or definitions.",
  "   - Retain 100% of the instructional text, definitions, scientific reasoning (علل / بما تفسر), experiments, observations (خد بالك / ملحوظة هامة), and explanations exactly as written in the textbook.",
  "",
  "4. EXCLUSIVE ELIMINATION OF UNANSWERED EXERCISES & CLUTTER:",
  "   - Remove ONLY: end-of-lesson homework questions without answers, blank test sheets, dotted answer lines, exercise checklists, publisher phone numbers, and non-instructional copyright text.",
  "   - Keep 100% of the educational content.",
  "",
  "5. SCIENTIFIC & MATHEMATICAL FORMULAS (LATEX):",
  "   - Format all mathematical, physical, and chemical equations in standard LaTeX:",
  "     * Block equations: $$ [equation] $$ (e.g. $$ E = mc^2 $$ or $$ \\text{الكثافة} = \\frac{\\text{الكتلة}}{\\text{الحجم}} $$)",
  "     * Inline variables and short formulas: $ [symbol] $ or \\( [symbol] \\)",
  "",
  "6. CONTENT TYPE METADATA TAGS:",
  "   - Place concise metadata tags at the beginning of key instructional blocks in the source language:",
  "     * [نوع المحتوى: تمهيدي] (or [Content Type: Introductory]) for intros.",
  "     * [نوع المحتوى: تأسيسي] (or [Content Type: Foundational]) for core definitions.",
  "     * [نوع المحتوى: قانون وقاعدة] (or [Content Type: Law/Formula]) for scientific laws/theorems.",
  "     * [نوع المحتوى: شرح مفصل] (or [Content Type: Detailed Explanation]) for experiments and deep dives.",
  "",
  "7. SUBJECT-SPECIFIC STRUCTURING:",
  "   - Languages: Separate '### قاعدة النحو: [اسم القاعدة]' / '### Grammar Rule: [Name]', '### المفردات واللغويات' (vocabulary tables), and '### نصوص القراءة والاستماع'.",
  "   - Social Studies: Clearly separate '## أولاً: الجغرافيا - [اسم الدرس]' and '## ثانياً: التاريخ - [اسم الدرس]'.",
  "",
  "8. PURE OUTPUT FORMAT:",
  "   - Output pure, clean Markdown directly with NO markdown code block fences (no ```markdown), NO introductory conversational remarks, and NO concluding greetings."
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
        "Structure this textbook page into pure Markdown following all system rules. Keep the exact source language, retain 100% of instructional details, announce Units (#) and Lessons (##), and format formulas in LaTeX.",
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
