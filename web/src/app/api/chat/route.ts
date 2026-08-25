export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db, CurriculumChunk, ChatMode, applyRRF } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth_helpers';
import { generateChatResponseStream, validateResponseAgainstContext, generateStrictRewriteStream } from '@/lib/deepseek';
import {
  analyzeQueryIntelligence,
  generateEmbedding,
  assessContextGap,
  classifyEngagement,
  QueryIntelligence
} from '@/lib/gemini';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_MODES: ChatMode[] = ['socratic', 'detailed', 'summary'];

function parseMessage(msg: string): { cleanText: string; imageDesc?: string } {
  let cleanText = msg || '';
  let imageDesc: string | undefined;

  // Extract and strip image prefix if present
  if (cleanText.startsWith('[IMAGE_MESSAGE:')) {
    const closingBracketIndex = cleanText.indexOf(']');
    if (closingBracketIndex !== -1) {
      const prefix = cleanText.substring(15, closingBracketIndex); // mimeType;base64Data;encodedDescription
      const parts = prefix.split(';');
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

  return { cleanText, imageDesc };
}

function buildPromptText(cleanText: string, imageDesc?: string): string {
  let text = cleanText;
  if (imageDesc) {
    text = `[وصف الصورة المرفقة من الطالب: ${imageDesc}]\n\nالسؤال: ${text}`;
  }
  return text;
}

function buildContextString(chunks: CurriculumChunk[]): string {
  if (chunks.length === 0) return '';
  return chunks
    .map((c, i) => `--- القسم ${i + 1}: [${c.heading}] ---\n${c.content}`)
    .join('\n\n');
}

function buildHierarchicalContextString(parentChunks: CurriculumChunk[], childChunks: CurriculumChunk[]): string {
  if (parentChunks.length === 0) return '';
  return parentChunks
    .map((parent, index) => {
      const matchedChildren = childChunks.filter(c => c.parent_id === parent.id);
      const childHighlights = matchedChildren.map(c => `  - جزء مطابق دقيق: ${c.content}`).join('\n');
      
      return `--- القسم ${index + 1}: [${parent.heading}] ---\n` +
             `محتوى الدرس الكامل:\n${parent.content}\n` +
             (matchedChildren.length > 0 ? `\nمطابقات الجمل المحددة:\n${childHighlights}\n` : '') +
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

    // Auth: Bearer token (registered) or x-device-id (guest)
    const authHeader = req.headers.get('Authorization');
    const deviceIdHeader = req.headers.get('x-device-id');

    let userId: string | null = null;
    let deviceId: string | null = deviceIdHeader || null;
    let profile: any = null;
    let targetGrade = '';
    let plan = 'free';
    let coins = 50.0;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      userId = verifySessionToken(token);
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
        { error: 'user_not_found', message: 'لم يتم العثور على حساب المستخدم.' },
        { status: 404 }
      );
    }

    plan = profile.plan_type || 'free';
    coins = profile.coins === undefined ? 50.0 : profile.coins;
    targetGrade = profile.grade_level?.trim();

    // Pro model + Thinking features unlocked for registered accounts.

    // Check coins (unlimited for admins / unlimited_credit accounts)
    const hasUnlimitedCredit = profile.role === 'admin' || !!profile.unlimited_credit;
    if (!hasUnlimitedCredit && coins <= 0) {
      return NextResponse.json({
        error: 'limit_reached',
        plan: plan,
        message: 'لقد استنفدت رصيد النقاط المتاح لك لهذا اليوم. سيتجدد رصيدك تلقائياً غداً.'
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
        // Keep the stored mode in sync so reopening the conversation restores it
        const existingSession = await db.getChatSession(activeSessionId);
        if (existingSession && (existingSession.mode || 'detailed') !== chatMode) {
          await db.updateChatSessionMode(activeSessionId, chatMode);
        }
      }
    } else {
      activeSessionId = session_id || 'guest-session';
    }

    // Check if curriculum is active/published
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

    const { cleanText: promptText, imageDesc } = parseMessage(message);

    // ─── v2 Parallel RAG Pipeline ─────────────────────────────────────────────
    // Default context for no curriculum case
    let context = 'لا يوجد ملف منهج دراسي مرفوع حالياً لهذه المادة والسنة الدراسية. يجب عليك تنبيه الطالب بأن هذه المعلومة خارج المنهج المقرر في بداية إجابتك.';
    const searchStepsLog: Array<{ step: string; icon: string; message: string }> = [];

    // Save user message before streaming
    if (userId) {
      await db.addChatMessage('user', message, userId, undefined, activeSessionId);
    }
    if (!userId && deviceId) {
      await db.incrementDeviceGuestCount(deviceId);
    }

    // Fetch message history for context
    let recentHistory: any[] = [];
    if (userId) {
      const rawHistory = await db.getChatHistory(undefined, undefined, activeSessionId);
      recentHistory = rawHistory
        .slice(-6)
        .map(h => {
          const { cleanText, imageDesc: histDesc } = parseMessage(h.message);
          return {
            sender: h.sender,
            message: buildPromptText(cleanText, histDesc)
          };
        });
    } else if (history) {
      recentHistory = history.map((h: any) => {
        const { cleanText, imageDesc: histDesc } = parseMessage(h.message || '');
        return {
          sender: h.sender,
          message: buildPromptText(cleanText, histDesc)
        };
      });
    }

    // We build the RAG context BEFORE starting the AI stream
    // This is done by building the stream controller that first emits search steps,
    // then starts the DeepSeek stream with the real context.

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        function emitSearchStep(step: string, icon: string, msg: string) {
          searchStepsLog.push({ step, icon, message: msg });
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'search_step', step, icon, message: msg })}\n\n`
          ));
        }

        try {
          // ─── PHASE 1: Build RAG Context ─────────────────────────────────
          let ragContext = '';

          if (isCurriculumActive) {
            // Step 1: ONE Gemini call for full intelligence (query analysis + HyDE)
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

            // Dynamic Curriculum Router
            let activeGrade = targetGrade;
            let activeSubject = subject_name;

            if (intelligence.metadata?.gradeLevel || intelligence.metadata?.subject) {
              const routerGrade = intelligence.metadata.gradeLevel || targetGrade;
              const routerSubject = intelligence.metadata.subject || subject_name;
              
              const routerCurr = allCurriculums.find(c => c.grade_level === routerGrade && c.subject_name === routerSubject);
              if (routerCurr) {
                activeGrade = routerGrade;
                activeSubject = routerSubject;
                emitSearchStep('routing', '🗺️', `تم توجيه البحث تلقائياً إلى منهج: ${activeSubject} (${activeGrade === '3_high' ? 'الصف الثالث الثانوي' : activeGrade})`);
              }
            }

            emitSearchStep('searching', '🔍', intelligence.searchAnnouncement);

            // Step 2: PARALLEL — Embed HyDE + BM25 search simultaneously
            const [hydeEmbedding, bm25Chunks] = await Promise.all([
              generateEmbedding(intelligence.hydePassage).catch(e => {
                console.error('HyDE embedding failed:', e);
                return [] as number[];
              }),
              db.bm25SearchCurriculum(activeGrade, activeSubject, intelligence.arabicKeywords, intelligence.englishKeywords)
            ]);

            // Step 3: Vector search with HyDE embedding
            let vectorChunks: CurriculumChunk[] = [];
            if (hydeEmbedding.length > 0) {
              try {
                vectorChunks = await db.vectorSearchCurriculum(activeGrade, activeSubject, hydeEmbedding);
              } catch (vecErr) {
                console.error('Vector search failed, using BM25 only:', vecErr);
              }
            }

            // Step 4: RRF fusion (k=60) with metadata boosting for unit/chapter
            const scores = new Map<string, { chunk: CurriculumChunk; score: number }>();
            
            vectorChunks.forEach((chunk, rank) => {
              const score = 1 / (60 + rank + 1);
              scores.set(chunk.id, { chunk, score });
            });
            
            bm25Chunks.forEach((chunk, rank) => {
              const score = 1 / (60 + rank + 1);
              const existing = scores.get(chunk.id);
              scores.set(chunk.id, { chunk, score: (existing?.score || 0) + score });
            });
            
            if (intelligence.metadata?.unit || intelligence.metadata?.chapter) {
              const unitTerm = intelligence.metadata.unit?.trim().toLowerCase();
              const chapterTerm = intelligence.metadata.chapter?.trim().toLowerCase();
              
              for (const [id, item] of scores.entries()) {
                const heading = (item.chunk.heading || '').toLowerCase();
                let boost = 1.0;
                if (unitTerm && heading.includes(unitTerm)) boost += 1.5;
                if (chapterTerm && heading.includes(chapterTerm)) boost += 1.5;
                if (boost > 1.0) {
                  item.score = item.score * boost;
                }
              }
            }

            const fusedChildChunks = Array.from(scores.values())
              .sort((a, b) => b.score - a.score)
              .map(({ chunk }) => chunk)
              .slice(0, 8);

            // Step 5: Expand child chunks → fetch their parent chunks (full sections for context)
            let contextChunks: CurriculumChunk[] = [];
            const parentIds = [...new Set(
              fusedChildChunks
                .map(c => c.parent_id)
                .filter((id): id is string => !!id)
            )];

            if (parentIds.length > 0) {
              contextChunks = await db.getParentChunks(parentIds);
            }

            // If no children (old data without hierarchy), use BM25 results directly
            if (contextChunks.length === 0 && fusedChildChunks.length > 0) {
              contextChunks = fusedChildChunks;
            }

            // Step 6: Query-type routing
            if (intelligence.queryType === 'overview') {
              emitSearchStep('summary', '📚', 'سأستعرض محتوى المنهج الكامل...');
              const [summary, outline] = await Promise.all([
                db.getCurriculumSummary(activeGrade, activeSubject),
                db.getFullCurriculumOutline(activeGrade, activeSubject)
              ]);
              if (summary) {
                ragContext = `ملخص المنهج الشامل:\n${summary}\n\n`;
              }
              if (outline.length > 0) {
                ragContext += `محاور المنهج الدراسي:\n${outline.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n\n`;
              }
              ragContext += buildHierarchicalContextString(contextChunks.slice(0, 4), fusedChildChunks);

            } else if (intelligence.queryType === 'direct' && contextChunks.length >= 3) {
              // Direct query with good results: skip gap analysis entirely
              ragContext = buildHierarchicalContextString(contextChunks.slice(0, 8), fusedChildChunks);

            } else {
              // Inferential/problem_solving or thin results: conditional gap analysis
              ragContext = buildHierarchicalContextString(contextChunks.slice(0, 8), fusedChildChunks);

              if (contextChunks.length < 3) {
                emitSearchStep('assessing', '📊', 'أتحقق من كفاية المعلومات المسترجعة...');

                try {
                  const gap = await assessContextGap(promptText, ragContext);

                  if (!gap.sufficient && gap.missingTopics.length > 0) {
                    for (const topic of gap.missingTopics.slice(0, 2)) {
                      emitSearchStep('followup', '🔍', `سأبحث أيضاً عن: ${topic}`);
                      try {
                        const extraChunks = await db.bm25SearchCurriculum(
                          activeGrade, activeSubject, [topic], [topic]
                        );
                        // Add new results, deduplicate
                        const existingIds = new Set(contextChunks.map(c => c.id));
                        const newChunks = extraChunks.filter(c => !existingIds.has(c.id));
                        contextChunks.push(...newChunks.slice(0, 3));
                        fusedChildChunks.push(...extraChunks.slice(0, 3));
                      } catch (extraErr) {
                        console.error(`Round 2 search for "${topic}" failed:`, extraErr);
                      }
                    }
                    ragContext = buildHierarchicalContextString(contextChunks.slice(0, 8), fusedChildChunks);
                  }

                  if (!gap.sufficient && contextChunks.length < 2) {
                    emitSearchStep('summary', '📚', 'سأراجع ملخص المنهج الكامل...');
                    const summary = await db.getCurriculumSummary(activeGrade, activeSubject);
                    if (summary) {
                      ragContext = `ملخص المنهج:\n${summary}\n\n${ragContext}`;
                    }
                  }
                } catch (gapErr) {
                  console.error('Gap analysis failed, continuing with available context:', gapErr);
                }
              }
            }

            // Final search result announcement
            const foundCount = contextChunks.length;
            emitSearchStep('found', '✅', `وجدت ${foundCount} ${foundCount === 1 ? 'قسماً' : 'أقسام'} ذات صلة من المنهج`);

            if (!ragContext.trim()) {
              ragContext = 'لا يوجد ملف منهج دراسي مرفوع حالياً لهذه المادة والسنة الدراسية. يجب عليك تنبيه الطالب بأن هذه المعلومة خارج المنهج المقرر في بداية إجابتك.';
            }
            context = ragContext;
          }

          const finalPromptText = buildPromptText(promptText, imageDesc);

          // ─── PHASE 2: Generate Answer with DeepSeek (streaming) ───────────
          // Re-fetch DeepSeek stream with the actual RAG context
          const deepseekRes2 = await generateChatResponseStream(
            finalPromptText,
            context,
            recentHistory,
            selectedModel === 'pro' ? 'deepseek-v4-pro' : 'deepseek-v4-flash',
            isThinkingEnabled,
            chatMode
          );

          if (!deepseekRes2.ok) {
            const errorText = await deepseekRes2.text();
            console.error('DeepSeek stream error:', errorText);
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: 'فشل الاتصال بمزود الذكاء الاصطناعي.' })}\n\n`
            ));
            controller.close();
            return;
          }

          const reader = deepseekRes2.body?.getReader();
          const decoder = new TextDecoder('utf-8');
          if (!reader) { controller.close(); return; }

          let fullThought = '';
          let fullContent = '';
          const thoughtStartTime = Date.now();
          let thoughtDuration = 0;
          let streamBuffer = '';
          let promptTokens = 0;
          let completionTokens = 0;

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
                  } else if (delta.content) {
                    fullContent += delta.content;
                  }
                } catch (e) {
                  // Ignore partial JSON parse errors
                }
              }
            }
          }

          // Fact verification step
          emitSearchStep('verifying', '🛡️', 'أتحقق من دقة وموثوقية الإجابة...');
          const validation = await validateResponseAgainstContext(fullContent, context);

          let finalThought = fullThought;
          let finalContent = fullContent;
          let isRewritten = false;

          if (!validation.isValid) {
            emitSearchStep('rewriting', '⚠️', 'أعيد صياغة الإجابة لتتطابق تماماً مع كتابك المدرسي...');
            const rewriteRes = await generateStrictRewriteStream(
              fullContent,
              context,
              recentHistory,
              selectedModel === 'pro' ? 'deepseek-v4-pro' : 'deepseek-v4-flash',
              isThinkingEnabled,
              chatMode
            );

            if (rewriteRes.ok) {
              isRewritten = true;
              const rewriteReader = rewriteRes.body?.getReader();
              if (rewriteReader) {
                let rewriteBuffer = '';
                finalThought = '';
                finalContent = '';

                while (true) {
                  const { done, value } = await rewriteReader.read();
                  if (done) break;

                  rewriteBuffer += decoder.decode(value, { stream: true });
                  const lines = rewriteBuffer.split('\n');
                  rewriteBuffer = lines.pop() || '';

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
                        if (delta) {
                          if (delta.reasoning_content) {
                            finalThought += delta.reasoning_content;
                            controller.enqueue(encoder.encode(
                              `data: ${JSON.stringify({ type: 'thought', content: delta.reasoning_content })}\n\n`
                            ));
                          } else if (delta.content) {
                            finalContent += delta.content;
                            controller.enqueue(encoder.encode(
                              `data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`
                            ));
                          }
                        }
                      } catch (e) {}
                    }
                  }
                }
              }
            }
          }

          if (!isRewritten) {
            // Stream the valid response from the buffer with typewriter speed delay
            if (finalThought) {
              const chunkSize = 25;
              for (let i = 0; i < finalThought.length; i += chunkSize) {
                const chunk = finalThought.slice(i, i + chunkSize);
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ type: 'thought', content: chunk })}\n\n`
                ));
                await new Promise(resolve => setTimeout(resolve, 5));
              }
            }

            if (finalContent) {
              const chunkSize = 40;
              for (let i = 0; i < finalContent.length; i += chunkSize) {
                const chunk = finalContent.slice(i, i + chunkSize);
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`
                ));
                await new Promise(resolve => setTimeout(resolve, 8));
              }
            }
          }

          thoughtDuration = (Date.now() - thoughtStartTime) / 1000;
          const finalDuration = thoughtDuration > 0 ? thoughtDuration : 0;
          const combinedMessage = finalThought
            ? `<thought duration="${Math.round(finalDuration)}">${finalThought}</thought>${finalContent}`
            : finalContent;

          // Coin cost calculation
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
                const isEngaged = await classifyEngagement(message, combinedMessage);
                if (isEngaged) {
                  pointsAwarded = 3;
                  totalPoints = await db.addPoints(userId, 3);
                  await db.updateChatSessionEngagement(activeSessionId);
                }
              }
            } catch (pErr) {
              console.error('Error classifying engagement points:', pErr);
            }
          }

          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'done',
              session_id: activeSessionId,
              duration: Math.round(finalDuration),
              coins_used: Number(coinsCost.toFixed(4)),
              remaining_coins: Number(remainingCoins.toFixed(2)),
              points_awarded: pointsAwarded,
              total_points: totalPoints
            })}\n\n`
          ));

        } catch (err) {
          console.error('Error during RAG stream:', err);
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: 'حدث خطأ أثناء بث الإجابة.' })}\n\n`
          ));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع أثناء معالجة رسالتك. يرجى المحاولة لاحقاً.' },
      { status: 500 }
    );
  }
}
