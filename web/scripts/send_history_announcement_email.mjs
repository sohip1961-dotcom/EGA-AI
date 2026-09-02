import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim();
        if (!process.env[k]) {
          process.env[k] = v;
        }
      }
    }
  });
}

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isBroadcast = args.includes('--broadcast');
const testArg = args.find(a => a.startsWith('--test='));
const testEmail = testArg ? testArg.split('=')[1] : null;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'no-reply@egsaiedu.com';
const SITE_URL = 'https://www.egsaiedu.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Supabase credentials missing in .env.local');
  process.exit(1);
}

if (!RESEND_API_KEY) {
  console.error('Error: RESEND_API_KEY is not defined.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export function getGreetingName(name) {
  if (!name || typeof name !== 'string') return 'يا بطل';
  const clean = name.trim();
  if (['طالب جديد', 'حساب اختباري', 'Test Account', 'just girls', 'mad man'].includes(clean)) {
    return 'يا بطل';
  }
  const firstName = clean.split(/\s+/)[0];
  return firstName || 'يا بطل';
}

export function generateShortEmailHtml(studentName) {
  const greeting = getGreetingName(studentName);
  
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>مفاجأة تانية بكالوريا - منهج التاريخ المصري متاح الآن</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0D1B2A; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; text-align: right; color: #1E2E3D;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0D1B2A; padding: 25px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.3); border: 1px solid #1E2E3D;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0D1B2A 0%, #1E2E3D 100%); padding: 28px 24px; text-align: center; border-bottom: 3px solid #00B4D8;">
              <div style="display: inline-block; padding: 4px 12px; background-color: rgba(0, 180, 216, 0.15); border: 1px solid #00B4D8; border-radius: 20px; color: #00B4D8; font-size: 12px; font-weight: bold; margin-bottom: 12px;">
                منصة EGS AI · السنة الثانية بكالوريا
              </div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 21px; font-weight: 800; line-height: 1.4;">
                أول مناهج البكالوريا نزلت رسمي
              </h1>
              <p style="margin: 8px 0 0 0; color: #FFB703; font-size: 15px; font-weight: 600;">
                منهج التاريخ المصري متاح دلوقتي بالكامل على حسابك!
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px 24px; background-color: #FFFFFF;">
              
              <p style="font-size: 17px; font-weight: bold; color: #0D1B2A; margin: 0 0 14px 0;">
                أهلاً بك ${greeting}،
              </p>
              
              <p style="font-size: 14.5px; line-height: 1.75; color: #334155; margin: 0 0 16px 0;">
                بدأنا رسمياً إطلاق مناهج البكالوريا على منصة <strong>EGS AI</strong>، وأول مادة متوفرة ومفهرسة بالكامل بين إيديك هي <strong>التاريخ المصري</strong> (3 وحدات و 12 درساً مفصلاً).
              </p>

              <!-- Points Box -->
              <div style="background-color: #F8F9FA; border-radius: 10px; padding: 16px 18px; margin-bottom: 20px; border-right: 4px solid #00B4D8;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #0D1B2A;">
                  بدون حفظ أصم ولا توهان بين المذكرات:
                </p>
                <ul style="margin: 0; padding-right: 20px; font-size: 13.5px; line-height: 1.9; color: #475569;">
                  <li><strong>شرح فوري ذكي:</strong> اسأل معلمك الذكي في أي جزئية وهيفهمهالك في ثواني.</li>
                  <li><strong>امتحانات تدريبية:</strong> ولّد امتحانات فورية بنظام الاختيار من متعدد والأسئلة المقالية.</li>
                  <li><strong>بطاقات استذكار (Flashcards):</strong> لتثبيت التواريخ والشخصيات الصعبة بذكاء.</li>
                  <li><strong>لوحة المتصدرين:</strong> حل وتدرب عشان ترفع ترتيبك بين دفعة البكالوريا.</li>
                </ul>
              </div>

              <p style="font-size: 13px; color: #64748B; margin: 0 0 22px 0; line-height: 1.6;">
                * باقي مواد البكالوريا (الفيزياء، الكيمياء، الرياضيات، واللغات) شغالة في الإعداد وهتنزل تباعاً.
              </p>

              <!-- CTA -->
              <div style="text-align: center; margin: 20px 0 15px 0;">
                <a href="${SITE_URL}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #00B4D8 0%, #0096B4 100%); color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: bold; padding: 13px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 180, 216, 0.35);">
                  ادخل وابدأ مذاكرة التاريخ المصري
                </a>
              </div>
              
              <p style="text-align: center; font-size: 12px; color: #94A3B8; margin: 0;">
                ${SITE_URL}
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8F9FA; padding: 16px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; font-size: 12px; color: #64748B;">
                منصة EGS AI التعليمية — رفيقك الذكي في رحلة البكالوريا
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateShortPlainText(studentName) {
  const greeting = getGreetingName(studentName);
  return `أهلاً بك ${greeting}،

بدأنا رسمياً إطلاق مناهج البكالوريا على منصة EGS AI، وأول مادة متوفرة ومفهرسة بالكامل على حسابك دلوقتي هي: منهج التاريخ المصري (3 وحدات و 12 درساً مفصلاً).

بدون حفظ أصم ولا توهان:
- شرح فوري ذكي مع معلمك الذكي على مدار الساعة.
- امتحانات تدريبية فورية بنظام الاختيار من متعدد والمقالي.
- بطاقات استذكار (Flashcards) لتثبيت التواريخ والشخصيات الصعبة.
- تنافس واجمع نقاط في لوحة متصدري دفعة البكالوريا.

باقي المواد في التجهيز وهتنزل تباعاً في الأيام الجاية!

ادخل دلوقتي على حسابك، اختار مادة التاريخ المصري، وابدأ المذاكرة:
${SITE_URL}

فريق عمل منصة EGS AI التعليمية`;
}

async function main() {
  console.log('Fetching students for grade_level: 2_high...');
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name, email, grade_level, role')
    .eq('grade_level', '2_high')
    .eq('role', 'student');

  if (error) {
    console.error('Database query error:', error);
    process.exit(1);
  }

  // Filter out admin or invalid emails
  const validStudents = (profiles || []).filter(p => p.email && p.email.includes('@') && p.email !== 'sohip1961@gmail.com');
  console.log(`Found ${validStudents.length} student(s) in 2_high to contact.`);

  validStudents.forEach((s, idx) => {
    console.log(`  ${idx + 1}. ${s.name} (${s.email})`);
  });

  if (isDryRun) {
    console.log('\n--- SHORT VERSION DRY RUN ---');
    console.log(generateShortPlainText('عمر'));
    return;
  }

  const targets = testEmail ? [{ name: 'تجربة', email: testEmail }] : (isBroadcast ? validStudents : []);

  if (targets.length === 0) {
    console.log('No targets specified. Use --broadcast to send to all students.');
    return;
  }

  console.log(`\nDispatching short emails to ${targets.length} student(s) via Resend API...`);

  let successCount = 0;
  let failCount = 0;

  for (const target of targets) {
    const html = generateShortEmailHtml(target.name);
    const text = generateShortPlainText(target.name);
    const subject = 'مفاجأة تانية بكالوريا.. منهج التاريخ المصري متاح دلوقتي على EGS AI!';

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: `EGS AI <${RESEND_FROM}>`,
          to: target.email.trim(),
          subject,
          html,
          text
        })
      });

      if (res.ok) {
        console.log(`Sent successfully to: ${target.name} <${target.email}>`);
        successCount++;
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.error(`Failed to send to: ${target.email} - Status: ${res.status}:`, errJson);
        failCount++;
      }
    } catch (err) {
      console.error(`Network error sending to ${target.email}:`, err.message);
      failCount++;
    }

    // 250ms delay between emails to adhere to Resend standard rate limits
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  console.log(`\nEmail Dispatch Complete: ${successCount} sent, ${failCount} failed.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
