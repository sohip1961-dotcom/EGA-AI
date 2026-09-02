'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  BookOpen,
  Brain,
  Zap,
  Send,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Lightbulb,
  FileText,
  Trophy,
  GraduationCap,
  CreditCard,
  Layers
} from 'lucide-react';

export type TourScreen = 'chat' | 'exams' | 'flashcards' | 'leaderboard' | 'subscriptions';

export interface TourStep {
  targetId?: string;
  title: string;
  badge?: string;
  badgeIcon?: React.ReactNode;
  content: string | React.ReactNode;
  hint?: string;
  position?: 'top' | 'bottom' | 'center' | 'left' | 'right';
  actionButtonText?: string;
  actionButtonIcon?: React.ReactNode;
  onEnter?: () => void;
  onAction?: () => void;
  subSteps?: {
    title: string;
    badge: string;
    badgeIcon?: React.ReactNode;
    content: string | React.ReactNode;
    targetId?: string;
    actionText?: string;
  }[];
}

interface AppTourProps {
  screen: TourScreen;
  isOpen: boolean;
  onClose: (completed: boolean) => void;
  currentSubject?: string;
  onSelectSubjectPrompt?: () => void;
  onPrefillPrompt?: (text: string) => void;
  onSubmitTourMessage?: () => void;
  isMobile?: boolean;
}

export function AppTour({
  screen,
  isOpen,
  onClose,
  currentSubject = '',
  onSelectSubjectPrompt,
  onPrefillPrompt,
  onSubmitTourMessage,
  isMobile = false
}: AppTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [subStepIndex, setSubStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Define screen tours with authentic Egyptian Arabic explanations
  const getScreenSteps = useCallback((): TourStep[] => {
    const subjectName = currentSubject || 'المادة اللي هتختارها';

    switch (screen) {
      case 'chat':
        return [
          {
            targetId: 'tour-chat-hero',
            title: 'يلا ناخد جولة سريعة في المنصة!',
            badge: 'مرحباً بك في EGS AI',
            badgeIcon: <Sparkles size={14} />,
            position: 'center',
            content: (
              <div className="tour-content-body">
                <p>
                  أهلاً بيك يا بطل في <strong>EGS AI</strong>! دي شاشة الدردشة والمذاكرة الذكية، هنا تقدر تسأل الذكاء الاصطناعي أي سؤال ييجي في بالك، يشرحلك أي درس مش فاهمه بالتفصيل، أو يحل معاك أصعب المسائل والتمارين خطوة بخطوة من كتاب الوزارة.
                </p>
                <div className="tour-highlight-box">
                  <Lightbulb size={16} className="tour-highlight-icon" />
                  <span>الذكاء الاصطناعي متدرب بالكامل على مناهجك المصرية ومخصص لمرحلتك الدراسية!</span>
                </div>
              </div>
            ),
            actionButtonText: 'يلا نبدأ الخطوات'
          },
          {
            targetId: 'tour-subject-selector',
            title: '2. اختيار المادة الدراسية',
            badge: 'خطوة أساسية',
            badgeIcon: <BookOpen size={14} />,
            position: 'bottom',
            content: (
              <div className="tour-content-body">
                <p>
                  أول وأهم خطوة لازم تعملها: <strong>حدد المادة اللي عايز تذاكرها دلوقتي</strong> من شريط المواد قدامك!
                </p>
                <p>
                  بمجرد ما تختار المادة، الذكاء الاصطناعي بيظبط كل إجاباته وشروحه على منهج وقوانين المادة دي بالظبط.
                </p>
                <div className="tour-highlight-box">
                  <GraduationCap size={16} className="tour-highlight-icon" />
                  <span>{currentSubject ? `أنت دلوقتي محدد: (${currentSubject}) - تقدر تبدلها في أي وقت بنقرة واحدة.` : 'اضغط على أي مادة من المواد المقررة عليك للمتابعة!'}</span>
                </div>
              </div>
            ),
            actionButtonText: currentSubject ? 'تأكيد المادة والمتابعة' : 'اختر مادة للمتابعة'
          },
          {
            targetId: 'tour-composer-dock',
            title: '3. صندوق السؤال وخيارات الذكاء الاصطناعي',
            badge: 'التحكم الذكي',
            badgeIcon: <Brain size={14} />,
            position: isMobile ? 'top' : 'top',
            content: null,
            subSteps: [
              {
                title: 'كتبنالك رسالة جاهزة للتجربة!',
                badge: '1 من 4: صندوق الكتابة',
                badgeIcon: <FileText size={14} />,
                targetId: 'tour-composer-dock',
                content: (
                  <div className="tour-content-body">
                    <p>
                      كتبنالك تلقائياً رسالة تجريبية في صندوق السؤال: 
                      <br />
                      <strong style={{ color: 'var(--primary-color)', display: 'inline-block', marginTop: '6px' }}>
                        «اشرحلي بالتفصيل وبأمثلة واضحة أول درس في منهج {subjectName}»
                      </strong>
                    </p>
                    <p>
                      تقدر في أي وقت تعدل الرسالة، أو تكتب أي سؤال يخطر في بالك، أو تضغط على أيقونة الكاميرا لإرفاق صورة مسألة من كتابك.
                    </p>
                  </div>
                ),
                actionText: 'التالي: أنماط الشرح والتفكير'
              },
              {
                title: 'ميزة التفكير العميق وأنماط الشرح',
                badge: '2 من 4: التفكير العميق',
                badgeIcon: <Brain size={14} />,
                targetId: 'tour-thinking-controls',
                content: (
                  <div className="tour-content-body">
                    <p>
                      تحت مربع السؤال عندك تحكّم قوي جداً:
                    </p>
                    <ul className="tour-features-list">
                      <li>
                        <strong>تفكير عميق (Deep Thinking):</strong> فعّله لما تكون المسألة صعبة أو محتاجة خطوات رياضية واستنتاج، وهيخلي الذكاء الاصطناعي يفكر خطوة بخطوة ويوضح خطوات تفكيره قبل الإجابة.
                      </li>
                      <li>
                        <strong>نمط الشرح:</strong> اختار بين (شرح مفصل شامل، أو أسلوب سقراطي تفاعلي يسألك ويناقشك، أو ملخص سريع ينجزك).
                      </li>
                    </ul>
                  </div>
                ),
                actionText: 'التالي: اختيار النموذج الذكي'
              },
              {
                title: 'نماذج الذكاء الاصطناعي والفرق بينها',
                badge: '3 من 4: نماذج AI',
                badgeIcon: <Zap size={14} />,
                targetId: 'tour-model-selector',
                content: (
                  <div className="tour-content-body">
                    <p>
                      تقدر تبدّل بين نموذجين حسب قوة المسألة اللي بتسألها:
                    </p>
                    <ul className="tour-features-list">
                      <li>
                        <strong>نموذج Fast (السريع):</strong> ممتاز للأسئلة السريعة، المفاهيم المباشرة، وحفظ القوانين، وسريع جداً في الرد.
                      </li>
                      <li>
                        <strong>نموذج Pro (الفائق):</strong> بيملك أعلى قدرة استنتاجية وتحليلية، مصمم لحل أعقد مسائل امتحانات الثانوية العامة والمسائل المركبة بدقة فائقة.
                      </li>
                    </ul>
                  </div>
                ),
                actionText: 'التالي: إرسال السؤال ورؤية النتيجة'
              },
              {
                title: 'اضغط إرسال وشوف النتيجة بنفسك!',
                badge: '4 من 4: جرّب دلوقتي',
                badgeIcon: <Send size={14} />,
                targetId: 'tour-send-button',
                content: (
                  <div className="tour-content-body">
                    <p>
                      كل حاجة جاهزة! اضغط دلوقتي على زر <strong>الإرسال</strong> عشان تشوف بنفسك إزاي EGS AI هيشرحلك الدرس باحترافية وسهولة، ويجاوبك خطوة بخطوة من كتابك المقرر.
                    </p>
                    <div className="tour-highlight-box success">
                      <CheckCircle size={16} className="tour-highlight-icon" />
                      <span>اضغط زر «إرسال وتجربة النتيجة» أدناه لبدء المحادثة فوراً!</span>
                    </div>
                  </div>
                ),
                actionText: 'إرسال وتجربة النتيجة الآن'
              }
            ]
          }
        ];

      case 'exams':
        return [
          {
            targetId: 'tour-exams-header',
            title: 'قسم الامتحانات والاختبارات الذكية',
            badge: 'امتحانات الوزارة',
            badgeIcon: <FileText size={14} />,
            position: 'center',
            content: (
              <div className="tour-content-body">
                <p>
                  هنا تقدر تولّد وتخوض امتحانات إلكترونية تفاعلية على أي درس أو وحدة في منهجك، مطابقة تماماً لمواصفات ونظام امتحانات الوزارة الحديثة.
                </p>
                <div className="tour-highlight-box">
                  <Sparkles size={16} className="tour-highlight-icon" />
                  <span>توليد فوري للامتحانات بأسئلة اختيار من متعدد مع وقت زمني محدد لتدريبك على جو الامتحان الحقيقي!</span>
                </div>
              </div>
            ),
            actionButtonText: 'التالي: اختيار المنهج والدرس'
          },
          {
            targetId: 'tour-exams-create-btn',
            title: 'توليد امتحان في درس محدد',
            badge: 'تخصيص الامتحان',
            badgeIcon: <BookOpen size={14} />,
            position: 'bottom',
            content: (
              <div className="tour-content-body">
                <p>
                  اضغط على زر <strong>توليد امتحان جديد</strong>، واختار المادة والوحدة أو الدرس اللي عايز تمتحن فيه، وحدد عدد الأسئلة اللي تناسب وقتك.
                </p>
              </div>
            ),
            actionButtonText: 'التالي: التصحيح الفوري'
          },
          {
            targetId: 'tour-exams-list',
            title: 'التصحيح التلقائي والشرح الفوري',
            badge: 'التقييم الذكي',
            badgeIcon: <CheckCircle size={14} />,
            position: 'top',
            content: (
              <div className="tour-content-body">
                <p>
                  بعد ما تخلص إجابة كل سؤال، النظام هيصححلك فورياً ويعرفك درجتك، ويقدملك شرح تفصيلي لسبب كل إجابة صحيحة، وتضاف درجاتك لنقاط ترتيبك في لوحة المتصدرين!
                </p>
              </div>
            ),
            actionButtonText: 'فهمت، جاهز للاختبارات!'
          }
        ];

      case 'flashcards':
        return [
          {
            targetId: 'tour-flashcards-header',
            title: 'المدرب الذكي والكروت التعليمية',
            badge: 'التكرار المتباعد',
            badgeIcon: <Layers size={14} />,
            position: 'center',
            content: (
              <div className="tour-content-body">
                <p>
                  طريقة عبقرية لحفظ وتثبيت أهم القوانين، التعريفات، والمفاهيم الأساسية باستخدام نظام <strong>التكرار المتباعد الذكي</strong> عشان متنساش أي معلومة.
                </p>
              </div>
            ),
            actionButtonText: 'التالي: طريقة المذاكرة'
          },
          {
            targetId: 'tour-flashcards-card',
            title: 'اقلب الكارت وقيّم حفظك',
            badge: 'تفاعل ذكي',
            badgeIcon: <Brain size={14} />,
            position: 'bottom',
            content: (
              <div className="tour-content-body">
                <p>
                  اقرأ السؤال أو المفهوم، واضغط على الكارت عشان يتقلب ويظهرلك الشرح والإجابة النموذجية.
                </p>
                <p>
                  بعدها قيّم نفسك (سهل، متوسط، صعب)، والمدرب الذكي هيبرمج إعادة ظهور الكارت في الوقت المناسب بالظبط قبل ما تنساه!
                </p>
              </div>
            ),
            actionButtonText: 'فهمت، يلا نراجع الكروت!'
          }
        ];

      case 'leaderboard':
        return [
          {
            targetId: 'tour-leaderboard-header',
            title: 'المسابقة ولوحة المتصدرين',
            badge: 'تنافس الأبطال',
            badgeIcon: <Trophy size={14} />,
            position: 'center',
            content: (
              <div className="tour-content-body">
                <p>
                  تنافس مع أشطر زملائك من نفس صفك الدراسي على مستوى كل محافظات مصر، واجمع نقاط الترتيب مع كل خطوة مذاكرة!
                </p>
                <div className="tour-highlight-box">
                  <Trophy size={16} className="tour-highlight-icon" />
                  <span>كل محادثة، كل امتحان تخلصه، وكل كارت تذاكره بيزود نقاطك ورصيدك في الترتيب!</span>
                </div>
              </div>
            ),
            actionButtonText: 'فهمت، يلا ننافس على الصدارة!'
          }
        ];

      case 'subscriptions':
        return [
          {
            targetId: 'tour-subscriptions-header',
            title: 'باقات الاشتراك وتفعيل Pro',
            badge: 'مميزات بلا حدود',
            badgeIcon: <CreditCard size={14} />,
            position: 'center',
            content: (
              <div className="tour-content-body">
                <p>
                  اشترك في باقة Pro لتفعيل تجديد الرصيد اليومي تلقائياً، إتاحة نماذج Pro الفائقة، وتوليد عدد غير محدود من الامتحانات الذكية.
                </p>
                <p>
                  الدفع سهل وآمن عبر بوابة كاشير المعتمدة في مصر بواسطة فودافون كاش، محافظ المحمول، ميزة، وبطاقات فيزا وماستركارد.
                </p>
              </div>
            ),
            actionButtonText: 'فهمت المميزات'
          }
        ];

      default:
        return [];
    }
  }, [screen, currentSubject, isMobile]);

  const steps = getScreenSteps();
  const currentStep = steps[currentStepIndex] || steps[0];
  const isSubStepped = !!(currentStep?.subSteps && currentStep.subSteps.length > 0);
  const activeSubStep = isSubStepped ? currentStep.subSteps![subStepIndex] : null;

  // Active target ID based on main step or sub-step
  const activeTargetId = activeSubStep?.targetId || currentStep?.targetId;

  // Update target element positioning & spotlight
  const updateTargetPosition = useCallback(() => {
    if (!activeTargetId) {
      setTargetRect(null);
      return;
    }

    const targetEl = document.getElementById(activeTargetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      const rect = targetEl.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [activeTargetId]);

  useEffect(() => {
    if (!isOpen) return;

    // Small delay to allow layout animations and active elements to stabilize
    const timer = setTimeout(() => {
      updateTargetPosition();
    }, 180);

    const handleResize = () => updateTargetPosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen, currentStepIndex, subStepIndex, activeTargetId, updateTargetPosition]);

  // When opening Step 3 (Submit box) in Chat screen: automatically prefill the prompt!
  useEffect(() => {
    if (screen === 'chat' && currentStepIndex === 2 && isOpen) {
      const prompt = `اشرحلي بالتفصيل وبأمثلة واضحة أول درس في منهج ${currentSubject || 'الفيزياء'}`;
      if (onPrefillPrompt) {
        onPrefillPrompt(prompt);
      }
    }
  }, [screen, currentStepIndex, isOpen, currentSubject, onPrefillPrompt]);

  if (!isOpen || !currentStep) return null;

  const totalMainSteps = steps.length;
  const isLastMainStep = currentStepIndex === totalMainSteps - 1;
  const isLastSubStep = isSubStepped ? subStepIndex === (currentStep.subSteps!.length - 1) : true;

  const handleNext = () => {
    if (isSubStepped && !isLastSubStep) {
      setSubStepIndex(prev => prev + 1);
      return;
    }

    if (isLastMainStep) {
      // Completed all steps
      onClose(true);
    } else {
      setCurrentStepIndex(prev => prev + 1);
      setSubStepIndex(0);
    }
  };

  const handlePrev = () => {
    if (isSubStepped && subStepIndex > 0) {
      setSubStepIndex(prev => prev - 1);
      return;
    }

    if (currentStepIndex > 0) {
      const prevStep = steps[currentStepIndex - 1];
      setCurrentStepIndex(prev => prev - 1);
      if (prevStep.subSteps && prevStep.subSteps.length > 0) {
        setSubStepIndex(prevStep.subSteps.length - 1);
      } else {
        setSubStepIndex(0);
      }
    }
  };

  const handleSkip = () => {
    onClose(false);
  };

  const handleActionClick = () => {
    // Custom action triggers
    if (screen === 'chat') {
      if (currentStepIndex === 1) {
        // Step 2: Subject selector
        if (onSelectSubjectPrompt) {
          onSelectSubjectPrompt();
        }
        handleNext();
        return;
      }

      if (currentStepIndex === 2 && isLastSubStep) {
        // Step 3 final sub-step: Submit message
        if (onSubmitTourMessage) {
          onSubmitTourMessage();
        }
        onClose(true);
        return;
      }
    }

    handleNext();
  };

  // Card positioning logic
  const getCardStyle = (): React.CSSProperties => {
    if (isMobile) {
      // On mobile, dock cleanly at bottom or top depending on spotlight position
      if (targetRect && targetRect.top > window.innerHeight / 2) {
        return {
          position: 'fixed',
          top: '16px',
          left: '12px',
          right: '12px',
          margin: '0 auto',
          maxWidth: '480px',
          zIndex: 10001
        };
      }
      return {
        position: 'fixed',
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        left: '12px',
        right: '12px',
        margin: '0 auto',
        maxWidth: '480px',
        zIndex: 10001
      };
    }

    // Desktop positioning
    if (!targetRect || currentStep.position === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '520px',
        width: '92%',
        zIndex: 10001
      };
    }

    const cardWidth = 460;
    const padding = 16;
    let top = targetRect.bottom + padding;
    let left = targetRect.left + (targetRect.width / 2) - (cardWidth / 2);

    // If target is low on screen, place card above target
    if (targetRect.bottom + 320 > window.innerHeight) {
      top = Math.max(16, targetRect.top - 340);
    }

    // Horizontal bounds
    if (left + cardWidth > window.innerWidth - 16) {
      left = window.innerWidth - cardWidth - 16;
    }
    if (left < 16) {
      left = 16;
    }

    return {
      position: 'fixed',
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      width: `${cardWidth}px`,
      zIndex: 10001
    };
  };

  return (
    <div className="tour-wrapper" style={{ direction: 'rtl' }}>
      {/* Dimmed backdrop with cutout spotlight if target exists */}
      <div className="tour-backdrop" onClick={handleSkip}>
        {targetRect && (
          <div
            className="tour-spotlight"
            style={{
              top: `${Math.max(0, targetRect.top - 6)}px`,
              left: `${Math.max(0, targetRect.left - 6)}px`,
              width: `${targetRect.width + 12}px`,
              height: `${targetRect.height + 12}px`
            }}
          />
        )}
      </div>

      {/* Floating Tour Guide Card */}
      <div ref={cardRef} className="tour-card animate-scale-in" style={getCardStyle()} onClick={(e) => e.stopPropagation()}>
        
        {/* Header: Badge & Close button */}
        <div className="tour-card-header">
          <div className="tour-badge">
            {activeSubStep?.badgeIcon || currentStep.badgeIcon || <Sparkles size={13} />}
            <span>{activeSubStep?.badge || currentStep.badge || `الخطوة ${currentStepIndex + 1} من ${totalMainSteps}`}</span>
          </div>

          <button
            type="button"
            className="tour-close-btn"
            onClick={handleSkip}
            title="إغلاق وتخطي الجولة"
            aria-label="إغلاق الجولة"
          >
            <X size={16} />
          </button>
        </div>

        {/* Title & Micro-step Sub-indicator */}
        <div className="tour-card-title-section">
          <h3 className="tour-card-title">
            {activeSubStep?.title || currentStep.title}
          </h3>

          {/* Sub-steps carousel pills for Step 3 */}
          {isSubStepped && currentStep.subSteps && (
            <div className="tour-substep-pills">
              {currentStep.subSteps.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSubStepIndex(idx)}
                  className={`tour-substep-pill ${subStepIndex === idx ? 'active' : ''}`}
                  title={s.title}
                >
                  <span className="tour-substep-num">{idx + 1}</span>
                  <span className="tour-substep-label">{s.badge.split(':')[0]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body content */}
        <div className="tour-card-content">
          {activeSubStep?.content || currentStep.content}
        </div>

        {/* Footer controls: Progress, Skip, Back, Next/Action */}
        <div className="tour-card-footer">
          {/* Progress dots */}
          <div className="tour-step-indicators">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`tour-step-dot ${i === currentStepIndex ? 'active' : ''} ${i < currentStepIndex ? 'completed' : ''}`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="tour-actions-group">
            <button
              type="button"
              className="tour-btn-skip"
              onClick={handleSkip}
            >
              تخطي الجولة
            </button>

            {(currentStepIndex > 0 || (isSubStepped && subStepIndex > 0)) && (
              <button
                type="button"
                className="tour-btn-secondary"
                onClick={handlePrev}
                title="الرجوع للخطوة السابقة"
              >
                <ChevronRight size={16} />
                <span>السابق</span>
              </button>
            )}

            <button
              type="button"
              className="tour-btn-primary"
              onClick={handleActionClick}
            >
              <span>
                {activeSubStep?.actionText || currentStep.actionButtonText || (isLastMainStep ? 'إتمام الجولة' : 'التالي')}
              </span>
              {isLastMainStep && isLastSubStep ? (
                <CheckCircle size={15} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default AppTour;
