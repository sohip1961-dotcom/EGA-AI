import { db } from './db';

export interface CurriculumLesson {
  id: string;
  title: string;
  lessonNumber: number;
  unitTitle?: string;
  unitId?: string;
  subtopics?: string[];
  startPage?: number;
}

export interface CurriculumUnit {
  id: string;
  title: string;
  unitNumber: number;
  startPage?: number;
  lessons: CurriculumLesson[];
}

export interface CurriculumStructureResult {
  hasCurriculum: boolean;
  curriculumId?: string;
  gradeLevel: string;
  subjectName: string;
  units: CurriculumUnit[];
  totalLessons: number;
}

function normalize(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u064B-\u065F\u0670]/g, '') // strip tashkeel
    .replace(/\u0640/g, '')                 // strip tatweel
    .replace(/[أإآٱ]/g, 'ا')                // unify alef variants (preserve standalone hamza 'ء')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[ـ\-_]/g, ' ')
    .replace(/[^\w\u0621-\u064A0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Retrieves the manual curriculum structure for a given grade level and subject name
 */
export async function getCurriculumStructure(
  gradeLevel: string,
  subjectName: string
): Promise<CurriculumStructureResult> {
  const cleanGrade = gradeLevel.trim();
  const cleanSubject = subjectName.trim();

  try {
    const curriculums = await db.getCurriculums();
    const targetCurr = curriculums.find(
      c => c.grade_level === cleanGrade && c.subject_name === cleanSubject
    );

    if (!targetCurr) {
      return {
        hasCurriculum: false,
        gradeLevel: cleanGrade,
        subjectName: cleanSubject,
        units: [],
        totalLessons: 0
      };
    }

    const rawUnits = Array.isArray(targetCurr.units) ? targetCurr.units : [];
    
    // Format and normalize units & lessons
    const units: CurriculumUnit[] = rawUnits.map((u, uIdx) => {
      const unitNumber = u.unitNumber || (uIdx + 1);
      const unitId = u.id || `unit_${unitNumber}`;
      const unitTitle = u.title || `الوحدة ${unitNumber}`;
      const rawLessons = Array.isArray(u.lessons) ? u.lessons : [];

      const lessons: CurriculumLesson[] = rawLessons.map((l, lIdx) => ({
        id: l.id || `lesson_${unitNumber}_${l.lessonNumber || (lIdx + 1)}`,
        title: l.title || `الدرس ${l.lessonNumber || (lIdx + 1)}`,
        lessonNumber: l.lessonNumber || (lIdx + 1),
        unitTitle: unitTitle,
        unitId: unitId,
        subtopics: Array.isArray(l.subtopics) ? l.subtopics : [],
        startPage: l.startPage
      }));

      return {
        id: unitId,
        title: unitTitle,
        unitNumber: unitNumber,
        startPage: u.startPage,
        lessons
      };
    });

    const totalLessons = units.reduce((acc, u) => acc + u.lessons.length, 0);

    return {
      hasCurriculum: true,
      curriculumId: targetCurr.id,
      gradeLevel: cleanGrade,
      subjectName: cleanSubject,
      units,
      totalLessons
    };
  } catch (err) {
    console.error('getCurriculumStructure error:', err);
    return {
      hasCurriculum: false,
      gradeLevel: cleanGrade,
      subjectName: cleanSubject,
      units: [],
      totalLessons: 0
    };
  }
}

/**
 * Retrieves targeted textbook context for a selected lesson or topic to inject into AI prompt
 */
export async function getCurriculumContextForLesson(
  gradeLevel: string,
  subjectName: string,
  lessonTitleOrTopic: string
): Promise<string> {
  if (!lessonTitleOrTopic || !lessonTitleOrTopic.trim()) return '';

  const cleanGrade = gradeLevel.trim();
  const cleanSubject = subjectName.trim();
  const query = lessonTitleOrTopic.trim();

  try {
    const curriculums = await db.getCurriculums();
    const targetCurr = curriculums.find(
      c => c.grade_level === cleanGrade && c.subject_name === cleanSubject
    );

    if (!targetCurr) return '';

    // If query is broad (e.g. 'المنهج بالكامل'), return top summary and content outline
    if (query === 'المنهج بالكامل' || query === 'مراجعة المنهج بالكامل') {
      const summary = await db.getCurriculumSummary(cleanGrade, cleanSubject);
      const detail = await db.getCurriculumDetail(targetCurr.id);
      if (summary && detail?.content) {
        return `ملخص المنهج:\n${summary}\n\nمقتطفات من المنهج:\n${detail.content.slice(0, 6000)}`;
      }
      return detail?.content ? detail.content.slice(0, 7000) : '';
    }

    const normQuery = normalize(query);
    const queryWords = normQuery.split(' ').filter(w => w.length > 2);

    // 1. Try BM25 search over curriculum chunks for targeted sections
    const matchingChildChunks = await db.bm25SearchCurriculum(
      cleanGrade,
      cleanSubject,
      queryWords.length > 0 ? queryWords : [query],
      []
    );

    if (matchingChildChunks && matchingChildChunks.length > 0) {
      const parentIds = [...new Set(
        matchingChildChunks
          .map(c => c.parent_id)
          .filter((id): id is string => !!id)
      )];

      let parentSections: any[] = [];
      if (parentIds.length > 0) {
        parentSections = await db.getParentChunks(parentIds);
      }
      if (parentSections.length === 0) {
        parentSections = matchingChildChunks;
      }

      if (parentSections.length > 0) {
        return parentSections
          .slice(0, 6)
          .map((p, idx) => `--- القسم ${idx + 1}: [${p.heading}] ---\n${p.content}`)
          .join('\n\n')
          .slice(0, 8000);
      }
    }

    // 2. Fallback to detail content section splitting
    const detail = await db.getCurriculumDetail(targetCurr.id);
    if (!detail || !detail.content) return '';

    // Split content into distinct sections by markdown headings
    const rawSections = detail.content.split(/\n(?=#+\s)/);
    
    // Direct section heading match
    const exactMatches = rawSections.filter(sec => {
      const firstLine = sec.split('\n')[0] || '';
      const normHeading = normalize(firstLine);
      return normHeading.includes(normQuery) || normQuery.includes(normHeading);
    });

    if (exactMatches.length > 0) {
      return exactMatches.slice(0, 5).join('\n\n').slice(0, 7000);
    }

    // Keyword relevance match
    const scoredSections = rawSections.map(sec => {
      const firstLine = sec.split('\n')[0] || '';
      const normHeading = normalize(firstLine);
      const normBody = normalize(sec);
      let score = 0;

      for (const word of queryWords) {
        if (normHeading.includes(word)) score += 12;
        if (normBody.includes(word)) score += 3;
      }
      return { section: sec, score };
    });

    scoredSections.sort((a, b) => b.score - a.score);
    const topSections = scoredSections.filter(s => s.score > 0).slice(0, 5);

    if (topSections.length > 0) {
      return topSections.map(s => s.section).join('\n\n').slice(0, 7000);
    }

    return detail.content.slice(0, 6000);
  } catch (err) {
    console.error('getCurriculumContextForLesson error:', err);
    return '';
  }
}
