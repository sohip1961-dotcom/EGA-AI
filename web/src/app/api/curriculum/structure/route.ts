export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { getCurriculumStructure } from '@/lib/curriculum_structure';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gradeLevel = searchParams.get('grade_level');
    const subjectName = searchParams.get('subject_name');

    if (!gradeLevel || !subjectName) {
      return NextResponse.json(
        { error: 'السنة الدراسية واسم المادة مطلوبان' },
        { status: 400 }
      );
    }

    const structure = await getCurriculumStructure(gradeLevel, subjectName);

    return NextResponse.json({
      success: true,
      ...structure
    });
  } catch (error: any) {
    console.error('Curriculum structure API error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب هيكل المنهج الدراسي.' },
      { status: 500 }
    );
  }
}
