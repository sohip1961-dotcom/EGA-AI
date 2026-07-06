import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth_helpers';

// Helper: Authorize admin
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

// GET curriculum details & reconstructed content
export async function GET(req: NextRequest) {
  const authResult = await authorizeAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المنهج مطلوب' }, { status: 400 });
    }

    const detail = await db.getCurriculumDetail(id);
    if (!detail) {
      return NextResponse.json({ error: 'المنهج غير موجود' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      curriculum: detail.curriculum,
      content: detail.content
    });

  } catch (error: any) {
    console.error('Get curriculum detail error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تحميل تفاصيل المنهج الدراسي.' }, { status: 500 });
  }
}

// POST update curriculum Markdown content
export async function POST(req: NextRequest) {
  const authResult = await authorizeAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id, grade_level, subject_name, content } = await req.json();

    if (!id || !grade_level || !subject_name || content === undefined) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة (المعرف، السنة الدراسية، اسم المادة، المحتوى)' },
        { status: 400 }
      );
    }

    if (!content.trim()) {
      return NextResponse.json({ error: 'المحتوى لا يمكن أن يكون فارغاً' }, { status: 400 });
    }

    // Chunk the Markdown content
    const chunks = chunkMarkdown(content);

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'تعذر تجزئة الملف. يرجى التأكد من احتوائه على نص صالح.' }, { status: 400 });
    }

    // Update in DB
    const success = await db.updateCurriculumContent(id, grade_level, subject_name, chunks);

    if (!success) {
      return NextResponse.json({ error: 'فشل تحديث محتوى المنهج' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'تم تحديث المنهج الدراسي وإعادة فهرسته بالكامل بنجاح.'
    });

  } catch (error: any) {
    console.error('Update curriculum content error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديث ومعالجة المنهج الدراسي.' },
      { status: 500 }
    );
  }
}

// Chunker Logic (matches /api/admin/curriculum/route.ts chunkMarkdown)
function chunkMarkdown(markdownText: string): { heading: string; content: string }[] {
  const lines = markdownText.split('\n');
  const chunks: { heading: string; content: string }[] = [];

  let currentHeading = 'مقدمة المنهج';
  let currentContentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)$/);

    if (match) {
      if (currentContentLines.length > 0) {
        const content = currentContentLines.join('\n').trim();
        if (content.length > 10) {
          chunks.push({ heading: currentHeading, content });
        }
        currentContentLines = [];
      }
      currentHeading = match[2].trim();
    } else {
      currentContentLines.push(line);
    }
  }

  if (currentContentLines.length > 0) {
    const content = currentContentLines.join('\n').trim();
    if (content.length > 10) {
      chunks.push({ heading: currentHeading, content });
    }
  }

  const finalChunks: { heading: string; content: string }[] = [];
  for (const chunk of chunks) {
    if (chunk.content.length <= 1500) {
      finalChunks.push(chunk);
    } else {
      const paragraphs = chunk.content.split(/\n\s*\n/);
      let subChunkContent = '';
      let subIndex = 1;

      for (const paragraph of paragraphs) {
        if (subChunkContent.length + paragraph.length > 1200) {
          if (subChunkContent.trim()) {
            finalChunks.push({
              heading: `${chunk.heading} (جزء ${subIndex++})`,
              content: subChunkContent.trim()
            });
          }
          subChunkContent = paragraph;
        } else {
          subChunkContent += (subChunkContent ? '\n\n' : '') + paragraph;
        }
      }
      if (subChunkContent.trim()) {
        finalChunks.push({
          heading: `${chunk.heading} (جزء ${subIndex++})`,
          content: subChunkContent.trim()
        });
      }
    }
  }

  return finalChunks;
}
