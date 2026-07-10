import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const EDENAI_API_KEY = process.env.EDENAI_API_KEY || '';
const EDENAI_BASE = 'https://api.edenai.run/v2';

export async function POST(req: NextRequest) {
  try {
    const { base64, mimeType } = await req.json();

    if (!base64) {
      return NextResponse.json(
        { error: 'بيانات الصورة مطلوبة' },
        { status: 400 }
      );
    }

    if (!EDENAI_API_KEY) {
      return NextResponse.json(
        { error: 'مفتاح API الخاص بـ EdenAI غير مهيأ' },
        { status: 500 }
      );
    }

    // Convert base64 to binary bytes
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType || 'image/jpeg' });

    // Build FormData for EdenAI VQA API
    const formData = new FormData();
    formData.append('providers', 'google');
    formData.append('fallback_providers', 'openai');
    formData.append('file', blob, `image.${(mimeType || 'image/jpeg').split('/')[1] || 'jpg'}`);
    formData.append(
      'question',
      'اقرأ هذه الصورة بالتفصيل واكتب وصفاً شاملاً ومفصلاً لها باللغة العربية، بما في ذلك أي نصوص أو معادلات رياضية أو فيزيائية أو كيميائية أو جداول أو رسوم توضيحية بداخلها بدقة بالغة وكتابتها حرفياً.'
    );

    const response = await fetch(`${EDENAI_BASE}/image/question_answer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EDENAI_API_KEY}`
      },
      body: formData
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('EdenAI VQA error:', response.status, errText);
      return NextResponse.json(
        { error: `فشل تحليل الصورة من مزود الخدمة: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // EdenAI response is standardized: data.google.answer or data.openai.answer
    const description = data?.google?.answer || data?.openai?.answer || '';

    if (!description) {
      console.error('EdenAI response structure empty:', JSON.stringify(data));
      
      // Let's see if we can find any status fail/error message in the response
      const googleErr = data?.google?.error?.message;
      const openaiErr = data?.openai?.error?.message;
      const errMsg = googleErr || openaiErr || 'لم يتم إرجاع وصف للصورة';
      
      return NextResponse.json(
        { error: errMsg },
        { status: 500 }
      );
    }

    return NextResponse.json({ description });
  } catch (error: any) {
    console.error('Upload Image route error:', error);
    return NextResponse.json(
      { error: error.message || 'حدث خطأ غير متوقع أثناء معالجة الصورة.' },
      { status: 500 }
    );
  }
}
