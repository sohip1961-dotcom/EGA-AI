export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db, CurriculumChunk, ChatMode, applyRRF } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth_helpers';
import { generateChatResponseStream } from '@/lib/deepseek';
import {
  analyzeQueryIntelligence,
  generateEmbedding,
  assessContextGap,
  classifyEngagement,
  QueryIntelligence
} from '@/lib/gemini';
import { runHybridTriFusionRetrieval } from '@/lib/hybrid_retriever';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_MODES: ChatMode[] = ['socratic', 'detailed', 'summary'];

function parseMessage(msg: string): { cleanText: string; imageDesc?: string; imageBase64?: string; imageMime?: string } {
  let cleanText = msg || '';
  let imageDesc: string | undefined;
  let imageBase64: string | undefined;
  let imageMime: string | undefined;

  if (cleanText.startsWith('[IMAGE_MESSAGE:')) {
    const closingBracketIndex = cleanText.indexOf(']');
    if (closingBracketIndex !== -1) {
      const prefix = cleanText.substring(15, closingBracketIndex);
      const parts = prefix.split(';');
      imageMime = parts[0] || 'image/jpeg';
      imageBase64 = parts[1] || '';
      if (parts[2]) {
        try {
          imageDesc = decodeURIComponent(parts[2]);
        } catch (e) {
          imageDesc = parts[2];
        }
      }
      cleanText = cleanText.substring(closingBracketIndex + 1);
    }
  }

  return { cleanText, imageDesc, imageBase64, imageMime };
}

function isConversationalGreeting(text: string): boolean {
  if (!text) return false;
  const clean = text
    .replace(/[؟?!.،,;:~`!@#$%^&*()_+\-=\[\]{}'"]/g, ' ')
    .trim()
    .toLowerCase();
  if (!clean || clean.length > 60) return false;

  const exactGreetings = new Set([
    'سلام', 'سلام عليكم', 'السلام عليكم', 'وعليكم السلام', 'أهلا', 'اهلا', 'مرحبا', 'مرحباً',
    'هاي', 'هلو', 'صباح الخير', 'مساء الخير', 'صباح النور', 'مساء النور', 'صباح الورد', 'مساء الورد',
    'ازيك', 'ازي حضرتك', 'إزيك', 'عامل ايه', 'اخبارك', 'أخبارك', 'شخبارك', 'تمام', 'الحمد لله',
    'مين انت', 'أنت مين', 'انت مين', 'مين حضرتك', 'عرفني بنفسك', 'بتعمل ايه', 'تقدر تساعدني ازاي',
    'شكرا', 'شكراً', 'تسلم', 'جزاك الله خير', 'جزاك الله خيرا', 'ألف شكر', 'مشكور',
    'عاوز اذاكر', 'عايز اذاكر', 'ممكن تساعدني', 'محتاج مساعدة', 'يلا نذاكر', 'ابدأ معايا',
    'يا مستر', 'يا استاذ', 'يا باشا', 'يا دكتور', 'يا بشمهندس'
  ]);

  if (exactGreetings.has(clean)) return true;

  const greetingPrefixes = [
    'ازيك', 'إزيك', 'السلام عليكم', 'سلام عليكم', 'صباح الخير', 'مساء الخير', 'أهلا', 'اهلا', 'مرحبا'
  ];
  return greetingPrefixes.some(p => clean.startsWith(p) && clean.length < 30);
}

async function analyzeImageWithEdenAI(base64: string, mimeType: string): Promise<string> {
  const EDENAI_API_KEY = process.env.EDENAI_API_KEY || '';
  if (!EDENAI_API_KEY || !base64) return '';

  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType || 'image/jpeg' });

    const formData = new FormData();
    formData.append('providers', 'google');
    formData.append('fallback_providers', 'openai');
    formData.append('file', blob, `image.${(mimeType || 'image/jpeg').split('/')[1] || 'jpg'}`);
    formData.append(
      'question',
      'اقرأ هذه الصورة بالتفصيل واكتب وصفاً شاملاً ومفصلاً لها باللغة العربية، بما في ذلك أي نصوص أو أسئلة أو مسائل أو معادلات رياضية أو فيزيائية أو كيميائية أو جداول أو رسوم توضيحية بداخلها بدقة بالغة واكتب النصوص والمسائل كما هي حرفياً.'
    );

    const response = await fetch('https://api.edenai.run/v2/image/question_answer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EDENAI_API_KEY}`
      },
      body: formData
    });

    if (!response.ok) {
      console.error('EdenAI VQA in chat error:', response.status);
      return '';
    }

    const data = await response.json();
    const googleAnswers = data?.google?.answers;
    const openaiAnswers = data?.openai?.answers;

    return (googleAnswers && googleAnswers.length > 0 ? googleAnswers[0] : null) || 
           (openaiAnswers && openaiAnswers.length > 0 ? openaiAnswers[0] : null) || 
           data?.google?.answer || 
           data?.openai?.answer || 
           '';
  } catch (err) {
    console.error('Error analyzing image in chat:', err);
    return '';
  }
}

function buildPromptText(cleanText: string, imageDesc?: string): string {
  let text = cleanText;
  if (imageDesc) {
    text = `[وصف الصورة المرفقة من الطالب: ${imageDesc}]\n\nالسؤال: ${text}`;
  }
  return text;
}

function buildHierarchicalContextString(parentChunks: CurriculumChunk[], childChunks: CurriculumChunk[] = []): string {
  if (parentChunks.length === 0) return '';
  return parentChunks
    .map((parent, index) => {
      return `--- القسم ${index + 1}: [${parent.heading}] ---\n` +
             `محتوى الدرس:\n${parent.content}\n` +
             `-----------------------------------------`;
    })
    .join('\n\n');
}

// ─── Main POST Handler ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    let { message, grade_level, subject_name, session_id, history, model, thinking, mode } = await req.json();
    if (grade_level) grade_level = grade_level.trim();
    if (subject_name) subject_name = subject_name.trim();

    const selectedModel = model === 'pro' ? 'pro' : 'flash';
    const isThinkingEnabled = !!thinking;
    const chatMode: ChatMode = VALID_MODES.includes(mode) ? mode : 'detailed';

    if (!message || !subject_name) {
      return NextResponse.json(
        { error: 'حقل الرسالة واسم المادة مطلوبان' },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get('Authorization');
    const deviceIdHeader = req.headers.get('x-device-id');

    let userId: string | null = null;
    let deviceId: string | null = deviceIdHeader || null;
    let profile: any = null;
    let targetGrade = '';
    let plan = 'free';
    let coins = 0.0;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      userId = verifySessionToken(token);
      if (userId) {
        const sessionCheck = await db.validateUserSessionDevice(userId, token, deviceId || undefined);
        if (!sessionCheck.valid) {
          return NextResponse.json(
            {
              error: 'device_session_revoked',
              code: 'device_session_revoked',
              message: 'تم تسجيل الخروج لأن هذا الحساب تم تسجيل الدخول إليه من جهاز آخر أو تجاوز الحد المسموح للأجهزة (3 أجهزة).'
            },
            { status: 401 }
          );
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'login_required', message: 'تسجيل الدخول مطلوب لاستخدام EGS AI.' },
        { status: 401 }
      );
    }

    profile = await db.getProfile(userId);
    if (!profile) {
      return NextResponse.json(
        { error: 'user_not_found', code: 'user_not_found', message: 'لم يتم العثور على حساب المستخدم أو تم حذفه.' },
        { status: 401 }
      );
    }

    plan = profile.plan_type || 'free';
    coins = profile.coins === undefined ? 0.0 : profile.coins;
    targetGrade = profile.grade_level?.trim();

    const hasUnlimitedCredit = profile.role === 'admin' || !!profile.unlimited_credit;
    if (!hasUnlimitedCredit && coins <= 0) {
      const isSubscribed = plan && plan !== 'free' && profile.subscription_status === 'active';
      return NextResponse.json({
        error: 'limit_reached',
        plan: plan,
        message: isSubscribed
          ? 'لقد استنفدت رصيد النقاط المتاح لك لهذا اليوم. سيتجدد رصيدك تلقائياً غداً.'
          : 'لقد استنفدت رصيدك التجريبي المجاني. اشترك الآن في إحدى باقات Pro لمتابعة المذاكرة والتفوق!'
      }, { status: 429 });
    }

    if (!targetGrade) {
      return NextResponse.json(
        { error: 'grade_level_required', message: 'السنة الدراسية مطلوبة لتحديد المنهج المناسب.' },
        { status: 400 }
      );
    }

    // Verify curriculum exists
    const allCurriculums = await db.getCurriculums();
    const targetCurr = allCurriculums.find(c => c.grade_level === targetGrade && c.subject_name === subject_name);
    if (!targetCurr) {
      return NextResponse.json({
        error: 'course_unavailable',
        message: 'المنهج الدراسي غير متوفر حالياً. (The course is unavailable.)'
      }, { status: 400 });
    }

    // Resolve or auto-create Chat Session
    let activeSessionId = session_id;
    if (userId) {
      if (!activeSessionId) {
        const title = message.length > 35 ? message.substring(0, 35) + '...' : message;
        const newSession = await db.createChatSession(title, subject_name, targetGrade, userId, undefined, chatMode);
        activeSessionId = newSession.id;
      } else {
        const existingSession = await db.getChatSession(activeSessionId);
        if (existingSession && (existingSession.mode || 'detailed') !== chatMode) {
          await db.updateChatSessionMode(activeSessionId, chatMode);
        }
      }
    } else {
      activeSessionId = session_id || 'guest-session';
    }

    let isCurriculumActive = false;
    try {
      const activeCurrsRaw = await db.getSystemSetting('active_curriculum_ids');
      if (activeCurrsRaw) {
        const activeIds = JSON.parse(activeCurrsRaw);
        isCurriculumActive = activeIds.includes(targetCurr.id);
      } else {
        isCurriculumActive = true;
      }
    } catch (e) {
      isCurriculumActive = true;
    }

    const { cleanText, imageDesc: initialImageDesc, imageBase64, imageMime } = parseMessage(message);
    let promptText = buildPromptText(cleanText, initialImageDesc);

    // Save user message before streaming
    if (userId) {
      await db.addChatMessage('user', message, userId, undefined, activeSessionId);
    }
    if (!userId && deviceId) {
      await db.incrementDeviceGuestCount(deviceId);
    }

    // Fetch recent message history
    let recentHistory: any[] = [];
    if (userId) {
      const rawHistory = await db.getChatHistory(undefined, undefined, activeSessionId);
      recentHistory = rawHistory
        .slice(-6)
        .map(h => {
          const { cleanText: hText, imageDesc: histDesc } = parseMessage(h.message);
          return {
            sender: h.sender,
            message: buildPromptText(hText, histDesc)
          };
        });
    } else if (history) {
      recentHistory = history.map((h: any) => {
        const { cleanText: hText, imageDesc: histDesc } = parseMessage(h.message || '');
        return {
          sender: h.sender,
          message: buildPromptText(hText, histDesc)
        };
      });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        function emitSearchStep(step: string, icon: string, msg: string) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'search_step', step, icon, message: msg })}\n\n`
          ));
        }

        try {
          // ─── IN-STREAM IMAGE ANALYSIS (if attached) ─────────────────────
          if (imageBase64) {
            emitSearchStep('image_analysis', '🔍', 'تحليل الصورة');
            let desc = initialImageDesc;
            if (!desc) {
              desc = await analyzeImageWithEdenAI(imageBase64, imageMime || 'image/jpeg');
              if (userId) {
                try {
                  await db.deductCoins(userId, null, 0.5);
                } catch (deductErr) {
                  console.error('Coin deduction error:', deductErr);
                }
              }
            }
            if (desc) {
              promptText = buildPromptText(cleanText, desc);
            }
          }

          // ─── PHASE 1: Build RAG Context ─────────────────────────────────
          let ragContext = '';

          if (!imageBase64 && isConversationalGreeting(cleanText)) {
            emitSearchStep('greeting', '✨', 'أهلاً بك يا بطل...');
            const studentGreetingName = profile?.name && profile.name !== 'طالب جديد' ? profile.name : 'يا بطل';
            ragContext = `أنت في محادثة ترحيبية افتتاحية مع الطالب (${studentGreetingName}).
1. رحب بالطالب بلهجة مصرية تعليمية ودودة ومهذبة للغاية وبطاقة إيجابية عالية ("يا بطل" أو "يا دكتورة").
2. عرف بنفسك باختصار شديد بأنك معلمه ومساعده الذكي في مادة "${subject_name}".
3. وضّح له أنك جاهز لمساعدته في: شرح أي درس بالتفصيل، حل أصعب المسائل والتدريبات خطوة بخطوة، أو توليد اختبارات تدريبية سريعة.
4. اقترح عليه البدء فوراً بسؤال محدد أو مسألة يواجه صعوبة فيها، أو مراجعة أول درس في المنهج.
5. استثناء حاسم: يمنع منعاً باتاً إصدار أي تنبيه بأن المعلومة خارج المنهج للتحيات والترحيب.`;
          } else if (isCurriculumActive) {
            emitSearchStep('analyzing', '🧠', 'أحلل سؤالك...');

            let intelligence: QueryIntelligence = {
              queryType: 'direct',
              arabicKeywords: promptText.replace(/[؟?!.،,]/g, '').split(/\s+/).filter(w => w.length > 2).slice(0, 6),
              englishKeywords: [] as string[],
              hydePassage: promptText,
              searchAnnouncement: `سأبحث الآن في منهج ${subject_name}...`
            };

            try {
              intelligence = await analyzeQueryIntelligence(promptText, subject_name, targetGrade);
            } catch (intellErr) {
              console.error('Query intelligence failed, using fallback:', intellErr);
            }

            let activeGrade = targetGrade;
            let activeSubject = subject_name;

            if (intelligence.metadata?.gradeLevel || intelligence.metadata?.subject) {
              const routerGrade = intelligence.metadata.gradeLevel || targetGrade;
              const routerSubject = intelligence.metadata.subject || subject_name;
              
              const routerCurr = allCurriculums.find(c => c.grade_level === routerGrade && c.subject_name === routerSubject);
              if (routerCurr) {
                activeGrade = routerGrade;
                activeSubject = routerSubject;
                emitSearchStep('routing', '🗺️', `تم توجيه البحث تلقائياً إلى منهج: ${activeSubject}`);
              }
            }

            emitSearchStep('searching', '🔍', intelligence.searchAnnouncement);
            emitSearchStep('graph_traversal', '🕸️', 'استكشاف شبكة المفاهيم والعلاقات الأكاديمية (GraphRAG)...');

            const hydeEmbedding = await generateEmbedding(intelligence.hydePassage).catch(e => {
              console.error('HyDE embedding failed:', e);
              return [] as number[];
            });

            emitSearchStep('fusion', '⚡', 'دمج وتصنيف أفضل نتائج البحث (Tri-Fusion RRF)...');

            const retrievalResult = await runHybridTriFusionRetrieval(
              activeGrade,
              activeSubject,
              promptText,
              hydeEmbedding,
              [...intelligence.arabicKeywords, ...intelligence.englishKeywords],
              {
                topK: 8,
                rrfK: 60,
                weightVector: 1.0,
                weightBM25: 1.0,
                weightGraph: 0.85
              }
            );

            let contextChunks = retrievalResult.parentChunks;
            let fusedChildChunks = retrievalResult.childChunks;
            ragContext = retrievalResult.formattedContext;

            if (intelligence.queryType === 'overview') {
              emitSearchStep('summary', '📚', 'سأستعرض محتوى المنهج الشامل...');
              const [summary, outline] = await Promise.all([
                db.getCurriculumSummary(activeGrade, activeSubject),
                db.getFullCurriculumOutline(activeGrade, activeSubject)
              ]);
              let overviewPrefix = '';
              if (summary) {
                overviewPrefix += `ملخص المنهج الشامل:\n${summary}\n\n`;
              }
              if (outline.length > 0) {
                overviewPrefix += `محاور المنهج الدراسي:\n${outline.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n\n`;
              }
              ragContext = overviewPrefix + ragContext;
            } else if (contextChunks.length < 3) {
              emitSearchStep('assessing', '📊', 'أتحقق من كفاية المعلومات المسترجعة...');
              try {
                const gap = await assessContextGap(promptText, ragContext);
                if (!gap.sufficient && gap.missingTopics.length > 0) {
                  for (const topic of gap.missingTopics.slice(0, 2)) {
                    emitSearchStep('followup', '🔍', `سأبحث أيضاً عن: ${topic}`);
                    try {
                      const extraResult = await runHybridTriFusionRetrieval(
                        activeGrade,
                        activeSubject,
                        topic,
                        [],
                        [topic],
                        { topK: 3 }
                      );
                      const existingIds = new Set(contextChunks.map(c => c.id));
                      const newChunks = extraResult.parentChunks.filter(c => !existingIds.has(c.id));
                      if (newChunks.length > 0) {
                        contextChunks.push(...newChunks);
                        fusedChildChunks.push(...extraResult.childChunks);
                        ragContext += `\n\n` + extraResult.formattedContext;
                      }
                    } catch (extraErr) {
                      console.error(`Round 2 search for "${topic}" failed:`, extraErr);
                    }
                  }
                }
              } catch (gapErr) {
                console.error('Gap analysis notice:', gapErr);
              }
            }

            const foundCount = contextChunks.length;
            const entityCount = retrievalResult.subgraph.entities.length;
            emitSearchStep(
              'found',
              '✅',
              entityCount > 0
                ? `وجدت ${foundCount} ${foundCount === 1 ? 'قسماً' : 'أقسام'} و ${entityCount} ${entityCount === 1 ? 'مفهوماً مرتبطاً' : 'مفاهيم مرتبطة'}`
                : `وجدت ${foundCount} ${foundCount === 1 ? 'قسماً' : 'أقسام'} ذات صلة من المنهج`
            );

            if (!ragContext.trim()) {
              ragContext = 'لا يوجد ملف منهج دراسي مرفوع حالياً لهذه المادة والسنة الدراسية. يجب عليك تنبيه الطالب بأن هذه المعلومة خارج المنهج المقرر في بداية إجابتك.';
            }
          }

          const finalContext = ragContext || 'لا يوجد ملف منهج دراسي مرفوع حالياً لهذه المادة والسنة الدراسية. يجب عليك تنبيه الطالب بأن هذه المعلومة خارج المنهج المقرر في بداية إجابتك.';
          const finalPromptText = promptText;

          // ─── PHASE 2: Real-time Streaming Generation with DeepSeek ─────────
          const deepseekRes = await generateChatResponseStream(
            finalPromptText,
            finalContext,
            recentHistory,
            selectedModel === 'pro' ? 'deepseek-v4-pro' : 'deepseek-v4-flash',
            isThinkingEnabled,
            chatMode
          );

          if (!deepseekRes.ok) {
            const errorText = await deepseekRes.text();
            console.error('DeepSeek stream error:', errorText);
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: 'فشل الاتصال بمزود الذكاء الاصطناعي.' })}\n\n`
            ));
            controller.close();
            return;
          }

          const reader = deepseekRes.body?.getReader();
          const decoder = new TextDecoder('utf-8');
          if (!reader) { controller.close(); return; }

          let fullThought = '';
          let fullContent = '';
          const thoughtStartTime = Date.now();
          let promptTokens = 0;
          let completionTokens = 0;
          let streamBuffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            streamBuffer += decoder.decode(value, { stream: true });
            const lines = streamBuffer.split('\n');
            streamBuffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              if (trimmed.startsWith('data: ')) {
                const dataStr = trimmed.slice(6);
                if (dataStr === '[DONE]') break;

                try {
                  const parsed = JSON.parse(dataStr);

                  if (parsed.usage) {
                    promptTokens = parsed.usage.prompt_tokens || 0;
                    completionTokens = parsed.usage.completion_tokens || 0;
                  }

                  const delta = parsed.choices?.[0]?.delta;
                  if (!delta) continue;

                  if (delta.reasoning_content) {
                    fullThought += delta.reasoning_content;
                    controller.enqueue(encoder.encode(
                      `data: ${JSON.stringify({ type: 'thought', content: delta.reasoning_content })}\n\n`
                    ));
                  } else if (delta.content) {
                    fullContent += delta.content;
                    controller.enqueue(encoder.encode(
                      `data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`
                    ));
                  }
                } catch (e) {}
              }
            }
          }

          const thoughtDuration = (Date.now() - thoughtStartTime) / 1000;
          const finalDuration = thoughtDuration > 0 ? thoughtDuration : 0;
          const combinedMessage = fullThought
            ? `<thought duration="${Math.round(finalDuration)}">${fullThought}</thought>${fullContent}`
            : fullContent;

          // Compute usage & coins
          let egpCost = 0;
          if (selectedModel === 'pro') {
            egpCost = (promptTokens / 1000000) * 150 + (completionTokens / 1000000) * 200;
          } else {
            egpCost = (promptTokens / 1000000) * 30 + (completionTokens / 1000000) * 50;
          }
          const coinsCost = egpCost * 10.0;

          const remainingCoins = await db.deductCoins(userId, deviceId, coinsCost);

          if (userId) {
            await db.addChatMessage('ai', combinedMessage, userId, undefined, activeSessionId, coinsCost);
          }

          let pointsAwarded = 0;
          let totalPoints: number | undefined = undefined;

          if (userId && activeSessionId) {
            try {
              const session = await db.getChatSession(activeSessionId);
              if (session && !session.engagement_points_awarded) {
                const isEngaged = await classifyEngagement(promptText, fullContent);
                if (isEngaged) {
                  pointsAwarded = 3;
                  totalPoints = await db.addPoints(userId, 3);
                  await db.updateChatSessionEngagement(activeSessionId);
                }
              }
            } catch (err) {
              console.error('Error evaluating engagement points in chat:', err);
            }
          }

          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'done',
              session_id: activeSessionId,
              duration: finalDuration,
              coins_used: coinsCost,
              remaining_coins: remainingCoins,
              points_awarded: pointsAwarded,
              total_points: totalPoints
            })}\n\n`
          ));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

        } catch (err: any) {
          console.error('Chat stream exception:', err);
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: 'حدث خطأ غير متوقع أثناء معالجة الرد.' })}\n\n`
          ));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });

  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء معالجة الطلب.' },
      { status: 500 }
    );
  }
}