export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db, CurriculumChunk } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth_helpers';
import { generateEmbeddingBatch, generateCurriculumSummary } from '@/lib/gemini';

// Approximate token counting (zero-dependency, lightweight)
// This handles Arabic/English mix (approximately 1.4 tokens per word)
function countTokens(text: string): number {
  if (!text) return 0;
  const wordCount = text.trim().split(/\s+/).length;
  return Math.ceil(wordCount * 1.4);
}

// ─── Constants ────────────────────────────────────────────────────────────────
// Using token counts (cl100k_base) instead of character counts
const PARENT_MAX_TOKENS = 500;   // ~200 Arabic words per parent section
const CHILD_MAX_TOKENS = 120;    // ~50 Arabic words per child chunk (retrieval unit)
const CHILD_OVERLAP_TOKENS = 24; // ~20% overlap between child chunks

// ─── Helper: Authorize admin ──────────────────────────────────────────────────
async function authorizeAdmin(req: NextRequest): Promise<string | NextResponse> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'غير مصرح للقيام بهذه العملية' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  const userId = verifySessionToken(token);
  if (!userId) {
    return NextResponse.json({ error: 'جلسة العمل منتهية أو غير صالحة' }, { status: 401 });
  }

  const profile = await db.getProfile(userId);
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'صلاحيات غير كافية. هذه العملية للمسؤولين فقط.' }, { status: 403 });
  }

  return userId;
}

// GET list all curriculums (Admin only)
export async function GET(req: NextRequest) {
  const authResult = await authorizeAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const curriculums = await db.getCurriculums();
    return NextResponse.json({ success: true, curriculums });
  } catch (error: any) {
    console.error('Get curriculums error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تحميل المناهج الدراسية.' }, { status: 500 });
  }
}

// POST upload and chunk curriculum (Admin only)
export async function POST(req: NextRequest) {
  const authResult = await authorizeAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const gradeLevel = (formData.get('grade_level') as string | null)?.trim();
    const subjectName = (formData.get('subject_name') as string | null)?.trim();

    if (!file || !gradeLevel || !subjectName) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة (الملف، السنة الدراسية، اسم المادة)' },
        { status: 400 }
      );
    }

    const fileContent = await file.text();
    if (!fileContent.trim()) {
      return NextResponse.json({ error: 'ملف المنهج فارغ!' }, { status: 400 });
    }

    console.log(`[Curriculum Upload] Starting hierarchical chunking for ${subjectName}...`);

    // Step 1: Hierarchical Parent-Child chunking with accurate token counting
    const { parents, children } = chunkMarkdownHierarchical(fileContent);

    if (parents.length === 0) {
      return NextResponse.json({ error: 'تعذر تجزئة الملف. يرجى التأكد من احتوائه على نص صالح.' }, { status: 400 });
    }

    console.log(`[Curriculum Upload] Created ${parents.length} parent chunks, ${children.length} child chunks`);

    // Step 2: Generate embeddings for child chunks (vector retrieval units)
    // Only embed children — parents are used for context after retrieval
    let embeddings: number[][] = [];
    try {
      const childTexts = children.map(c => `${c.heading}\n${c.content}`);
      embeddings = await generateEmbeddingBatch(childTexts);
      console.log(`[Curriculum Upload] Generated ${embeddings.filter(e => e.length > 0).length}/${children.length} embeddings`);
    } catch (embErr) {
      console.error('[Curriculum Upload] Embedding generation failed, continuing without vectors:', embErr);
      embeddings = children.map(() => []);
    }

    // Step 3: Generate curriculum-level summary (for overview queries)
    let summaryContent = '';
    try {
      summaryContent = await generateCurriculumSummary(fileContent);
      console.log('[Curriculum Upload] Curriculum summary generated');
    } catch (sumErr) {
      console.error('[Curriculum Upload] Summary generation failed:', sumErr);
    }

    // Step 4: Assemble all chunks with IDs for DB insertion
    // IDs are pre-assigned here so children can reference parent IDs
    const parentWithIds = parents.map((p, i) => ({
      ...p,
      id: crypto.randomUUID(),
      position_index: i
    }));

    const allChunks: Omit<CurriculumChunk, 'curriculum_id'>[] = [];

    // Add parent chunks (no embedding — they're for context, not retrieval)
    for (const parent of parentWithIds) {
      allChunks.push({
        id: parent.id,
        content: parent.content,
        heading: parent.heading,
        chunk_level: 'parent',
        parent_id: null,
        position_index: parent.position_index,
        embedding: null
      });
    }

    // Add child chunks with embeddings and parent references
    let childGlobalIndex = parents.length;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const parentId = parentWithIds.find(p => p.heading === child.parentHeading)?.id || null;
      allChunks.push({
        id: crypto.randomUUID(),
        content: child.content,
        heading: child.heading,
        chunk_level: 'child',
        parent_id: parentId,
        position_index: childGlobalIndex++,
        embedding: embeddings[i]?.length > 0 ? embeddings[i] : null
      });
    }

    // Add curriculum summary as a special parent chunk (for overview queries)
    if (summaryContent) {
      allChunks.push({
        id: crypto.randomUUID(),
        content: summaryContent,
        heading: '__CURRICULUM_SUMMARY__',
        chunk_level: 'parent',
        parent_id: null,
        position_index: -1, // placed before all others logically
        embedding: null
      });
    }

    // Step 5: Save to DB
    const curriculum = await db.createCurriculum(gradeLevel, subjectName, file.name, allChunks);

    const embeddedCount = embeddings.filter(e => e.length > 0).length;
    return NextResponse.json({
      success: true,
      message: `تم رفع المنهج بنجاح: ${parents.length} قسم رئيسي، ${children.length} وحدة بحث، ${embeddedCount} متجه دلالي.`,
      curriculum,
      stats: {
        parentChunks: parents.length,
        childChunks: children.length,
        embeddingsGenerated: embeddedCount,
        hasSummary: !!summaryContent
      }
    });

  } catch (error: any) {
    console.error('Curriculum upload error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء رفع ومعالجة ملف المنهج.' },
      { status: 500 }
    );
  }
}

// PATCH rename curriculum subject/file name (Admin only)
export async function PATCH(req: NextRequest) {
  const authResult = await authorizeAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id, subject_name, file_name } = await req.json();
    if (!id || !subject_name || !subject_name.trim()) {
      return NextResponse.json({ error: 'معرف المنهج واسم المادة الجديد مطلوبان' }, { status: 400 });
    }

    const updated = await db.renameCurriculum(id, subject_name, file_name);
    if (!updated) {
      return NextResponse.json({ error: 'فشلت إعادة تسمية المنهج' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'تم تحديث اسم المنهج بنجاح', curriculum: updated });

  } catch (error: any) {
    console.error('Rename curriculum error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إعادة تسمية المنهج.' }, { status: 500 });
  }
}

// DELETE curriculum (Admin only)
export async function DELETE(req: NextRequest) {
  const authResult = await authorizeAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'معرف المنهج مطلوب للحذف' }, { status: 400 });
    }

    const success = await db.deleteCurriculum(id);
    if (!success) {
      return NextResponse.json({ error: 'فشل حذف المنهج' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'تم حذف المنهج الدراسي بنجاح' });

  } catch (error: any) {
    console.error('Delete curriculum error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف المنهج.' }, { status: 500 });
  }
}

// ─── Hierarchical Parent-Child Chunker ───────────────────────────────────────
// Stage A: Parse Markdown → Parent chunks (full sections per heading)
// Stage B: Sliding window → Child chunks (small retrieval units)
// Uses gpt-tokenizer (cl100k_base) for accurate Arabic token counting

interface ParentChunk {
  heading: string;
  content: string;
}

interface ChildChunk {
  heading: string;
  content: string;
  parentHeading: string;
}

function chunkMarkdownHierarchical(markdownText: string): {
  parents: ParentChunk[];
  children: ChildChunk[];
} {
  // ─── Stage A: Parse Markdown headings into parent sections ───────────────
  const lines = markdownText.split('\n');
  const rawSections: { heading: string; contentLines: string[] }[] = [];

  let currentHeading = 'مقدمة المنهج';
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (currentLines.join('\n').trim().length > 10) {
        rawSections.push({ heading: currentHeading, contentLines: [...currentLines] });
      }
      currentHeading = headingMatch[2].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  // Save last section
  if (currentLines.join('\n').trim().length > 10) {
    rawSections.push({ heading: currentHeading, contentLines: currentLines });
  }

  // ─── Stage A-2: Split oversized parent sections by token count ────────────
  const parents: ParentChunk[] = [];

  for (const section of rawSections) {
    const fullContent = section.contentLines.join('\n').trim();
    const tokenCount = countTokens(fullContent);

    if (tokenCount <= PARENT_MAX_TOKENS) {
      parents.push({ heading: section.heading, content: fullContent });
    } else {
      // Split by paragraphs when section is too large
      const paragraphs = fullContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      let buffer = '';
      let subIndex = 1;

      for (const para of paragraphs) {
        const testBuffer = buffer ? `${buffer}\n\n${para}` : para;
        if (countTokens(testBuffer) > PARENT_MAX_TOKENS && buffer.trim()) {
          parents.push({
            heading: `${section.heading} (${subIndex++})`,
            content: buffer.trim()
          });
          buffer = para;
        } else {
          buffer = testBuffer;
        }
      }
      if (buffer.trim()) {
        parents.push({
          heading: subIndex > 1 ? `${section.heading} (${subIndex})` : section.heading,
          content: buffer.trim()
        });
      }
    }
  }

  // ─── Stage B: Sliding Window → Child chunks ───────────────────────────────
  // Index on small children, but retrieve their full parent for context
  const children: ChildChunk[] = [];

  for (const parent of parents) {
    const childChunks = createSlidingWindowChunks(
      parent.content,
      parent.heading,
      CHILD_MAX_TOKENS,
      CHILD_OVERLAP_TOKENS
    );
    children.push(...childChunks);
  }

  return { parents, children };
}

// Sliding window chunker using accurate token counts
function createSlidingWindowChunks(
  text: string,
  parentHeading: string,
  maxTokens: number,
  overlapTokens: number
): ChildChunk[] {
  // Split into sentences using Arabic/English sentence boundaries
  const sentences = text
    .split(/(?<=[.!?؟\n])\s+|(?<=[\n])\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length === 0) return [];

  // If the entire text fits in one child chunk, return as-is
  if (countTokens(text) <= maxTokens) {
    return [{
      heading: parentHeading,
      content: text.trim(),
      parentHeading
    }];
  }

  const chunks: ChildChunk[] = [];
  let buffer: string[] = [];
  let bufferTokens = 0;

  for (const sentence of sentences) {
    const sentTokens = countTokens(sentence);

    if (bufferTokens + sentTokens > maxTokens && buffer.length > 0) {
      // Emit current buffer as a child chunk
      chunks.push({
        heading: parentHeading,
        content: buffer.join(' ').trim(),
        parentHeading
      });

      // Keep overlap: remove sentences from front until within overlap budget
      while (buffer.length > 0 && bufferTokens > overlapTokens) {
        const removed = buffer.shift()!;
        bufferTokens -= countTokens(removed);
      }
    }

    buffer.push(sentence);
    bufferTokens += sentTokens;
  }

  // Emit remaining buffer
  if (buffer.length > 0 && buffer.join(' ').trim().length > 5) {
    chunks.push({
      heading: parentHeading,
      content: buffer.join(' ').trim(),
      parentHeading
    });
  }

  return chunks.length > 0 ? chunks : [{
    heading: parentHeading,
    content: text.trim(),
    parentHeading
  }];
}
