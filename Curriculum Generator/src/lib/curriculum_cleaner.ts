/**
 * Curriculum Markdown Sanitizer and Deduplicator
 * Cleans multi-page OCR & LLM-generated curriculum Markdown by:
 * 1. Ensuring Unit covers contain ONLY the Unit number and name (# الوحدة [الرقم]: [الاسم] / # Unit [Num]: [Title]).
 * 2. Normalizing unit numbers sequentially (1, 2, 3, 4...) and fixing OCR-corrupted numbers (e.g. 13 -> 1).
 * 3. Stripping out all unit cover clutter (lesson index lists, learning outcomes 'نواتج التعلم', objectives).
 * 4. Deduplicating Unit (#) and Lesson (##) headers across continuation pages.
 * 5. Rejecting false unit headers generated from decorative margin running headers/footers.
 * 6. Stripping out non-instructional clutter (Objectives, Competencies, Cross-cutting concepts).
 */

const NUMBER_WORDS: Record<string, number> = {
  'الاولى': 1, 'الأولى': 1, 'الاول': 1, 'الأول': 1, '1': 1, '١': 1,
  'الثانية': 2, 'الثاني': 2, '2': 2, '٢': 2,
  'الثالثة': 3, 'الثالث': 3, '3': 3, '٣': 3,
  'الرابعة': 4, 'الرابع': 4, '4': 4, '٤': 4,
  'الخامسة': 5, 'الخامس': 5, '5': 5, '٥': 5,
  'السادسة': 6, 'السادس': 6, '6': 6, '٦': 6,
  'السابعة': 7, 'السابع': 7, '7': 7, '٧': 7,
  'الثامنة': 8, 'الثامن': 8, '8': 8, '٨': 8,
  'التاسعة': 9, 'التاسع': 9, '9': 9, '٩': 9,
  'العاشرة': 10, 'العاشر': 10, '10': 10, '١٠': 10,
  'الحادية عشرة': 11, 'الحادي عشر': 11, '11': 11, '١١': 11,
  'الثانية عشرة': 12, 'الثاني عشر': 12, '12': 12, '١٢': 12,
  'الثالثة عشرة': 13, 'الثالث عشر': 13, '13': 13, '١٣': 13,
  'الرابعة عشرة': 14, 'الرابع عشر': 14, '14': 14, '١٤': 14,
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10
};

function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u064B-\u065F\u0670]/g, '') // strip tashkeel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ـ\-_]/g, ' ')
    .replace(/[^\w\u0621-\u064A\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function extractUnitInfo(headingText: string): { isEnglish: boolean; number: number | null; title: string } {
  const isEnglish = /^Unit\b/i.test(headingText.trim());
  const match = headingText.match(/(?:الوحدة|Unit)\s*[:\s\-]*([^\s:]+)?\s*[:\-\s]*(.*)/i);
  if (!match) return { isEnglish, number: null, title: headingText.trim() };

  const numToken = (match[1] || '').toLowerCase().replace(/[:\-]/g, '').trim();
  let num: number | null = NUMBER_WORDS[numToken] ?? (parseInt(numToken, 10) || null);
  if (num !== null && num > 8) {
    const firstDigit = parseInt(String(num)[0], 10);
    num = (firstDigit >= 1 && firstDigit <= 8) ? firstDigit : null;
  }
  let title = (match[2] || '').replace(/^[:\-\s]+/, '').trim();
  title = title.replace(/^\[(?:(?:عنوان الوحدة|Unit Title)(?:\s*-\s*)?)?([^\]]+)\]$/, '$1').trim();
  title = title.replace(/^Unit\s+(One|Two|Three|Four|Five|Six|[0-9]+)\s*[:\-]?\s*/i, '').trim();
  title = title.replace(/^(?:عنوان الوحدة|غير محدد في الصفحة|غير محددة في الصفحة|unit title|unit one|unit two|unit three|unit four|unit five|unit six)$/i, '').trim();
  return { isEnglish, number: num, title };
}

function extractLessonInfo(headingText: string): { number: number | null; title: string; prefix: string } {
  const match = headingText.match(/(?:الدرس(?:ان|ين)?|الفصل|الموضوع|Lessons?|Chapters?|نص(?:\s+استماع|\s+قراءة|\s+شعري|\s+نثري)?)\s*[:\s\-]*([^\s:]+)?\s*[:\-\s]*(.*)/i);
  if (!match) return { number: null, title: headingText.trim(), prefix: 'الدرس' };
  
  const leadMatch = headingText.match(/^(?:الدرس(?:ان|ين)?|الفصل|الموضوع|Lessons?|Chapters?|نص(?:\s+استماع|\s+قراءة|\s+شعري|\s+نثري)?)/i);
  const prefix = leadMatch ? leadMatch[0] : 'الدرس';
  
  const numToken = (match[1] || '').toLowerCase().replace(/[:\-]/g, '').trim();
  const num = NUMBER_WORDS[numToken] ?? (parseInt(numToken, 10) || null);
  let title = (match[2] || '').replace(/^[:\-\s]+/, '').trim();
  title = title.replace(/^\[(?:(?:عنوان الدرس|عنوان الفصل|Lesson Title|Chapter Title)(?:\s*-\s*)?)?([^\]]+)\]$/, '$1').trim();
  return { number: num, title, prefix };
}

function isSameUnitTitle(titleA: string | null, titleB: string | null): boolean {
  if (!titleA || !titleB) return false;
  const a = normalizeText(titleA);
  const b = normalizeText(titleB);
  if (a === b) return true;
  if (a.length >= 6 && b.length >= 6) {
    if (a.includes(b) || b.includes(a)) return true;
  }
  return false;
}

function isSubtopicOrMargin(title: string): boolean {
  if (!title) return true;
  const norm = normalizeText(title);
  if (norm.length <= 1) return true;
  return false;
}

export function cleanAndDeduplicateCurriculumMarkdown(rawMarkdown: string): string {
  if (!rawMarkdown) return '';

  const lines = rawMarkdown.split('\n');
  const resultLines: string[] = [];

  let currentUnitNum: number | null = null;
  let currentUnitTitle: string | null = null;

  let currentLessonNum: number | null = null;
  let currentLessonTitleNorm: string | null = null;

  let skipUntilNextHeading = false;
  let isInsideUnitCover = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for curriculum top-level header (# منهج ...)
    if (trimmed.startsWith('# منهج')) {
      resultLines.push(line);
      continue;
    }

    // Check for section clutter headings to skip (Objectives, Skills & Values, Cross-cutting concepts)
    if (
      trimmed.match(/^#{1,4}\s*(أهداف الدرس|أهداف الوحدة|نواتج التعلم|مخرجات التعلم|الأهداف التعليمية|المهارات والقيم والقضايا المتضمنة|المفاهيم المتقاطعة|تهيئة الدرس|Learning Outcomes)/i)
    ) {
      skipUntilNextHeading = true;
      continue;
    }

    // Stop skipping when we hit a new major markdown heading or page break
    if (skipUntilNextHeading) {
      if (trimmed.startsWith('#') || trimmed.startsWith('<!-- بداية الصفحة')) {
        skipUntilNextHeading = false;
      } else {
        continue;
      }
    }

    // Skip content type meta-labels
    if (trimmed.match(/^\[(نوع المحتوى|Content Type):.+\]$/i)) {
      continue;
    }

    // Handle Lesson Header FIRST (so #, ##, ###, #### with Lesson/Chapter/Topic/Text is always parsed as Lesson)
    const lessonMatch = trimmed.match(/^#{1,4}\s*(?:(الدرس(?:ان|ين)?|Lesson|Lessons|الفصل|Chapter|Chapters|الموضوع|نص\s+(?:استماع|قراءة|شعري|نثري))[:\s\-].*)$/i);
    if (lessonMatch) {
      isInsideUnitCover = false;
      const fullHeading = lessonMatch[0].replace(/^#{1,4}\s*/, '').trim();
      const { number: lNum, title: lTitle, prefix } = extractLessonInfo(fullHeading);
      const normLTitle = normalizeText(lTitle);

      // If duplicate of active lesson in this unit
      if (lNum !== null && lNum === currentLessonNum && normLTitle && normLTitle === currentLessonTitleNorm) {
        continue;
      }

      currentLessonNum = lNum;
      currentLessonTitleNorm = normLTitle || `${prefix} ${lNum || ''}`.trim();
      resultLines.push(`## ${fullHeading}`);
      continue;
    }

    // Handle Unit Header: # الوحدة ... OR # Unit ... (any heading level promoted to #)
    const unitMatch = trimmed.match(/^#{1,4}\s*(?:(الوحدة|Unit)[:\s\-].*)$/i);
    if (unitMatch) {
      const fullHeading = unitMatch[0].replace(/^#{1,4}\s*/, '').trim();
      const { isEnglish, number: uNum, title: uTitle } = extractUnitInfo(fullHeading);

      // If unit has no explicit number OR is grammar/subtopic: demote to H3
      if (uNum === null || isSubtopicOrMargin(uTitle)) {
        if (uTitle) resultLines.push(`### ${uTitle || fullHeading}`);
        continue;
      }

      if (currentUnitTitle && isSameUnitTitle(currentUnitTitle, uTitle)) {
        continue; // Duplicate margin of same unit
      }

      // If unit number is explicitly <= currentUnitNum: ignore duplicate margin footer
      if (currentUnitNum !== null && uNum <= currentUnitNum) {
        continue;
      }

      // Valid new unit
      currentUnitNum = uNum;
      currentUnitTitle = uTitle || (isEnglish ? `Unit ${currentUnitNum}` : `الوحدة ${currentUnitNum}`);
      currentLessonNum = null;
      currentLessonTitleNorm = null;
      isInsideUnitCover = true;

      const prefix = isEnglish ? '# Unit ' : '# الوحدة ';
      const cleanUnitHeading = uTitle ? `${prefix}${currentUnitNum}: ${uTitle}` : `${prefix}${currentUnitNum}`;
      resultLines.push(cleanUnitHeading);
      continue;
    }

    // Handle Major Curriculum Divisions (# قسم النحو والصرف / # القصة المقررة / # Grammar / # Story)
    const divisionMatch = trimmed.match(/^#{1,4}\s+((?:قسم|القصة|Story|Reader|Grammar)\b.*)$/i);
    if (divisionMatch) {
      isInsideUnitCover = false;
      currentLessonNum = null;
      currentLessonTitleNorm = null;
      const fullDiv = divisionMatch[0].replace(/^#{1,4}\s*/, '').trim();
      resultLines.push(`# ${fullDiv}`);
      continue;
    }

    // If inside unit cover, strip lesson index lines & learning outcome bullet items
    if (isInsideUnitCover) {
      if (trimmed.startsWith('#')) {
        isInsideUnitCover = false;
      } else if (
        trimmed.match(/^(?:الدرس\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|السادس|[0-9]+)|Lesson\s+[0-9]+|نواتج التعلم|أهداف|في نهاية هذه الوحدة|Learning Outcomes|[0-9]+\.\s+)/i)
      ) {
        continue;
      }
    }

    // Handle generic H2 that is not a lesson (demote to H3)
    const genericH2Match = trimmed.match(/^##\s+(.+)$/);
    if (genericH2Match) {
      isInsideUnitCover = false;
      const subHeading = genericH2Match[1].trim();
      const normSub = normalizeText(subHeading);

      if (currentLessonTitleNorm && normSub.length > 3 && (currentLessonTitleNorm === normSub || currentLessonTitleNorm.includes(normSub))) {
        continue;
      }

      resultLines.push(`### ${subHeading}`);
      continue;
    }

    // Handle stray single '#' that is not Unit or Curriculum (demote to H3)
    const genericH1Match = trimmed.match(/^#\s+(.+)$/);
    if (genericH1Match) {
      isInsideUnitCover = false;
      resultLines.push(`### ${genericH1Match[1].trim()}`);
      continue;
    }

    // Handle stray H3 that is just the unit title repeated as margin header
    const genericH3Match = trimmed.match(/^###\s+(.+)$/);
    if (genericH3Match) {
      const subHeading = genericH3Match[1].trim();
      if (
        (currentUnitTitle && isSameUnitTitle(currentUnitTitle, subHeading)) &&
        !subHeading.includes('نشاط') && !subHeading.includes('قانون') && !subHeading.includes('تجربة')
      ) {
        continue;
      }
    }

    resultLines.push(line);
  }

  // Clean up excessive blank lines
  let cleaned = resultLines.join('\n');
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

  return cleaned.trim();
}

