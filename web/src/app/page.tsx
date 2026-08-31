'use client';

import React, { useState, useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import DOMPurify from 'dompurify';
import {
  MessageSquare,
  Settings,
  CreditCard,
  User,
  LogOut,
  Upload,
  Trash,
  BookOpen,
  Sparkles,
  Plus,
  Send,
  Lock,
  Check,
  FileText,
  Globe,
  Loader2,
  AlertCircle,
  Menu,
  X,
  Copy,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  LogIn,
  Bell,
  ArrowRight,
  Image as ImageIcon,
  Mic,
  GraduationCap,
  ListChecks,
  MessageCircleQuestion,
  Undo2,
  Crop,
  Brush,
  Brain,
  Trophy,
  Flame,
  Coins,
  Award,
  Edit2,
  Trash2,
  PlusCircle,
  Layers,
  Grid,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  Phone,
  CheckCircle,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Laptop,
  Tablet,
  Zap,
  FlaskConical,
  Calculator,
  Dna,
  Languages,
  Compass,
  Clock,
  Crown,
  Calendar,
  Download,
  Share,
  PlusSquare,
  Target
} from 'lucide-react';

interface SearchStep {
  step: string;
  icon: string;
  message: string;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  message: string;
  created_at?: string;
  thought?: string;
  isThinking?: boolean;
  duration?: number;
  hasError?: boolean;
  searchSteps?: SearchStep[]; // v2 RAG search steps for display
}


interface CurriculumLesson {
  id: string;
  title: string;
  lessonNumber: number;
  unitTitle?: string;
  unitId?: string;
  subtopics?: string[];
  startPage?: number;
}

interface CurriculumUnit {
  id: string;
  title: string;
  unitNumber: number;
  startPage?: number;
  lessons: CurriculumLesson[];
  lessonsText?: string;
}

interface Curriculum {
  id: string;
  grade_level: string;
  subject_name: string;
  file_name: string;
  units?: CurriculumUnit[];
  is_placeholder?: boolean;
  track_id?: string | null;
  is_elective?: boolean;
  created_at: string;
}

const GRADE_NAMES: Record<string, string> = {
  '1_middle': 'الصف الأول الإعدادي',
  '2_middle': 'الصف الثاني الإعدادي',
  '3_middle': 'الصف الثالث الإعدادي',
  '1_high': 'الصف الأول الثانوي',
  '2_high': 'السنة الثانية بكالوريا (الصف الثاني الثانوي)'
};

export interface BaccalaureateTrack {
  id: string;
  name: string;
  englishName: string;
  description: string;
}

export const BACCALAUREATE_TRACKS: Record<string, BaccalaureateTrack> = {
  'medicine_life_sciences': {
    id: 'medicine_life_sciences',
    name: 'مسار الطب وعلوم الحياة',
    englishName: 'Medicine & Life Sciences Track',
    description: 'العلوم الحيوية والطبية والصيدلانية'
  },
  'engineering_cs': {
    id: 'engineering_cs',
    name: 'مسار الهندسة وعلوم الحاسب',
    englishName: 'Engineering & Computer Science Track',
    description: 'الرياضيات المتقدمة والهندسة والتكنولوجيا'
  },
  'business': {
    id: 'business',
    name: 'مسار إدارة الأعمال',
    englishName: 'Business Track',
    description: 'الاقتصاد والمحاسبة والعلوم المالية والإدارية'
  },
  'arts_literature': {
    id: 'arts_literature',
    name: 'مسار الآداب والفنون',
    englishName: 'Arts & Literature Track',
    description: 'الفنون والعلوم الإنسانية واللغات والفلسفة'
  }
};

const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: 'var(--primary-color)', opacity: 0.85, display: 'inline-block'
          }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-english)' }}>{language}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="code-block-header button"
          style={{ fontFamily: 'var(--font-arabic)' }}
        >
          {copied ? (
            <span style={{ color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Check size={12} />
              <span>تم النسخ!</span>
            </span>
          ) : (
            <>
              <Copy size={12} />
              <span>نسخ</span>
            </>
          )}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
};

const ThoughtBlock = ({
  thought, 
  duration, 
  isThinking 
}: { 
  thought?: string; 
  duration?: number; 
  isThinking?: boolean; 
}) => {
  const [expanded, setExpanded] = useState(isThinking || false);

  useEffect(() => {
    if (isThinking) setExpanded(true);
  }, [isThinking]);

  if (!thought && !isThinking) return null;

  return (
    <div className="thought-block">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="thought-toggle-btn"
      >
        <Brain size={14} className={isThinking ? 'animate-spin' : ''} style={{ color: 'var(--primary-color)' }} />
        <span>
          {isThinking 
            ? `جارٍ التفكير (${duration || 0} ثانية)...` 
            : `فكّر لمدة ${duration || 1} ثانية`}
        </span>
        <ChevronRight size={13} style={{ 
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.22s ease',
        }} />
      </button>
      
      {expanded && thought && (
        <div className="thought-content">{thought}</div>
      )}
    </div>
  );
};

  // MathRenderer: Renders LaTeX equations inline or block using bundled KaTeX (synchronous, no CDN load-race)
  const MathRenderer = ({ formula, block = false }: { formula: string; block?: boolean }) => {
    const html = React.useMemo(() => {
      try {
        return katex.renderToString(formula, {
          displayMode: block,
          throwOnError: false,
          strict: false,
          // trust: false (default) — the AI's LaTeX output is not fully trusted input;
          // this blocks \includegraphics/\href/etc. that could otherwise be abused.
          macros: {
            '\\RR': '\\mathbb{R}',
          },
        });
      } catch (e) {
        console.error('KaTeX error:', e);
        return '';
      }
    }, [formula, block]);

    if (html) {
      return <span className={block ? "math-block animate-fade-in" : "math-inline"} dangerouslySetInnerHTML={{ __html: html }} />;
    }

    return block ? (
      <div className="math-block">
        {formula}
      </div>
    ) : (
      <code className="math-inline">
        {formula}
      </code>
    );
  };

  // SvgDiagram: Renders AI-generated geometric diagrams as sanitized, zoomable SVG
  const SvgDiagram = ({ svgContent }: { svgContent: string }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    const sanitized = React.useMemo(() => {
      if (!mounted) return '';
      try {
        return DOMPurify.sanitize(svgContent, {
          USE_PROFILES: { svg: true, svgFilters: true },
          FORBID_TAGS: ['script', 'foreignObject'],
          FORBID_ATTR: ['onload', 'onerror', 'onclick', 'href', 'xlink:href'],
        });
      } catch (e) {
        console.error('SVG sanitize error:', e);
        return '';
      }
    }, [svgContent, mounted]);

    if (!mounted || !sanitized) return null;

    return (
      <div
        className="animate-fade-in"
        style={{
          margin: '1.1rem 0',
          padding: '16px',
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          overflowX: 'auto',
          display: 'flex',
          justifyContent: 'center',
          width: '100%'
        }}
      >
        <div
          className="svg-diagram-wrapper"
          style={{ width: '100%', maxWidth: '600px', color: 'var(--text-main)' }}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      </div>
    );
  };

  // parseInlineText: parses bold, code, and math delimiters inline
  const parseInlineText = (text: string): React.ReactNode[] => {
    const regex = /(\\\([\s\S]*?\\\))|(\\\[[\s\S]*?\\\])|(\$\$[\s\S]*?\$\$)|(\$[^\$\n]+\$)|(\*\*[^*]+\*\*)|(`[^`]+`)/g;
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (!part) return null;
      
      // Inline math \( ... \)
      if (part.startsWith('\\(') && part.endsWith('\\)')) {
        const formula = part.substring(2, part.length - 2);
        return <MathRenderer key={index} formula={formula} block={false} />;
      }

      // Block math \[ ... \] (when embedded inline)
      if (part.startsWith('\\[') && part.endsWith('\\]')) {
        const formula = part.substring(2, part.length - 2);
        return <MathRenderer key={index} formula={formula} block={true} />;
      }
      
      // Block math $$ ... $$ (when embedded inline)
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const formula = part.substring(2, part.length - 2);
        return <MathRenderer key={index} formula={formula} block={true} />;
      }

      // Inline math $ ... $
      if (part.startsWith('$') && part.endsWith('$')) {
        const formula = part.substring(1, part.length - 1);
        return <MathRenderer key={index} formula={formula} block={false} />;
      }

      // Bold ** ... **
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.substring(2, part.length - 2);
        return <strong key={index} style={{ fontWeight: 800 }}>{boldText}</strong>;
      }

      // Inline code ` ... `
      if (part.startsWith('`') && part.endsWith('`')) {
        const codeText = part.substring(1, part.length - 1);
        return <code key={index}>{codeText}</code>;
      }

      return <span key={index}>{part}</span>;
    }).filter(el => el !== null) as React.ReactNode[];
  };

  // MarkdownMessage: Parses line by line into structured React elements (tables, code, lists, math, headers)
  const MarkdownMessage = ({ content }: { content: string }) => {
    const lines = content.split('\n');
    const blocks: React.ReactNode[] = [];
    
    let idx = 0;
    while (idx < lines.length) {
      const line = lines[idx];
      const trimmed = line.trim();

      if (trimmed === '') {
        blocks.push(<div key={`empty-${idx}`} style={{ height: '0.6em' }} />);
        idx++;
        continue;
      }

      // Code blocks
      if (trimmed.startsWith('```')) {
        const lang = trimmed.replace('```', '').trim() || 'code';
        let codeLines: string[] = [];
        idx++;
        while (idx < lines.length && !lines[idx].trim().startsWith('```')) {
          codeLines.push(lines[idx]);
          idx++;
        }
        idx++;
        if (lang.toLowerCase() === 'svg') {
          blocks.push(
            <SvgDiagram key={`svg-${idx}`} svgContent={codeLines.join('\n')} />
          );
        } else {
          blocks.push(
            <CodeBlock key={`code-${idx}`} code={codeLines.join('\n')} language={lang} />
          );
        }
        continue;
      }

      // Block math
      if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
        const formula = trimmed.substring(2, trimmed.length - 2);
        blocks.push(<MathRenderer key={`mathblock-${idx}`} formula={formula} block={true} />);
        idx++;
        continue;
      }
      if (trimmed.startsWith('$$')) {
        let mathLines: string[] = [];
        idx++;
        while (idx < lines.length && !lines[idx].trim().endsWith('$$')) {
          mathLines.push(lines[idx]);
          idx++;
        }
        if (idx < lines.length) {
          const endLine = lines[idx].trim();
          if (endLine !== '$$') {
            mathLines.push(endLine.replace('$$', ''));
          }
          idx++;
        }
        blocks.push(<MathRenderer key={`mathblock-${idx}`} formula={mathLines.join('\n')} block={true} />);
        continue;
      }
      if (trimmed.startsWith('\\[') && trimmed.endsWith('\\]') && trimmed.length > 4) {
        const formula = trimmed.substring(2, trimmed.length - 2);
        blocks.push(<MathRenderer key={`mathblock-${idx}`} formula={formula} block={true} />);
        idx++;
        continue;
      }
      if (trimmed.startsWith('\\[')) {
        let mathLines: string[] = [];
        idx++;
        while (idx < lines.length && !lines[idx].trim().endsWith('\\]')) {
          mathLines.push(lines[idx]);
          idx++;
        }
        if (idx < lines.length) {
          const endLine = lines[idx].trim();
          if (endLine !== '\\]') {
            mathLines.push(endLine.replace('\\]', ''));
          }
          idx++;
        }
        blocks.push(<MathRenderer key={`mathblock-${idx}`} formula={mathLines.join('\n')} block={true} />);
        continue;
      }

      // Tables
      if (trimmed.startsWith('|') && idx + 1 < lines.length && lines[idx + 1].trim().startsWith('|')) {
        const nextLine = lines[idx + 1].trim();
        const isTable = nextLine.replace(/[\s\-\|:‌]/g, '') === '';
        
        if (isTable) {
          const headerRow = line;
          const rows: string[] = [];
          idx += 2;
          
          while (idx < lines.length && lines[idx].trim().startsWith('|')) {
            rows.push(lines[idx].trim());
            idx++;
          }

          const parseCells = (rowText: string) => {
            const cells = rowText.split('|').map(c => c.trim());
            if (cells[0] === '') cells.shift();
            if (cells[cells.length - 1] === '') cells.pop();
            return cells;
          };

          const headers = parseCells(headerRow);
          const parsedRows = rows.map(r => parseCells(r));

          blocks.push(
            <div key={`table-${idx}`} style={{ overflowX: 'auto', margin: '1.2rem 0', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'right' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--primary-light)', borderBottom: '2px solid var(--border-color)' }}>
                    {headers.map((h, hIdx) => (
                      <th key={hIdx} style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--primary-color)' }}>{parseInlineText(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: rIdx % 2 === 1 ? 'rgba(85, 107, 47, 0.02)' : 'transparent' }}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} style={{ padding: '10px 14px', color: 'var(--text-main)' }}>{parseInlineText(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      // Headers
      if (trimmed.startsWith('### ')) {
        blocks.push(<h3 key={`h3-${idx}`} style={{ marginTop: '1.2rem', marginBottom: '0.6rem', color: 'var(--primary-color)', fontWeight: 700, fontSize: '1.05rem' }}>{parseInlineText(trimmed.substring(4))}</h3>);
        idx++;
        continue;
      }
      if (trimmed.startsWith('## ')) {
        blocks.push(<h2 key={`h2-${idx}`} style={{ marginTop: '1.2rem', marginBottom: '0.6rem', color: 'var(--primary-color)', fontWeight: 700, fontSize: '1.15rem' }}>{parseInlineText(trimmed.substring(3))}</h2>);
        idx++;
        continue;
      }
      if (trimmed.startsWith('# ')) {
        blocks.push(<h1 key={`h1-${idx}`} style={{ marginTop: '1.2rem', marginBottom: '0.6rem', color: 'var(--primary-color)', fontWeight: 700, fontSize: '1.3rem' }}>{parseInlineText(trimmed.substring(2))}</h1>);
        idx++;
        continue;
      }

      // Lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        let listItems: string[] = [];
        while (idx < lines.length && (lines[idx].trim().startsWith('- ') || lines[idx].trim().startsWith('* '))) {
          listItems.push(lines[idx].trim().substring(2));
          idx++;
        }
        blocks.push(
          <ul key={`ul-${idx}`} style={{ marginRight: '1.5rem', marginBottom: '0.8rem', listStyleType: 'disc' }}>
            {listItems.map((item, lIdx) => (
              <li key={lIdx} style={{ marginBottom: '0.3rem' }}>{parseInlineText(item)}</li>
            ))}
          </ul>
        );
        continue;
      }
      if (/^\d+\.\s/.test(trimmed)) {
        let listItems: string[] = [];
        while (idx < lines.length && /^\d+\.\s/.test(lines[idx].trim())) {
          const itemText = lines[idx].trim().replace(/^\d+\.\s/, '');
          listItems.push(itemText);
          idx++;
        }
        blocks.push(
          <ol key={`ol-${idx}`} style={{ marginRight: '1.5rem', marginBottom: '0.8rem', listStyleType: 'decimal' }}>
            {listItems.map((item, lIdx) => (
              <li key={lIdx} style={{ marginBottom: '0.3rem' }}>{parseInlineText(item)}</li>
            ))}
          </ol>
        );
        continue;
      }

      // Paragraph
      blocks.push(
        <p key={`p-${idx}`} style={{ marginBottom: '0.8rem', lineHeight: '1.6' }}>
          {parseInlineText(line)}
        </p>
      );
      idx++;
    }

    return <div className="markdown-body">{blocks}</div>;
  };

  // Interactive Quiz Card Component
  const InteractiveQuizCard = ({ quiz, onAnswerSubmit }: { quiz: any; onAnswerSubmit?: (text: string) => void }) => {
    const [selected, setSelected] = useState<number | null>(null);
    const [essayAnswer, setEssayAnswer] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [tfAnswer, setTfAnswer] = useState<boolean | null>(null);

    const isCorrect = () => {
      if (quiz.type === 'multiple_choice') {
        if (selected === null) return false;
        return quiz.options[selected] === quiz.correct_answer;
      } else if (quiz.type === 'true_false') {
        if (tfAnswer === null) return false;
        return String(tfAnswer) === String(quiz.correct_answer);
      }
      return true;
    };

    const handleSubmit = (answerText: string) => {
      setSubmitted(true);
      if (onAnswerSubmit) {
        onAnswerSubmit(answerText);
      }
    };

    return (
      <div style={{
        background: 'var(--sidebar-bg)',
        border: '1.5px solid var(--primary-color)',
        borderRadius: '16px',
        padding: '18px',
        margin: '12px 0',
        direction: 'rtl',
        boxShadow: 'var(--shadow-sm)',
        maxWidth: '500px',
        width: '100%',
        color: 'var(--text-main)',
        textAlign: 'right'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FileText size={16} style={{ color: 'var(--primary-color)' }} />
          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--primary-color)' }}>اختبر فهمك مع EGS AI:</span>
        </div>
        
        <p style={{ fontWeight: 700, fontSize: '0.98rem', marginBottom: '16px', lineHeight: '1.5' }}>{quiz.question}</p>

        {quiz.type === 'multiple_choice' && quiz.options && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {quiz.options.map((opt: string, idx: number) => {
              const isSelected = selected === idx;
              let btnStyle: React.CSSProperties = {
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1.5px solid var(--border-color)',
                background: 'var(--card-bg)',
                color: 'var(--text-main)',
                textAlign: 'right',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem',
                transition: 'var(--transition)'
              };

              if (isSelected) {
                btnStyle.borderColor = 'var(--primary-color)';
                btnStyle.background = 'var(--primary-light)';
                btnStyle.color = 'var(--primary-color)';
              }

              if (submitted) {
                const isOptCorrect = opt === quiz.correct_answer;
                if (isOptCorrect) {
                  btnStyle.borderColor = 'var(--success-color)';
                  btnStyle.background = 'rgba(42, 157, 143, 0.1)';
                  btnStyle.color = 'var(--success-color)';
                } else if (isSelected) {
                  btnStyle.borderColor = 'var(--danger-color)';
                  btnStyle.background = 'rgba(230, 57, 70, 0.1)';
                  btnStyle.color = 'var(--danger-color)';
                }
              }

              return (
                <button
                  key={idx}
                  disabled={submitted}
                  onClick={() => {
                    setSelected(idx);
                    handleSubmit(opt);
                  }}
                  style={btnStyle}
                >
                  {idx + 1}. {opt}
                </button>
              );
            })}
          </div>
        )}

        {quiz.type === 'true_false' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            {[
              { val: true, label: 'صح', color: 'var(--success-color)', bg: 'rgba(42, 157, 143, 0.1)' },
              { val: false, label: 'خطأ', color: 'var(--danger-color)', bg: 'rgba(230, 57, 70, 0.1)' }
            ].map((btn) => {
              const isSelected = tfAnswer === btn.val;
              let btnStyle: React.CSSProperties = {
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: '1.5px solid var(--border-color)',
                background: 'var(--card-bg)',
                color: 'var(--text-main)',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
                fontSize: '0.9rem',
                transition: 'var(--transition)'
              };

              if (isSelected) {
                btnStyle.borderColor = btn.color;
                btnStyle.background = btn.bg;
                btnStyle.color = btn.color;
              }

              if (submitted) {
                const isBtnCorrect = String(btn.val) === String(quiz.correct_answer);
                if (isBtnCorrect) {
                  btnStyle.borderColor = 'var(--success-color)';
                  btnStyle.background = 'rgba(42, 157, 143, 0.1)';
                  btnStyle.color = 'var(--success-color)';
                } else if (isSelected) {
                  btnStyle.borderColor = 'var(--danger-color)';
                  btnStyle.background = 'rgba(230, 57, 70, 0.1)';
                  btnStyle.color = 'var(--danger-color)';
                }
              }

              return (
                <button
                  key={String(btn.val)}
                  disabled={submitted}
                  onClick={() => {
                    setTfAnswer(btn.val);
                    handleSubmit(String(btn.val));
                  }}
                  style={btnStyle}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        )}

        {quiz.type === 'essay' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <textarea
              disabled={submitted}
              value={essayAnswer}
              onChange={(e) => setEssayAnswer(e.target.value)}
              placeholder="اكتب إجابتك هنا يا بطل..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1.5px solid var(--border-color)',
                background: 'var(--card-bg)',
                color: 'var(--text-main)',
                outline: 'none',
                fontSize: '0.88rem'
              }}
            />
            <button
              disabled={submitted || !essayAnswer.trim()}
              onClick={() => handleSubmit(essayAnswer)}
              className="btn-primary"
              style={{
                alignSelf: 'flex-start',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700
              }}
            >
              إرسال الإجابة للتقييم
            </button>
          </div>
        )}

        {submitted && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: '10px',
            background: 'var(--card-bg)',
            borderLeft: `4px solid ${quiz.type === 'essay' ? 'var(--primary-color)' : (isCorrect() ? 'var(--success-color)' : 'var(--danger-color)')}`,
            fontSize: '0.85rem',
            lineHeight: '1.5'
          }}>
            {quiz.type !== 'essay' && (
              <p style={{ fontWeight: 800, color: isCorrect() ? 'var(--success-color)' : 'var(--danger-color)', marginBottom: '4px' }}>
                {isCorrect() ? 'إجابة صحيحة! أحسنت يا بطل!' : 'إجابة خاطئة، لا بأس فالهدف هو التعلم!'}
              </p>
            )}
            {quiz.type === 'essay' && (
              <p style={{ fontWeight: 800, color: 'var(--primary-color)', marginBottom: '4px' }}>
                تم إرسال إجابتك للتحليل!
              </p>
            )}
            <p style={{ color: 'var(--text-secondary)' }}><strong>الشرح والتوضيح:</strong> {quiz.explanation}</p>
          </div>
        )}
      </div>
    );
  };

  // Smart Exam Invite Card Component
  const InteractiveExamInviteCard = ({ exam, onGoToExams }: { exam: any; onGoToExams: () => void }) => {
    return (
      <div style={{
        background: 'var(--sidebar-bg)',
        border: '2px dashed var(--primary-color)',
        borderRadius: '16px',
        padding: '20px',
        margin: '12px 0',
        direction: 'rtl',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '500px',
        width: '100%',
        color: 'var(--text-main)',
        boxShadow: 'var(--shadow-sm)',
        textAlign: 'right'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} style={{ color: 'var(--primary-color)' }} />
          <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--primary-color)' }}>امتحان مقترح من EGS AI:</span>
        </div>

        <h3 style={{ fontWeight: 800, fontSize: '1.05rem', margin: '0' }}>{exam.title}</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0' }}>
          المادة: {exam.subject_name} · الصف الدراسي: {GRADE_NAMES[exam.grade_level]}
        </p>
        
        <button
          onClick={onGoToExams}
          className="btn-primary"
          style={{
            alignSelf: 'flex-start',
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '0.88rem',
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(193,39,45,0.25)'
          }}
        >
          بدء الامتحان الآن
        </button>
      </div>
    );
  };

  // Motivational Paywall Card for zero coins / depleted funds
  const MotivationalPaywallCard = ({ onGoToSubscriptions }: { onGoToSubscriptions?: () => void }) => {
    return (
      <div className="motivational-paywall-card animate-scale-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(229, 169, 60, 0.15)', color: 'var(--secondary-color)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.78rem', fontWeight: 800 }}>
            <Sparkles size={14} />
            <span>أنت بطل المذاكرة اليوم!</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--secondary-color)', fontSize: '0.74rem', fontWeight: 700 }}>
            <Trophy size={13} />
            <span>إنجاز أكاديمي رائع</span>
          </div>
        </div>

        <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 8px', lineHeight: '1.4' }}>
          استمر في رحلة التفوق — لا تدع حماسك يتوقف!
        </h3>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: '1.65', margin: '0 0 16px' }}>
          لقد استنفدت رصيدك التجريبي المجاني. تفوقك يستحق الاستمرار! اشترك الآن في باقة <strong style={{ color: 'var(--primary-color)' }}>Pro</strong> لتفعيل رصيد يومي متجدد (80-120 نقطة يومياً) ونموذج التفكير العميق لتحليل أصعب المسائل والامتحانات الشاملة.
        </p>

        {/* Feature perks */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '14px' }}>
          <div style={{ background: 'var(--alpha-white-3)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
            <Zap size={15} color="var(--primary-color)" />
            <span style={{ fontWeight: 700 }}>80-120 نقطة متجددة يومياً</span>
          </div>
          <div style={{ background: 'var(--alpha-white-3)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
            <Brain size={15} color="var(--primary-color)" />
            <span style={{ fontWeight: 700 }}>نموذج التفكير العميق للمسائل</span>
          </div>
          <div style={{ background: 'var(--alpha-white-3)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
            <FileText size={15} color="var(--primary-color)" />
            <span style={{ fontWeight: 700 }}>توليد وتصحيح امتحانات غير محدودة</span>
          </div>
        </div>

        {/* Supported Payment Methods */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
            طرق دفع فورية وآمنة عبر كاشير (Kashier):
          </div>
          <div className="payment-badges-row">
            <span className="payment-badge-chip"><Phone size={12} /> فودافون كاش</span>
            <span className="payment-badge-chip"><Zap size={12} /> انستاباي InstaPay</span>
            <span className="payment-badge-chip"><CreditCard size={12} /> كروت ميزة الوطنية</span>
            <span className="payment-badge-chip"><Phone size={12} /> أورنج كاش</span>
            <span className="payment-badge-chip"><Phone size={12} /> اتصالات كاش</span>
            <span className="payment-badge-chip"><Phone size={12} /> وي باي WE Pay</span>
            <span className="payment-badge-chip"><CreditCard size={12} /> فيزا وماستركارد</span>
          </div>
        </div>

        {/* Guarantee Note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '16px', background: 'rgba(16, 185, 129, 0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <CheckCircle size={14} color="var(--success-color)" />
          <span>ضمان استرجاع كامل المبلغ خلال 3 أيام (72 ساعة) لتجربة آمنة 100%.</span>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={() => {
            if (onGoToSubscriptions) onGoToSubscriptions();
          }}
          className="btn-primary"
          style={{
            width: '100%',
            padding: '12px 18px',
            fontSize: '0.92rem',
            fontWeight: 800,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(193, 39, 45, 0.35)'
          }}
        >
          <CreditCard size={16} />
          <span>ترقية الحساب والاستمرار في التفوق (ابتداءً من 60 ج.م فقط)</span>
        </button>
      </div>
    );
  };

  // Formatted Chat Message Component (handles markdown + inline cards)
  const FormattedChatMessage = ({ 
    content, 
    sender,
    onGoToExams,
    onAnswerSubmit,
    onGoToFlashcards,
    onGoToSubscriptions
  }: { 
    content: string; 
    sender: 'user' | 'ai';
    onGoToExams: (exam: any) => void;
    onAnswerSubmit: (text: string) => void;
    onGoToFlashcards?: (subjectName: string) => void;
    onGoToSubscriptions?: () => void;
  }) => {
    if (sender === 'user') {
      return <div style={{ whiteSpace: 'pre-wrap', direction: 'rtl' }}>{content}</div>;
    }

    let displayContent = content;
    let quizData: any = null;
    let examData: any = null;
    let flashcardsData: any = null;
    let isPaywall = false;

    if (displayContent.includes('[UPGRADE_PAYWALL]')) {
      isPaywall = true;
      displayContent = displayContent.replace('[UPGRADE_PAYWALL]', '').trim();
    }

    const quizRegex = /\[QUIZ_QUESTION\]([\s\S]*?)\[\/QUIZ_QUESTION\]/;
    const quizMatch = content.match(quizRegex);
    if (quizMatch) {
      displayContent = displayContent.replace(quizMatch[0], '');
      try {
        quizData = JSON.parse(quizMatch[1].trim());
      } catch (e) {
        console.error('Quiz JSON parse error:', e);
      }
    }

    const examRegex = /\[CREATE_EXAM\]([\s\S]*?)\[\/CREATE_EXAM\]/;
    const examMatch = content.match(examRegex);
    if (examMatch) {
      displayContent = displayContent.replace(examMatch[0], '');
      try {
        examData = JSON.parse(examMatch[1].trim());
      } catch (e) {
        console.error('Exam JSON parse error:', e);
      }
    }

    const flashcardsRegex = /\[CREATE_FLASHCARDS\]([\s\S]*?)\[\/CREATE_FLASHCARDS\]/;
    const flashcardsMatch = content.match(flashcardsRegex);
    if (flashcardsMatch) {
      displayContent = displayContent.replace(flashcardsMatch[0], '');
      try {
        flashcardsData = JSON.parse(flashcardsMatch[1].trim());
      } catch (e) {
        console.error('Flashcards JSON parse error:', e);
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {displayContent.trim() && <MarkdownMessage content={displayContent} />}
        {isPaywall && <MotivationalPaywallCard onGoToSubscriptions={onGoToSubscriptions} />}
        {quizData && <InteractiveQuizCard quiz={quizData} onAnswerSubmit={onAnswerSubmit} />}
        {examData && <InteractiveExamInviteCard exam={examData} onGoToExams={() => onGoToExams(examData)} />}
        {flashcardsData && (
          <div className="glass" style={{ padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border-primary)', background: 'var(--primary-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'var(--primary-color)', color: 'var(--text-on-primary)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Brain size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-main)' }}>
                  {flashcardsData.title || 'مجموعة كروت جديدة'}
                </h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {flashcardsData.subject_name} • {flashcardsData.cards?.length || 0} كارت تعليمي
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                if (onGoToFlashcards) onGoToFlashcards(flashcardsData.subject_name);
              }}
              className="btn-primary"
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, border: 'none', cursor: 'pointer' }}
            >
              مراجعة الكروت الآن
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── v2: SearchStepsPanel — shows RAG search process to the student ──────
  const SearchStepsPanel = ({ steps, isSearching }: { steps?: SearchStep[]; isSearching?: boolean }) => {
    const [collapsed, setCollapsed] = React.useState(false);

    const renderSearchStepIcon = (icon: string) => {
      if (!icon) return <Search size={14} style={{ color: 'var(--primary-color)' }} />;
      if (icon.includes('🔍')) return <Search size={14} style={{ color: 'var(--primary-color)' }} />;
      if (icon.includes('🖼️') || icon.includes('image') || icon.includes('scan')) return <ImageIcon size={14} style={{ color: 'var(--primary-color)' }} />;
      if (icon.includes('📖') || icon.includes('📚')) return <BookOpen size={14} style={{ color: 'var(--primary-color)' }} />;
      if (icon.includes('✅') || icon.includes('✔️')) return <Check size={14} style={{ color: 'var(--success-color)' }} />;
      if (icon.includes('❌')) return <X size={14} style={{ color: 'var(--danger-color)' }} />;
      if (icon.includes('⏳') || icon.includes('⌛')) return <Loader2 size={14} className="animate-spin" style={{ color: 'var(--primary-color)' }} />;
      // Fallback to text representation or strip emoji if needed, here we just return as span
      return <span style={{ fontSize: '0.85rem' }}>{icon}</span>;
    };

    const allSteps = steps || [];
    if (allSteps.length === 0 && !isSearching) return null;

    return (
      <div
        className="search-steps-panel"
        style={{
          background: 'var(--sidebar-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '10px 14px',
          marginBottom: '10px',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          direction: 'rtl',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: allSteps.length > 0 ? 'pointer' : 'default',
            marginBottom: collapsed ? 0 : (allSteps.length > 0 ? '8px' : 0)
          }}
          onClick={() => allSteps.length > 0 && setCollapsed(c => !c)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--primary-color)' }}>
              {isSearching && allSteps.length === 0 ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            </span>
            <span style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.8rem' }}>
              {isSearching && allSteps.length === 0 ? 'جاري البحث في المنهج...' : 'خطوات البحث الذكي'}
            </span>
          </div>
          {allSteps.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', userSelect: 'none' }}>
              <span>{collapsed ? 'عرض' : 'إخفاء'}</span>
              <ChevronRight size={13} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.2s ease' }} />
            </span>
          )}
        </div>

        {/* Steps list */}
        {!collapsed && allSteps.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {allSteps.map((s, idx) => (
              <div
                key={idx}
                className="search-step-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  background: idx === allSteps.length - 1 ? 'var(--primary-light)' : 'transparent',
                  animation: 'stepFadeIn 0.3s ease forwards',
                  animationDelay: `${idx * 0.05}s`,
                  opacity: 0
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', minWidth: '20px', justifyContent: 'center' }}>{renderSearchStepIcon(s.icon)}</span>
                <span style={{
                  color: idx === allSteps.length - 1 ? 'var(--primary-color)' : 'var(--text-secondary)',
                  fontWeight: idx === allSteps.length - 1 ? 700 : 500,
                  fontSize: '0.8rem'
                }}>
                  {s.message}
                </span>
                {idx === allSteps.length - 1 && isSearching && (
                  <span className="step-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-color)', display: 'inline-block', marginRight: 'auto', flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

// ─── Image Editor (crop + freehand markup, dependency-free) ──────────────────
const EDITOR_BRUSH_COLORS = ['#C1272D', '#D83A32', '#E5A93C', '#1E70BA', '#10b981', '#fbbf24', '#FFFFFF', '#0E0D0D'];

const ImageEditorModal = ({
  src,
  mimeType,
  onConfirm,
  onCancel,
}: {
  src: string;
  mimeType: string;
  onConfirm: (base64: string, mimeType: string) => void;
  onCancel: () => void;
}) => {
  const [tool, setTool] = useState<'crop' | 'brush'>('brush');
  const [brushColor, setBrushColor] = useState(EDITOR_BRUSH_COLORS[0]);
  const [strokes, setStrokes] = useState<{ color: string; points: { x: number; y: number }[] }[]>([]);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const drawingRef = useRef(false);
  const cropStartRef = useRef<{ x: number; y: number } | null>(null);

  // Redraw overlay (strokes + crop rect) whenever state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgSize) return;
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sx = img.clientWidth / imgSize.w;
    const sy = img.clientHeight / imgSize.h;
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * sx, stroke.points[0].y * sy);
      for (const p of stroke.points.slice(1)) ctx.lineTo(p.x * sx, p.y * sy);
      ctx.stroke();
    }
    if (cropRect) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.clearRect(cropRect.x * sx, cropRect.y * sy, cropRect.w * sx, cropRect.h * sy);
      ctx.strokeStyle = '#C1272D';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(cropRect.x * sx, cropRect.y * sy, cropRect.w * sx, cropRect.h * sy);
      ctx.restore();
    }
  }, [strokes, cropRect, imgSize]);

  const toImageCoords = (e: React.PointerEvent): { x: number; y: number } | null => {
    const img = imgRef.current;
    if (!img || !imgSize) return null;
    const rect = img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * imgSize.w;
    const y = ((e.clientY - rect.top) / rect.height) * imgSize.h;
    return {
      x: Math.max(0, Math.min(imgSize.w, x)),
      y: Math.max(0, Math.min(imgSize.h, y))
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const pt = toImageCoords(e);
    if (!pt) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (tool === 'brush') {
      drawingRef.current = true;
      setStrokes(prev => [...prev, { color: brushColor, points: [pt] }]);
    } else {
      cropStartRef.current = pt;
      setCropRect({ x: pt.x, y: pt.y, w: 0, h: 0 });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const pt = toImageCoords(e);
    if (!pt) return;
    if (tool === 'brush' && drawingRef.current) {
      setStrokes(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last) next[next.length - 1] = { ...last, points: [...last.points, pt] };
        return next;
      });
    } else if (tool === 'crop' && cropStartRef.current) {
      const start = cropStartRef.current;
      setCropRect({
        x: Math.min(start.x, pt.x),
        y: Math.min(start.y, pt.y),
        w: Math.abs(pt.x - start.x),
        h: Math.abs(pt.y - start.y)
      });
    }
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
    cropStartRef.current = null;
    if (cropRect && (cropRect.w < 10 || cropRect.h < 10)) setCropRect(null);
  };

  const handleUndo = () => {
    if (tool === 'crop' && cropRect) {
      setCropRect(null);
    } else {
      setStrokes(prev => prev.slice(0, -1));
    }
  };

  const exportImage = () => {
    const img = imgRef.current;
    if (!img || !imgSize) return;
    const region = cropRect && cropRect.w >= 10 && cropRect.h >= 10
      ? cropRect
      : { x: 0, y: 0, w: imgSize.w, h: imgSize.h };
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(region.w);
    canvas.height = Math.round(region.h);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, region.x, region.y, region.w, region.h, 0, 0, canvas.width, canvas.height);
    ctx.lineWidth = Math.max(3, imgSize.w / 250);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x - region.x, stroke.points[0].y - region.y);
      for (const p of stroke.points.slice(1)) ctx.lineTo(p.x - region.x, p.y - region.y);
      ctx.stroke();
    }
    // JPEG keeps the payload small; step quality down until it fits the 5 MB cap
    let quality = 0.92;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length * 0.75 > 5 * 1024 * 1024 && quality > 0.4) {
      quality -= 0.12;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
    onConfirm(dataUrl.split(',')[1], 'image/jpeg');
  };

  const toolButtonStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    background: active ? 'var(--primary-color)' : 'var(--alpha-white-4)',
    color: active ? 'var(--text-on-primary)' : 'var(--text-main)',
    fontSize: '0.78rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font-arabic)',
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
      <div className="glass-strong animate-scale-in" style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '640px', maxHeight: '95vh', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden', direction: 'rtl' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', fontFamily: 'var(--font-arabic)' }}>تعديل الصورة قبل الإرسال</span>
          <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', padding: '10px 18px' }}>
          <button type="button" onClick={() => setTool('brush')} style={toolButtonStyle(tool === 'brush')}>
            <Brush size={13} />
            <span>رسم</span>
          </button>
          <button type="button" onClick={() => setTool('crop')} style={toolButtonStyle(tool === 'crop')}>
            <Crop size={13} />
            <span>قص</span>
          </button>
          <button type="button" onClick={handleUndo} style={toolButtonStyle(false)}>
            <Undo2 size={13} />
            <span>تراجع</span>
          </button>
          {tool === 'brush' && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {EDITOR_BRUSH_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBrushColor(c)}
                  aria-label={`لون ${c}`}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: c,
                    border: brushColor === c ? '2px solid var(--text-main)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div ref={containerRef} style={{ margin: '0 18px', flex: 1, minHeight: '200px', maxHeight: '55vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '12px', background: 'var(--input-bg)', touchAction: 'none' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              ref={imgRef}
              src={src}
              alt="Edit preview"
              draggable={false}
              onLoad={(e) => setImgSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              style={{ maxWidth: '100%', maxHeight: '55vh', userSelect: 'none', display: 'block' }}
            />
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ position: 'absolute', top: 0, left: 0, cursor: 'crosshair' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', padding: '14px 18px' }}>
          <button
            type="button"
            onClick={exportImage}
            style={{ flex: 1, padding: '10px', background: 'var(--primary-color)', color: 'var(--text-on-primary)', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-arabic)' }}
          >
            تأكيد
          </button>
          <button
            type="button"
            onClick={() => onConfirm(src.split(',')[1], mimeType)}
            style={{ flex: 1, padding: '10px', background: 'var(--alpha-white-4)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-arabic)' }}
          >
            استخدام بدون تعديل
          </button>
        </div>
      </div>
    </div>
  );
};

interface CurriculumLessonPickerProps {
  type: 'exam' | 'flashcard';
  currentGrade: string;
  currentSubject: string;
  structure: { units: any[]; totalLessons: number; hasCurriculum: boolean } | undefined;
  loading: boolean;
  activeLessonTab: 'curriculum' | 'custom';
  setActiveLessonTab: (tab: 'curriculum' | 'custom') => void;
  selectedLesson: any | null;
  setSelectedLesson: (lesson: any | null) => void;
  customTopic: string;
  setCustomTopic: (topic: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeUnitTab: string;
  setActiveUnitTab: (tab: string) => void;
  expandedUnits: Record<string, boolean>;
  setExpandedUnits: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isMobile: boolean;
  onFetchStructure?: (grade: string, subject: string) => void;
}

const CurriculumLessonPicker: React.FC<CurriculumLessonPickerProps> = ({
  type,
  currentGrade,
  currentSubject,
  structure,
  loading,
  activeLessonTab,
  setActiveLessonTab,
  selectedLesson,
  setSelectedLesson,
  customTopic,
  setCustomTopic,
  searchQuery,
  setSearchQuery,
  activeUnitTab,
  setActiveUnitTab,
  expandedUnits,
  setExpandedUnits,
  isMobile,
  onFetchStructure,
}) => {
  // Auto-fetch structure if not loaded yet
  useEffect(() => {
    if (currentGrade && currentSubject && !structure && !loading && onFetchStructure) {
      onFetchStructure(currentGrade, currentSubject);
    }
  }, [currentGrade, currentSubject, structure, loading, onFetchStructure]);

  const units = structure?.units || [];
  const hasUnits = Boolean(structure?.hasCurriculum && units.length > 0);
  const totalLessonsCount = structure?.totalLessons || units.reduce((acc: number, u: any) => acc + (u.lessons?.length || 0), 0);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredUnits = units.map((u: any) => {
    const unitTitleMatches = (u.title || '').toLowerCase().includes(normalizedQuery);
    const matchingLessons = (u.lessons || []).filter((l: any) =>
      !normalizedQuery ||
      unitTitleMatches ||
      (l.title || '').toLowerCase().includes(normalizedQuery) ||
      (l.subtopics || []).some((s: string) => s.toLowerCase().includes(normalizedQuery))
    );
    return {
      ...u,
      lessons: matchingLessons,
      isMatch: !normalizedQuery || unitTitleMatches || matchingLessons.length > 0
    };
  }).filter((u: any) => u.isMatch);

  const currentVisibleLessonsCount = filteredUnits.reduce((acc: number, u: any) => acc + (u.lessons?.length || 0), 0);

  const toggleUnit = (unitId: string) => {
    setExpandedUnits(prev => {
      const isCurrentlyOpen = prev[unitId] !== false;
      return { ...prev, [unitId]: !isCurrentlyOpen };
    });
  };

  // Selection state helpers
  const isAllCurriculumSelected = selectedLesson?.type === 'all' || (!selectedLesson && (customTopic === 'المنهج بالكامل' || customTopic === 'مراجعة المنهج بالكامل'));
  const isWholeUnitSelected = (unit: any) => selectedLesson?.type === 'unit' && (selectedLesson.id === unit.id || selectedLesson.title === unit.title);
  const isLessonSelected = (lesson: any) => selectedLesson?.type === 'lesson' && (selectedLesson?.id === lesson.id || selectedLesson?.title === lesson.title);

  const handleSelectAllCurriculum = () => {
    const defaultTitle = type === 'exam' ? 'المنهج بالكامل' : 'مراجعة المنهج بالكامل';
    setSelectedLesson({ type: 'all', title: defaultTitle });
    setCustomTopic(defaultTitle);
  };

  const handleSelectUnit = (unit: any, uIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWholeUnitSelected(unit)) {
      setSelectedLesson(null);
      setCustomTopic('');
    } else {
      setSelectedLesson({
        type: 'unit',
        id: unit.id,
        title: unit.title,
        unitNumber: unit.unitNumber || (uIdx + 1),
        lessonCount: unit.lessons?.length || 0,
        startPage: unit.startPage
      });
      setCustomTopic(unit.title);
      setExpandedUnits(prev => ({ ...prev, [unit.id]: true }));
    }
  };

  const handleSelectLesson = (unit: any, lesson: any, lIdx: number) => {
    if (isLessonSelected(lesson)) {
      setSelectedLesson(null);
      setCustomTopic('');
    } else {
      setSelectedLesson({
        type: 'lesson',
        id: lesson.id,
        title: lesson.title,
        unitTitle: unit.title,
        unitId: unit.id,
        lessonNumber: lesson.lessonNumber || (lIdx + 1),
        startPage: lesson.startPage,
        subtopics: lesson.subtopics
      });
      setCustomTopic(lesson.title);
    }
  };

  const handleResetSelection = () => {
    setSelectedLesson(null);
    setCustomTopic('');
  };

  return (
    <div className="curriculum-selector-container">
      {/* Mode Switcher */}
      <div style={{ display: 'flex', background: 'var(--bg-elevated)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-color)', gap: '4px' }}>
        <button
          type="button"
          onClick={() => setActiveLessonTab('curriculum')}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: activeLessonTab === 'curriculum' ? 'var(--primary-color)' : 'transparent',
            color: activeLessonTab === 'curriculum' ? 'var(--text-on-primary)' : 'var(--text-secondary)',
            boxShadow: activeLessonTab === 'curriculum' ? '0 2px 8px var(--primary-glow)' : 'none',
            transition: 'var(--transition)'
          }}
        >
          <BookOpen size={14} />
          <span>اختيار من المنهج</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveLessonTab('custom')}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: activeLessonTab === 'custom' ? 'var(--primary-color)' : 'transparent',
            color: activeLessonTab === 'custom' ? 'var(--text-on-primary)' : 'var(--text-secondary)',
            boxShadow: activeLessonTab === 'custom' ? '0 2px 8px var(--primary-glow)' : 'none',
            transition: 'var(--transition)'
          }}
        >
          <Edit2 size={14} />
          <span>موضوع مخصص</span>
        </button>
      </div>

      {activeLessonTab === 'curriculum' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', color: 'var(--primary-color)', fontSize: '0.84rem', fontWeight: 700 }}>
                <Loader2 className="animate-spin" size={16} />
                <span>جاري تحميل فهرس المنهج...</span>
              </div>
              <div className="curriculum-skeleton-row" />
              <div className="curriculum-skeleton-row" />
            </div>
          ) : !hasUnits ? (
            <div className="glass" style={{ padding: '18px', borderRadius: '14px', border: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--card-bg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 700 }}>
                <AlertCircle size={16} style={{ color: 'var(--primary-color)' }} />
                <span>لم يتم العثور على فهرس تفاعلي لهذه المادة.</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                يمكنك كتابة اسم الموضوع أو الدرس يدوياً من خيار "موضوع مخصص".
              </p>
              <button
                type="button"
                onClick={() => setActiveLessonTab('custom')}
                className="btn-primary"
                style={{ alignSelf: 'center', padding: '6px 16px', fontSize: '0.8rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                كتابة موضوع مخصص
              </button>
            </div>
          ) : (
            <>
              {/* Option 1: Quick Full Curriculum Card */}
              <div
                onClick={handleSelectAllCurriculum}
                className={`curriculum-quick-all-card ${isAllCurriculumSelected ? 'selected' : ''}`}
                title="تحديد كامل المنهج الدراسي"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: isAllCurriculumSelected ? 'var(--primary-color)' : 'var(--bg-elevated)', color: isAllCurriculumSelected ? 'var(--text-on-primary)' : 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Layers size={17} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right', minWidth: 0, flex: 1, gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>المنهج بالكامل</span>
                      <span style={{ fontSize: '0.72rem', background: isAllCurriculumSelected ? 'var(--primary-color)' : 'var(--bg-elevated)', color: isAllCurriculumSelected ? 'var(--text-on-primary)' : 'var(--text-secondary)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        {totalLessonsCount} درس
                      </span>
                    </div>
                    <span style={{ fontSize: '0.73rem', color: isAllCurriculumSelected ? 'var(--primary-color)' : 'var(--text-secondary)', lineHeight: 1.3 }}>
                      {type === 'exam' ? 'امتحان شامل يغطي جميع الوحدات والمفاهيم' : 'كروت تعليمية شاملة لكامل المنهج'}
                    </span>
                  </div>
                </div>
                <div style={{ flexShrink: 0, marginRight: '8px' }}>
                  {isAllCurriculumSelected ? (
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--primary-color)', color: 'var(--text-on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                  ) : (
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--border-hover)', background: 'transparent' }} />
                  )}
                </div>
              </div>

              {/* Search Bar */}
              <div className="curriculum-search-bar">
                <Search size={14} style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="ابحث عن وحدة، درس، أو مفهوم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', paddingRight: '32px', paddingLeft: searchQuery ? '30px' : '10px', fontSize: '0.82rem', height: '36px', borderRadius: '9px', background: 'var(--card-bg)' }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                    title="مسح البحث"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Scrollable Units & Lessons Tree */}
              <div className="curriculum-scroll-box" style={{ maxHeight: isMobile ? '340px' : '420px' }}>
                {filteredUnits.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span>لا توجد دروس مطابقة لـ "{searchQuery}".</span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700 }}
                    >
                      عرض جميع الدروس
                    </button>
                  </div>
                ) : (
                  filteredUnits.map((unit: any, uIdx: number) => {
                    const isSearching = normalizedQuery.length > 0;
                    const isExpanded = isSearching || expandedUnits[unit.id] !== false;
                    const isUnitFullySelected = isWholeUnitSelected(unit);
                    const hasSelectedLesson = Boolean(selectedLesson && selectedLesson.type === 'lesson' && unit.lessons?.some((l: any) => l.id === selectedLesson.id));

                    let cardClass = 'curriculum-unit-card';
                    if (isUnitFullySelected) cardClass += ' unit-selected';
                    else if (hasSelectedLesson) cardClass += ' has-selected-lesson';

                    return (
                      <div key={unit.id || uIdx} className={cardClass}>
                        {/* Unit Header Row */}
                        <div
                          onClick={() => toggleUnit(unit.id)}
                          className="curriculum-unit-header"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                            <div style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                              <ChevronDown size={15} />
                            </div>
                            <span style={{ fontSize: '0.72rem', background: isUnitFullySelected ? 'var(--primary-color)' : hasSelectedLesson ? 'var(--primary-light)' : 'var(--bg-elevated)', color: isUnitFullySelected ? 'var(--text-on-primary)' : hasSelectedLesson ? 'var(--primary-color)' : 'var(--text-secondary)', border: `1px solid ${isUnitFullySelected || hasSelectedLesson ? 'var(--primary-color)' : 'var(--border-color)'}`, padding: '2px 7px', borderRadius: '5px', fontWeight: 800, flexShrink: 0 }}>
                              الوحدة {unit.unitNumber || (uIdx + 1)}
                            </span>
                            <span style={{ fontSize: '0.86rem', fontWeight: 800, color: isUnitFullySelected ? 'var(--primary-color)' : 'var(--text-main)', flex: 1, minWidth: 0, wordBreak: 'break-word', lineHeight: 1.35 }}>
                              {unit.title}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {unit.lessons?.length || 0} دروس
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleSelectUnit(unit, uIdx, e)}
                              className={`curriculum-unit-select-btn ${isUnitFullySelected ? 'active' : ''}`}
                              title="تحديد الوحدة بالكامل"
                            >
                              {isUnitFullySelected ? (
                                <>
                                  <Check size={11} strokeWidth={3} />
                                  <span>محددة</span>
                                </>
                              ) : (
                                <span>تحديد الوحدة</span>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Lessons List inside Unit */}
                        {isExpanded && (
                          <div className="curriculum-unit-lessons-box">
                            {unit.lessons.map((lesson: any, lIdx: number) => {
                              const isSelected = isLessonSelected(lesson);
                              const lessonConcepts = lesson.subtopics && lesson.subtopics.length > 0
                                ? lesson.subtopics.slice(0, 3).join(' • ')
                                : null;

                              return (
                                <div
                                  key={lesson.id || lIdx}
                                  onClick={() => handleSelectLesson(unit, lesson, lIdx)}
                                  className={`curriculum-lesson-row ${isSelected ? 'selected' : ''}`}
                                >
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '0.7rem', color: isSelected ? 'var(--primary-color)' : 'var(--text-muted)', fontWeight: 700 }}>
                                        درس {lesson.lessonNumber || (lIdx + 1)}
                                      </span>
                                      <span style={{ fontSize: '0.84rem', fontWeight: isSelected ? 800 : 700, color: isSelected ? 'var(--primary-color)' : 'var(--text-main)', wordBreak: 'break-word', lineHeight: 1.35 }}>
                                        {lesson.title}
                                      </span>
                                      {lesson.startPage && (
                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', padding: '1px 5px', borderRadius: '4px', marginRight: 'auto' }}>
                                          ص. {lesson.startPage}
                                        </span>
                                      )}
                                    </div>

                                    {lessonConcepts && (
                                      <span style={{ fontSize: '0.7rem', color: isSelected ? 'var(--primary-color)' : 'var(--text-secondary)', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {lessonConcepts}
                                      </span>
                                    )}
                                  </div>

                                  <div style={{ flexShrink: 0, marginRight: '4px' }}>
                                    {isSelected ? (
                                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--primary-color)', color: 'var(--text-on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Check size={11} strokeWidth={3} />
                                      </div>
                                    ) : (
                                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '1.5px solid var(--border-hover)', background: 'transparent' }} />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Pinned Selection Summary */}
              {(selectedLesson || isAllCurriculumSelected) && (
                <div className="curriculum-selection-summary">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'var(--primary-color)', color: 'var(--text-on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle2 size={15} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, gap: '1px', textAlign: 'right' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                        {isAllCurriculumSelected
                          ? 'نطاق الاختيار المحدد:'
                          : selectedLesson?.type === 'unit'
                          ? 'الوحدة المحددة بالكامل:'
                          : `الدرس المحدد (${selectedLesson?.unitTitle || 'الوحدة'}):`}
                      </span>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--primary-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isAllCurriculumSelected
                          ? 'المنهج بالكامل'
                          : selectedLesson?.title || customTopic}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetSelection}
                    style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', flexShrink: 0 }}
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* Custom Topic Input */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="form-label" style={{ fontSize: '0.82rem' }}>
            {type === 'exam' ? 'الموضوع أو الدرس المطلوب يدوياً للامتحان:' : 'موضوع الكروت المطلوب يدوياً:'}
          </label>
          <input
            type="text"
            required
            placeholder={type === 'exam' ? 'مثال: قوانين نيوتن، الكيمياء الحرارية، الحملة الفرنسية...' : 'مثال: قوانين نيوتن، الكيمياء الحرارية، الباب الأول...'}
            value={customTopic}
            onChange={(e) => {
              setCustomTopic(e.target.value);
              setSelectedLesson(null);
            }}
            className="form-input"
            style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem', borderRadius: '9px' }}
          />
        </div>
      )}
    </div>
  );
};

export default function App() {
  // Initial Page Loading & Auth Gate State (prevents FOUC & premature registration flash)
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  // Navigation & Views
  const [activeTab, setActiveTab] = useState<'chat' | 'admin' | 'beta' | 'subscriptions' | 'profile' | 'exams' | 'flashcards' | 'leaderboard'>('chat');

  // Points / Coins & Model States
  const [coins, setCoins] = useState<number>(15.0);
  const [points, setPoints] = useState<number>(0);
  const [pointsBonusAnim, setPointsBonusAnim] = useState<number | null>(null);

  const triggerPointsAnim = (amount: number) => {
    setPointsBonusAnim(amount);
    setTimeout(() => {
      setPointsBonusAnim(null);
    }, 1800);
  };

  const [selectedModel, setSelectedModel] = useState<'flash' | 'pro'>('flash');
  const [thinkingEnabled, setThinkingEnabled] = useState<boolean>(false);
  const [chatMode, setChatMode] = useState<'socratic' | 'detailed' | 'summary'>('detailed');

  // Theme State
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');

  const applyTheme = (t: string) => {
    if (typeof window === 'undefined') return;
    let resolvedTheme = 'dark';
    if (t === 'system') {
      const isDarkSystem = window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolvedTheme = isDarkSystem ? 'dark' : 'light';
    } else {
      resolvedTheme = t;
    }
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  };

  const handleThemeChange = (newTheme: 'system' | 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('egs_theme', newTheme);
    applyTheme(newTheme);
  };

  const handleDismissNotification = (id: string) => {
    const updated = [...dismissedNotifIds, id];
    setDismissedNotifIds(updated);
    localStorage.setItem('egs_dismissed_notifications', JSON.stringify(updated));
  };

  // Auth State
  const [user, setUser] = useState<any>(null); // { id, phone, name, grade_level, plan_type, role }
  const [token, setToken] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');

  // Phase 2: Flashcards & Leaderboard States
  const [flashcardDecks, setFlashcardDecks] = useState<any[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<any | null>(null);
  const [deckCards, setDeckCards] = useState<any[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  
  const [generatingDecks, setGeneratingDecks] = useState(false);
  const [flashcardTopic, setFlashcardTopic] = useState('');
  const [flashcardCount, setFlashcardCount] = useState(5);
  const [flashcardSubject, setFlashcardSubject] = useState('');

  // Subject Stack & Manual Flashcard States
  const [selectedFlashcardSubject, setSelectedFlashcardSubject] = useState<string | null>(null);
  const [subjectDecks, setSubjectDecks] = useState<any[]>([]);
  const [subjectCards, setSubjectCards] = useState<any[]>([]);
  const [activeStackIndex, setActiveStackIndex] = useState(0);
  const [flashcardViewMode, setFlashcardViewMode] = useState<'grid' | 'stack'>('grid');
  const [isDealingAway, setIsDealingAway] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [deckFilter, setDeckFilter] = useState<string | null>(null);
  const [doneCards, setDoneCards] = useState<any[]>([]);
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [showFlashcardCreateModal, setShowFlashcardCreateModal] = useState(false);
  const [flashcardCreateMode, setFlashcardCreateMode] = useState<'ai' | 'manual'>('ai');
  const [manualDeckTitle, setManualDeckTitle] = useState('');
  const [manualCardsList, setManualCardsList] = useState<{ question: string; answer: string }[]>([
    { question: '', answer: '' }
  ]);
  const [editingDeck, setEditingDeck] = useState<any | null>(null);
  const [pendingOpenSubject, setPendingOpenSubject] = useState<string | null>(null);
  
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [userLeaderboardRank, setUserLeaderboardRank] = useState<any | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [leaderboardFilter, setLeaderboardFilter] = useState<'all' | 'my'>('my');

  // Curriculum Structure & Lesson Picker States
  const [curriculumStructures, setCurriculumStructures] = useState<Record<string, { units: any[]; totalLessons: number; hasCurriculum: boolean }>>({});
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [lessonSearchQuery, setLessonSearchQuery] = useState('');
  const [activeUnitTab, setActiveUnitTab] = useState<string>('all');
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

  // Exam Customization State
  const [showExamCreateModal, setShowExamCreateModal] = useState(false);
  const [examSubject, setExamSubject] = useState('');
  const [examTopic, setExamTopic] = useState('');
  const [selectedExamLesson, setSelectedExamLesson] = useState<any | null>(null);
  const [examLessonTab, setExamLessonTab] = useState<'curriculum' | 'custom'>('curriculum');
  const [examMode, setExamMode] = useState<'auto' | 'total_only' | 'custom_types'>('auto');
  const [examTotalCount, setExamTotalCount] = useState<number>(5);
  const [examMcqCount, setExamMcqCount] = useState<number>(2);
  const [examTfCount, setExamTfCount] = useState<number>(2);
  const [examEssayCount, setExamEssayCount] = useState<number>(1);
  const [examTimeRemaining, setExamTimeRemaining] = useState<number>(0);

  // Flashcards Lesson Picker State
  const [selectedFlashcardLesson, setSelectedFlashcardLesson] = useState<any | null>(null);
  const [flashcardLessonTab, setFlashcardLessonTab] = useState<'curriculum' | 'custom'>('curriculum');

  // Kashier Payment & Subscription States
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    planTitle: string;
    amount: number;
    bonusCoins: number;
  } | null>(null);
  const [paymentErrorToast, setPaymentErrorToast] = useState<string | null>(null);

  const isUserSubscribed = Boolean(
    user &&
    user.plan_type &&
    user.plan_type !== 'free' &&
    user.subscription_status === 'active' &&
    (!user.subscription_end_date || new Date(user.subscription_end_date).getTime() > Date.now())
  );

  const remainingDays = user?.subscription_end_date
    ? Math.max(0, Math.ceil((new Date(user.subscription_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : (isUserSubscribed ? 30 : 0);

  const handleSubscribe = async (planId: string) => {
    if (!user || !token) {
      setAuthTab('login');
      setShowAuthModal(true);
      return;
    }

    if (isUserSubscribed) {
      setPaymentErrorToast('لديك باقة اشتراك نشطة وسارية بالفعل. لا يمكن الاشتراك في باقة جديدة حتى انتهاء اشتراكك الحالي.');
      setTimeout(() => setPaymentErrorToast(null), 5000);
      return;
    }

    setSubscribingPlan(planId);
    try {
      const res = await fetch('/api/payment/kashier/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan_id: planId })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل تجهيز طلب الدفع');
      }

      const order = data.order;
      const redirectUrl = `https://checkout.kashier.io/?merchantId=${order.merchantId}&orderId=${order.orderId}&amount=${order.amount}&currency=${order.currency}&hash=${order.hash}&mode=${order.mode}&merchantRedirect=${encodeURIComponent(order.merchantRedirect)}&serverWebhook=${encodeURIComponent(order.serverWebhook)}&allowedMethods=${encodeURIComponent(order.allowedMethods)}&display=ar`;

      window.location.href = redirectUrl;
    } catch (err: any) {
      console.error('Subscription error:', err);
      setPaymentErrorToast(err.message || 'حدث خطأ أثناء بدء عملية الدفع عبر كاشير.');
      setTimeout(() => setPaymentErrorToast(null), 5000);
    } finally {
      setSubscribingPlan(null);
    }
  };

  // Currency Verification & Subscription Renewal States
  const [verifiedCurrencyData, setVerifiedCurrencyData] = useState<any>(null);
  const [isVerifyingCurrency, setIsVerifyingCurrency] = useState<boolean>(false);
  const [currencyVerificationToast, setCurrencyVerificationToast] = useState<string | null>(null);
  const [renewalCountdown, setRenewalCountdown] = useState<string>('00:00:00');

  const handleVerifyCurrency = async () => {
    if (!token || !user) return;
    setIsVerifyingCurrency(true);
    try {
      const res = await fetch('/api/user/verify-currency', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setVerifiedCurrencyData(data.data);
        if (data.data.coins !== undefined) {
          setCoins(data.data.coins);
        }
        if (data.data.subscriptionStatus && user) {
          setUser({
            ...user,
            coins: data.data.coins,
            plan_type: data.data.planType,
            subscription_status: data.data.subscriptionStatus,
            subscription_end_date: data.data.subscriptionEndDate,
            subscription_start_date: data.data.subscriptionStartDate,
            subscription_plan_id: data.data.subscriptionPlanId
          });
        }
        setCurrencyVerificationToast('تم التحقق بنجاح وتأكيد صحة رصيد العملات والاشتراك من الخادم المركزي.');
      } else {
        setCurrencyVerificationToast(data.error || 'تعذر التحقق من الرصيد والاشتراك.');
      }
    } catch (err) {
      setCurrencyVerificationToast('حدث خطأ في الاتصال أثناء التحقق من الرصيد.');
    } finally {
      setIsVerifyingCurrency(false);
      setTimeout(() => setCurrencyVerificationToast(null), 5000);
    }
  };

  useEffect(() => {
    const updateCountdown = () => {
      if (verifiedCurrencyData?.dailyRenewal?.nextRenewalIso) {
        const diffMs = new Date(verifiedCurrencyData.dailyRenewal.nextRenewalIso).getTime() - Date.now();
        if (diffMs > 0) {
          const totalSec = Math.floor(diffMs / 1000);
          const h = Math.floor(totalSec / 3600);
          const m = Math.floor((totalSec % 3600) / 60);
          const s = totalSec % 60;
          setRenewalCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
          return;
        }
      }
      const now = new Date();
      const nextUtcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const diff = Math.max(0, Math.floor((nextUtcMidnight.getTime() - now.getTime()) / 1000));
      const hours = Math.floor(diff / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      const secs = diff % 60;
      setRenewalCountdown(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [verifiedCurrencyData]);

  // Multi-Device Management State (Max 3 Devices)
  const [userDevices, setUserDevices] = useState<any[]>([]);
  const [loadingDevices, setLoadingDevices] = useState<boolean>(false);
  const [deviceActionMessage, setDeviceActionMessage] = useState<{ text: string; type: 'success' | 'error' }>({ text: '', type: 'success' });
  const [sessionRevokedModal, setSessionRevokedModal] = useState<boolean>(false);

  const handleSessionRevoked = () => {
    localStorage.removeItem('egs_token');
    localStorage.removeItem('egs_user');
    setToken(null);
    setUser(null);
    setCoins(15.0);
    setSessionRevokedModal(true);
  };

  const fetchUserDevices = async () => {
    if (!token) return;
    setLoadingDevices(true);
    try {
      const currentDevId = localStorage.getItem('egs_device_id') || undefined;
      const res = await fetch(`/api/auth/devices?device_id=${currentDevId || ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-device-id': currentDevId || ''
        }
      });
      const data = await res.json();
      if (res.status === 401 && (data.error?.includes('أجهزة') || data.code === 'device_session_revoked' || data.code === 'device_limit_exceeded')) {
        handleSessionRevoked();
        return;
      }
      if (data.success && data.devices) {
        setUserDevices(data.devices);
      }
    } catch (err) {
      console.error('Failed to fetch user devices:', err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleLogoutDevice = async (targetDeviceId: string) => {
    if (!token) return;
    try {
      const currentDevId = localStorage.getItem('egs_device_id') || undefined;
      const res = await fetch(`/api/auth/devices?device_id=${targetDeviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-device-id': currentDevId || ''
        }
      });
      const data = await res.json();
      if (data.success) {
        setDeviceActionMessage({ text: 'تم تسجيل الخروج من الجهاز بنجاح.', type: 'success' });
        fetchUserDevices();
        setTimeout(() => setDeviceActionMessage({ text: '', type: 'success' }), 4000);
      } else {
        setDeviceActionMessage({ text: data.error || 'فشل تسجيل الخروج من الجهاز.', type: 'error' });
      }
    } catch (err: any) {
      setDeviceActionMessage({ text: err.message || 'حدث خطأ غير متوقع.', type: 'error' });
    }
  };

  const handleLogoutAllOtherDevices = async () => {
    if (!token) return;
    try {
      const currentDevId = localStorage.getItem('egs_device_id') || undefined;
      const res = await fetch(`/api/auth/devices?action=logout_all_others`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-device-id': currentDevId || ''
        }
      });
      const data = await res.json();
      if (data.success) {
        setDeviceActionMessage({ text: 'تم تسجيل الخروج من جميع الأجهزة الأخرى بنجاح.', type: 'success' });
        fetchUserDevices();
        setTimeout(() => setDeviceActionMessage({ text: '', type: 'success' }), 4000);
      } else {
        setDeviceActionMessage({ text: data.error || 'فشل تسجيل الخروج من الأجهزة الأخرى.', type: 'error' });
      }
    } catch (err: any) {
      setDeviceActionMessage({ text: err.message || 'حدث خطأ غير متوقع.', type: 'error' });
    }
  };

  const handleResetUserDevices = async (targetUserId: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: targetUserId, action: 'reset_devices' })
      });
      const data = await res.json();
      if (data.success) {
        loadAdminUsers();
      }
    } catch (err) {
      console.error('Failed to reset user devices:', err);
    }
  };
  
  // Phase 2 Helper Functions
  const fetchFlashcardDecks = async () => {
    if (!token) return;
    setLoadingDecks(true);
    try {
      const res = await fetch('/api/flashcards', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFlashcardDecks(data.decks || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDecks(false);
    }
  };

  const fetchDueCards = async (deckId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/flashcards/review?deck_id=${deckId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDeckCards(data.cards || []);
        setCurrentCardIndex(0);
        setIsCardFlipped(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const submitCardReview = async (cardId: string, rating: number) => {
    if (!token) return;
    try {
      const res = await fetch('/api/flashcards/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ card_id: cardId, rating })
      });
      const data = await res.json();
      if (data.success) {
        if (currentCardIndex < deckCards.length - 1) {
          setIsCardFlipped(false);
          setTimeout(() => {
            setCurrentCardIndex(prev => prev + 1);
          }, 300);
        } else {
          alert('تهانينا! لقد أكملت مراجعة جميع الكروت المستحقة في هذه المجموعة.');
          setSelectedDeck(null);
          fetchFlashcardDecks();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSubjectCards = async (subjectName: string) => {
    if (!token) return;
    setLoadingDecks(true);
    try {
      const res = await fetch(`/api/flashcards/subject?subject_name=${encodeURIComponent(subjectName)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSubjectDecks(data.decks || []);
        setSubjectCards(data.cards || []);
        setActiveStackIndex(0);
        setDoneCards([]);
        setIsCardFlipped(false);
        setFlashcardViewMode('grid');
        setRevealedAnswers({});
        setDeckFilter(null);
        setSelectedFlashcardSubject(subjectName);
      }
    } catch (e) {
      console.error('Fetch subject cards error:', e);
    } finally {
      setLoadingDecks(false);
    }
  };

  const advancePlayingCard = (targetIndex?: number) => {
    if (isDealingAway) return;
    setIsDealingAway(true);
    setTimeout(() => {
      setIsCardFlipped(false);
      if (targetIndex !== undefined) {
        setActiveStackIndex(targetIndex);
      } else {
        setActiveStackIndex(prev => prev + 1);
      }
      setIsDealingAway(false);
    }, 420);
  };

  const submitSubjectCardReview = async (cardId: string, rating: number) => {
    if (!token) return;
    try {
      const currentCard = subjectCards[activeStackIndex];
      fetch('/api/flashcards/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ card_id: cardId, rating })
      }).catch(err => console.error(err));
      if (currentCard) {
        setDoneCards(prev => [...prev, currentCard]);
      }
      advancePlayingCard();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCardEdit = async (cardId: string, question: string, answer: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/flashcards/card', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: cardId, question, answer })
      });
      const data = await res.json();
      if (data.success) {
        setSubjectCards(prev => prev.map(c => c.id === cardId ? { ...c, question, answer } : c));
        setEditingCard(null);
      } else {
        alert(data.error || 'فشل تعديل الكارت');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!token || !confirm('هل أنت تأكد من حذف هذا الكارت؟')) return;
    try {
      const res = await fetch(`/api/flashcards/card?id=${cardId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSubjectCards(prev => prev.filter(c => c.id !== cardId));
        setEditingCard(null);
      } else {
        alert(data.error || 'فشل حذف الكارت');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRenameDeck = async (deckId: string, newTitle: string) => {
    if (!token || !newTitle.trim()) return;
    try {
      const res = await fetch('/api/flashcards', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: deckId, title: newTitle.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setEditingDeck(null);
        fetchFlashcardDecks();
        if (selectedFlashcardSubject) {
          fetchSubjectCards(selectedFlashcardSubject);
        }
      } else {
        alert(data.error || 'فشل إعادة التسمية');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (!token || !confirm('هل أنت تأكد من حذف هذه المجموعة بالكامل؟')) return;
    try {
      const res = await fetch(`/api/flashcards?id=${deckId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchFlashcardDecks();
        if (selectedFlashcardSubject) {
          fetchSubjectCards(selectedFlashcardSubject);
        }
      } else {
        alert(data.error || 'فشل حذف المجموعة');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualCreateDeck = async () => {
    if (!token || !flashcardSubject || !manualDeckTitle) return;
    const validCards = manualCardsList.filter(c => c.question.trim() && c.answer.trim());
    if (validCards.length === 0) {
      alert('يرجى إضافة كارت واحد على الأقل يحتوي على سؤال وإجابة');
      return;
    }

    setGeneratingDecks(true);
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject_name: flashcardSubject,
          grade_level: user?.grade_level || '1_high',
          title: manualDeckTitle,
          cards: validCards
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowFlashcardCreateModal(false);
        setManualDeckTitle('');
        setManualCardsList([{ question: '', answer: '' }]);
        fetchFlashcardDecks();
        if (selectedFlashcardSubject === flashcardSubject) {
          fetchSubjectCards(flashcardSubject);
        }
      } else {
        alert(data.error || 'فشل إنشاء الكروت');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingDecks(false);
    }
  };

  const fetchCurriculumStructure = async (grade: string, subject: string) => {
    if (!grade || !subject) return null;
    const cacheKey = `${grade}_${subject}`;
    if (curriculumStructures[cacheKey]) return curriculumStructures[cacheKey];

    setLoadingStructure(true);
    try {
      const res = await fetch(`/api/curriculum/structure?grade_level=${encodeURIComponent(grade)}&subject_name=${encodeURIComponent(subject)}`);
      const data = await res.json();
      if (data.success) {
        const structureData = {
          units: data.units || [],
          totalLessons: data.totalLessons || 0,
          hasCurriculum: !!data.hasCurriculum
        };
        setCurriculumStructures(prev => ({
          ...prev,
          [cacheKey]: structureData
        }));
        return structureData;
      }
    } catch (e) {
      console.error('Failed to load curriculum structure:', e);
    } finally {
      setLoadingStructure(false);
    }
    return null;
  };

  const generateFlashcardDeck = async () => {
    const activeTopic = flashcardTopic.trim() || (selectedFlashcardLesson ? selectedFlashcardLesson.title : '');
    if (!token || !flashcardSubject || !activeTopic) return;
    setGeneratingDecks(true);
    try {
      const currentGrade = user?.grade_level || chatGrade || '1_high';
      const res = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject_name: flashcardSubject,
          grade_level: currentGrade,
          topic: activeTopic,
          count: flashcardCount
        })
      });
      const data = await res.json();
      if (data.success) {
        setFlashcardTopic('');
        setSelectedFlashcardLesson(null);
        setShowFlashcardCreateModal(false);
        fetchFlashcardDecks();
        if (selectedFlashcardSubject === flashcardSubject) {
          fetchSubjectCards(flashcardSubject);
        }
      } else {
        alert(data.error || 'فشل توليد الكروت');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingDecks(false);
    }
  };

  const fetchLeaderboard = async (filter: 'all' | 'my') => {
    if (!token) return;
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`/api/leaderboard?grade_level=${filter}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLeaderboardData((data.leaderboard || []).slice(0, 10));
        setUserLeaderboardRank(data.user_rank || null);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  // Auth Form Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('1_high');
  const [selectedTrack, setSelectedTrack] = useState('medicine_life_sciences');
  const [selectedElective, setSelectedElective] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Google OAuth Extra States
  const [showGoogleGradeModal, setShowGoogleGradeModal] = useState(false);
  const [googleTempUser, setGoogleTempUser] = useState<any>(null);
  const [googleSelectedTrack, setGoogleSelectedTrack] = useState('medicine_life_sciences');
  const [googleSelectedElective, setGoogleSelectedElective] = useState('');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatSubject, setChatSubject] = useState('');
  const [chatGrade, setChatGrade] = useState('1_high'); // for guests
  const [showSubjectSheet, setShowSubjectSheet] = useState(false); // mobile material picker
  const [chatLoading, setChatLoading] = useState(false);
  const [guestMessagesCount, setGuestMessagesCount] = useState(0);
  const [deviceId, setDeviceId] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Placeholder Curriculum Notice Modal State
  const [placeholderModalCurriculum, setPlaceholderModalCurriculum] = useState<Curriculum | null>(null);

  // Sessions State
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Report State
  const [reportTarget, setReportTarget] = useState<{ content: string; userQuery: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  // Notification Center State
  const [activeNotifications, setActiveNotifications] = useState<any[]>([]);
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>([]);
  const [showNotifCenter, setShowNotifCenter] = useState(false);

  // Admin State
  const [adminSection, setAdminSection] = useState<'overview' | 'users' | 'notifications' | 'reports' | 'versions'>('overview');
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [uploadGrade, setUploadGrade] = useState('1_high');
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'placeholder'>('file');
  const [uploadTrackId, setUploadTrackId] = useState('');
  const [uploadIsElective, setUploadIsElective] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [attachCurriculumModal, setAttachCurriculumModal] = useState<Curriculum | null>(null);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachLoading, setAttachLoading] = useState(false);
  const [websiteLink, setWebsiteLink] = useState('http://localhost:3000');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState({ text: '', type: '' });
  const [renamingCurriculumId, setRenamingCurriculumId] = useState<string | null>(null);
  const [renameSubjectValue, setRenameSubjectValue] = useState('');

  // Admin: Users Management State
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUserSearch, setAdminUserSearch] = useState('');

  // Admin: Notifications Management State
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [adminNotificationsLoading, setAdminNotificationsLoading] = useState(false);
  const [newNotifTitle, setNewNotifTitle] = useState('');
  const [newNotifBody, setNewNotifBody] = useState('');
  const [newNotifType, setNewNotifType] = useState<'info' | 'success' | 'warning' | 'maintenance'>('info');
  const [newNotifTarget, setNewNotifTarget] = useState<'both' | 'web' | 'phone'>('both');
  const [notifCreateLoading, setNotifCreateLoading] = useState(false);

  // Admin: Reports Review State
  const [adminReports, setAdminReports] = useState<any[]>([]);
  const [adminReportsLoading, setAdminReportsLoading] = useState(false);
  const [reportsStatusFilter, setReportsStatusFilter] = useState<'pending' | 'reviewed' | 'dismissed' | ''>('pending');

  // Admin: Versions Management State
  const [adminVersions, setAdminVersions] = useState<any[]>([]);
  const [adminVersionsLoading, setAdminVersionsLoading] = useState(false);
  const [newVersionCode, setNewVersionCode] = useState('');
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionNotes, setNewVersionNotes] = useState('');
  const [newVersionUrl, setNewVersionUrl] = useState('');
  const [newVersionMandatory, setNewVersionMandatory] = useState(true);
  const [versionCreateLoading, setVersionCreateLoading] = useState(false);

  // Admin Editing State
  const [editCurriculumId, setEditCurriculumId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editGrade, setEditGrade] = useState('1_high');
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [editModalError, setEditModalError] = useState('');

  // Admin Manual Units & Lessons Index Manager State
  const [unitsModalCurr, setUnitsModalCurr] = useState<Curriculum | null>(null);
  const [unitsList, setUnitsList] = useState<CurriculumUnit[]>([]);
  const [unitsModalLoading, setUnitsModalLoading] = useState(false);
  const [unitsModalError, setUnitsModalError] = useState('');
  const [unitsModalSuccess, setUnitsModalSuccess] = useState('');

  // Admin Dashboard Stats State
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Configuration Settings State
  const [activeGradeLevels, setActiveGradeLevels] = useState<string[]>(['1_middle', '2_middle', '3_middle', '1_high', '2_high']);
  const [activeTracks, setActiveTracks] = useState<string[]>(['medicine_life_sciences', 'engineering_cs', 'business', 'arts_literature']);
  const [activeCurriculumIds, setActiveCurriculumIds] = useState<string[]>([]);
  const [savingTracks, setSavingTracks] = useState(false);

  // Profile Update State
  const [profileName, setProfileName] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileOtp, setProfileOtp] = useState('');
  const [profileOtpStep, setProfileOtpStep] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ text: '', type: '' });

  // Responsive Layout & PWA Detection
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showMobileInstallBanner, setShowMobileInstallBanner] = useState(false);
  const [showIosInstallModal, setShowIosInstallModal] = useState(false);

  // Exams States & Operations
  const [exams, setExams] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [activeExamAnswers, setActiveExamAnswers] = useState<Record<string, string>>({});
  const [examResult, setExamResult] = useState<any | null>(null);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [generatingExam, setGeneratingExam] = useState(false);

  const loadExamsData = async () => {
    setLoadingExams(true);
    try {
      const storedToken = localStorage.getItem('egs_token') || token;
      const headers: Record<string, string> = {};
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      if (deviceId) headers['x-device-id'] = deviceId;

      const currentGrade = user ? user.grade_level : chatGrade;
      const examsRes = await fetch(`/api/exams?grade_level=${currentGrade}&subject_name=${chatSubject}`, { headers });
      const examsData = await examsRes.json();
      setExams(Array.isArray(examsData) ? examsData : []);

      const subRes = await fetch(`/api/exams/submissions`, { headers });
      const subData = await subRes.json();
      setSubmissions(Array.isArray(subData) ? subData : []);
    } catch (e) {
      console.error('Error loading exams data:', e);
    } finally {
      setLoadingExams(false);
    }
  };

  const handleGenerateExam = async (customParams?: {
    topic: string;
    mode: 'auto' | 'total_only' | 'custom_types';
    total_count?: number;
    mcq_count?: number;
    tf_count?: number;
    essay_count?: number;
  }) => {
    if (coins <= 0) {
      const isSubscribed = user && user.plan_type && user.plan_type !== 'free' && user.subscription_status === 'active';
      if (isSubscribed) {
        alert('ليس لديك رصيد كافٍ من النقاط لإنشاء الامتحان. سيتجدد رصيدك تلقائياً غداً.');
      } else {
        alert('لقد استنفدت رصيدك التجريبي المجاني. يرجى الاشتراك في باقة Pro لإنشاء الامتحانات التفاعلية.');
        setShowUpgradeSheet(true);
      }
      return;
    }
    setGeneratingExam(true);
    try {
      const storedToken = localStorage.getItem('egs_token') || token;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      if (deviceId) headers['x-device-id'] = deviceId;

      const currentGrade = user ? user.grade_level : chatGrade;
      const targetSubject = (customParams as any)?.subject_name || examSubject || chatSubject;
      const res = await fetch('/api/exams/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subject_name: targetSubject,
          grade_level: currentGrade,
          ...customParams
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل توليد الامتحان');

      await loadExamsData();
      const examObj = data.exam || data;
      setSelectedExam(examObj);
      setActiveExamAnswers({});
      setExamResult(null);
      setSelectedExamLesson(null);
      setShowExamCreateModal(false); // Close custom creator modal
      const durationSeconds = (examObj.questions?.length || 5) * 120;
      if (examObj.id) {
        localStorage.setItem('egs_active_exam_id', examObj.id);
        localStorage.setItem('egs_active_exam_time', String(durationSeconds));
      }
      setExamTimeRemaining(durationSeconds);
      if (storedToken) {
        fetch('/api/config', { headers: { 'Authorization': `Bearer ${storedToken}` } })
          .then(r => r.json())
          .then(d => {
            if (d.user) {
              setUser(d.user);
              setCoins(d.user.coins ?? 50.0);
              setPoints(d.user.points ?? 0);
              localStorage.setItem('egs_user', JSON.stringify(d.user));
            }
          })
          .catch(() => {});
      }
    } catch (e: any) {
      alert(e.message || 'فشل توليد الامتحان بالذكاء الاصطناعي');
    } finally {
      setGeneratingExam(false);
    }
  };

  const handleSubmitExam = async () => {
    if (!selectedExam) return;
    if (coins <= 0) {
      const isSubscribed = user && user.plan_type && user.plan_type !== 'free' && user.subscription_status === 'active';
      if (isSubscribed) {
        alert('ليس لديك رصيد كافٍ من النقاط لتصحيح الامتحان. سيتجدد رصيدك تلقائياً غداً.');
      } else {
        alert('لقد استنفدت رصيدك التجريبي المجاني. يرجى الاشتراك في باقة Pro لتصحيح ومتابعة الامتحانات.');
        setShowUpgradeSheet(true);
      }
      return;
    }
    setGradingLoading(true);
    try {
      const storedToken = localStorage.getItem('egs_token') || token;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      if (deviceId) headers['x-device-id'] = deviceId;

      const res = await fetch('/api/exams/submit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          exam_id: selectedExam.id,
          answers: activeExamAnswers
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تصحيح الامتحان');

      setExamResult(data);

      if (data.points_awarded && data.points_awarded > 0) {
        triggerPointsAnim(data.points_awarded);
        setPoints(prev => {
          const newP = data.total_points !== undefined ? data.total_points : prev + data.points_awarded;
          try {
            const stored = localStorage.getItem('egs_user');
            if (stored) {
              const parsedUser = JSON.parse(stored);
              parsedUser.points = newP;
              localStorage.setItem('egs_user', JSON.stringify(parsedUser));
              setUser(parsedUser);
            }
          } catch (e) {}
          return newP;
        });
      }

      localStorage.removeItem('egs_active_exam_id');
      localStorage.removeItem('egs_active_exam_time');
      setExamTimeRemaining(0);
      loadExamsData();
    } catch (e: any) {
      alert(e.message || 'فشل تصحيح الامتحان');
    } finally {
      setGradingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'exams') {
      loadExamsData();
    }
  }, [activeTab, chatSubject, user?.grade_level]);

  // Exam timer countdown effect
  useEffect(() => {
    let interval: any;
    if (selectedExam && !examResult && examTimeRemaining > 0) {
      interval = setInterval(() => {
        setExamTimeRemaining(prev => {
          const next = prev - 1;
          localStorage.setItem('egs_active_exam_time', String(next));
          if (next <= 0) {
            clearInterval(interval);
            setTimeout(() => {
              handleSubmitExam();
            }, 100);
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [selectedExam, examResult, examTimeRemaining]);

  // Restore active exam on mount or when exams load
  useEffect(() => {
    const savedExamId = localStorage.getItem('egs_active_exam_id');
    const savedTime = localStorage.getItem('egs_active_exam_time');
    
    if (savedExamId && savedTime && exams.length > 0) {
      const activeExam = exams.find(e => e.id === savedExamId);
      if (activeExam) {
        setSelectedExam(activeExam);
        setExamTimeRemaining(parseInt(savedTime, 10));
      }
    }
  }, [exams]);

  useEffect(() => {
    if (activeTab === 'flashcards' && token) {
      fetchFlashcardDecks();
    }
  }, [activeTab, token]);

  useEffect(() => {
    if (activeTab === 'leaderboard' && token) {
      fetchLeaderboard(leaderboardFilter);
    }
  }, [activeTab, token, leaderboardFilter]);

  useEffect(() => {
    if (activeTab === 'profile' && token) {
      fetchUserDevices();
    }
  }, [activeTab, token]);

  // Kashier Payment Result Listener (from redirect)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const paymentResult = urlParams.get('payment_result');
    const plan = urlParams.get('plan');

    if (paymentResult === 'success') {
      const planTitle = plan === 'pro_3m' ? 'اشتراك 3 أشهر' : (plan === 'pro_2m' ? 'اشتراك شهرين' : 'اشتراك شهر (Pro)');
      const bonusCoins = plan === 'pro_3m' ? 2500 : (plan === 'pro_2m' ? 1000 : 500);
      const amount = plan === 'pro_3m' ? 250 : (plan === 'pro_2m' ? 100 : 50);

      setPaymentSuccessData({
        planTitle,
        amount,
        bonusCoins
      });

      const savedToken = localStorage.getItem('egs_token');
      if (savedToken) {
        fetch('/api/config', { headers: { 'Authorization': `Bearer ${savedToken}` } })
          .then(r => r.json())
          .then(d => {
            if (d.user) {
              setUser(d.user);
              setCoins(d.user.coins ?? 50.0);
              setPoints(d.user.points ?? 0);
              localStorage.setItem('egs_user', JSON.stringify(d.user));
            }
          })
          .catch(() => {});
      }

      window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentResult === 'failed') {
      setPaymentErrorToast('تعذرت عملية الدفع عبر كاشير أو تم إلغاؤها من قبل العميل.');
      setTimeout(() => setPaymentErrorToast(null), 6000);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const handleChatScroll = () => {
    if (!chatScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 160;
    setShowScrollBottom(!isNearBottom);
  };

  const scrollToBottom = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const skipHistoryReloadRef = useRef(false);
  const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string; description: string } | null>(null);
  const [isDescribingImage, setIsDescribingImage] = useState(false);
  const [editingImage, setEditingImage] = useState<{ dataUrl: string; mimeType: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showModeSheet, setShowModeSheet] = useState(false);
  const [showModelSheet, setShowModelSheet] = useState(false);
  const [showUpgradeSheet, setShowUpgradeSheet] = useState(false);

  // Helper for suggestions clicking
  const handleSuggestionClick = (text: string) => {
    setInputMessage(text);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);
  };

  const getSubjectIcon = (name: string, customSize?: number) => {
    const iconSize = customSize || (isMobile ? 14 : 18);
    if (!name) return <BookOpen size={iconSize} />;
    const n = name.toLowerCase();
    if (n.includes('فيزياء') || n.includes('physics')) return <Zap size={iconSize} />;
    if (n.includes('كيمياء') || n.includes('chemistry')) return <FlaskConical size={iconSize} />;
    if (n.includes('رياض') || n.includes('جبر') || n.includes('تفاضل') || n.includes('هندسة') || n.includes('math')) return <Calculator size={iconSize} />;
    if (n.includes('أحياء') || n.includes('احياء') || n.includes('biology')) return <Dna size={iconSize} />;
    if (n.includes('إنجليز') || n.includes('انجليز') || n.includes('لغة') || n.includes('فرنس') || n.includes('english')) return <Languages size={iconSize} />;
    if (n.includes('جغرافي') || n.includes('تاريخ')) return <Compass size={iconSize} />;
    return <BookOpen size={iconSize} />;
  };

  // Helper to render non-intrusive mobile PWA install banner
  const renderMobileInstallBanner = () => {
    if (!isMobileDevice || isStandalone || !showMobileInstallBanner) return null;
    return (
      <div 
        className="glass animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(125, 161, 70, 0.09)',
          border: '1px solid var(--border-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          boxShadow: 'var(--shadow-sm)',
          margin: '0 auto 10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'var(--primary-light)',
            color: 'var(--primary-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Download size={17} />
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              تثبيت تطبيق EGS AI على الهاتف
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              إضافة المنصة إلى الشاشة الرئيسية لفتح فوري وسلس
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleMobileInstallClick}
            className="btn-primary"
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.76rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              border: 'none'
            }}
          >
            <Download size={12} />
            <span>تثبيت</span>
          </button>

          <button
            type="button"
            onClick={handleDismissMobileInstallBanner}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm)'
            }}
            title="إخفاء"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  };

  // Helper to render student study hub (Subject Grid + Study Modes)
  const renderSuggestionChips = () => {
    const targetGrade = user ? user.grade_level : chatGrade;
    const activeSubjects = getActiveSubjectsForGrade(targetGrade);

    return (
      <div className="study-hub-container animate-fade-in">
        {/* Active Subjects Quick Selector */}
        {activeSubjects.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
                المواد الدراسية المقررة
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {user?.grade_level === '2_high' && user?.track_id && BACCALAUREATE_TRACKS[user.track_id] && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--primary-color)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    {BACCALAUREATE_TRACKS[user.track_id].name}
                  </span>
                )}
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {user ? GRADE_NAMES[user.grade_level] : GRADE_NAMES[chatGrade]}
                </span>
              </div>
            </div>
            <div 
              className="subject-cards-grid"
              style={isMobile ? {
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                gap: '8px',
                padding: '2px 2px 6px',
                width: '100%'
              } : {}}
            >
              {activeSubjects.map((s) => {
                const isSelected = chatSubject === s.subject_name;
                const isPlaceholder = !!s.is_placeholder;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      if (isPlaceholder) {
                        setPlaceholderModalCurriculum(s);
                      } else {
                        setChatSubject(s.subject_name);
                        if (textareaRef.current) textareaRef.current.focus();
                      }
                    }}
                    className={`subject-card-item ${isSelected ? 'active' : ''}`}
                    style={isMobile ? {
                      position: 'relative',
                      flex: '0 0 auto',
                      display: 'inline-flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '10px'
                    } : { position: 'relative' }}
                  >
                    {isPlaceholder && (
                      <span style={{
                        position: 'absolute',
                        top: '5px',
                        left: '5px',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        background: 'rgba(229, 169, 60, 0.18)',
                        color: 'var(--accent-gold, #E5A93C)',
                        border: '1px solid rgba(229, 169, 60, 0.35)',
                        borderRadius: '4px',
                        padding: '1px 5px',
                        lineHeight: '1.2'
                      }}>
                        قريباً
                      </span>
                    )}
                    <div className="subject-card-icon">
                      {getSubjectIcon(s.subject_name)}
                    </div>
                    <span className="subject-card-name">{s.subject_name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Practical Study Mode Cards (2x2 Neat Square Grid on Mobile) */}
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.02em' }}>
            ماذا تود أن تنجز الآن؟
          </div>
          <div 
            className="study-mode-cards-grid"
            style={isMobile ? {
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              width: '100%'
            } : {}}
          >
            {[
              {
                icon: <BookOpen size={isMobile ? 16 : 18} />,
                title: 'شرح وتفصيل درس',
                desc: 'شرح مبسط مع أمثلة وتوضيح المفاهيم الصعبة',
                action: () => {
                  const targetGrade = user ? user.grade_level : chatGrade;
                  const activeSubjs = getActiveSubjectsForGrade(targetGrade);
                  const currentSubj = activeSubjs.find(s => s.subject_name === chatSubject);
                  if (currentSubj?.is_placeholder) {
                    setPlaceholderModalCurriculum(currentSubj);
                    return;
                  }
                  handleSuggestionClick(`اشرح لي بالتفصيل وبأمثلة واضحة في منهج ${chatSubject || 'الدراسي'}: `);
                }
              },
              {
                icon: <Sparkles size={isMobile ? 16 : 18} />,
                title: 'حل مسألة أو سؤال',
                desc: 'تحليل المسائل المعقدة واستخراج الإجابات النموذجية',
                action: () => {
                  const targetGrade = user ? user.grade_level : chatGrade;
                  const activeSubjs = getActiveSubjectsForGrade(targetGrade);
                  const currentSubj = activeSubjs.find(s => s.subject_name === chatSubject);
                  if (currentSubj?.is_placeholder) {
                    setPlaceholderModalCurriculum(currentSubj);
                    return;
                  }
                  handleSuggestionClick(`ساعدني في حل وتفصيل هذه المسألة في ${chatSubject || 'المنهج'}: `);
                }
              },
              {
                icon: <FileText size={isMobile ? 16 : 18} />,
                title: 'امتحان تقييمي',
                desc: 'توليد اختبار ذكي بالذكاء الاصطناعي مع التصحيح الفوري',
                action: () => {
                  const targetGrade = user ? user.grade_level : chatGrade;
                  const activeSubjs = getActiveSubjectsForGrade(targetGrade);
                  const currentSubj = activeSubjs.find(s => s.subject_name === chatSubject);
                  if (currentSubj?.is_placeholder) {
                    setPlaceholderModalCurriculum(currentSubj);
                    return;
                  }
                  const subj = chatSubject || (activeSubjs[0]?.subject_name || '');
                  setExamSubject(subj);
                  setExamTopic('');
                  setSelectedExamLesson(null);
                  setLessonSearchQuery('');
                  setExamLessonTab('curriculum');
                  setShowExamCreateModal(true);
                  if (subj) fetchCurriculumStructure(targetGrade, subj);
                }
              },
              {
                icon: <Brain size={isMobile ? 16 : 18} />,
                title: 'المدرب الذكي والكروت',
                desc: 'مراجعة المفاهيم بطريقة التكرار المتباعد الذكية',
                action: () => {
                  const targetGrade = user ? user.grade_level : chatGrade;
                  const activeSubjs = getActiveSubjectsForGrade(targetGrade);
                  const currentSubj = activeSubjs.find(s => s.subject_name === chatSubject);
                  if (currentSubj?.is_placeholder) {
                    setPlaceholderModalCurriculum(currentSubj);
                    return;
                  }
                  setActiveTab('flashcards');
                  if (chatSubject) fetchSubjectCards(chatSubject);
                }
              }
            ].map((card, idx) => (
              <div
                key={idx}
                onClick={card.action}
                className="study-mode-card-item"
                style={isMobile ? {
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '12px 6px',
                  borderRadius: '14px',
                  minHeight: '70px',
                  gap: '6px'
                } : {}}
              >
                <div 
                  className="study-mode-card-icon"
                  style={isMobile ? {
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    margin: 0
                  } : {}}
                >
                  {card.icon}
                </div>
                <div style={isMobile ? { textAlign: 'center', width: '100%' } : {}}>
                  <div 
                    className="study-mode-card-title"
                    style={isMobile ? {
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      lineHeight: 1.25,
                      whiteSpace: 'nowrap',
                      margin: 0,
                      textAlign: 'center'
                    } : {}}
                  >
                    {card.title}
                  </div>
                  {!isMobile && <div className="study-mode-card-desc">{card.desc}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const getElectiveSubjectsForTrack = (trackId: string): string[] => {
    if (!trackId) return [];
    const trackCurrs = curriculums.filter(c => c.grade_level === '2_high' && c.track_id === trackId);
    const electivesOnly = trackCurrs.filter(c => c.is_elective).map(c => c.subject_name.trim());
    if (electivesOnly.length > 0) return Array.from(new Set(electivesOnly));
    return Array.from(new Set(trackCurrs.map(c => c.subject_name.trim())));
  };

  const getActiveSubjectsForGrade = (grade: string) => {
    let filtered = curriculums.filter(c => c.grade_level === grade);
    if (activeCurriculumIds.length > 0) {
      filtered = filtered.filter(c => activeCurriculumIds.includes(c.id) || c.is_placeholder);
    }

    // For 2_high (Baccalaureate): dynamically filter to common subjects + student's track & elective
    if (grade === '2_high') {
      const currentTrack = (user && user.grade_level === '2_high' && user.track_id) ? user.track_id : selectedTrack;
      const currentElective = (user && user.grade_level === '2_high' && user.elective_subject) ? user.elective_subject : selectedElective;

      if (currentTrack) {
        filtered = filtered.filter(c => {
          // If curriculum is specifically assigned to a different track, exclude it
          if (c.track_id && c.track_id !== currentTrack) {
            return false;
          }
          // If curriculum is an elective for this track
          if (c.track_id === currentTrack && c.is_elective) {
            if (currentElective) {
              return c.subject_name.trim() === currentElective.trim();
            }
            return true;
          }
          // Common subjects for 2_high (no track_id) or non-elective track subjects
          return true;
        });
      }
    }

    if (filtered.length > 0) return filtered;
    return curriculums.filter(c => c.grade_level === grade);
  };

  useEffect(() => {
    const targetGrade = user ? user.grade_level : chatGrade;
    const availableSubjects = getActiveSubjectsForGrade(targetGrade);
    if (availableSubjects.length > 0) {
      const nonPlaceholder = availableSubjects.filter(s => !s.is_placeholder);
      const exists = availableSubjects.some(s => s.subject_name === chatSubject);
      if (!exists) {
        setChatSubject((nonPlaceholder[0] || availableSubjects[0]).subject_name);
      }
    } else {
      setChatSubject('');
    }
  }, [user, chatGrade, curriculums, activeCurriculumIds, selectedTrack, selectedElective]);

  // Helper to render input form (centered or bottom)
  const renderInputForm = (isCentered: boolean) => {
    const targetGrade = user ? user.grade_level : chatGrade;
    const activeSubjects = getActiveSubjectsForGrade(targetGrade);
    const hasMessage = inputMessage.trim().length > 0;

    const activeSession = sessions.find(s => s.id === activeSessionId);
    const isSessionCourseValid = !activeSessionId || !activeSession || curriculums.some(c => 
      c.subject_name === activeSession.subject_name && 
      c.grade_level === activeSession.grade_level &&
      (activeCurriculumIds.includes(c.id) || c.is_placeholder)
    );

    const currentGrade = user ? user.grade_level : chatGrade;
    const currentSubjectObj = curriculums.find(c => 
      c.subject_name === chatSubject && 
      c.grade_level === currentGrade
    );
    const hasCurriculum = !!currentSubjectObj;
    const isPlaceholderSubject = !!currentSubjectObj?.is_placeholder;

    const guestLimitReached = !user && guestMessagesCount >= 5;

    let isDisabled = chatLoading || isDescribingImage;
    let placeholderText = chatSubject ? `اسألني عن أي شيء في منهج ${chatSubject}...` : 'اسألني عن أي شيء...';

    if (guestLimitReached) {
      isDisabled = true;
      placeholderText = "لقد استنفدت الرسائل الـ 5 المجانية المتاحة لك كزائر. يرجى تسجيل الدخول للمتابعة!";
    } else if (!isSessionCourseValid) {
      isDisabled = true;
      placeholderText = "يرجى بدء محادثة جديدة لأن المنهج قد تم تعديله أو حذفه.";
    } else if (isPlaceholderSubject) {
      isDisabled = true;
      placeholderText = `منهج ${chatSubject} قيد الإعداد والتجهيز حالياً بالذكاء الاصطناعي...`;
    } else if (!hasCurriculum && chatSubject) {
      isDisabled = true;
      placeholderText = "المنهج الدراسي غير متوفر حالياً.";
    }

    const toggleModelMenu = () => {
      if (isMobile) {
        setShowModelSheet(true);
      } else {
        setShowModelMenu(prev => !prev);
      }
    };

    const handleModelSelect = (model: 'flash' | 'pro') => {
      // Pro model unlocked for registered users
      if (model === 'pro' && !user) {
        alert('يرجى تسجيل الدخول لاستخدام نموذج المحترفين (Pro).');
      } else {
        setSelectedModel(model);
      }
      setShowModelMenu(false);
      setShowModelSheet(false);
    };

    const CHAT_MODES: { key: 'socratic' | 'detailed' | 'summary'; label: string; icon: React.ReactNode }[] = [
      { key: 'socratic', label: 'سقراطي', icon: <MessageCircleQuestion size={13} /> },
      { key: 'detailed', label: 'شرح مفصل', icon: <GraduationCap size={13} /> },
      { key: 'summary', label: 'ملخص', icon: <ListChecks size={13} /> },
    ];
    const activeModeInfo = CHAT_MODES.find(m => m.key === chatMode) || CHAT_MODES[1];

    const handleModeSelect = (mode: 'socratic' | 'detailed' | 'summary') => {
      setChatMode(mode);
      localStorage.setItem('egs_chat_mode', mode);
      setShowModeMenu(false);
      setShowModeSheet(false);
    };

    return (
      <form onSubmit={handleSendMessage} style={{ width: '100%', maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* Zero-Coins Motivational Banner for Free Accounts */}
        {user && (user.role !== 'admin' && !user.unlimited_credit) && coins <= 0 && !isUserSubscribed && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(125, 161, 70, 0.12) 0%, rgba(229, 169, 60, 0.14) 100%)',
            border: '1.5px solid var(--primary-color)',
            borderRadius: '16px',
            padding: isMobile ? '12px 14px' : '14px 18px',
            marginBottom: '10px',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: isMobile ? '10px' : '14px',
            direction: 'rtl',
            boxShadow: 'var(--shadow-sm)',
            animation: 'fadeInFast 0.3s ease forwards'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
              <div style={{
                background: 'var(--primary-color)',
                color: '#fff',
                width: isMobile ? '32px' : '38px',
                height: isMobile ? '32px' : '38px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(125, 161, 70, 0.35)'
              }}>
                <Sparkles size={isMobile ? 16 : 18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? '0.84rem' : '0.9rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', lineHeight: '1.3' }}>
                  <span>أنت بطل المذاكرة اليوم!</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--secondary-color)', fontWeight: 700, background: 'rgba(229, 169, 60, 0.14)', padding: '1px 6px', borderRadius: '6px' }}>
                    استنفدت رصيدك اليومي
                  </span>
                </div>
                <div style={{ fontSize: isMobile ? '0.74rem' : '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.45' }}>
                  اشترك الآن في باقة Pro لتفعيل رصيد يومي متجدد ومواصلة المذاكرة وحل الامتحانات.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowUpgradeSheet(true);
                setActiveTab('subscriptions');
                if (isMobile) setSidebarOpen(false);
              }}
              className="btn-primary"
              style={{
                padding: isMobile ? '10px 14px' : '8px 16px',
                borderRadius: '10px',
                fontSize: isMobile ? '0.8rem' : '0.82rem',
                fontWeight: 800,
                width: isMobile ? '100%' : 'auto',
                flexShrink: 0,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(125, 161, 70, 0.3)'
              }}
            >
              <CreditCard size={15} />
              <span>اشتراك عبر كاشير (فودافون كاش / فيزا)</span>
            </button>
          </div>
        )}

        {pendingImage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--card-bg)',
            padding: '8px 12px',
            borderRadius: '14px',
            border: '1px solid var(--border-color)',
            marginBottom: '8px',
            boxShadow: 'var(--shadow-sm)',
            direction: 'rtl'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img 
                src={`data:${pendingImage.mimeType};base64,${pendingImage.base64}`} 
                alt="Upload preview" 
                style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  تم إرفاق الصورة بنجاح
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--primary-color)' }}>
                  جاهزة للإرسال مع السؤال (سيتم تحليلها فور الإرسال)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPendingImage(null);
              }}
              style={{
                background: 'var(--alpha-white-4)',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition-fast)'
              }}
              title="حذف الصورة"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="composer-dock-container">
          {/* Main Input + Buttons Row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', direction: 'rtl' }}>
            
            {/* Image attachment button */}
            <button
              type="button"
              disabled={isDisabled}
              onClick={() => imageInputRef.current?.click()}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: pendingImage ? 'var(--primary-light)' : 'var(--alpha-white-4)',
                border: pendingImage ? '1.5px solid var(--primary-color)' : '1px solid var(--border-color)',
                color: pendingImage ? 'var(--primary-color)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
                flexShrink: 0,
                transition: 'var(--transition-fast)'
              }}
              title="إرفاق صورة مسألة أو سؤال"
            >
              <ImageIcon size={17} />
            </button>
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              style={{ display: 'none' }}
            />

            {/* Auto-growing Textarea */}
            <textarea
              ref={isCentered ? null : textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e as any);
                }
              }}
              placeholder={placeholderText}
              disabled={isDisabled}
              rows={1}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: '16px',
                lineHeight: '1.5',
                minHeight: '38px',
                maxHeight: '160px',
                padding: '8px 4px',
                color: 'var(--text-main)',
                direction: 'rtl',
                textAlign: 'right',
                fontFamily: 'var(--font-arabic)',
              }}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={isDisabled || (!hasMessage && !pendingImage)}
              className={`send-button ${(hasMessage || pendingImage) && !isDisabled ? 'active' : ''}`}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="إرسال"
            >
              <Send size={16} />
            </button>
          </div>

          {/* Quick-Controls Scrollable Feature Toolbar */}
          {/* Quick-Controls Scrollable Feature Toolbar */}
          <div className="composer-features-toolbar">
            
            {/* Feature 1: Mode / Template Selector */}
            <button
              type="button"
              onClick={() => setShowModeSheet(true)}
              className={`composer-feature-pill ${chatMode !== 'detailed' ? 'active' : ''}`}
              title="تغيير نمط الشرح والتدريس"
            >
              {activeModeInfo.icon}
              <span>{activeModeInfo.label}</span>
              <span style={{ fontSize: '0.62rem', opacity: 0.7 }}>▾</span>
            </button>

            {/* Feature 2: Deep Thinking (CoT) Toggle */}
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  alert('يرجى تسجيل الدخول لاستخدام ميزة التفكير العميق.');
                } else {
                  setThinkingEnabled(!thinkingEnabled);
                }
              }}
              className={`composer-feature-pill ${thinkingEnabled ? 'active-glow' : ''}`}
              title="تفعيل ميزة التفكير العميق لتحليل أدق المسائل"
            >
              <Brain size={13} />
              <span>{thinkingEnabled ? 'التفكير مفعل' : 'تفكير عميق'}</span>
              {!user && <Lock size={10} style={{ opacity: 0.6 }} />}
            </button>

            {/* Feature 3: AI Model Selector */}
            <button
              type="button"
              onClick={() => setShowModelSheet(true)}
              className={`composer-feature-pill ${selectedModel === 'pro' ? 'active-gold' : ''}`}
              title="تبديل نموذج الذكاء الاصطناعي"
            >
              {selectedModel === 'pro' ? <Sparkles size={13} /> : <Zap size={13} />}
              <span>{selectedModel === 'pro' ? 'Pro فائق' : 'Fast سريع'}</span>
              <span style={{ fontSize: '0.62rem', opacity: 0.7 }}>▾</span>
            </button>

            {/* Feature 4: Subject Selection */}
            {messages.length === 0 ? (
              <button
                type="button"
                onClick={() => setShowSubjectSheet(true)}
                className="composer-feature-pill"
                title="تحديد المادة الدراسية"
              >
                {getSubjectIcon(chatSubject)}
                <span>{chatSubject || 'المادة الدراسية'}</span>
                <span style={{ fontSize: '0.62rem', opacity: 0.7 }}>▾</span>
              </button>
            ) : (
              <div className="composer-feature-pill" style={{ cursor: 'default', opacity: 0.9 }}>
                {getSubjectIcon(chatSubject)}
                <span>{chatSubject}</span>
              </div>
            )}

            {/* Feature 5: Grade (for guests) */}
            {!user && messages.length === 0 && (
              <button
                type="button"
                onClick={() => setShowSubjectSheet(true)}
                className="composer-feature-pill"
                title="تحديد الصف الدراسي"
              >
                <GraduationCap size={13} />
                <span>{GRADE_NAMES[chatGrade] || 'الصف'}</span>
                <span style={{ fontSize: '0.62rem', opacity: 0.7 }}>▾</span>
              </button>
            )}

          </div>
        </div>
      </form>
    );
  };

  // Teaching template / mode picker modal & sheet
  const renderModeSheet = () => {
    if (!showModeSheet) return null;

    return (
      <div className="bottom-sheet-overlay" onClick={() => setShowModeSheet(false)}>
        <div className="bottom-sheet-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '100%' }}>
          <div className="sheet-handle" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap size={20} style={{ color: 'var(--primary-color)' }} />
              <span style={{ fontSize: '1.05rem', fontWeight: 800 }}>اختر نمط الشرح والتدريس</span>
            </div>
            <button type="button" onClick={() => setShowModeSheet(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              {
                key: 'detailed',
                label: 'شرح وتفصيل شامل (الافتراضي)',
                desc: 'شرح أكاديمي منهجي متكامل مع تبسيط القوانين والأمثلة التوضيحية لضمان أعلى استيعاب وفهم.',
                icon: <GraduationCap size={22} />,
                badge: 'موصى به'
              },
              {
                key: 'socratic',
                label: 'الحوار السقراطي التفاعلي',
                desc: 'توجيه ذكي بالأسئلة والملاحظات المتدرجة لتصل إلى الحل بنفسك وتنمي مهارات التفكير العلمي.',
                icon: <MessageCircleQuestion size={22} />,
                badge: 'تفكير نقدي'
              },
              {
                key: 'summary',
                label: 'ملخص وتركيز سريع',
                desc: 'كبسولات مركزة لأهم القوانين والنقاط والمفاهيم للمراجعة السريعة قبل الامتحانات.',
                icon: <ListChecks size={22} />,
                badge: 'مراجعة نهائية'
              }
            ].map((m) => {
              const isSelected = chatMode === m.key;
              return (
                <div
                  key={m.key}
                  onClick={() => {
                    setChatMode(m.key as any);
                    localStorage.setItem('egs_chat_mode', m.key);
                    setShowModeSheet(false);
                  }}
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                    background: isSelected ? 'var(--primary-light)' : 'var(--sidebar-bg)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: isSelected ? 'var(--primary-color)' : 'var(--alpha-white-4)',
                    color: isSelected ? 'var(--text-on-primary)' : 'var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {m.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: isSelected ? 'var(--primary-color)' : 'var(--text-main)' }}>
                        {m.label}
                      </span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, background: 'var(--alpha-white-5)', padding: '2px 8px', borderRadius: 'var(--radius-full)', color: 'var(--text-muted)' }}>
                        {m.badge}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                      {m.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // AI model picker modal & sheet
  const renderModelSheet = () => {
    if (!showModelSheet) return null;

    return (
      <div className="bottom-sheet-overlay" onClick={() => setShowModelSheet(false)}>
        <div className="bottom-sheet-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '100%' }}>
          <div className="sheet-handle" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} style={{ color: 'var(--primary-color)' }} />
              <span style={{ fontSize: '1.05rem', fontWeight: 800 }}>اختر نموذج الذكاء الاصطناعي</span>
            </div>
            <button type="button" onClick={() => setShowModelSheet(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              {
                key: 'flash',
                title: 'Fast سريع (DeepSeek Flash)',
                desc: 'استجابة فورية فائقة السرعة للأسئلة المباشرة وشرح المفاهيم العامة.',
                icon: <Zap size={22} />,
                badge: 'سرعة فائقة'
              },
              {
                key: 'pro',
                title: 'Pro محترف (DeepSeek Reasoner)',
                desc: 'أعلى دقة أكاديمية وتحليل مستفيض خطوة بخطوة لأصعب مسائل الثانوية والإعدادية.',
                icon: <Sparkles size={22} />,
                badge: 'دقة قصوى'
              }
            ].map((m) => {
              const isSelected = selectedModel === m.key;
              return (
                <div
                  key={m.key}
                  onClick={() => {
                    if (m.key === 'pro' && !user) {
                      alert('يرجى تسجيل الدخول لاستخدام نموذج المحترفين (Pro).');
                    } else {
                      setSelectedModel(m.key as any);
                      setShowModelSheet(false);
                    }
                  }}
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                    background: isSelected ? 'var(--primary-light)' : 'var(--sidebar-bg)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: isSelected ? 'var(--primary-color)' : 'var(--alpha-white-4)',
                    color: isSelected ? 'var(--text-on-primary)' : 'var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {m.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: isSelected ? 'var(--primary-color)' : 'var(--text-main)' }}>
                        {m.title}
                      </span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, background: 'var(--alpha-white-5)', padding: '2px 8px', borderRadius: 'var(--radius-full)', color: 'var(--text-muted)' }}>
                        {m.badge}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                      {m.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Motivational Upgrade Bottom Sheet for Depleted Funds / Subscriptions
  const renderUpgradeSheet = () => {
    if (!showUpgradeSheet || isUserSubscribed) return null;

    return (
      <div className="bottom-sheet-overlay" onClick={() => setShowUpgradeSheet(false)}>
        <div className="bottom-sheet-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <div className="sheet-handle" />
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} style={{ color: 'var(--secondary-color)' }} />
              <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)' }}>ترقية الحساب إلى باقة Pro</span>
            </div>
            <button type="button" onClick={() => setShowUpgradeSheet(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
              <X size={18} />
            </button>
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0 0 16px' }}>
            اختر الباقة المناسبة لك لتجديد رصيدك يومياً والاستمتاع بكامل ميزات المساعد الذكي والتفكير المستفيض:
          </p>

          {/* 3 Quick Plans */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {[
              { id: 'pro_1m', title: 'باقة شهر (1 Month)', price: '60', period: 'شهرياً', points: '80 نقطة يومياً', featured: true },
              { id: 'pro_2m', title: 'باقة شهرين (2 Months)', price: '100', period: 'شهرين', points: '90 نقطة يومياً', featured: false },
              { id: 'pro_3m', title: 'باقة 3 أشهر (3 Months)', price: '140', period: '3 أشهر', points: '120 نقطة يومياً', featured: false },
            ].map((p) => (
              <div
                key={p.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: 'var(--sidebar-bg)',
                  border: p.featured ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>{p.title}</span>
                    {p.featured && (
                      <span style={{ background: 'var(--primary-color)', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', borderRadius: 'var(--radius-full)' }}>
                        الأكثر طلباً
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.76rem', color: 'var(--primary-color)', fontWeight: 700 }}>
                    {p.points}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)' }}>{p.price}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}> ج.م</span>
                  </div>
                  <button
                    type="button"
                    disabled={subscribingPlan !== null}
                    onClick={() => {
                      setShowUpgradeSheet(false);
                      handleSubscribe(p.id);
                    }}
                    className="btn-primary"
                    style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800 }}
                  >
                    {subscribingPlan === p.id ? <Loader2 size={14} className="animate-spin" /> : <span>اشتراك</span>}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Payment Badges */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
              طرق دفع فورية وآمنة عبر كاشير (Kashier):
            </div>
            <div className="payment-badges-row">
              <span className="payment-badge-chip"><Phone size={12} /> فودافون كاش</span>
              <span className="payment-badge-chip"><Zap size={12} /> انستاباي InstaPay</span>
              <span className="payment-badge-chip"><CreditCard size={12} /> كروت ميزة</span>
              <span className="payment-badge-chip"><CreditCard size={12} /> فيزا وماستركارد</span>
            </div>
          </div>

          {/* Refund policy note */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-muted)', background: 'rgba(16, 185, 129, 0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <CheckCircle size={14} color="var(--success-color)" />
            <span>ضمان استرجاع كامل المبلغ خلال 3 أيام بدون أي مخاطرة.</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowUpgradeSheet(false);
              setActiveTab('subscriptions');
            }}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '10px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              color: 'var(--text-muted)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            عرض كافة تفاصيل الباقات والأسعار
          </button>
        </div>
      </div>
    );
  };

  // Material picker — responsive modal and sheet of subject cards + grade options.
  const renderSubjectSheet = () => {
    if (!showSubjectSheet) return null;

    const targetGrade = user ? user.grade_level : chatGrade;
    const sheetSubjects = getActiveSubjectsForGrade(targetGrade);
    const canPickGrade = !user; // guests choose their grade; logged-in users are fixed
    const gradeEntries = Object.entries(GRADE_NAMES).filter(
      ([key]) =>
        (activeGradeLevels.length === 0 || activeGradeLevels.includes(key)) &&
        curriculums.some((c) => c.grade_level === key)
    );

    return (
      <div className="bottom-sheet-overlay" onClick={() => setShowSubjectSheet(false)}>
        <div className="bottom-sheet-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', width: '100%' }}>
          <div className="sheet-handle" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={20} style={{ color: 'var(--primary-color)' }} />
              <span style={{ fontSize: '1.05rem', fontWeight: 800 }}>اختر المادة الدراسية</span>
            </div>
            <button type="button" onClick={() => setShowSubjectSheet(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
              <X size={18} />
            </button>
          </div>

          {sheetSubjects.length > 0 ? (
            <div className="subject-grid">
              {sheetSubjects.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`subject-card ${chatSubject === c.subject_name ? 'selected' : ''}`}
                  onClick={() => {
                    setShowSubjectSheet(false);
                    if (c.is_placeholder) {
                      setPlaceholderModalCurriculum(c);
                    } else {
                      setChatSubject(c.subject_name);
                    }
                  }}
                  style={{ position: 'relative' }}
                >
                  {c.is_placeholder && (
                    <span style={{
                      position: 'absolute',
                      top: '6px',
                      left: '6px',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      background: 'rgba(229, 169, 60, 0.18)',
                      color: 'var(--accent-gold, #E5A93C)',
                      border: '1px solid rgba(229, 169, 60, 0.35)',
                      borderRadius: '4px',
                      padding: '1px 5px',
                      lineHeight: '1.2'
                    }}>
                      قريباً
                    </span>
                  )}
                  <span className="subject-card-icon">
                    {getSubjectIcon(c.subject_name)}
                  </span>
                  <span>{c.subject_name}</span>
                </button>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '8px 2px 20px', fontFamily: 'var(--font-arabic)' }}>
              لا يوجد مواد مفعلة لهذا الصف حالياً.
            </p>
          )}

          {canPickGrade && (
            <>
              <div className="sheet-section-label">الصف الدراسي</div>
              <div className="grade-row">
                {gradeEntries.map(([key, name]) => (
                  <button
                    type="button"
                    key={key}
                    className={`grade-option ${chatGrade === key ? 'selected' : ''}`}
                    onClick={() => setChatGrade(key)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };


  // Auto-grow textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputMessage]);


  const loadSystemConfig = (devIdVal?: string, tokenVal?: string | null) => {
    const targetDevId = devIdVal || deviceId;
    const headers: Record<string, string> = {};
    if (targetDevId) {
      headers['x-device-id'] = targetDevId;
    }
    const activeToken = tokenVal !== undefined ? tokenVal : (localStorage.getItem('egs_token') || token);
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }
    fetch('/api/config', { headers })
      .then(res => res.json())
      .then(data => {
        if (data.website_link) setWebsiteLink(data.website_link);
        if (data.active_grade_levels) {
          setActiveGradeLevels(data.active_grade_levels);
          if (data.active_grade_levels.length > 0) {
            setGradeLevel(data.active_grade_levels[0]);
            setChatGrade(data.active_grade_levels[0]);
          }
        }
        if (data.active_curriculum_ids) setActiveCurriculumIds(data.active_curriculum_ids);
        if (data.all_curriculums) setCurriculums(data.all_curriculums);
        if (data.guest_messages_count !== undefined) {
          setGuestMessagesCount(data.guest_messages_count);
        }
        if (data.guest_coins !== undefined) {
          setCoins(data.guest_coins);
        }
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('egs_user', JSON.stringify(data.user));
          setCoins(data.user.coins === undefined ? 50.0 : data.user.coins);
          setPoints(data.user.points || 0);
        }
      });
  };

  // Load Initial Settings, DeviceID and Auth
  useEffect(() => {
    // 1. Theme initialization
    const savedTheme = localStorage.getItem('egs_theme') || 'system';
    setTheme(savedTheme as any);
    applyTheme(savedTheme);

    const savedChatMode = localStorage.getItem('egs_chat_mode');
    if (savedChatMode === 'socratic' || savedChatMode === 'detailed' || savedChatMode === 'summary') {
      setChatMode(savedChatMode);
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      const currentSaved = localStorage.getItem('egs_theme') || 'system';
      if (currentSaved === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // 2. Immediate responsive & PWA device detection
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    setSidebarOpen(!mobile);

    const ua = navigator.userAgent || '';
    const isIos = /iPhone|iPad|iPod/i.test(ua);
    const isMob = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || (window.innerWidth < 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
    setIsIosDevice(isIos);
    setIsMobileDevice(isMob);

    const standaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(standaloneMode);

    const dismissedPwa = localStorage.getItem('egs_pwa_banner_dismissed') === 'true';
    if (isMob && !standaloneMode && !dismissedPwa) {
      setShowMobileInstallBanner(true);
    }

    if (typeof window !== 'undefined') {
      if ((window as any).__egsPwaPrompt) {
        setDeferredPrompt((window as any).__egsPwaPrompt);
      }
      (window as any).__onPwaPromptReady = (promptEvent: any) => {
        setDeferredPrompt(promptEvent);
      };
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (typeof window !== 'undefined') {
        (window as any).__egsPwaPrompt = e;
      }
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setShowMobileInstallBanner(false);
      setDeferredPrompt(null);
      if (typeof window !== 'undefined') {
        (window as any).__egsPwaPrompt = null;
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    const handleResize = () => {
      const isMobResized = window.innerWidth < 768;
      setIsMobile(isMobResized);
    };
    window.addEventListener('resize', handleResize);

    // 3. Generate or read device guest ID & browser fingerprint
    let devId = localStorage.getItem('egs_device_id');
    if (!devId) {
      devId = 'device_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('egs_device_id', devId);
    }
    setDeviceId(devId);

    let browserFp = localStorage.getItem('egs_browser_id');
    if (!browserFp) {
      browserFp = 'browser_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
      localStorage.setItem('egs_browser_id', browserFp);
    }

    // 4. Synchronous Token & User recovery from localStorage
    let storedToken = localStorage.getItem('egs_token');
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('token');
      if (tokenParam) {
        storedToken = tokenParam;
        localStorage.setItem('egs_token', tokenParam);
        setToken(tokenParam);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    const storedUser = localStorage.getItem('egs_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setProfileName(parsedUser.name || '');
        if (parsedUser.coins !== undefined) {
          setCoins(parsedUser.coins);
        }
        if (parsedUser.points !== undefined) {
          setPoints(parsedUser.points);
        }
      } catch (e) {}
    } else if (storedToken) {
      setToken(storedToken);
    }

    // 5. Load system configuration & active syllabus
    loadSystemConfig(devId, storedToken);

    // 6. Load notifications and dismissed-ids
    try {
      const storedDismissed = localStorage.getItem('egs_dismissed_notifications');
      if (storedDismissed) setDismissedNotifIds(JSON.parse(storedDismissed));
    } catch (e) {}
    fetch('/api/notifications?target=web')
      .then(res => res.json())
      .then(data => { if (data.success) setActiveNotifications(data.notifications); })
      .catch(() => {});

    // 7. Complete initial loading smoothly to avoid FOUC / flashes
    const initTimer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 120);

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  const handleMobileInstallClick = async () => {
    const promptToUse = deferredPrompt || (typeof window !== 'undefined' ? (window as any).__egsPwaPrompt : null);
    if (promptToUse && typeof promptToUse.prompt === 'function') {
      try {
        await promptToUse.prompt();
        const choiceResult = await promptToUse.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setShowMobileInstallBanner(false);
        }
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') {
          (window as any).__egsPwaPrompt = null;
        }
        return;
      } catch (e) {
        // Fall through to in-place modal guide without redirecting
      }
    }

    // If native prompt is unavailable (e.g. iOS Safari, or manual browser menu trigger), show the in-place guide modal directly on the home screen
    setShowIosInstallModal(true);
  };

  const handleDismissMobileInstallBanner = () => {
    setShowMobileInstallBanner(false);
    localStorage.setItem('egs_pwa_banner_dismissed', 'true');
  };

  // Load sessions list
  const loadSessions = async () => {
    const storedToken = localStorage.getItem('egs_token');
    if (!storedToken) {
      setSessions([]);
      return;
    }
    setSessionsLoading(true);
    try {
      const res = await fetch('/api/chat/sessions', {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      });
      const data = await res.json();
      if (data.success && data.sessions) {
        setSessions(data.sessions);
      }
    } catch (e) {
      console.error('Error loading sessions:', e);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Load chat history for a session
  const loadChatHistory = async (sessionId?: string | null) => {
    const targetSessionId = sessionId !== undefined ? sessionId : activeSessionId;
    const storedToken = localStorage.getItem('egs_token') || token;
    if (!storedToken) {
      setMessages([]);
      return;
    }
    
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${storedToken}`
      };
      
      const url = targetSessionId 
        ? `/api/chat/history?session_id=${targetSessionId}`
        : `/api/chat/history`;
      
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success && data.history) {
        const parsedHistory = data.history.map((h: any) => {
          if (h.sender === 'ai' && h.message && h.message.startsWith('<thought')) {
            const closeThoughtIndex = h.message.indexOf('</thought>');
            if (closeThoughtIndex !== -1) {
              const startThoughtIndex = h.message.indexOf('>');
              if (startThoughtIndex !== -1 && startThoughtIndex < closeThoughtIndex) {
                const thought = h.message.substring(startThoughtIndex + 1, closeThoughtIndex);
                const content = h.message.substring(closeThoughtIndex + '</thought>'.length);
                
                let duration = 0;
                const durationMatch = h.message.substring(0, startThoughtIndex + 1).match(/duration="(\d+)"/);
                if (durationMatch) {
                  duration = parseInt(durationMatch[1], 10);
                }
                
                return {
                  sender: 'ai',
                  message: content,
                  thought: thought,
                  duration: duration,
                  isThinking: false,
                  created_at: h.created_at
                };
              }
            }
          }
          return {
            sender: h.sender,
            message: h.message,
            created_at: h.created_at
          };
        });
        setMessages(parsedHistory);
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error('Error loading history:', e);
    }
  };


  // Delete chat session
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذه المحادثة بالكامل؟')) return;
    const storedToken = localStorage.getItem('egs_token') || token;
    try {
      const res = await fetch(`/api/chat/sessions?id=${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${storedToken}` }
      });
      const data = await res.json();
      if (data.success) {
        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
        }
        loadSessions();
      }
    } catch (e) {
      console.error('Error deleting session:', e);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportTarget || reportLoading) return;
    setReportLoading(true);
    try {
      const storedToken = localStorage.getItem('egs_token') || token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      if (deviceId) headers['x-device-id'] = deviceId;

      const res = await fetch('/api/report', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reported_content: reportTarget.content,
          user_query: reportTarget.userQuery,
          reason: reportReason,
          session_id: activeSessionId || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إرسال البلاغ');
      setReportDone(true);
      setTimeout(() => {
        setReportTarget(null);
        setReportReason('');
        setReportDone(false);
      }, 1800);
    } catch (e: any) {
      alert(e.message || 'فشل إرسال البلاغ');
    } finally {
      setReportLoading(false);
    }
  };

  // Load sessions when authenticated
  useEffect(() => {
    if (token) {
      loadSessions();
      setActiveSessionId(null);
      setMessages([]);
    } else {
      setSessions([]);
      setActiveSessionId(null);
      setMessages([]);
    }
  }, [token]);

  // Load messages when session changes
  useEffect(() => {
    if (activeSessionId) {
      if (skipHistoryReloadRef.current) {
        skipHistoryReloadRef.current = false;
        return;
      }
      loadChatHistory(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  // Fetch admin curriculums
  useEffect(() => {
    if (activeTab === 'admin' && token && user?.role === 'admin') {
      loadCurriculums();
    }
  }, [activeTab, token, user]);

  const loadCurriculums = async () => {
    try {
      const res = await fetch('/api/admin/curriculum', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCurriculums(data.curriculums);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Auth Operations
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authTab === 'login') {
        const currentDeviceId = localStorage.getItem('egs_device_id') || undefined;
        const browserFingerprint = localStorage.getItem('egs_browser_id') || undefined;
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, device_id: currentDeviceId, browser_fingerprint: browserFingerprint, platform: 'web' })
        });
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'فشل تسجيل الدخول');
        }

        // Save session
        localStorage.setItem('egs_token', data.token);
        localStorage.setItem('egs_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setCoins(data.user.coins === undefined ? 15.0 : data.user.coins);
        setPoints(data.user.points || 0);
        setShowAuthModal(false);
        resetAuthForm();

      } else {
        // Register step 1: Send registration details
        if (!otpStep) {
          if (!termsAccepted) {
            throw new Error('يجب الموافقة على سياسة الخصوصية وشروط الاستخدام لإتمام التسجيل.');
          }
          if (gradeLevel === '2_high' && !selectedTrack) {
            throw new Error('يرجى اختيار المسار الدراسي لطلاب البكالوريا.');
          }
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              name,
              grade_level: gradeLevel,
              track_id: gradeLevel === '2_high' ? selectedTrack : undefined,
              elective_subject: gradeLevel === '2_high' ? selectedElective : undefined,
              password,
              terms_accepted: true
            })
          });
          const data = await res.json();
          
          if (!res.ok) {
            throw new Error(data.error || 'فشل عملية التسجيل');
          }

          setOtpStep(true);
        } else {
          // Register step 2: Verify OTP with anti-abuse check
          const hasRegisteredBefore = localStorage.getItem('egs_registered_before') === 'true';
          const browserFingerprint = localStorage.getItem('egs_browser_id') || undefined;
          const currentDeviceId = localStorage.getItem('egs_device_id') || undefined;
          const res = await fetch('/api/auth/otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              otp: otpCode,
              has_registered_before: hasRegisteredBefore,
              browser_fingerprint: browserFingerprint,
              device_id: currentDeviceId
            })
          });
          const data = await res.json();
          
          if (!res.ok) {
            throw new Error(data.error || 'رمز التحقق غير صحيح');
          }

          // Save session
          localStorage.setItem('egs_token', data.token);
          localStorage.setItem('egs_user', JSON.stringify(data.user));
          localStorage.setItem('egs_registered_before', 'true');
          setToken(data.token);
          setUser(data.user);
          if (data.user?.track_id) setSelectedTrack(data.user.track_id);
          if (data.user?.elective_subject) setSelectedElective(data.user.elective_subject);
          setCoins(data.user.coins === undefined ? 15.0 : data.user.coins);
          setPoints(data.user.points || 0);
          setShowAuthModal(false);
          resetAuthForm();
        }
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async (credential: string, selectedGrade?: string, trackId?: string, electiveSubj?: string) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const hasRegisteredBefore = localStorage.getItem('egs_registered_before') === 'true';
      const browserFingerprint = localStorage.getItem('egs_browser_id') || undefined;
      const currentDeviceId = localStorage.getItem('egs_device_id') || undefined;
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential,
          grade_level: selectedGrade,
          track_id: selectedGrade === '2_high' ? (trackId || googleSelectedTrack) : undefined,
          elective_subject: selectedGrade === '2_high' ? (electiveSubj || googleSelectedElective) : undefined,
          has_registered_before: hasRegisteredBefore,
          browser_fingerprint: browserFingerprint,
          device_id: currentDeviceId
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول بواسطة Google');
      }

      if (data.requires_grade_level) {
        // Show grade selection modal
        setGoogleTempUser({ credential, email: data.email, name: data.name });
        setShowGoogleGradeModal(true);
        setShowAuthModal(false);
      } else {
        // Successful login
        localStorage.setItem('egs_token', data.token);
        localStorage.setItem('egs_user', JSON.stringify(data.user));
        localStorage.setItem('egs_registered_before', 'true');
        setToken(data.token);
        setUser(data.user);
        if (data.user?.track_id) setSelectedTrack(data.user.track_id);
        if (data.user?.elective_subject) setSelectedElective(data.user.elective_subject);
        setCoins(data.user.coins === undefined ? 15.0 : data.user.coins);
        setPoints(data.user.points || 0);
        setShowAuthModal(false);
        setShowGoogleGradeModal(false);
        setGoogleTempUser(null);
        resetAuthForm();
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const resetAuthForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setOtpCode('');
    setOtpStep(false);
    setAuthError('');
    setTermsAccepted(false);
  };

  // Google One-Tap & Sign-In Button integration
  useEffect(() => {
    if (showAuthModal) {
      const timer = setTimeout(() => {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '868945795931-v00sqknb9qsgcq7hid3t2rkps2vu1348.apps.googleusercontent.com';
        if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
          try {
            (window as any).google.accounts.id.initialize({
              client_id: clientId,
              callback: (response: any) => {
                handleGoogleLogin(response.credential);
              }
            });
            const btnContainer = document.getElementById("google-signin-button");
            if (btnContainer) {
              (window as any).google.accounts.id.renderButton(btnContainer, {
                theme: "outline",
                size: "large",
                width: "100%",
                text: "signin_with"
              });
            }
          } catch (err) {
            console.error("Google accounts.id initialization error:", err);
          }
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showAuthModal]);

  const handleLogout = () => {
    const currentDevId = localStorage.getItem('egs_device_id');
    const currentTok = token || localStorage.getItem('egs_token');
    if (currentTok) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentTok}`
        },
        body: JSON.stringify({ device_id: currentDevId })
      }).catch(() => {});
    }
    localStorage.removeItem('egs_token');
    localStorage.removeItem('egs_user');
    setToken(null);
    setUser(null);
    setCoins(50.0);
    setActiveTab('chat');
    loadSystemConfig(deviceId, null);
  };
  const handleUpdateUserGrade = async (newGrade: string, newTrack?: string | null, newElective?: string | null) => {
    if (!user) return;
    try {
      const payload: any = { grade_level: newGrade };
      if (newGrade === '2_high') {
        payload.track_id = newTrack !== undefined ? newTrack : (user.track_id || selectedTrack);
        payload.elective_subject = newElective !== undefined ? newElective : (user.elective_subject || selectedElective);
      }
      const res = await fetch('/api/auth/update-grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحديث السنة الدراسية.');

      // Update state and storage
      const updatedUser = {
        ...user,
        grade_level: newGrade,
        track_id: payload.track_id || null,
        elective_subject: payload.elective_subject || null
      };
      setUser(updatedUser);
      localStorage.setItem('egs_user', JSON.stringify(updatedUser));
      if (payload.track_id) setSelectedTrack(payload.track_id);
      if (payload.elective_subject) setSelectedElective(payload.elective_subject);
      
      // Clear current active session & chat history to select lessons for new grade
      setActiveSessionId(null);
      setMessages([]);
      
      setProfileMessage({ text: 'تم تحديث السنة الدراسية والمسار بنجاح.', type: 'success' });
    } catch (err: any) {
      setProfileMessage({ text: err.message || 'فشل تحديث السنة الدراسية.', type: 'danger' });
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً. الحد الأقصى هو 5 ميجابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      // Open the crop/markup editor first; upload happens on confirm
      setEditingImage({ dataUrl: reader.result as string, mimeType: file.type });
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditedImage = (base64: string, mimeType: string) => {
    setEditingImage(null);
    setIsDescribingImage(false);
    setPendingImage({ base64, mimeType, description: '' });
  };

  // Chat Operation
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const messageToSend = customText || inputMessage;
    if ((!messageToSend.trim() && !pendingImage) || chatLoading) return;

    let userMsg = messageToSend;
    if (pendingImage && !customText) {
      userMsg = `[IMAGE_MESSAGE:${pendingImage.mimeType};${pendingImage.base64};]${inputMessage}`;
    }

    // Client-side coins check
    if (coins <= 0) {
      const isSubscribed = user && user.plan_type && user.plan_type !== 'free' && user.subscription_status === 'active';
      setMessages(prev => [...prev, {
        sender: 'ai',
        message: isSubscribed
          ? '**تنبيه: انتهى الرصيد المتاح!**\n\nلقد استنفدت رصيد النقاط المتاح لك لهذا اليوم. سيتجدد رصيدك تلقائياً غداً.'
          : '[UPGRADE_PAYWALL]'
      }]);
      if (!isSubscribed) {
        setShowUpgradeSheet(true);
      }
      if (!user) {
        setTimeout(() => {
          setAuthTab('register');
          setShowAuthModal(true);
        }, 3000);
      }
      return;
    }

    // Beta: Pro model + Thinking are unlocked for all registered users (no payment tiers yet).
    // Guests cannot reach these controls via the UI, but guard defensively.
    if (!user && (selectedModel === 'pro' || thinkingEnabled)) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        message: '**تنبيه: يلزم تسجيل الدخول**\n\nنموذج المحترفين وميزة التفكير متاحة فقط للمستخدمين المسجلين.'
      }]);
      return;
    }

    // Client-side syllabus presence verification
    const targetGrade = user ? user.grade_level : chatGrade;
    const hasCurriculum = curriculums.some(c => 
      c.subject_name === chatSubject && 
      c.grade_level === targetGrade
    );
    if (!hasCurriculum) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        message: '**تنبيه: المنهج غير متوفر**\n\nالمنهج الدراسي غير متوفر حالياً لهذه المادة. (The course is unavailable.)'
      }]);
      return;
    }

    // Client-side deleted/changed course verification
    if (activeSessionId) {
      const activeSession = sessions.find(s => s.id === activeSessionId);
      if (activeSession) {
        const sessionCurrValid = curriculums.some(c => 
          c.subject_name === activeSession.subject_name && 
          c.grade_level === activeSession.grade_level &&
          activeCurriculumIds.includes(c.id)
        );
        if (!sessionCurrValid) {
          setMessages(prev => [...prev, {
            sender: 'ai',
            message: 'Please continue in another chat because the course has changed or been deleted.'
          }]);
          return;
        }
      }
    }

    // Proactive credit check for free accounts
    const isFreeUserOutOfCoins = user && (user.role !== 'admin' && !user.unlimited_credit) && (coins <= 0);
    if (isFreeUserOutOfCoins) {
      if (!customText) {
        setInputMessage('');
      }
      setPendingImage(null);
      setMessages(prev => [
        ...prev,
        { sender: 'user', message: userMsg },
        {
          sender: 'ai',
          message: `[UPGRADE_PAYWALL]`
        }
      ]);
      setShowUpgradeSheet(true);
      return;
    }

    if (!customText) {
      setInputMessage('');
    }
    setPendingImage(null);
    setChatLoading(true);

    // Optimistically update message history list
    setMessages(prev => [...prev, { sender: 'user', message: userMsg }]);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (deviceId) {
        headers['x-device-id'] = deviceId;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMsg,
          grade_level: user ? user.grade_level : chatGrade,
          subject_name: chatSubject,
          session_id: activeSessionId,
          model: selectedModel,
          thinking: thinkingEnabled,
          mode: chatMode,
          history: !user ? messages.map(m => ({ sender: m.sender, message: m.message })) : undefined
        })
      });

      if (!res.ok) {
        let data: any = {};
        try {
          data = await res.json();
        } catch (_) {
          data = { message: res.statusText || 'حدث خطأ في الاتصال بالخادم.' };
        }
        // Handle limits
        if (data.error === 'limit_reached') {
          setMessages(prev => [...prev, {
            sender: 'ai',
            message: `[UPGRADE_PAYWALL]\n\n${data.message || ''}`
          }]);
          setShowUpgradeSheet(true);
          if (!token) {
            setTimeout(() => {
              setAuthTab('register');
              setShowAuthModal(true);
            }, 3000);
          }
        } else {
          throw new Error(data.message || data.error || 'حدث خطأ أثناء إرسال الرسالة.');
        }
        return;
      }

      // Increment local guest count if not logged in
      if (!token) {
        setGuestMessagesCount(prev => prev + 1);
      }

      // Add a placeholder message for the AI stream response (with empty searchSteps array)
      setMessages(prev => [...prev, {
        sender: 'ai',
        message: '',
        thought: '',
        isThinking: true,
        duration: 0,
        searchSteps: []
      }]);

      let currentThought = '';
      let currentContent = '';
      let currentDuration = 0;
      let isThinking = true;
      let currentSearchSteps: SearchStep[] = [];

      // Start counting duration in seconds
      const timerInterval = setInterval(() => {
        if (isThinking) {
          currentDuration += 1;
          setMessages(prev => {
            const next = [...prev];
            if (next.length > 0 && next[next.length - 1].sender === 'ai') {
              next[next.length - 1] = {
                ...next[next.length - 1],
                duration: currentDuration
              };
            }
            return next;
          });
        }
      }, 1000);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';

      if (reader) {
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: !done });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              if (trimmed.startsWith('data: ')) {
                const dataStr = trimmed.slice(6);
                try {
                  const dataObj = JSON.parse(dataStr);
                  if (dataObj.type === 'search_step') {
                    // RAG v2: live search step emitted before the AI answer
                    const step: SearchStep = {
                      step: dataObj.step || 'search',
                      icon: dataObj.icon || '🔍',
                      message: dataObj.message || ''
                    };
                    currentSearchSteps = [...currentSearchSteps, step];
                    setMessages(prev => {
                      const next = [...prev];
                      if (next.length > 0 && next[next.length - 1].sender === 'ai') {
                        next[next.length - 1] = {
                          ...next[next.length - 1],
                          searchSteps: [...currentSearchSteps]
                        };
                      }
                      return next;
                    });
                  } else if (dataObj.type === 'thought') {
                    currentThought += dataObj.content;
                    setMessages(prev => {
                      const next = [...prev];
                      if (next.length > 0 && next[next.length - 1].sender === 'ai') {
                        next[next.length - 1] = {
                          ...next[next.length - 1],
                          thought: currentThought
                        };
                      }
                      return next;
                    });
                  } else if (dataObj.type === 'content') {
                    if (isThinking) {
                      isThinking = false;
                      clearInterval(timerInterval);
                    }
                    currentContent += dataObj.content;
                    setMessages(prev => {
                      const next = [...prev];
                      if (next.length > 0 && next[next.length - 1].sender === 'ai') {
                        next[next.length - 1] = {
                          ...next[next.length - 1],
                          message: currentContent,
                          isThinking: false
                        };
                      }
                      return next;
                    });
                  } else if (dataObj.type === 'error') {
                    if (isThinking) {
                      isThinking = false;
                      clearInterval(timerInterval);
                    }
                    const errMessage = dataObj.message || dataObj.content || 'حدث خطأ أثناء معالجة الطلب.';
                    setMessages(prev => {
                      const next = [...prev];
                      if (next.length > 0 && next[next.length - 1].sender === 'ai') {
                        next[next.length - 1] = {
                          ...next[next.length - 1],
                          message: `⚠️ **حدث خطأ!**\n\n${errMessage}`,
                          isThinking: false,
                          hasError: true
                        };
                      }
                      return next;
                    });
                  } else if (dataObj.type === 'done') {
                    isThinking = false;
                    clearInterval(timerInterval);
                    
                    if (dataObj.duration) {
                      currentDuration = dataObj.duration;
                    }

                    setMessages(prev => {
                      const next = [...prev];
                      if (next.length > 0 && next[next.length - 1].sender === 'ai') {
                        next[next.length - 1] = {
                          ...next[next.length - 1],
                          message: currentContent,
                          thought: currentThought,
                          duration: currentDuration,
                          isThinking: false
                        };
                      }
                      return next;
                    });

                    if (dataObj.remaining_coins !== undefined) {
                      setCoins(dataObj.remaining_coins);
                      const storedUser = localStorage.getItem('egs_user');
                      if (storedUser) {
                        try {
                          const parsedUser = JSON.parse(storedUser);
                          parsedUser.coins = dataObj.remaining_coins;
                          localStorage.setItem('egs_user', JSON.stringify(parsedUser));
                          setUser(parsedUser);
                        } catch (e) {}
                      }
                    }

                    if (dataObj.points_awarded && dataObj.points_awarded > 0) {
                      triggerPointsAnim(dataObj.points_awarded);
                      setPoints(prev => {
                        const newP = dataObj.total_points !== undefined ? dataObj.total_points : prev + dataObj.points_awarded;
                        const storedUser = localStorage.getItem('egs_user');
                        if (storedUser) {
                          try {
                            const parsedUser = JSON.parse(storedUser);
                            parsedUser.points = newP;
                            localStorage.setItem('egs_user', JSON.stringify(parsedUser));
                            setUser(parsedUser);
                          } catch (e) {}
                        }
                        return newP;
                      });
                    }

                    // If this was a new session (activeSessionId was null), select it and reload sessions list
                    if (!activeSessionId && dataObj.session_id) {
                      skipHistoryReloadRef.current = true;
                      setActiveSessionId(dataObj.session_id);
                      loadSessions();
                    }
                  } else if (dataObj.type === 'error') {
                    throw new Error(dataObj.message);
                  }
                } catch (e) {
                  // Partial JSON, skip
                }
              }
            }
          }
        }
      }

      clearInterval(timerInterval);

    } catch (err: any) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        message: `حدث خطأ في الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى. (التفاصيل: ${err.message})`
      }]);
    } finally {
      setChatLoading(false);
    }
  };


  // Admin Operations
  const handleUploadCurriculum = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMessage({ text: '', type: '' });

    if (!uploadSubject.trim()) {
      setAdminMessage({ text: 'يرجى إدخال اسم المادة الدراسية', type: 'danger' });
      return;
    }

    if (uploadMode === 'file' && !uploadFile) {
      setAdminMessage({ text: 'يرجى اختيار ملف المنهج (.md)', type: 'danger' });
      return;
    }

    setAdminLoading(true);

    try {
      if (uploadMode === 'placeholder') {
        const res = await fetch('/api/admin/curriculum', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            is_placeholder: true,
            grade_level: uploadGrade,
            subject_name: uploadSubject,
            track_id: uploadGrade === '2_high' ? (uploadTrackId || null) : null,
            is_elective: uploadGrade === '2_high' ? uploadIsElective : false
          })
        });

        const data = await res.json();
        if (res.ok) {
          setAdminMessage({ text: data.message || 'تمت إضافة المادة كمنهج قيد الإعداد بنجاح', type: 'success' });
          setUploadSubject('');
          setUploadTrackId('');
          setUploadIsElective(false);
          loadCurriculums();
          return;
        } else {
          throw new Error(data.error || 'فشلت إضافة المادة');
        }
      } else {
        const formData = new FormData();
        if (uploadFile) formData.append('file', uploadFile);
        formData.append('grade_level', uploadGrade);
        formData.append('subject_name', uploadSubject);
        if (uploadGrade === '2_high') {
          if (uploadTrackId) formData.append('track_id', uploadTrackId);
          formData.append('is_elective', uploadIsElective ? 'true' : 'false');
        }

        const res = await fetch('/api/admin/curriculum', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        const contentType = res.headers.get('content-type');
        let errorMessage = 'فشل رفع الملف';

        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (res.ok) {
            setAdminMessage({ text: data.message, type: 'success' });
            setUploadSubject('');
            setUploadFile(null);
            setUploadTrackId('');
            setUploadIsElective(false);
            
            // Reset file input
            const fileInput = document.getElementById('curriculum_file') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

            loadCurriculums();
            return;
          } else {
            errorMessage = data.error || errorMessage;
          }
        } else {
          const text = await res.text();
          errorMessage = `خطأ في الخادم (${res.status}): ${text.slice(0, 100)}`;
        }

        throw new Error(errorMessage);
      }
    } catch (err: any) {
      setAdminMessage({ text: err.message || 'حدث خطأ أثناء العملية', type: 'danger' });
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAttachFileToPlaceholder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachCurriculumModal || !attachFile) {
      alert('يرجى اختيار ملف المنهج بصيغة Markdown (.md)');
      return;
    }

    setAttachLoading(true);
    const formData = new FormData();
    formData.append('curriculum_id', attachCurriculumModal.id);
    formData.append('file', attachFile);

    try {
      const res = await fetch('/api/admin/curriculum', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'تم رفع ومعالجة ملف المنهج بنجاح وتفعيل المادة.');
        setAttachCurriculumModal(null);
        setAttachFile(null);
        loadCurriculums();
      } else {
        alert(data.error || 'فشل رفع الملف للمنهج.');
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء رفع الملف.');
    } finally {
      setAttachLoading(false);
    }
  };

  const handleDeleteCurriculum = async (id: string) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا المنهج بشكل نهائي؟ سيمسح ذلك جميع البيانات المرتبطة به.')) return;
    try {
      const res = await fetch('/api/admin/curriculum', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        loadCurriculums();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateWebsiteLink = async () => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ website_link: websiteLink })
      });
      if (res.ok) {
        alert('تم حفظ رابط الموقع بنجاح. سيتم توجيه مستخدمي تطبيق أندرويد إلى هذا الرابط للدفع.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save specific system setting arrays (active grades or curricula)
  const saveConfigSettings = async (updatedGrades: string[], updatedCurrs: string[]) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          active_grade_levels: updatedGrades,
          active_curriculum_ids: updatedCurrs
        })
      });
      if (res.ok) {
        loadSystemConfig();
      }
    } catch (e) {
      console.error('Error saving config settings:', e);
    }
  };

  // Toggle active grade level status
  const handleToggleGradeActive = async (grade: string) => {
    let updatedGrades = [...activeGradeLevels];
    if (updatedGrades.includes(grade)) {
      updatedGrades = updatedGrades.filter(g => g !== grade);
    } else {
      updatedGrades.push(grade);
    }
    setActiveGradeLevels(updatedGrades);
    await saveConfigSettings(updatedGrades, activeCurriculumIds);
  };

  // Toggle active track status (Baccalaureate tracks)
  const handleToggleTrackActive = async (trackId: string) => {
    let updatedTracks = [...activeTracks];
    if (updatedTracks.includes(trackId)) {
      updatedTracks = updatedTracks.filter(t => t !== trackId);
    } else {
      updatedTracks.push(trackId);
    }
    setActiveTracks(updatedTracks);
    try {
      setSavingTracks(true);
      await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          active_tracks: updatedTracks
        })
      });
      loadSystemConfig();
    } catch (e) {
      console.error('Error updating active tracks:', e);
    } finally {
      setSavingTracks(false);
    }
  };

  // Toggle active curriculum status
  const handleToggleCurriculumActive = async (currId: string) => {
    let updatedCurrs = [...activeCurriculumIds];
    if (updatedCurrs.includes(currId)) {
      updatedCurrs = updatedCurrs.filter(id => id !== currId);
    } else {
      updatedCurrs.push(currId);
    }
    setActiveCurriculumIds(updatedCurrs);
    await saveConfigSettings(activeGradeLevels, updatedCurrs);
  };

  // Fetch dashboard stats
  const loadDashboardStats = async () => {
    setDashboardLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.stats) {
        setDashboardStats(data.stats);
      }
    } catch (e) {
      console.error('Error loading dashboard stats:', e);
    } finally {
      setDashboardLoading(false);
    }
  };

  // Trigger dashboard stats reload when admin tab is opened
  useEffect(() => {
    if (activeTab === 'admin' && token && user?.role === 'admin') {
      loadDashboardStats();
    }
  }, [activeTab, token, user]);

  // Rename curriculum
  const handleRenameCurriculum = async (id: string) => {
    if (!renameSubjectValue.trim()) return;
    try {
      const res = await fetch('/api/admin/curriculum', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id, subject_name: renameSubjectValue.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRenamingCurriculumId(null);
      setRenameSubjectValue('');
      loadCurriculums();
    } catch (e: any) {
      alert(e.message || 'فشلت إعادة تسمية المنهج');
    }
  };

  // ─── Admin: Users Management ────────────────────────────────────────────────
  const loadAdminUsers = async () => {
    setAdminUsersLoading(true);
    try {
      const res = await fetch(`/api/admin/users${adminUserSearch ? `?search=${encodeURIComponent(adminUserSearch)}` : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setAdminUsers(data.users);
    } catch (e) {
      console.error('Error loading users:', e);
    } finally {
      setAdminUsersLoading(false);
    }
  };

  const handleToggleUserUnlimited = async (id: string, current: boolean) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id, unlimited_credit: !current })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadAdminUsers();
    } catch (e: any) {
      alert(e.message || 'فشل تحديث المستخدم');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا المستخدم نهائياً؟')) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadAdminUsers();
    } catch (e: any) {
      alert(e.message || 'فشل حذف المستخدم');
    }
  };

  useEffect(() => {
    if (activeTab === 'admin' && adminSection === 'users' && token && user?.role === 'admin') {
      loadAdminUsers();
    }
  }, [activeTab, adminSection, token, user]);

  // ─── Admin: Notifications Management ────────────────────────────────────────
  const loadAdminNotifications = async () => {
    setAdminNotificationsLoading(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setAdminNotifications(data.notifications);
    } catch (e) {
      console.error('Error loading notifications:', e);
    } finally {
      setAdminNotificationsLoading(false);
    }
  };

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotifTitle.trim() || !newNotifBody.trim() || notifCreateLoading) return;
    setNotifCreateLoading(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: newNotifTitle, body: newNotifBody, type: newNotifType, target: newNotifTarget })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewNotifTitle('');
      setNewNotifBody('');
      setNewNotifType('info');
      setNewNotifTarget('both');
      loadAdminNotifications();
    } catch (e: any) {
      alert(e.message || 'فشل إنشاء الإشعار');
    } finally {
      setNotifCreateLoading(false);
    }
  };

  const handleToggleNotificationActive = async (id: string, active: boolean) => {
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id, active })
      });
      if (!res.ok) throw new Error('فشل تحديث الإشعار');
      loadAdminNotifications();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('هل تريد حذف هذا الإشعار نهائياً؟')) return;
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error('فشل حذف الإشعار');
      loadAdminNotifications();
    } catch (e: any) {
      alert(e.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin' && adminSection === 'notifications' && token && user?.role === 'admin') {
      loadAdminNotifications();
    }
  }, [activeTab, adminSection, token, user]);

  // ─── Admin: Reports Review ──────────────────────────────────────────────────
  const loadAdminReports = async () => {
    setAdminReportsLoading(true);
    try {
      const res = await fetch(`/api/admin/reports${reportsStatusFilter ? `?status=${reportsStatusFilter}` : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setAdminReports(data.reports);
    } catch (e) {
      console.error('Error loading reports:', e);
    } finally {
      setAdminReportsLoading(false);
    }
  };

  const handleUpdateReportStatus = async (id: string, status: 'pending' | 'reviewed' | 'dismissed') => {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id, status })
      });
      if (!res.ok) throw new Error('فشل تحديث حالة البلاغ');
      loadAdminReports();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm('هل تريد حذف هذا البلاغ نهائياً؟')) return;
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error('فشل حذف البلاغ');
      loadAdminReports();
    } catch (e: any) {
      alert(e.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin' && adminSection === 'reports' && token && user?.role === 'admin') {
      loadAdminReports();
    }
  }, [activeTab, adminSection, token, user, reportsStatusFilter]);

  // ─── Admin: App Versions Management ─────────────────────────────────────────
  const loadAdminVersions = async () => {
    setAdminVersionsLoading(true);
    try {
      const res = await fetch('/api/admin/versions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setAdminVersions(data.versions);
    } catch (e) {
      console.error('Error loading versions:', e);
    } finally {
      setAdminVersionsLoading(false);
    }
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionCode.trim() || !newVersionName.trim() || versionCreateLoading) return;
    setVersionCreateLoading(true);
    try {
      const res = await fetch('/api/admin/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          platform: 'android',
          version_code: newVersionCode,
          version_name: newVersionName,
          release_notes: newVersionNotes,
          download_url: newVersionUrl,
          mandatory: newVersionMandatory
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewVersionCode('');
      setNewVersionName('');
      setNewVersionNotes('');
      setNewVersionUrl('');
      setNewVersionMandatory(true);
      loadAdminVersions();
    } catch (e: any) {
      alert(e.message || 'فشل إضافة الإصدار');
    } finally {
      setVersionCreateLoading(false);
    }
  };

  const handleDeleteVersion = async (id: string) => {
    if (!confirm('هل تريد حذف هذا الإصدار نهائياً؟')) return;
    try {
      const res = await fetch('/api/admin/versions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error('فشل حذف الإصدار');
      loadAdminVersions();
    } catch (e: any) {
      alert(e.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin' && adminSection === 'versions' && token && user?.role === 'admin') {
      loadAdminVersions();
    }
  }, [activeTab, adminSection, token, user]);

  // Load curriculum detail for editing
  const handleEditCurriculum = async (currId: string) => {
    setEditCurriculumId(currId);
    setEditModalLoading(true);
    setEditModalError('');
    try {
      const res = await fetch(`/api/admin/curriculum/detail?id=${currId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditContent(data.content);
        setEditSubject(data.curriculum.subject_name);
        setEditGrade(data.curriculum.grade_level);
      } else {
        throw new Error(data.error || 'فشل تحميل تفاصيل المنهج.');
      }
    } catch (err: any) {
      setEditModalError(err.message || 'حدث خطأ غير متوقع.');
    } finally {
      setEditModalLoading(false);
    }
  };

  // Save edited curriculum Markdown content
  const handleSaveCurriculumEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCurriculumId) return;

    setEditModalLoading(true);
    setEditModalError('');

    try {
      const res = await fetch('/api/admin/curriculum/detail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: editCurriculumId,
          grade_level: editGrade,
          subject_name: editSubject,
          content: editContent
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ التعديلات.');

      alert('تم تحديث محتوى المنهج الدراسي بنجاح وإعادة فهرسته.');
      setEditCurriculumId(null);
      loadCurriculums();
      loadSystemConfig();
    } catch (err: any) {
      setEditModalError(err.message || 'فشل الحفظ.');
    } finally {
      setEditModalLoading(false);
    }
  };

  // Open manual units and lessons index modal
  const handleOpenUnitsModal = (curr: Curriculum) => {
    setUnitsModalCurr(curr);
    const rawUnits = Array.isArray(curr.units) ? JSON.parse(JSON.stringify(curr.units)) : [];
    const formattedUnits: CurriculumUnit[] = rawUnits.map((u: any, uIdx: number) => {
      const lessons = Array.isArray(u.lessons) ? u.lessons : [];
      const text = lessons.map((l: any) => l.title || '').join('\n');
      return {
        ...u,
        unitNumber: typeof u.unitNumber === 'number' ? u.unitNumber : (uIdx + 1),
        lessonsText: text,
        lessons
      };
    });
    setUnitsList(formattedUnits);
    setUnitsModalError('');
    setUnitsModalSuccess('');
  };

  const handleAddUnit = () => {
    const nextNum = unitsList.length + 1;
    const newUnitId = `unit_${Date.now()}`;
    const newUnitTitle = `الوحدة ${nextNum}`;
    const defaultText = `الدرس الأول\nالدرس الثاني\nالدرس الثالث`;
    const defaultLessons: CurriculumLesson[] = [
      {
        id: `lesson_${Date.now()}_1`,
        title: 'الدرس الأول',
        lessonNumber: 1,
        unitTitle: newUnitTitle,
        unitId: newUnitId
      },
      {
        id: `lesson_${Date.now()}_2`,
        title: 'الدرس الثاني',
        lessonNumber: 2,
        unitTitle: newUnitTitle,
        unitId: newUnitId
      },
      {
        id: `lesson_${Date.now()}_3`,
        title: 'الدرس الثالث',
        lessonNumber: 3,
        unitTitle: newUnitTitle,
        unitId: newUnitId
      }
    ];

    const newUnit: CurriculumUnit = {
      id: newUnitId,
      title: newUnitTitle,
      unitNumber: nextNum,
      lessonsText: defaultText,
      lessons: defaultLessons
    };
    setUnitsList([...unitsList, newUnit]);
  };

  const handleUpdateUnitTitle = (unitIdx: number, newTitle: string) => {
    const updated = [...unitsList];
    const unit = updated[unitIdx];
    const unitTitle = newTitle;
    const updatedLessons = (unit.lessons || []).map(l => ({ ...l, unitTitle }));
    updated[unitIdx] = {
      ...unit,
      title: unitTitle,
      lessons: updatedLessons
    };
    setUnitsList(updated);
  };

  const handleDeleteUnit = (unitIdx: number) => {
    const updated = unitsList.filter((_, idx) => idx !== unitIdx);
    const reindexed = updated.map((u, i) => ({
      ...u,
      unitNumber: i + 1,
      lessons: (u.lessons || []).map((l) => ({ ...l, unitTitle: u.title, unitId: u.id }))
    }));
    setUnitsList(reindexed);
  };

  const handleUpdateUnitLessonsText = (unitIdx: number, text: string) => {
    const updated = [...unitsList];
    const unit = updated[unitIdx];
    const lines = text.split('\n');
    const existingLessons = unit.lessons || [];

    const validLines = lines.map(l => l.trim()).filter(l => l.length > 0);
    const parsedLessons: CurriculumLesson[] = validLines.map((line, idx) => ({
      id: existingLessons[idx]?.id || `lesson_${unit.id || unitIdx + 1}_${idx + 1}`,
      title: line,
      lessonNumber: idx + 1,
      unitTitle: unit.title,
      unitId: unit.id
    }));

    updated[unitIdx] = {
      ...unit,
      lessonsText: text,
      lessons: parsedLessons
    };
    setUnitsList(updated);
  };

  const handleSaveUnits = async () => {
    if (!unitsModalCurr) return;
    setUnitsModalLoading(true);
    setUnitsModalError('');
    setUnitsModalSuccess('');

    try {
      const sanitizedUnits: CurriculumUnit[] = unitsList.map((u, uIdx) => {
        const unitNum = u.unitNumber || (uIdx + 1);
        const unitId = u.id || `unit_${unitNum}`;
        const unitTitle = (u.title || '').trim() || `الوحدة ${unitNum}`;

        let lessons: CurriculumLesson[] = [];
        if (typeof u.lessonsText === 'string') {
          const lines = u.lessonsText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          lessons = lines.map((line, lIdx) => ({
            id: `lesson_${unitId}_${lIdx + 1}`,
            title: line,
            lessonNumber: lIdx + 1,
            unitTitle: unitTitle,
            unitId: unitId
          }));
        } else if (Array.isArray(u.lessons)) {
          lessons = u.lessons.map((l, lIdx) => ({
            id: l.id || `lesson_${unitId}_${lIdx + 1}`,
            title: (l.title || '').trim() || `الدرس ${lIdx + 1}`,
            lessonNumber: lIdx + 1,
            unitTitle: unitTitle,
            unitId: unitId
          }));
        }

        return {
          id: unitId,
          title: unitTitle,
          unitNumber: unitNum,
          lessons: lessons
        };
      });

      const res = await fetch('/api/admin/curriculum/units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: unitsModalCurr.id,
          units: sanitizedUnits
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ الوحدات والدروس');

      setUnitsModalSuccess('تم حفظ فهرس الوحدات والدروس بنجاح');
      
      const savedUnits = data.units || sanitizedUnits;
      setCurriculums(prev => prev.map(c => c.id === unitsModalCurr.id ? { ...c, units: savedUnits } : c));
      
      const cacheKey = `${unitsModalCurr.grade_level}_${unitsModalCurr.subject_name}`;
      setCurriculumStructures(prev => {
        const next = { ...prev };
        delete next[cacheKey];
        return next;
      });

      fetchCurriculumStructure(unitsModalCurr.grade_level, unitsModalCurr.subject_name);

      setTimeout(() => {
        setUnitsModalCurr(null);
        setUnitsModalSuccess('');
      }, 750);
    } catch (err: any) {
      setUnitsModalError(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setUnitsModalLoading(false);
    }
  };

  // Student Profile Page Operations
  const handleUpdateProfileName = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage({ text: '', type: '' });

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'update-name',
          name: profileName
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Update local storage and user state
      const updatedUser = { ...user, name: data.user.name };
      localStorage.setItem('egs_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setProfileMessage({ text: 'تم تحديث الاسم بنجاح.', type: 'success' });
    } catch (err: any) {
      setProfileMessage({ text: err.message || 'حدث خطأ أثناء تحديث الاسم.', type: 'danger' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSendProfileOtp = async () => {
    setProfileLoading(true);
    setProfileMessage({ text: '', type: '' });

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'send-otp' })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setProfileOtpStep(true);
      setProfileMessage({ text: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.', type: 'success' });
    } catch (err: any) {
      setProfileMessage({ text: err.message || 'فشل إرسال رمز التحقق.', type: 'danger' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleVerifyProfileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileNewPassword) {
      setProfileMessage({ text: 'يرجى إدخال كلمة المرور الجديدة.', type: 'danger' });
      return;
    }
    
    setProfileLoading(true);
    setProfileMessage({ text: '', type: '' });

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'verify-otp',
          otp: profileOtp,
          new_password: profileNewPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setProfileOtpStep(false);
      setProfileOtp('');
      setProfileNewPassword('');
      setProfileMessage({ text: 'تم تحديث كلمة المرور بنجاح.', type: 'success' });
    } catch (err: any) {
      setProfileMessage({ text: err.message || 'فشل تأكيد الرمز وتغيير كلمة المرور.', type: 'danger' });
    } finally {
      setProfileLoading(false);
    }
  };

  // Initial Preloader Screen (Smooth Gradual Loading & Zero Flash)
  if (isInitialLoading) {
    return (
      <div 
        suppressHydrationWarning={true} 
        className="flex h-screen w-screen items-center justify-center bg-gradient-light animate-fade-in"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          width: '100vw',
          background: 'var(--bg-color)',
          gap: '20px',
          padding: '24px',
          direction: 'rtl',
          fontFamily: 'var(--font-arabic)',
          position: 'fixed',
          inset: 0,
          zIndex: 9999
        }}
      >
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <div 
            style={{
              position: 'absolute',
              inset: '-10px',
              borderRadius: '26px',
              border: '2px solid var(--border-primary)',
              animation: 'pulse-ring 2.5s ease-out infinite'
            }} 
          />
          <div 
            style={{
              background: 'var(--primary-light)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '72px',
              height: '72px',
              borderRadius: '22px',
              border: '1.5px solid var(--border-primary)',
              boxShadow: 'var(--shadow-glow-strong)',
              overflow: 'hidden'
            }}
          >
            <img src="/logo.png" alt="EGS AI Logo" style={{ width: '84%', height: '84%', objectFit: 'contain' }} />
          </div>
        </div>

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.5px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="text-gradient">EGS AI</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, margin: 0 }}>
            مساعدك الذكي في المنهج الدراسي المصري
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--primary-color)' }} />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            جاري تهيئة المنصة التعليمية...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      suppressHydrationWarning={true} 
      className="flex h-screen w-screen overflow-hidden bg-gradient-light animate-fade-in" 
      style={{ 
        display: 'flex', 
        flexDirection: 'row-reverse',
        padding: isMobile ? '0' : '16px',
        gap: isMobile ? '0' : '16px'
      }}
    >
      
      {/* Mobile Sidebar Overlay Backdrop */}
      {isMobile && sidebarOpen && (
        <div 
          className="mobile-overlay" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar Panel */}
      <aside 
        className="glass flex flex-col justify-between border-r sidebar-transition" 
        style={{ 
          width: sidebarOpen ? (isMobile ? '280px' : '320px') : '0px', 
          minWidth: sidebarOpen ? (isMobile ? '280px' : '320px') : '0px',
          display: 'flex', 
          flexDirection: 'column', 
          borderTop: sidebarOpen && !isMobile ? '1px solid var(--border-color)' : 'none',
          borderBottom: sidebarOpen && !isMobile ? '1px solid var(--border-color)' : 'none',
          borderLeft: sidebarOpen && !isMobile ? '1px solid var(--border-color)' : 'none',
          borderRight: sidebarOpen ? '1px solid var(--border-color)' : 'none', 
          borderRadius: isMobile ? '0' : 'var(--radius-lg)',
          height: '100%', 
          background: 'var(--sidebar-bg)', 
          zIndex: 999,
          position: isMobile ? 'fixed' : 'relative',
          right: 0,
          top: 0,
          bottom: 0,
          overflow: 'hidden',
          transition: 'var(--transition)',
          boxShadow: isMobile ? 'none' : 'var(--shadow-md)'
        }}
      >
        
        {/* Top Logo & Options */}
        <div style={{ padding: '20px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', position: 'relative' }} className="custom-scrollbar">
          
          {/* Close button on Mobile */}
          {isMobile && (
            <button 
              onClick={() => setSidebarOpen(false)} 
              style={{ 
                background: 'var(--alpha-white-4)', 
                border: '1px solid var(--border-color)', 
                color: 'var(--text-muted)', 
                position: 'absolute', 
                top: '16px', 
                left: '16px', 
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          )}

          {/* Logo */}
          <div style={{ textAlign: 'center', paddingTop: isMobile ? '8px' : '4px', marginBottom: '4px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '14px', background: 'var(--primary-light)', border: '1px solid var(--border-primary)', marginBottom: '10px', overflow: 'hidden' }}>
              <img src="/logo.png" alt="EGS AI Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span className="text-gradient">EGS AI</span>
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '3px' }}>
              مساعدك الذكي في المنهج الدراسي
            </p>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0 -4px' }} />

          {/* Navigation Group 1: Study & Chat */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div className="sidebar-section-title">المذاكرة والدردشة</div>
            {[
              { icon: <Plus size={16} />, label: 'دردشة جديدة', action: () => { setActiveSessionId(null); setMessages([]); setActiveTab('chat'); if (isMobile) setSidebarOpen(false); }, isActive: activeTab === 'chat' && !activeSessionId },
              { icon: <Search size={16} />, label: 'البحث في الدردشات', action: () => { setActiveTab('chat'); setShowSearch(prev => !prev); if (isMobile) setSidebarOpen(false); }, isActive: showSearch },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={item.action}
                className={`sidebar-nav-item ${item.isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Navigation Group 2: Study Tools */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
            <div className="sidebar-section-title">الأدوات الدراسية والتقييم</div>
            {[
              { icon: <FileText size={16} />, label: 'الامتحانات والاختبارات', action: () => { setActiveTab('exams'); if (isMobile) setSidebarOpen(false); }, isActive: activeTab === 'exams' },
              ...(user ? [
                { icon: <Brain size={16} />, label: 'المدرب الذكي (الكروت)', action: () => { setActiveTab('flashcards'); if (isMobile) setSidebarOpen(false); }, isActive: activeTab === 'flashcards' },
                { icon: <Trophy size={16} />, label: 'المسابقة ولوحة المتصدرين', action: () => { setActiveTab('leaderboard'); if (isMobile) setSidebarOpen(false); }, isActive: activeTab === 'leaderboard' },
              ] : []),
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={item.action}
                className={`sidebar-nav-item ${item.isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Navigation Group 3: Account & Services */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
            <div className="sidebar-section-title">الحساب والخدمات</div>
            {[
              ...(isUserSubscribed ? [
                { icon: <ShieldCheck size={16} />, label: 'اشتراكي الحالي', action: () => { setActiveTab('subscriptions'); if (isMobile) setSidebarOpen(false); }, isActive: activeTab === 'subscriptions' || activeTab === 'beta' }
              ] : [
                { icon: <CreditCard size={16} />, label: 'باقات الاشتراك', action: () => { setActiveTab('subscriptions'); if (isMobile) setSidebarOpen(false); }, isActive: activeTab === 'subscriptions' || activeTab === 'beta' }
              ]),
              ...(user ? [
                { icon: <User size={16} />, label: 'الملف الشخصي', action: () => { setActiveTab('profile'); if (isMobile) setSidebarOpen(false); }, isActive: activeTab === 'profile' }
              ] : []),
              ...(user?.role === 'admin' ? [{ icon: <Settings size={16} />, label: 'لوحة التحكم', action: () => { setActiveTab('admin'); if (isMobile) setSidebarOpen(false); }, isActive: activeTab === 'admin' }] : []),
              { icon: <Phone size={16} />, label: 'تواصل معنا', action: () => { window.location.href = '/contact'; }, isActive: false },
              { icon: <Download size={16} />, label: 'تحميل وتثبيت التطبيق', action: () => { window.location.href = '/download'; }, isActive: false }
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={item.action}
                className={`sidebar-nav-item ${item.isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {user && (
            <>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0 -4px' }} />
              
              {showSearch && (
                <div style={{ padding: '0 4px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="البحث في الدردشات..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      fontSize: '0.8rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--input-bg)',
                      color: 'var(--text-main)',
                      outline: 'none',
                    }}
                  />
                </div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflowY: 'auto', minHeight: '100px' }} className="custom-scrollbar">
                <h4 style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '0 2px' }}>المحادثات السابقة</h4>
                {sessionsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '14px' }}>
                    <Loader2 size={16} className="animate-spin" style={{ color: 'var(--primary-color)' }} />
                  </div>
                ) : sessions.filter(s => !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.subject_name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 6px', opacity: 0.7 }}>
                    {searchQuery ? 'لا توجد نتائج مطابقة' : 'لا يوجد محادثات سابقة'}
                  </p>
                ) : (
                  sessions
                    .filter(s => !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.subject_name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          if (user && s.grade_level !== user.grade_level) {
                            alert("لا يمكنك متابعة هذه المحادثة لأنها تنتمي لصف دراسي آخر.");
                            return;
                          }
                          setActiveSessionId(s.id);
                          if ((s as any).mode === 'socratic' || (s as any).mode === 'detailed' || (s as any).mode === 'summary') {
                            setChatMode((s as any).mode);
                          }
                          if (isMobile) setSidebarOpen(false);
                        }}
                        className={`sidebar-session-item ${activeSessionId === s.id ? 'active' : ''}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                          <MessageSquare size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{s.title}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.62rem', background: 'var(--primary-light)', color: 'var(--primary-color)', padding: '1px 6px', borderRadius: '6px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                            {s.subject_name}
                          </span>
                          <button
                            onClick={(e) => handleDeleteSession(s.id, e)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', opacity: 0, padding: '3px', display: 'flex', alignItems: 'center', borderRadius: '4px', transition: 'var(--transition-fast)' }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                            className="session-delete-btn"
                          >
                            <Trash size={11} />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </>
          )}



        </div>

        {/* Footer Identity Section */}
        <div style={{ padding: '16px 18px', borderTop: '1px solid var(--border-color)', background: 'var(--sidebar-bg)' }}>
          {/* Theme switcher */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0 14px 0', borderBottom: '1px solid var(--border-color)', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>مظهر المنصة</span>
            <div style={{ display: 'flex', background: 'var(--alpha-white-4)', padding: '2px', borderRadius: '8px', gap: '2px' }}>
              {[
                { value: 'light', label: 'مضيء' },
                { value: 'dark', label: 'مظلم' },
                { value: 'system', label: 'تلقائي' }
              ].map((opt) => {
                const isActive = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleThemeChange(opt.value as any)}
                    style={{
                      border: 'none',
                      background: isActive ? 'var(--primary-color)' : 'transparent',
                      color: isActive ? 'var(--text-on-primary)' : 'var(--text-secondary)',
                      fontSize: '0.74rem',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: 'var(--primary-color)',
                  color: 'var(--text-on-primary)',
                  width: '36px', height: '36px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1rem',
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(193,39,45,0.3)'
                }}>
                  {user.name ? user.name[0].toUpperCase() : <User size={16} />}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-main)' }}>{user.name}</h4>
                  <div style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span className={`plan-badge plan-badge-${user.plan_type?.startsWith('pro') ? 'pro' : user.plan_type === 'max' ? 'max' : 'free'}`}>
                      {user.plan_type === 'pro_3m' || user.plan_type === 'max' ? 'باقة 3 أشهر' :
                       user.plan_type === 'pro_2m' ? 'باقة شهرين' :
                       user.plan_type === 'pro_1m' || user.plan_type === 'pro' ? 'باقة شهر' :
                       'مجاني (15 نقطة)'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      الرصيد: {coins.toFixed(2)} نقطة
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="btn-danger"
                style={{ width: '100%', padding: '8px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)' }}
              >
                <LogOut size={14} />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2px' }}>
                رصيدك التجريبي: {coins.toFixed(2)} نقطة
              </div>
              <button
                onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}
                className="btn-primary"
                style={{ width: '100%', padding: '11px 14px', fontSize: '0.88rem', borderRadius: 'var(--radius-sm)' }}
              >
                تسجيل الدخول / إنشاء حساب
              </button>
            </div>
          )}

          {/* Quick Footer Policy & Contact Links */}
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.72rem' }}>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>الخصوصية</a>
            <span style={{ color: 'var(--border-color)' }}>•</span>
            <a href="/terms#refund" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>الإرجاع والاشتراكات</a>
            <span style={{ color: 'var(--border-color)' }}>•</span>
            <a href="/contact" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>تواصل معنا</a>
            <span style={{ color: 'var(--border-color)' }}>•</span>
            <a href="/download" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>تحميل التطبيق</a>
            <span style={{ color: 'var(--border-color)' }}>•</span>
            <a href="/delete-account" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>حذف الحساب</a>
          </div>
        </div>


      </aside>

      {/* Main Workspace Panel */}
      <main 
        style={{ 
          flex: 1, 
          height: '100%', 
          overflow: 'hidden', 
          display: 'flex', 
          flexDirection: 'column', 
          position: 'relative',
          borderRadius: isMobile ? '0' : 'var(--radius-lg)',
          border: isMobile ? 'none' : '1px solid var(--border-color)',
          boxShadow: isMobile ? 'none' : 'var(--shadow-md)',
          background: 'var(--bg-color)'
        }}
      >
        
        {/* VIEW 1: Chat Workspace */}
        {activeTab === 'chat' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-color)' }}>
            
            {/* Header */}
            <header style={{
              padding: isMobile ? '0 12px' : '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--sidebar-bg)',
              borderBottom: '1px solid var(--border-color)',
              height: '64px',
              zIndex: 5,
              color: 'var(--text-main)',
              direction: 'rtl'
            }}>
              {/* Brand Logo & Menu Toggle (RTL: right side on mobile, left on desktop) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', order: isMobile ? 1 : 2 }}>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--alpha-white-5)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  title={sidebarOpen ? "إغلاق القائمة الجانبية" : "فتح القائمة الجانبية"}
                >
                  {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                </button>

                <div
                  onClick={() => {
                    if (!isUserSubscribed) {
                      setActiveTab('subscriptions');
                    } else {
                      setActiveTab('chat');
                    }
                    if (isMobile) setSidebarOpen(false);
                  }}
                  title="EGS AI - المساعد الذكي الرسمي"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    transition: 'var(--transition)',
                    background: 'var(--primary-light)',
                    border: '1px solid var(--border-primary)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-glow)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary-light)'}
                >
                  <span style={{ fontWeight: 800, fontSize: isMobile ? '0.85rem' : '0.95rem', color: 'var(--text-main)' }}>EGS AI</span>
                </div>

                {!isMobile && chatSubject && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--alpha-white-4)', border: '1px solid var(--border-color)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {getSubjectIcon(chatSubject)}
                    <span>{chatSubject}</span>
                  </div>
                )}
              </div>

              {/* User actions (RTL: left side on mobile, right on desktop) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', order: isMobile ? 2 : 1 }}>
                {user && (
                  <div 
                    onClick={() => {
                      setActiveTab('leaderboard');
                      if (isMobile) setSidebarOpen(false);
                    }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      background: 'rgba(229, 169, 60, 0.12)', 
                      padding: isMobile ? '4px 8px' : '4px 12px', 
                      borderRadius: 'var(--radius-full)', 
                      fontSize: isMobile ? '0.72rem' : '0.8rem', 
                      fontWeight: 800, 
                      color: 'var(--secondary-color)', 
                      border: '1px solid rgba(229, 169, 60, 0.25)', 
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    title="عرض ترتيبك في المسابقة ولوحة المتصدرين"
                  >
                    <Trophy size={13} />
                    <span>{points} {isMobile ? 'نقاط' : 'نقاط الترتيب'}</span>
                    {pointsBonusAnim && (
                      <span className="points-plus-badge">+{pointsBonusAnim}</span>
                    )}
                  </div>
                )}
                <div 
                  onClick={() => {
                    if (isUserSubscribed) {
                      setActiveTab('profile');
                      if (isMobile) setSidebarOpen(false);
                    } else {
                      if (isMobile) {
                        setShowUpgradeSheet(true);
                      } else {
                        setActiveTab('subscriptions');
                      }
                    }
                  }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    background: coins <= 5 && !isUserSubscribed ? 'rgba(193, 39, 45, 0.15)' : 'var(--alpha-white-4)', 
                    border: coins <= 5 && !isUserSubscribed ? '1px solid var(--danger-color)' : '1px solid var(--border-color)',
                    padding: isMobile ? '4px 8px' : '4px 12px', 
                    borderRadius: 'var(--radius-full)', 
                fontSize: isMobile ? '0.72rem' : '0.8rem', 
                    fontWeight: 700, 
                    color: coins <= 5 && !isUserSubscribed ? 'var(--danger-color)' : 'var(--primary-color)',
                    cursor: 'pointer'
                  }}
                  title={isUserSubscribed ? "رصيد النقاط اليومية المتاح — يتجدد تلقائياً كل 24 ساعة" : "رصيد العملات المتاح — اضغط للترقية وشحن الرصيد"}
                >
                  <Coins size={13} />
                  <span>{coins.toFixed(isMobile ? 1 : 2)} {isMobile ? 'عملة' : 'عملة'}</span>
                  {coins <= 5 && !isUserSubscribed && <Plus size={11} />}
                </div>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowNotifCenter(prev => !prev)}
                    style={{
                      background: 'var(--alpha-white-4)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '50%',
                      width: isMobile ? '32px' : '34px',
                      height: isMobile ? '32px' : '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    <Bell size={15} />
                    {activeNotifications.filter(n => !dismissedNotifIds.includes(n.id)).length > 0 && (
                      <span style={{ position: 'absolute', top: '2px', left: '2px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger-color)' }} />
                    )}
                  </button>
                  {showNotifCenter && (
                    <div 
                      style={isMobile ? {
                        position: 'fixed',
                        top: '64px',
                        left: '12px',
                        right: '12px',
                        maxHeight: '70vh',
                        overflowY: 'auto',
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 100,
                        padding: '10px'
                      } : {
                        position: 'absolute',
                        top: '42px',
                        right: 0,
                        width: '320px',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 50,
                        padding: '10px'
                      }} 
                      className="custom-scrollbar"
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', padding: '6px 8px 10px', borderBottom: '1px solid var(--border-color)', marginBottom: '6px', textAlign: 'right' }}>الإشعارات</div>
                      {activeNotifications.filter(n => !dismissedNotifIds.includes(n.id)).length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '20px 0' }}>لا توجد إشعارات جديدة</p>
                      ) : (
                        activeNotifications.filter(n => !dismissedNotifIds.includes(n.id)).map(n => (
                          <div key={n.id} style={{ padding: '10px 8px', borderRadius: 'var(--radius-sm)', marginBottom: '4px', background: 'var(--alpha-white-2)', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)' }}>{n.title}</span>
                              <button onClick={() => handleDismissNotification(n.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                                <X size={13} />
                              </button>
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{n.body}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {!isMobile && !isUserSubscribed && (
                  <button
                    onClick={() => setActiveTab('subscriptions')}
                    className="pulse-primary"
                    style={{
                      background: 'var(--primary-light)',
                      color: 'var(--primary-color)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <CreditCard size={13} />
                    <span>الاشتراكات</span>
                  </button>
                )}
                {user ? (
                  <div
                    onClick={() => setActiveTab('profile')}
                    style={{
                      width: isMobile ? '30px' : '32px',
                      height: isMobile ? '30px' : '32px',
                      borderRadius: '50%',
                      background: 'var(--primary-color)',
                      color: 'var(--text-on-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: isMobile ? '0.85rem' : '0.95rem',
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)'
                    }}
                    title={user.name}
                  >
                    {user.name ? user.name[0].toUpperCase() : <User size={14} />}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAuthTab('login');
                      setShowAuthModal(true);
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      borderRadius: '16px',
                      padding: isMobile ? '5px 10px' : '6px 14px',
                      fontSize: isMobile ? '0.78rem' : '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    تسجيل الدخول
                  </button>
                )}
              </div>
            </header>

            {/* Chat Area Messages */}
            <div
              ref={chatScrollRef}
              onScroll={handleChatScroll}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: isMobile ? '16px 12px' : '24px 20px',
                paddingBottom: isMobile && messages.length === 0 ? 'calc(24px + 60px + env(safe-area-inset-bottom, 0px))' : '24px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
              className="custom-scrollbar"
            >
              {!user ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '20px' }}>
                  {renderMobileInstallBanner()}
                  <div className="glass text-center animate-scale-in" style={{
                    maxWidth: '460px',
                    padding: '40px 30px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--card-bg)',
                    border: '1.5px solid var(--border-color)',
                    boxShadow: 'var(--shadow-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px'
                  }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '56px',
                      height: '56px',
                      borderRadius: '16px',
                      background: 'var(--primary-light)',
                      border: '1.5px solid var(--border-primary)',
                      boxShadow: 'var(--shadow-glow)',
                      marginBottom: '8px'
                    }}>
                      <LogIn size={26} style={{ color: 'var(--primary-color)' }} />
                    </div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      تسجيل الدخول للمتابعة
                    </h3>
                    <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0 0 10px 0' }}>
                      يرجى تسجيل الدخول لمتابعة استخدام المنصة التعليمية ومساعدك الذكي.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('login');
                          setShowAuthModal(true);
                        }}
                        className="btn-primary"
                        style={{
                          padding: '12px 24px',
                          borderRadius: 'var(--radius-md)',
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          border: 'none',
                          cursor: 'pointer',
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'var(--transition)'
                        }}
                      >
                        <LogIn size={16} />
                        <span>تسجيل الدخول</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('register');
                          setShowAuthModal(true);
                        }}
                        style={{
                          padding: '11px 24px',
                          borderRadius: 'var(--radius-md)',
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          background: 'transparent',
                          border: '1.5px solid var(--border-color)',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'var(--transition)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--primary-color)';
                          e.currentTarget.style.color = 'var(--primary-color)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.color = 'var(--text-main)';
                        }}
                      >
                        <Sparkles size={16} />
                        <span>إنشاء حساب جديد</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', padding: isMobile ? '12px 4px' : '24px 12px' }}>
                  <div className="animate-scale-in" style={{
                    width: '100%',
                    maxWidth: '820px',
                    margin: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: isMobile ? '8px' : '24px'
                  }}>
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '3px' : '6px' }}>
                      {/* Brand Icon */}
                      <div style={{ position: 'relative', display: 'inline-block', marginBottom: isMobile ? '2px' : '4px' }}>
                        <div style={{
                          position: 'absolute',
                          inset: isMobile ? '-4px' : '-6px',
                          borderRadius: '50%',
                          border: '1.5px solid var(--border-primary)',
                          animation: 'pulse-ring 2.5s ease-out infinite',
                        }} />
                        <div style={{
                          background: 'var(--primary-light)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: isMobile ? '38px' : '64px',
                          height: isMobile ? '38px' : '64px',
                          borderRadius: isMobile ? '12px' : '20px',
                          fontSize: '2rem',
                          border: '1.5px solid var(--border-primary)',
                          boxShadow: 'var(--shadow-glow)',
                          overflow: 'hidden',
                        }}>
                          <img src="/logo.png" alt="EGS AI Logo" style={{ width: '82%', height: '82%', objectFit: 'contain' }} />
                        </div>
                      </div>
                      
                      <h2 style={{ fontSize: isMobile ? '1.12rem' : '1.9rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.5px', lineHeight: 1.25, margin: 0 }}>
                        {user ? `مرحباً بك يا ${user.name} في EGS AI` : 'مرحباً بك في EGS AI'}
                      </h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? '0.75rem' : '0.94rem', lineHeight: isMobile ? '1.3' : '1.5', maxWidth: '560px', margin: '0 auto' }}>
                        {user 
                          ? <>مساعدك الذكي المعتمد لمنهج <strong style={{ color: 'var(--primary-color)' }}>{chatSubject || 'المرحلة الدراسية'}</strong> — {GRADE_NAMES[user.grade_level]}.</>
                          : <>منصتك التعليمية الذكية لمدارس ومناهج جمهورية مصر العربية.</>
                        }
                      </p>
                    </div>

                    {/* Mobile PWA Install Banner */}
                    {renderMobileInstallBanner()}

                    {/* Quick Competition Access Banner */}
                    {user && (
                      <div 
                        className="competition-home-banner animate-scale-in"
                        onClick={() => {
                          setActiveTab('leaderboard');
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: isMobile ? '34px' : '38px',
                            height: isMobile ? '34px' : '38px',
                            borderRadius: '10px',
                            background: 'rgba(229, 169, 60, 0.15)',
                            border: '1px solid rgba(229, 169, 60, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--secondary-color)',
                            flexShrink: 0
                          }}>
                            <Trophy size={isMobile ? 18 : 20} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: isMobile ? '0.82rem' : '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                مسابقة أوائل الطلاب
                              </span>
                              <span style={{ fontSize: '0.62rem', background: 'rgba(229, 169, 60, 0.2)', color: 'var(--secondary-color)', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                المتصدرين
                              </span>
                            </div>
                            <p style={{ margin: '2px 0 0', fontSize: isMobile ? '0.7rem' : '0.76rem', color: 'var(--text-muted)' }}>
                              رصيدك: <strong style={{ color: 'var(--secondary-color)' }}>{points} نقطة</strong> — {userLeaderboardRank?.rank_number ? `ترتيبك الحالي #${userLeaderboardRank.rank_number}` : 'اضغط لعرض قائمة المتصدرين والمنافسة'}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--primary-color)', fontSize: isMobile ? '0.74rem' : '0.8rem', fontWeight: 800 }}>
                          <span>عرض الترتيب</span>
                          <ChevronLeft size={16} />
                        </div>
                      </div>
                    )}

                    {/* Student Study Hub: Subjects Grid & Study Modes */}
                    {renderSuggestionChips()}

                    {/* Centered Floating AI Composer */}
                    <div style={{ width: '100%' }}>
                      {renderInputForm(true)}
                    </div>
                    
                    <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.5', opacity: 0.85 }}>
                      EGS AI نظام ذكاء اصطناعي للمساعدة في المذاكرة — تحقق دائماً من الكتب المدرسية والمقررات الرسمية.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: isMobile ? '14px' : '20px', width: '100%' }}>
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className="message-row animate-fade-in"
                      style={{
                        flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                      }}
                    >
                      {/* Avatar */}
                      {msg.sender === 'user' ? (
                        <div className="message-avatar message-avatar-user">
                          {user?.name ? user.name[0].toUpperCase() : 'أ'}
                        </div>
                      ) : (
                        <div className="message-avatar message-avatar-ai" style={{ overflow: 'hidden', padding: 0 }}>
                          <img src="/logo.png" alt="EGS AI Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                      )}

                      {/* Bubble content */}
                      <div 
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          maxWidth: msg.sender === 'user' ? (isMobile ? '88%' : '80%') : (isMobile ? '94%' : '90%'), 
                          alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                          flex: 1
                        }}
                      >
                        {/* Search Steps Panel — shows RAG search process */}
                        {msg.sender === 'ai' && (msg.searchSteps && msg.searchSteps.length > 0 || (msg.isThinking && (!msg.searchSteps || msg.searchSteps.length === 0))) && (
                          <SearchStepsPanel
                            steps={msg.searchSteps}
                            isSearching={msg.isThinking}
                          />
                        )}

                        {/* Render Thought Process for AI responses */}
                        {msg.sender === 'ai' && (msg.thought || msg.isThinking) && (
                          <ThoughtBlock 
                            thought={msg.thought} 
                            duration={msg.duration} 
                            isThinking={msg.isThinking} 
                          />
                        )}

                        {/* Message Bubble Body */}
                        {msg.sender === 'user' ? (
                          <div className="message-bubble message-bubble-user animate-scale-in">
                            {/* Render attached image thumbnail if message has image prefix */}
                            {(() => {
                              const imgMatch = msg.message.match(/^\[IMAGE_MESSAGE:([^;]+);([^;]+)(?:;([^\]]*))?\]([\s\S]*)$/);
                              if (imgMatch) {
                                const mime = imgMatch[1];
                                const base64 = imgMatch[2];
                                const cleanText = imgMatch[4].trim();
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <img 
                                      src={`data:${mime};base64,${base64}`} 
                                      alt="Student upload" 
                                      style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '10px', objectFit: 'contain', border: '1px solid rgba(255,255,255,0.2)' }}
                                    />
                                    {cleanText && <div>{cleanText}</div>}
                                  </div>
                                );
                              }
                              return msg.message;
                            })()}
                          </div>
                        ) : (
                          msg.message ? (
                            <div className="message-bubble message-bubble-ai animate-scale-in">
                              <FormattedChatMessage
                                content={msg.message}
                                sender="ai"
                                onGoToExams={async (exam: any) => {
                                  if (!exam.id) {
                                    try {
                                      const storedToken = localStorage.getItem('egs_token') || token;
                                      const res = await fetch('/api/exams', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          ...(storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {})
                                        },
                                        body: JSON.stringify({
                                          title: exam.title,
                                          subject_name: exam.subject_name || chatSubject,
                                          grade_level: exam.grade_level || (user ? user.grade_level : chatGrade),
                                          questions: exam.questions
                                        })
                                      });
                                      const data = await res.json();
                                      if (res.ok) exam = data.exam || data;
                                    } catch (e) {
                                      console.error('Failed to persist chat exam:', e);
                                    }
                                  }
                                  const finalExam = exam.exam || exam;
                                  setSelectedExam(finalExam);
                                  setActiveExamAnswers({});
                                  setExamResult(null);
                                  const durationSeconds = (finalExam.questions?.length || 5) * 120;
                                  if (finalExam.id) {
                                    localStorage.setItem('egs_active_exam_id', finalExam.id);
                                    localStorage.setItem('egs_active_exam_time', String(durationSeconds));
                                  }
                                  setExamTimeRemaining(durationSeconds);
                                  setActiveTab('exams');
                                }}
                                onAnswerSubmit={(_text: string) => {}}
                                onGoToFlashcards={(subj: string) => {
                                  setActiveTab('flashcards');
                                  fetchSubjectCards(subj);
                                }}
                                onGoToSubscriptions={() => {
                                  if (!isUserSubscribed) {
                                    setActiveTab('subscriptions');
                                  } else {
                                    setActiveTab('profile');
                                  }
                                  if (isMobile) setSidebarOpen(false);
                                }}
                              />
                            </div>
                          ) : (
                            <div className="message-bubble message-bubble-ai animate-scale-in" style={{ padding: '16px 20px' }}>
                              <div className="typing-dots">
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                              </div>
                            </div>
                          )
                        )}
                        
                        {/* Actions below bubble */}
                        {msg.sender === 'ai' && msg.message && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(msg.message)}
                              style={{
                                background: isMobile ? 'var(--alpha-white-4)' : 'transparent',
                                border: isMobile ? '1px solid var(--border-color)' : 'none',
                                borderRadius: isMobile ? 'var(--radius-full)' : '0',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: isMobile ? '0.78rem' : '0.7rem',
                                padding: isMobile ? '7px 12px' : '0',
                                minHeight: isMobile ? '36px' : 'auto',
                                opacity: 0.85,
                                transition: 'var(--transition)'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.85'}
                            >
                              <Copy size={isMobile ? 15 : 10} />
                              <span>نسخ الإجابة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const prevUserMsg = [...messages.slice(0, index)].reverse().find(m => m.sender === 'user');
                                setReportTarget({ content: msg.message, userQuery: prevUserMsg?.message || '' });
                              }}
                              style={{
                                background: isMobile ? 'var(--alpha-white-4)' : 'transparent',
                                border: isMobile ? '1px solid var(--border-color)' : 'none',
                                borderRadius: isMobile ? 'var(--radius-full)' : '0',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: isMobile ? '0.78rem' : '0.7rem',
                                padding: isMobile ? '7px 12px' : '0',
                                minHeight: isMobile ? '36px' : 'auto',
                                opacity: 0.85,
                                transition: 'var(--transition)'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--danger-color)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                            >
                              <AlertCircle size={isMobile ? 15 : 10} />
                              <span>الإبلاغ عن الرد</span>
                            </button>
                            {!isMobile && (
                              <span
                                title="الإجابات مُولَّدة تلقائياً بواسطة ذكاء اصطناعي وقد تحتوي أخطاء"
                                style={{ fontSize: '0.68rem', color: 'var(--text-muted)', opacity: 0.6, cursor: 'default' }}
                              >
                                تنبيه: قد يخطئ الذكاء الاصطناعي
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (messages.length === 0 || messages[messages.length - 1].sender !== 'ai') && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-color)', color: '#ffffff' }}>
                        <Loader2 size={16} className="animate-spin" />
                      </div>
                      <div style={{ padding: '14px 20px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', borderRadius: '18px 18px 18px 4px', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {messages.length > 0 && messages[messages.length - 1]?.message?.startsWith('[IMAGE_MESSAGE:') 
                            ? 'تحليل الصورة...' 
                            : 'EGS AI يفكر ويبحث في المنهج...'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Bar */}
            {messages.length > 0 && (
              <div style={{ padding: isMobile ? '10px 14px calc(10px + 64px + env(safe-area-inset-bottom, 0px))' : '20px 24px', borderTop: '1px solid var(--border-color)', background: 'var(--sidebar-bg)' }}>
                {renderInputForm(false)}
                <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.6' }}>
                  EGS AI ذكاء اصطناعي وقد يرتكب أخطاءً — تحقق دائماً من المناهج والكتب المدرسية الرسمية. الإجابات مُولَّدة تلقائياً ولسنا مسؤولين عنها بشكل كامل.
                </p>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: Subscriptions Page */}
        {(activeTab === 'subscriptions' || activeTab === 'beta') && (
          <div className="mobile-main-with-nav" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '24px 16px' : '40px 24px', background: 'var(--bg-color)' }}>
            {isMobile && (
              <button 
                onClick={() => setActiveTab('chat')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  marginBottom: '24px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  fontFamily: 'var(--font-arabic)',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'var(--transition)'
                }}
              >
                <ArrowRight size={16} />
                <span>العودة للدردشة</span>
              </button>
            )}
            <div style={{ maxWidth: '920px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-scale-in">

              {isUserSubscribed ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Title & Header for Subscribed User */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', fontWeight: 800, marginBottom: '14px', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
                      <ShieldCheck size={16} />
                      <span>اشتراكك سارٍ ونشط</span>
                    </div>
                    <h2 style={{ fontSize: isMobile ? '1.5rem' : '1.9rem', fontWeight: 900, color: 'var(--primary-color)' }}>
                      تفاصيل اشتراكك الحالي
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '0.92rem', lineHeight: '1.7', maxWidth: '640px', margin: '8px auto 0' }}>
                      أنت مشترك حالياً وتتمتع بوصول كامل لكافة ميزات نموذج Pro الفائق وتوليد الامتحانات والتفكير المستفيض مع رصيد يومي متجدد.
                    </p>
                  </div>

                  {/* Active Subscription Details Card */}
                  <div className="glass" style={{ padding: isMobile ? '20px' : '32px', borderRadius: 'var(--radius-lg)', background: 'var(--card-bg)', border: '2px solid var(--primary-color)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>الباقة المفعلة</span>
                        <h3 style={{ fontSize: isMobile ? '1.3rem' : '1.6rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '4px' }}>
                          {user?.plan_type === 'pro_3m' || user?.plan_type === 'max' ? 'باقة 3 أشهر (3 Months)' :
                           user?.plan_type === 'pro_2m' ? 'باقة شهرين (2 Months)' :
                           'باقة شهر (1 Month)'}
                        </h3>
                      </div>
                      <div style={{ background: 'var(--primary-light)', color: 'var(--primary-color)', padding: '8px 16px', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', fontWeight: 800, border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={15} />
                        <span>
                          {user?.plan_type === 'pro_3m' || user?.plan_type === 'max' ? '120 نقطة يومياً' :
                           user?.plan_type === 'pro_2m' ? '90 نقطة يومياً' :
                           '80 نقطة يومياً'} تتجدد تلقائياً
                        </span>
                      </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0 0 20px' }} />

                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                      <div style={{ background: 'var(--alpha-white-2)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 16px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} color="var(--primary-color)" />
                          تاريخ بدء الاشتراك
                        </span>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                          {user?.subscription_start_date ? new Date(user.subscription_start_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : 'سارٍ حالياً'}
                        </div>
                      </div>

                      <div style={{ background: 'var(--alpha-white-2)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 16px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} color="var(--danger-color)" />
                          تاريخ وساعة انتهاء الاشتراك
                        </span>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary-color)', marginTop: '4px' }}>
                          {user?.subscription_end_date ? new Date(user.subscription_end_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : 'سارٍ'}
                        </div>
                      </div>

                      <div style={{ background: 'var(--alpha-white-2)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 16px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} color="var(--secondary-color)" />
                          المدة المتبقية
                        </span>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--secondary-color)', marginTop: '4px' }}>
                          {remainingDays} يوماً متبقياً
                        </div>
                      </div>
                    </div>

                    {/* Dedicated Currency Verification & Daily Renewal System Card */}
                    <div style={{ background: 'var(--alpha-white-3)', border: '1px solid var(--border-primary)', borderRadius: '14px', padding: '18px 20px', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <h4 style={{ fontSize: '0.96rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                              نظام التحقق من العملة والتجديد اليومي
                            </h4>
                            <span style={{ fontSize: '0.78rem', color: 'var(--primary-color)', fontWeight: 700 }}>
                              رصيد موثق ومحمي ضد التلاعب والتجاوز
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleVerifyCurrency}
                          disabled={isVerifyingCurrency}
                          style={{
                            padding: '8px 14px',
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--primary-color)',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            cursor: isVerifyingCurrency ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'var(--transition)'
                          }}
                        >
                          <RefreshCw size={14} className={isVerifyingCurrency ? 'animate-spin' : ''} />
                          <span>{isVerifyingCurrency ? 'جاري التحقق...' : 'تأكيد ومطابقة الرصيد الآن'}</span>
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>الرصيد المؤكد حالياً</span>
                            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--primary-color)', marginTop: '2px' }}>
                              {coins.toFixed(2)} نقطة
                            </div>
                          </div>
                          <Coins size={22} color="var(--primary-color)" />
                        </div>

                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>موعد التجديد اليومي القادم</span>
                            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '2px', fontFamily: 'monospace', direction: 'ltr' }}>
                              {renewalCountdown}
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>عند منتصف الليل (12:00 ص بتوقيت القاهرة)</span>
                          </div>
                          <Clock size={22} color="var(--secondary-color)" />
                        </div>
                      </div>

                      {/* Guarantees List */}
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          <CheckCircle2 size={14} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>حساب دقيق للنقاط يمنع الخصم العشوائي.</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          <CheckCircle2 size={14} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>تجديد يومي كامل حتى آخر ثانية في الاشتراك.</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          <CheckCircle2 size={14} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>إنهاء تلقائي دقيق للمدة دون أي تجاوز.</span>
                        </div>
                      </div>
                    </div>

                    {/* Feature Highlights */}
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px' }}>الميزات النشطة في حسابك:</h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={15} color="var(--primary-color)" /> تجديد يومي تلقائي للرصيد كل 24 ساعة بتوقيت القاهرة</li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={15} color="var(--primary-color)" /> استخدام كامل لنموذج Pro الفائق</li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={15} color="var(--primary-color)" /> تفعيل ميزة التفكير المستفيض (Deep Thinking)</li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={15} color="var(--primary-color)" /> إنشاء امتحانات تفاعلية وبطاقات تدريب غير محدودة</li>
                      </ul>
                    </div>

                    {/* Notice */}
                    <div style={{ background: 'rgba(229, 169, 60, 0.08)', border: '1px solid rgba(229, 169, 60, 0.25)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                      <AlertCircle size={18} color="var(--secondary-color)" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        لا يمكن الاشتراك في باقة إضافية أو إعادة التوجيه للدفع أثناء سريان اشتراكك الحالي. سيتاح لك الاشتراك وتجديد باقتك فور انتهاء المدة الحالية في {user?.subscription_end_date ? new Date(user.subscription_end_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : 'نهاية الفترة'}.
                      </span>
                    </div>

                    {/* Return Action */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('chat')}
                      className="btn-primary"
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <ArrowRight size={18} />
                      <span>العودة إلى المساعد الذكي ومواصلة المذاكرة</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Title & Header */}
                  <div style={{ textAlign: 'center' }}>
                    {user?.subscription_status === 'expired' && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(193, 39, 45, 0.1)', color: 'var(--danger-color)', padding: '8px 18px', borderRadius: 'var(--radius-full)', fontSize: '0.88rem', fontWeight: 800, marginBottom: '16px', border: '1px solid rgba(193, 39, 45, 0.25)' }}>
                        <AlertCircle size={16} />
                        <span>انتهت فترة اشتراكك السابقة. تم إيقاف التجديد اليومي التلقائي لمنع تجاوز المدة.</span>
                      </div>
                    )}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--primary-light)', color: 'var(--primary-color)', padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', fontWeight: 800, marginBottom: '14px' }}>
                      <CreditCard size={15} />
                      <span>الاشتراكات والأسعار الرسمية</span>
                    </div>
                    <h2 style={{ fontSize: isMobile ? '1.5rem' : '1.9rem', fontWeight: 900, color: 'var(--primary-color)' }}>
                      {user?.subscription_status === 'expired' ? 'جدّد اشتراكك لمواصلة التفوق' : 'اختر باقة الاشتراك المناسبة لك'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '0.92rem', lineHeight: '1.7', maxWidth: '640px', margin: '8px auto 0' }}>
                      احصل على التفعيل الفوري للمساعد الذكي الفائق (Pro Model)، ميزة التفكير المستفيض، وتوليد امتحانات تفاعلية غير محدودة مع تجديد يومي دقيق للرصيد.
                    </p>
                  </div>

                  {/* Currency Verification Box for Free / Expired registered users */}
                  {user && (
                    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            الرصيد المتاح حالياً: <span style={{ color: 'var(--primary-color)' }}>{coins.toFixed(2)} نقطة</span>
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {user.subscription_status === 'expired'
                              ? 'حسابك في الوضع المجاني بعد انتهاء مدة الاشتراك. النقاط المتبقية صالحة حتى نفادها.'
                              : 'الرصيد التجريبي المجاني الممنوح لك. اشترك لتفعيل التجديد اليومي التلقائي.'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleVerifyCurrency}
                        disabled={isVerifyingCurrency}
                        style={{
                          padding: '8px 16px',
                          background: 'var(--alpha-white-2)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-main)',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: isVerifyingCurrency ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'var(--transition)'
                        }}
                      >
                        <RefreshCw size={14} className={isVerifyingCurrency ? 'animate-spin' : ''} />
                        <span>{isVerifyingCurrency ? 'جاري التحقق...' : 'التحقق من الرصيد'}</span>
                      </button>
                    </div>
                  )}

                  {/* 3 Pricing Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '20px' }}>
                    
                    {/* Plan 1: 1 Month (60 EGP) */}
                    <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', background: 'var(--card-bg)', border: '2px solid var(--primary-color)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: '14px', left: '14px', background: 'var(--primary-color)', color: '#FFFFFF', fontSize: '0.68rem', fontWeight: 900, padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
                        الباقة الأكثر طلباً
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary-color)', marginBottom: '6px' }}>باقة شهر (1 Month)</h3>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '12px 0 16px' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>60</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)' }}>ج.م / شهرياً</span>
                      </div>
                      <div style={{ background: 'var(--primary-light)', color: 'var(--primary-color)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontWeight: 800, marginBottom: '14px', textAlign: 'center' }}>
                        80 نقطة يومياً تتجدد كل 24 ساعة
                      </div>
                      <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', marginBottom: '16px' }} />
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={15} color="var(--primary-color)" /> 80 نقطة يومياً تتجدد تلقائياً طوال 30 يوماً</li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={15} color="var(--primary-color)" /> استخدام كامل لنموذج Pro الفائق</li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={15} color="var(--primary-color)" /> تفعيل ميزة التفكير المستفيض (Deep Thinking)</li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={15} color="var(--primary-color)" /> إنشاء امتحانات تفاعلية غير محدودة</li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={15} color="var(--primary-color)" /> دعم فني مباشر عبر الواتساب</li>
                      </ul>
                      <button
                        onClick={() => handleSubscribe('pro_1m')}
                        disabled={subscribingPlan !== null}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--primary-color)',
                          color: 'var(--text-on-primary)',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          border: 'none',
                          cursor: subscribingPlan !== null ? 'not-allowed' : 'pointer',
                          opacity: subscribingPlan !== null && subscribingPlan !== 'pro_1m' ? 0.6 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'var(--transition)'
                        }}
                      >
                        {subscribingPlan === 'pro_1m' ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>جاري التجهيز لبوابة كاشير...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard size={16} />
                            <span>اشترك الآن (كاشير Kashier)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Plan 2: 2 Months (100 EGP) */}
                    <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: '14px', left: '14px', background: 'var(--primary-light)', color: 'var(--primary-color)', fontSize: '0.68rem', fontWeight: 900, padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
                        الباقة الأكثر شعبية
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '6px' }}>باقة شهرين (2 Months)</h3>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '12px 0 16px' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>100</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)' }}>ج.م / شهرين</span>
                      </div>
                      <div style={{ background: 'var(--primary-light)', color: 'var(--primary-color)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontWeight: 800, marginBottom: '14px', textAlign: 'center' }}>
                        90 نقطة يومياً تتجدد كل 24 ساعة
                      </div>
                      <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', marginBottom: '16px' }} />
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={15} color="var(--primary-color)" /> 90 نقطة يومياً تتجدد تلقائياً طوال 60 يوماً</li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={15} color="var(--primary-color)" /> جميع ميزات باقة Pro مع ميزة التفكير المستفيض</li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={15} color="var(--primary-color)" /> تدريب وحل مسائل وامتحانات تفاعلية متقدمة</li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={15} color="var(--primary-color)" /> دعم فني ومتابعة أداء مستمرة</li>
                      </ul>
                      <button
                        onClick={() => handleSubscribe('pro_2m')}
                        disabled={subscribingPlan !== null}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--card-bg)',
                          border: '1px solid var(--primary-color)',
                          color: 'var(--primary-color)',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          cursor: subscribingPlan !== null ? 'not-allowed' : 'pointer',
                          opacity: subscribingPlan !== null && subscribingPlan !== 'pro_2m' ? 0.6 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'var(--transition)'
                        }}
                      >
                        {subscribingPlan === 'pro_2m' ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>جاري التجهيز لبوابة كاشير...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard size={16} />
                            <span>اشترك الآن (كاشير Kashier)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Plan 3: 3 Months (140 EGP) */}
                    <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: '14px', left: '14px', background: 'var(--primary-light)', color: 'var(--primary-color)', fontSize: '0.68rem', fontWeight: 800, padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
                        أفضل قيمة وأعلى توفير
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '6px' }}>باقة 3 أشهر (3 Months)</h3>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '12px 0 16px' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>140</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)' }}>ج.م / 3 أشهر</span>
                      </div>
                      <div style={{ background: 'var(--primary-light)', color: 'var(--primary-color)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontWeight: 800, marginBottom: '14px', textAlign: 'center' }}>
                        120 نقطة يومياً تتجدد كل 24 ساعة
                      </div>
                      <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', marginBottom: '16px' }} />
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={15} color="var(--primary-color)" /> 120 نقطة يومياً تتجدد تلقائياً طوال 90 يوماً</li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={15} color="var(--primary-color)" /> أولوية قصوى وسرعة فائقة في الإجابات والحلول</li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={15} color="var(--primary-color)" /> تغطية شاملة لترم كامل في الامتحانات والحلول</li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={15} color="var(--primary-color)" /> متابعة خاصة ودعم فني مخصص</li>
                      </ul>
                      <button
                        onClick={() => handleSubscribe('pro_3m')}
                        disabled={subscribingPlan !== null}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--card-bg)',
                          border: '1px solid var(--primary-color)',
                          color: 'var(--primary-color)',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          cursor: subscribingPlan !== null ? 'not-allowed' : 'pointer',
                          opacity: subscribingPlan !== null && subscribingPlan !== 'pro_3m' ? 0.6 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'var(--transition)'
                        }}
                      >
                        {subscribingPlan === 'pro_3m' ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>جاري التجهيز لبوابة كاشير...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard size={16} />
                            <span>اشترك الآن (كاشير Kashier)</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>

                  {/* Payment Gateway Information (Kashier) */}
                  <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                    <h4 style={{ fontWeight: 800, color: 'var(--primary-color)', marginBottom: '10px', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={18} />
                      <span>طرق الدفع الإلكتروني الآمنة عبر بوابة كاشير (Kashier)</span>
                    </h4>
                    <p style={{ lineHeight: '1.7', fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
                      يتم معالجة كافة المعاملات المالية على الموقع بشكل آمن ومشفر 100% عبر بوابة الدفع <strong>كاشير Kashier</strong> المعتمدة بالبنك المركزي المصري.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '0.8rem', fontWeight: 700 }}>
                      {['Visa', 'Mastercard', 'ميزة Meeza', 'فودافون كاش', 'أورانج كاش', 'اتصالات كاش', 'WE Pay', 'Instapay'].map((method, i) => (
                        <span key={i} style={{ background: 'var(--primary-light)', color: 'var(--primary-color)', padding: '5px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Cancellation & Refund Policy Notice */}
              <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-lg)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', direction: 'rtl' }}>
                <h4 style={{ fontWeight: 800, color: 'var(--primary-color)', marginBottom: '8px', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={17} />
                  <span>سياسة الإلغاء والاسترجاع (Refund Policy):</span>
                </h4>
                <p style={{ lineHeight: '1.7', fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
                  يمكنك طلب إلغاء الاشتراك واسترداد المبلغ المدفوع خلال <strong>3 أيام (72 ساعة)</strong> فقط من تاريخ وتوقيت الشراء، <strong>بشرط ألا تكون قد استخدمت أي جزء من نقاط الباقة المتاحة</strong>. في حال استخدام أية نقطة، يعتبر الاشتراك غير قابل للاسترجاع.
                </p>
              </div>

              {/* Points system info card */}
              <div className="glass" style={{ padding: '18px 24px', borderRadius: 'var(--radius-lg)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sparkles size={18} color="var(--primary-color)" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>رصيد نقاطك الحالي في الحساب:</span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary-color)' }}>
                  {coins.toFixed(2)} نقطة
                </div>
              </div>

              {/* Support & Contact Banner */}
              <div style={{ textAlign: 'center', padding: '16px', background: 'var(--primary-light)', borderRadius: 'var(--radius-lg)', color: 'var(--primary-color)', fontSize: '0.88rem', fontWeight: 700 }}>
                تحتاج مساعدة أو استفسار بخصوص الاشتراكات؟ تواصل معنا عبر الهاتف/واتساب: <a href="tel:01037220587" style={{ color: 'inherit', textDecoration: 'underline', direction: 'ltr', display: 'inline-block' }}>01037220587</a> أو البريد الإلكتروني: <a href="mailto:sohaib572010@gmail.com" style={{ color: 'inherit', textDecoration: 'underline' }}>sohaib572010@gmail.com</a>
              </div>

              {/* Website Footer Links */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.84rem' }}>
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'none' }}>سياسة الخصوصية</a>
                <span style={{ color: 'var(--border-color)' }}>•</span>
                <a href="/terms#refund" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'none' }}>سياسة الإرجاع والاسترجاع</a>
                <span style={{ color: 'var(--border-color)' }}>•</span>
                <a href="/contact" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'none' }}>نموذج التواصل والدعم الفني</a>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 3: Admin Dashboard */}
        {activeTab === 'admin' && user?.role === 'admin' && (
          <div className="mobile-main-with-nav" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '24px 16px' : '40px 24px', background: 'var(--bg-color)' }}>
            {isMobile && (
              <button 
                onClick={() => setActiveTab('chat')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  marginBottom: '24px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  fontFamily: 'var(--font-arabic)',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'var(--transition)'
                }}
              >
                <ArrowRight size={16} />
                <span>العودة للدردشة</span>
              </button>
            )}
            <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-scale-in">
              
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-color)' }}>لوحة تحكم المسؤول</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>إدارة كاملة للمنصة: المناهج، المستخدمون، الإشعارات، البلاغات، وإصدارات التطبيق.</p>
              </div>

              {/* Admin Section Tabs */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                {[
                  { key: 'overview', label: 'المناهج والإحصائيات', icon: <BookOpen size={14} /> },
                  { key: 'users', label: 'المستخدمون', icon: <User size={14} /> },
                  { key: 'notifications', label: 'الإشعارات', icon: <Sparkles size={14} /> },
                  { key: 'reports', label: 'البلاغات', icon: <AlertCircle size={14} /> },
                  { key: 'versions', label: 'إصدارات التطبيق', icon: <Globe size={14} /> },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setAdminSection(tab.key as any)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 16px',
                      borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                      border: 'none',
                      borderBottom: adminSection === tab.key ? '2px solid var(--primary-color)' : '2px solid transparent',
                      background: adminSection === tab.key ? 'var(--primary-light)' : 'transparent',
                      color: adminSection === tab.key ? 'var(--primary-color)' : 'var(--text-muted)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {adminSection === 'overview' && (
              <>
              {/* Statistics Dashboard */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                {/* Total Users */}
                <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>إجمالي الطلاب المسجلين</span>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                    {dashboardStats?.totalUsers || 0} طالب
                  </span>
                  <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '10px', paddingTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--text-main)' }}>توزيع الطلاب حسب الصف:</div>
                    {Object.entries(GRADE_NAMES).map(([key, name]) => {
                      const count = dashboardStats?.usersByGrade?.[key] || 0;
                      return (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span>{name}:</span>
                          <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Highest Usage User */}
                <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>الطالب الأكثر استخداماً للرسائل</span>
                    {dashboardStats?.highestUsageUser ? (
                      <div style={{ marginTop: '8px' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'block' }}>
                          {dashboardStats.highestUsageUser.name}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                          البريد الإلكتروني: {dashboardStats.highestUsageUser.email || dashboardStats.highestUsageUser.phone}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>
                          الصف: {GRADE_NAMES[dashboardStats.highestUsageUser.grade_level]}
                        </span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-color)', display: 'block', marginTop: '6px' }}>
                          عدد الرسائل المرسلة: {dashboardStats.highestUsageUser.message_count} رسالة
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>لا توجد رسائل مرسلة بعد</span>
                    )}
                  </div>
                </div>

                {/* Highest Usage Grade */}
                <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>الصف الأكثر نشاطاً</span>
                    {dashboardStats?.highestUsageGrade ? (
                      <div style={{ marginTop: '8px' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-color)', display: 'block' }}>
                          {GRADE_NAMES[dashboardStats.highestUsageGrade.grade_level]}
                        </span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginTop: '8px' }}>
                          عدد رسائل الصف: {dashboardStats.highestUsageGrade.message_count} رسالة
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>لا توجد رسائل مرسلة بعد</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Grade Level Activations */}
              <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '12px' }}>
                  تفعيل المراحل والصفوف الدراسية
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  حدد الصفوف الدراسية المتاحة للطلاب الجدد عند التسجيل والطلاب الحاليين في المنصة.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {Object.entries(GRADE_NAMES).map(([key, name]) => {
                    const isChecked = activeGradeLevels.includes(key);
                    return (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: isChecked ? 'var(--primary-light)' : 'var(--alpha-white-2)', border: '1px solid', borderColor: isChecked ? 'var(--primary-color)' : 'var(--border-color)', transition: 'var(--transition)' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleGradeActive(key)}
                          style={{ accentColor: 'var(--primary-color)', width: '16px', height: '16px' }}
                        />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isChecked ? 'var(--primary-color)' : 'var(--text-main)' }}>{name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Baccalaureate Tracks Activation */}
              <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                    إدارة وتفعيل مسارات السنة الثانية بكالوريا
                  </h3>
                  {savingTracks && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)' }}>جاري حفظ التغييرات...</span>
                  )}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  حدد المسارات المتاحة لطلاب الصف الثاني الثانوي (البكالوريا) لتظهر لهم في خيارات التسجيل واختيار المواد الدراسية.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {Object.values(BACCALAUREATE_TRACKS).map((track) => {
                    const isChecked = activeTracks.includes(track.id);
                    const trackElectives = getElectiveSubjectsForTrack(track.id);
                    return (
                      <label key={track.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer', padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: isChecked ? 'var(--primary-light)' : 'var(--alpha-white-2)', border: '1px solid', borderColor: isChecked ? 'var(--primary-color)' : 'var(--border-color)', transition: 'var(--transition)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleTrackActive(track.id)}
                            style={{ accentColor: 'var(--primary-color)', width: '16px', height: '16px' }}
                          />
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: isChecked ? 'var(--primary-color)' : 'var(--text-main)' }}>{track.name}</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: '26px' }}>{track.description}</span>
                        {trackElectives.length > 0 ? (
                          <span style={{ fontSize: '0.7rem', color: 'var(--primary-color)', marginRight: '26px', marginTop: '2px' }}>
                            المواد المضافة للمسار: {trackElectives.join('، ')}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginRight: '26px', marginTop: '2px' }}>
                            لا توجد مواد مضافة لهذا المسار حتى الآن
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Two Column Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                
                {/* Upload Curriculum */}
                <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text-main)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Upload size={18} />
                      <span>{uploadMode === 'file' ? 'رفع ملف منهج جديد (.md)' : 'إضافة مادة بدون ملف (قيد الإعداد)'}</span>
                    </h3>

                    {/* Mode switch */}
                    <div style={{ display: 'flex', background: 'var(--sidebar-bg)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <button
                        type="button"
                        onClick={() => setUploadMode('file')}
                        style={{
                          padding: '4px 10px',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: uploadMode === 'file' ? 'var(--primary-color)' : 'transparent',
                          color: uploadMode === 'file' ? 'var(--text-on-primary)' : 'var(--text-muted)'
                        }}
                      >
                        رفع ملف
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMode('placeholder')}
                        style={{
                          padding: '4px 10px',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: uploadMode === 'placeholder' ? 'var(--primary-color)' : 'transparent',
                          color: uploadMode === 'placeholder' ? 'var(--text-on-primary)' : 'var(--text-muted)'
                        }}
                      >
                        قيد الإعداد (بدون ملف)
                      </button>
                    </div>
                  </div>

                  {adminMessage.text && (
                    <div style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      background: adminMessage.type === 'success' ? 'rgba(42, 157, 143, 0.1)' : 'rgba(230, 57, 70, 0.1)',
                      color: adminMessage.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <AlertCircle size={16} />
                      <span>{adminMessage.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleUploadCurriculum} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>السنة الدراسية:</label>
                      <select
                        value={uploadGrade}
                        onChange={(e) => setUploadGrade(e.target.value)}
                        style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--sidebar-bg)', color: 'var(--text-main)' }}
                      >
                        {Object.entries(GRADE_NAMES).map(([key, name]) => (
                          <option key={key} value={key} style={{ background: 'var(--card-bg)' }}>{name}</option>
                        ))}
                      </select>
                    </div>

                    {uploadGrade === '2_high' && (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>المسار الدراسي (اختياري / مادة تخصص):</label>
                          <select
                            value={uploadTrackId}
                            onChange={(e) => setUploadTrackId(e.target.value)}
                            style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--sidebar-bg)', color: 'var(--text-main)' }}
                          >
                            <option value="">مادة مشتركة لجميع مسارات البكالوريا</option>
                            {Object.values(BACCALAUREATE_TRACKS).map((track) => (
                              <option key={track.id} value={track.id}>{track.name}</option>
                            ))}
                          </select>
                        </div>

                        {uploadTrackId && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={uploadIsElective}
                              onChange={(e) => setUploadIsElective(e.target.checked)}
                              style={{ accentColor: 'var(--primary-color)', width: '15px', height: '15px' }}
                            />
                            <span>هذه المادة هي مادة اختيارية في هذا المسار</span>
                          </label>
                        )}
                      </>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>اسم المادة الدراسية:</label>
                      <input
                        type="text"
                        value={uploadSubject}
                        onChange={(e) => setUploadSubject(e.target.value)}
                        placeholder="مثال: الأحياء، الكيمياء، الرياضيات المتخصصة"
                        style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--sidebar-bg)', color: 'var(--text-main)' }}
                      />
                    </div>

                    {uploadMode === 'file' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>اختر ملف المنهج (Markdown):</label>
                        <input
                          id="curriculum_file"
                          type="file"
                          accept=".md"
                          onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                          style={{ padding: '8px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--sidebar-bg)', color: 'var(--text-main)' }}
                        />
                      </div>
                    )}

                    {uploadMode === 'placeholder' && (
                      <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(229, 169, 60, 0.1)', border: '1px solid rgba(229, 169, 60, 0.3)', fontSize: '0.8rem', color: 'var(--accent-gold, #E5A93C)', lineHeight: '1.6' }}>
                        سيتم إضافة المادة إلى قائمة المواد للطلاب مع إشعار "قريباً / قيد الإعداد". لن يتمكن الطلاب من إرسال أسئلة حولها حتى تقوم برفع ملف المنهج لاحقاً.
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={adminLoading}
                      style={{
                        padding: '12px',
                        background: 'var(--primary-color)',
                        color: 'var(--text-on-primary)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '10px',
                        transition: 'var(--transition)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary-color)'}
                    >
                      {adminLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>{uploadMode === 'file' ? 'جاري تحليل وتجزئة الملف...' : 'جاري إضافة المادة...'}</span>
                        </>
                      ) : (
                        <span>{uploadMode === 'file' ? 'رفع وتجهيز بيانات المنهج' : 'إضافة المادة (قيد الإعداد)'}</span>
                      )}
                    </button>
                  </form>
                </div>

                {/* System Settings Configurations */}
                <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text-main)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={18} />
                    <span>إعدادات النظام وعناوين التطبيق</span>
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>رابط الموقع (Next.js URL):</label>
                      <input
                        type="text"
                        value={websiteLink}
                        onChange={(e) => setWebsiteLink(e.target.value)}
                        placeholder="http://localhost:3000"
                        style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--sidebar-bg)', color: 'var(--text-main)' }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        سيتم استدعاء هذا الرابط من تطبيق الهواتف (Flutter) لتوجيه المستخدمين لإكمال عمليات الدفع بشكل آمن على متصفح الويب.
                      </span>
                    </div>

                    <button
                      onClick={handleUpdateWebsiteLink}
                      style={{
                        padding: '12px',
                        background: 'var(--primary-color)',
                        color: 'var(--text-on-primary)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary-color)'}
                    >
                      حفظ إعدادات الرابط
                    </button>
                  </div>
                </div>

              </div>

              {/* Loaded Curriculums */}
              <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', marginTop: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '16px' }}>
                  المناهج الدراسية المفهرسة بالذكاء الاصطناعي
                </h3>

                {curriculums.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>لا يوجد مناهج مرفوعة حالياً. يرجى رفع ملفات المناهج بصيغة Markdown للبدء.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'right' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--primary-color)' }}>
                          <th style={{ padding: '12px 8px' }}>المادة</th>
                          <th style={{ padding: '12px 8px' }}>السنة الدراسية والمسار</th>
                          <th style={{ padding: '12px 8px' }}>الملف المرفوع</th>
                          <th style={{ padding: '12px 8px' }}>تاريخ الرفع</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center' }}>النشاط والنشر</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center' }}>العمليات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {curriculums.map((curr) => {
                          const isCurrActive = activeCurriculumIds.includes(curr.id);
                          const isPlaceholder = !!curr.is_placeholder;
                          return (
                            <tr key={curr.id} style={{ borderBottom: '1px solid var(--alpha-white-5)' }}>
                              <td style={{ padding: '12px 8px', fontWeight: 700 }}>
                                {renamingCurriculumId === curr.id ? (
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <input
                                      type="text"
                                      autoFocus
                                      value={renameSubjectValue}
                                      onChange={(e) => setRenameSubjectValue(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCurriculum(curr.id); if (e.key === 'Escape') setRenamingCurriculumId(null); }}
                                      style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--primary-color)', outline: 'none', background: 'var(--sidebar-bg)', color: 'var(--text-main)', fontSize: '0.85rem', width: '120px' }}
                                    />
                                    <button onClick={() => handleRenameCurriculum(curr.id)} style={{ background: 'var(--primary-color)', border: 'none', color: 'var(--text-on-primary)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>حفظ</button>
                                    <button onClick={() => setRenamingCurriculumId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem' }}>إلغاء</button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{curr.subject_name}</span>
                                    <button
                                      onClick={() => { setRenamingCurriculumId(curr.id); setRenameSubjectValue(curr.subject_name); }}
                                      title="إعادة تسمية المادة"
                                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '2px' }}
                                    >
                                      <Settings size={12} />
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '12px 8px' }}>
                                <div>{GRADE_NAMES[curr.grade_level]}</div>
                                {curr.track_id && BACCALAUREATE_TRACKS[curr.track_id] && (
                                  <div style={{ fontSize: '0.72rem', color: 'var(--primary-color)', marginTop: '2px', fontWeight: 600 }}>
                                    {BACCALAUREATE_TRACKS[curr.track_id].name} {curr.is_elective ? '(اختيارية)' : ''}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '12px 8px', direction: 'ltr', textAlign: 'right' }}>
                                {isPlaceholder ? (
                                  <span style={{ background: 'rgba(229, 169, 60, 0.15)', color: 'var(--accent-gold, #E5A93C)', border: '1px solid rgba(229, 169, 60, 0.3)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, direction: 'rtl', display: 'inline-block' }}>
                                    قيد التجهيز (بدون ملف)
                                  </span>
                                ) : (
                                  curr.file_name
                                )}
                              </td>
                              <td style={{ padding: '12px 8px' }}>{new Date(curr.created_at).toLocaleDateString('ar-EG')}</td>
                              <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={isCurrActive}
                                    onChange={() => handleToggleCurriculumActive(curr.id)}
                                    style={{ accentColor: 'var(--primary-color)', width: '16px', height: '16px' }}
                                  />
                                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isCurrActive ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                                    {isCurrActive ? 'منشور نشط' : 'غير منشور'}
                                  </span>
                                </label>
                              </td>
                              <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                  {isPlaceholder && (
                                    <button
                                      onClick={() => { setAttachCurriculumModal(curr); setAttachFile(null); }}
                                      title="رفع ملف المنهج وتفعيله"
                                      style={{
                                        background: 'var(--primary-color)',
                                        border: 'none',
                                        color: 'var(--text-on-primary)',
                                        cursor: 'pointer',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                      }}
                                    >
                                      <Upload size={12} />
                                      <span>رفع الملف الآن</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleOpenUnitsModal(curr)}
                                    title="إدارة فهرس الوحدات والدروس يدوياً"
                                    style={{
                                      background: 'rgba(125, 161, 70, 0.15)',
                                      border: '1px solid var(--border-primary)',
                                      color: 'var(--primary-color)',
                                      cursor: 'pointer',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px'
                                    }}
                                  >
                                    <Layers size={13} />
                                    <span>الوحدات والدروس ({curr.units?.length || 0})</span>
                                  </button>
                                  <button
                                    onClick={() => handleEditCurriculum(curr.id)}
                                    style={{
                                      background: 'var(--primary-light)',
                                      border: 'none',
                                      color: 'var(--primary-color)',
                                      cursor: 'pointer',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700
                                    }}
                                  >
                                    تعديل المحتوى
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCurriculum(curr.id)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--danger-color)',
                                      cursor: 'pointer',
                                      padding: '4px',
                                      borderRadius: '4px'
                                    }}
                                  >
                                    <Trash size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              </>
              )}

              {/* Users Management Section */}
              {adminSection === 'users' && (
                <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '16px' }}>إدارة المستخدمين</h3>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    <input
                      type="text"
                      value={adminUserSearch}
                      onChange={(e) => setAdminUserSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') loadAdminUsers(); }}
                      placeholder="ابحث بالاسم أو رقم الهاتف..."
                      style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--sidebar-bg)', color: 'var(--text-main)' }}
                    />
                    <button onClick={loadAdminUsers} className="btn-secondary" style={{ padding: '10px 18px' }}>بحث</button>
                  </div>

                  {adminUsersLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--primary-color)' }} /></div>
                  ) : adminUsers.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>لا يوجد مستخدمون مطابقون.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'right' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--primary-color)' }}>
                            <th style={{ padding: '10px 8px' }}>الاسم</th>
                            <th style={{ padding: '10px 8px' }}>البريد الإلكتروني</th>
                            <th style={{ padding: '10px 8px' }}>الصف</th>
                            <th style={{ padding: '10px 8px' }}>الرصيد</th>
                            <th style={{ padding: '10px 8px', textAlign: 'center' }}>الأجهزة</th>
                            <th style={{ padding: '10px 8px', textAlign: 'center' }}>رصيد غير محدود</th>
                            <th style={{ padding: '10px 8px', textAlign: 'center' }}>إدارة الأجهزة</th>
                            <th style={{ padding: '10px 8px', textAlign: 'center' }}>حذف</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminUsers.map((u) => (
                            <tr key={u.id} style={{ borderBottom: '1px solid var(--alpha-white-5)' }}>
                              <td style={{ padding: '10px 8px', fontWeight: 700 }}>{u.name}{u.role === 'admin' && <span className="plan-badge plan-badge-max" style={{ marginRight: '6px' }}>مسؤول</span>}</td>
                              <td style={{ padding: '10px 8px', direction: 'ltr', textAlign: 'right' }}>{u.email || u.phone}</td>
                              <td style={{ padding: '10px 8px' }}>{GRADE_NAMES[u.grade_level] || u.grade_level}</td>
                              <td style={{ padding: '10px 8px' }}>{(u.coins ?? 0).toFixed(2)}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-full)',
                                  background: (u.active_devices_count ?? 0) >= 3 ? 'rgba(230, 57, 70, 0.15)' : 'var(--alpha-white-2)',
                                  color: (u.active_devices_count ?? 0) >= 3 ? '#E63946' : 'var(--text-main)',
                                  fontSize: '0.75rem',
                                  fontWeight: 800
                                }}>
                                  {u.active_devices_count ?? 0} / 3
                                </span>
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={!!u.unlimited_credit}
                                    onChange={() => handleToggleUserUnlimited(u.id, !!u.unlimited_credit)}
                                    style={{ accentColor: 'var(--primary-color)', width: '16px', height: '16px' }}
                                  />
                                </label>
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleResetUserDevices(u.id)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'var(--alpha-white-2)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="تسجيل الخروج من كافة أجهزة هذا المستخدم"
                                >
                                  <RotateCcw size={12} />
                                  <span>إعادة ضبط</span>
                                </button>
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                {u.role !== 'admin' && (
                                  <button onClick={() => handleDeleteUser(u.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}>
                                    <Trash size={15} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Notifications Management Section */}
              {adminSection === 'notifications' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '16px' }}>إنشاء إشعار جديد</h3>
                    <form onSubmit={handleCreateNotification} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <input
                        type="text"
                        value={newNotifTitle}
                        onChange={(e) => setNewNotifTitle(e.target.value)}
                        placeholder="عنوان الإشعار"
                        style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--sidebar-bg)', color: 'var(--text-main)' }}
                      />
                      <textarea
                        value={newNotifBody}
                        onChange={(e) => setNewNotifBody(e.target.value)}
                        placeholder="نص الإشعار..."
                        rows={3}
                        style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--sidebar-bg)', color: 'var(--text-main)', resize: 'vertical', fontFamily: 'var(--font-arabic)' }}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>نوع الإشعار:</label>
                          <select value={newNotifType} onChange={(e) => setNewNotifType(e.target.value as any)} style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-main)' }}>
                            <option value="info">معلومة</option>
                            <option value="success">تهنئة/نجاح</option>
                            <option value="warning">تنبيه</option>
                            <option value="maintenance">صيانة/عطل</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>يظهر على:</label>
                          <select value={newNotifTarget} onChange={(e) => setNewNotifTarget(e.target.value as any)} style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-main)' }}>
                            <option value="both">الموقع والتطبيق معاً</option>
                            <option value="web">الموقع فقط</option>
                            <option value="phone">تطبيق الهاتف فقط</option>
                          </select>
                        </div>
                      </div>
                      <button type="submit" disabled={notifCreateLoading} className="btn-primary" style={{ padding: '12px' }}>
                        {notifCreateLoading ? <Loader2 size={16} className="animate-spin" /> : <span>نشر الإشعار</span>}
                      </button>
                    </form>
                  </div>

                  <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '16px' }}>الإشعارات المنشورة</h3>
                    {adminNotificationsLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--primary-color)' }} /></div>
                    ) : adminNotifications.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>لا توجد إشعارات بعد.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {adminNotifications.map((n) => (
                          <div key={n.id} style={{ padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: n.active ? 'var(--alpha-white-2)' : 'transparent', opacity: n.active ? 1 : 0.5 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 700 }}>{n.title}</span>
                                  <span className="plan-badge plan-badge-free" style={{ fontSize: '0.65rem' }}>{n.target === 'both' ? 'الموقع والتطبيق' : n.target === 'web' ? 'الموقع' : 'التطبيق'}</span>
                                </div>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{n.body}</p>
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                <button onClick={() => handleToggleNotificationActive(n.id, !n.active)} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
                                  {n.active ? 'إخفاء' : 'إظهار'}
                                </button>
                                <button onClick={() => handleDeleteNotification(n.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}>
                                  <Trash size={15} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reports Review Section */}
              {adminSection === 'reports' && (
                <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)' }}>بلاغات الطلاب عن ردود الذكاء الاصطناعي</h3>
                    <select value={reportsStatusFilter} onChange={(e) => setReportsStatusFilter(e.target.value as any)} style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-main)' }}>
                      <option value="pending">قيد المراجعة</option>
                      <option value="reviewed">تمت المراجعة</option>
                      <option value="dismissed">مرفوضة</option>
                      <option value="">الكل</option>
                    </select>
                  </div>

                  {adminReportsLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--primary-color)' }} /></div>
                  ) : adminReports.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>لا توجد بلاغات مطابقة.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {adminReports.map((r) => (
                        <div key={r.id} style={{ padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>{new Date(r.created_at).toLocaleString('ar-EG')}</div>
                          {r.user_query && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}><strong>سؤال الطالب:</strong> {r.user_query}</p>}
                          <p style={{ fontSize: '0.85rem', background: 'var(--alpha-white-2)', padding: '10px', borderRadius: '6px', marginBottom: '6px', whiteSpace: 'pre-wrap' }}>{r.reported_content}</p>
                          <p style={{ fontSize: '0.82rem', color: 'var(--danger-color)', marginBottom: '10px' }}><strong>السبب:</strong> {r.reason}</p>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span className={`plan-badge ${r.status === 'pending' ? 'plan-badge-free' : r.status === 'reviewed' ? 'plan-badge-pro' : 'plan-badge-max'}`}>{r.status === 'pending' ? 'قيد المراجعة' : r.status === 'reviewed' ? 'تمت المراجعة' : 'مرفوضة'}</span>
                            {r.status !== 'reviewed' && <button onClick={() => handleUpdateReportStatus(r.id, 'reviewed')} className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.75rem' }}>تمت المراجعة</button>}
                            {r.status !== 'dismissed' && <button onClick={() => handleUpdateReportStatus(r.id, 'dismissed')} className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.75rem' }}>رفض البلاغ</button>}
                            <button onClick={() => handleDeleteReport(r.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}><Trash size={15} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* App Versions Management Section */}
              {adminSection === 'versions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '16px' }}>إضافة إصدار جديد (أندرويد)</h3>
                    <form onSubmit={handleCreateVersion} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>رقم الإصدار الداخلي (version_code):</label>
                          <input type="number" value={newVersionCode} onChange={(e) => setNewVersionCode(e.target.value)} placeholder="مثال: 2" style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-main)', direction: 'ltr' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>اسم الإصدار الظاهر:</label>
                          <input type="text" value={newVersionName} onChange={(e) => setNewVersionName(e.target.value)} placeholder="مثال: 1.1.0" style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-main)', direction: 'ltr' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>رابط التحميل (Google Play):</label>
                        <input type="text" value={newVersionUrl} onChange={(e) => setNewVersionUrl(e.target.value)} placeholder="https://play.google.com/store/apps/details?id=..." style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-main)', direction: 'ltr' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>ملخص المزايا والتحديثات الجديدة:</label>
                        <textarea value={newVersionNotes} onChange={(e) => setNewVersionNotes(e.target.value)} rows={4} placeholder="ما الجديد في هذا الإصدار؟" style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-main)', resize: 'vertical', fontFamily: 'var(--font-arabic)' }} />
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={newVersionMandatory} onChange={(e) => setNewVersionMandatory(e.target.checked)} style={{ accentColor: 'var(--primary-color)', width: '16px', height: '16px' }} />
                        <span>تحديث إجباري (لا يمكن تخطيه)</span>
                      </label>
                      <button type="submit" disabled={versionCreateLoading} className="btn-primary" style={{ padding: '12px' }}>
                        {versionCreateLoading ? <Loader2 size={16} className="animate-spin" /> : <span>إضافة الإصدار</span>}
                      </button>
                    </form>
                  </div>

                  <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '16px' }}>الإصدارات المنشورة</h3>
                    {adminVersionsLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--primary-color)' }} /></div>
                    ) : adminVersions.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>لا توجد إصدارات مسجلة بعد.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {adminVersions.map((v) => (
                          <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', gap: '10px', flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700 }}>{v.version_name}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(code: {v.version_code})</span>
                                {v.mandatory && <span className="plan-badge plan-badge-max" style={{ fontSize: '0.65rem' }}>إجباري</span>}
                              </div>
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>{v.platform} · {new Date(v.created_at).toLocaleDateString('ar-EG')}</p>
                            </div>
                            <button onClick={() => handleDeleteVersion(v.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}>
                              <Trash size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* VIEW 4: Student Profile */}
        {activeTab === 'profile' && user && (
          <div className="mobile-main-with-nav" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '24px 16px' : '40px 24px', background: 'var(--bg-color)' }}>
            {isMobile && (
              <button 
                onClick={() => setActiveTab('chat')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  marginBottom: '24px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  fontFamily: 'var(--font-arabic)',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'var(--transition)'
                }}
              >
                <ArrowRight size={16} />
                <span>العودة للدردشة</span>
              </button>
            )}
            <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-scale-in">
              
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-color)' }}>الملف الشخصي للطالب</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>تعديل بياناتك الشخصية وتغيير كلمة المرور وإدارة باقة اشتراكك التعليمي.</p>
              </div>

              {profileMessage.text && (
                <div style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  background: profileMessage.type === 'success' ? 'rgba(42, 157, 143, 0.1)' : 'rgba(230, 57, 70, 0.1)',
                  color: profileMessage.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} />
                  <span>{profileMessage.text}</span>
                </div>
              )}

              {/* Profile Card details */}
              <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '20px', color: 'var(--text-main)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)' }}>البيانات الأساسية</h3>
                
                <form onSubmit={handleUpdateProfileName} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>الاسم بالكامل:</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="الاسم"
                        style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--sidebar-bg)', color: 'var(--text-main)' }}
                      />
                      <button
                        type="submit"
                        disabled={profileLoading}
                        style={{
                          padding: '10px 20px',
                          background: 'var(--primary-color)',
                          color: 'var(--text-on-primary)',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'var(--transition)'
                        }}
                      >
                        حفظ الاسم
                      </button>
                    </div>
                  </div>
                </form>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>البريد الإلكتروني:</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', direction: 'ltr', display: 'inline-block', marginTop: '4px' }}>{user.email || user.phone}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>الصف الدراسي الحالي:</span>
                    <select
                      value={user.grade_level}
                      onChange={(e) => {
                        const newGrade = e.target.value;
                        if (newGrade === '2_high') {
                          handleUpdateUserGrade(newGrade, selectedTrack, selectedElective);
                        } else {
                          handleUpdateUserGrade(newGrade, null, null);
                        }
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--sidebar-bg)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        outline: 'none',
                        width: '100%',
                      }}
                    >
                      {Object.entries(GRADE_NAMES)
                        .filter(([key]) => user.role === 'admin' || activeGradeLevels.length === 0 || activeGradeLevels.includes(key) || key === user.grade_level)
                        .map(([key, name]) => (
                          <option key={key} value={key}>{name}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>

                {user.grade_level === '2_high' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>مسار البكالوريا:</span>
                      <select
                        value={user.track_id || selectedTrack}
                        onChange={(e) => {
                          const newTrack = e.target.value;
                          const electives = getElectiveSubjectsForTrack(newTrack);
                          const newElective = electives.length > 0 ? electives[0] : '';
                          handleUpdateUserGrade('2_high', newTrack, newElective);
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--sidebar-bg)',
                          color: 'var(--text-main)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          outline: 'none',
                          width: '100%',
                        }}
                      >
                        {Object.values(BACCALAUREATE_TRACKS)
                          .filter(t => user.role === 'admin' || activeTracks.length === 0 || activeTracks.includes(t.id) || t.id === user.track_id)
                          .map((track) => (
                            <option key={track.id} value={track.id}>{track.name}</option>
                          ))
                        }
                      </select>
                    </div>
                    {(() => {
                      const currentTrack = user.track_id || selectedTrack;
                      const electives = getElectiveSubjectsForTrack(currentTrack);
                      if (electives.length === 0) return null;
                      return (
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>المادة الاختيارية:</span>
                          <select
                            value={user.elective_subject || selectedElective || electives[0]}
                            onChange={(e) => {
                              handleUpdateUserGrade('2_high', currentTrack, e.target.value);
                            }}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--sidebar-bg)',
                              color: 'var(--text-main)',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              outline: 'none',
                              width: '100%',
                            }}
                          >
                            {electives.map((subj) => (
                              <option key={subj} value={subj}>{subj}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Password update flow */}
              <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text-main)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)' }}>تحديث كلمة المرور</h3>
                
                {!profileOtpStep ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>كلمة المرور الجديدة:</label>
                      <input
                        type="password"
                        value={profileNewPassword}
                        onChange={(e) => setProfileNewPassword(e.target.value)}
                        placeholder="أدخل كلمة المرور الجديدة"
                        style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--sidebar-bg)', color: 'var(--text-main)' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendProfileOtp}
                      disabled={profileLoading || !profileNewPassword}
                      style={{
                        padding: '12px',
                        background: 'var(--primary-color)',
                        color: 'var(--text-on-primary)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      إرسال رمز التحقق (OTP)
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleVerifyProfileOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>أدخل رمز التحقق المرسل إلى بريدك الإلكتروني</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>رمز التحقق المرسل:</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={profileOtp}
                        onChange={(e) => setProfileOtp(e.target.value)}
                        placeholder="------"
                        style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', textAlign: 'center', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '4px', background: 'var(--sidebar-bg)', color: 'var(--text-main)' }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={profileLoading}
                      style={{
                        padding: '12px',
                        background: 'var(--primary-color)',
                        color: 'var(--text-on-primary)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      تأكيد كلمة المرور الجديدة
                    </button>
                  </form>
                )}
              </div>

              {/* Account & Subscription status card */}
              <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text-main)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <ShieldCheck size={18} />
                    <span>حالة الحساب والعملة والاشتراك</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleVerifyCurrency}
                    disabled={isVerifyingCurrency}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--alpha-white-2)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--primary-color)',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: isVerifyingCurrency ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'var(--transition)'
                    }}
                  >
                    <RefreshCw size={13} className={isVerifyingCurrency ? 'animate-spin' : ''} />
                    <span>{isVerifyingCurrency ? 'جاري التحقق...' : 'تأكيد الرصيد'}</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: 'var(--primary-light)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--primary-color)', fontWeight: 700 }}>الرصيد المؤكد</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary-color)', marginTop: '2px' }}>
                        {coins.toFixed(2)} نقطة
                      </div>
                    </div>
                    <Coins size={20} color="var(--primary-color)" />
                  </div>

                  <div style={{ background: 'var(--alpha-white-2)', border: '1px solid var(--border-color)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                        {isUserSubscribed ? 'التجديد القادم (القاهرة)' : 'حالة التجديد'}
                      </span>
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '2px', fontFamily: isUserSubscribed ? 'monospace' : 'inherit', direction: isUserSubscribed ? 'ltr' : 'rtl' }}>
                        {isUserSubscribed ? renewalCountdown : 'يتطلب باقة نشطة'}
                      </div>
                    </div>
                    <Clock size={20} color={isUserSubscribed ? 'var(--secondary-color)' : 'var(--text-muted)'} />
                  </div>
                </div>

                <div style={{ background: 'var(--alpha-white-1)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.88rem', color: 'var(--primary-color)', fontWeight: 800 }}>
                    {user?.plan_type === 'pro_3m' || user?.plan_type === 'max' ? 'باقة 3 أشهر (120 نقطة يومياً)' :
                     user?.plan_type === 'pro_2m' ? 'باقة شهرين (90 نقطة يومياً)' :
                     user?.plan_type === 'pro_1m' || user?.plan_type === 'pro' ? 'باقة شهر (80 نقطة يومياً)' :
                     'الباقة المجانية التجريبية (15 نقطة صالحة للاستخدام)'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    {user?.plan_type && user.plan_type !== 'free' && isUserSubscribed
                      ? `اشتراكك سارٍ حتى ${user.subscription_end_date ? new Date(user.subscription_end_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : 'نهاية المدة'}. رصيدك يتجدد تلقائياً كل 24 ساعة بتوقيت القاهرة.`
                      : 'تحصل على 15 نقطة تجريبية عند التسجيل. اشترك الآن في باقاتنا لتفعيل التجديد اليومي الدقيق والوصول الكامل.'}
                  </span>
                </div>

                <button
                  onClick={() => setActiveTab('subscriptions')}
                  className="btn-secondary"
                  style={{ alignSelf: 'flex-start' }}
                >
                  {isUserSubscribed ? 'عرض تفاصيل اشتراكي الحالي' : 'إدارة باقات الاشتراك والترقية'}
                </button>
              </div>

              {/* Connected Devices Card (Max 3 Devices) */}
              <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text-main)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Smartphone size={20} color="var(--primary-color)" />
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)', margin: 0 }}>الأجهزة المتصلة والجلسات النشطة</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الحد الأقصى المسموح به: 3 أجهزة</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: userDevices.length >= 3 ? 'rgba(230, 57, 70, 0.15)' : 'var(--primary-light)',
                      color: userDevices.length >= 3 ? '#E63946' : 'var(--primary-color)',
                      fontSize: '0.78rem',
                      fontWeight: 800
                    }}>
                      {userDevices.length} / 3 أجهزة نشطة
                    </span>
                    <button
                      type="button"
                      onClick={fetchUserDevices}
                      disabled={loadingDevices}
                      style={{
                        padding: '6px 10px',
                        background: 'var(--alpha-white-2)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-main)',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="تحديث قائمة الأجهزة"
                    >
                      <RefreshCw size={12} className={loadingDevices ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                <div style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--alpha-white-1)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5'
                }}>
                  يُسمح باستخدام الحساب على 3 أجهزة كحد أقصى في وقت واحد. إذا قمت بتسجيل الدخول من جهاز رابع، سيتم تلقائياً تسجيل الخروج من كافة الأجهزة السابقة لحماية حسابك من المشاركة غير المصرح بها.
                </div>

                {deviceActionMessage.text && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: deviceActionMessage.type === 'success' ? 'rgba(42, 157, 143, 0.1)' : 'rgba(230, 57, 70, 0.1)',
                    color: deviceActionMessage.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <CheckCircle size={15} />
                    <span>{deviceActionMessage.text}</span>
                  </div>
                )}

                {/* Device List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {loadingDevices ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--primary-color)' }} />
                    </div>
                  ) : userDevices.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      جاري تحميل بيانات الأجهزة المتصلة...
                    </div>
                  ) : (
                    userDevices.map((dev: any) => (
                      <div
                        key={dev.id || dev.device_id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: dev.is_current_device ? '1px solid var(--border-primary)' : '1px solid var(--border-color)',
                          background: dev.is_current_device ? 'var(--primary-light)' : 'var(--sidebar-bg)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-sm)',
                            background: dev.is_current_device ? 'var(--primary-color)' : 'var(--alpha-white-2)',
                            color: dev.is_current_device ? 'var(--text-on-primary)' : 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {dev.device_type === 'mobile' ? <Smartphone size={18} /> :
                             dev.device_type === 'tablet' ? <Tablet size={18} /> :
                             <Laptop size={18} />}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{dev.device_name}</span>
                              {dev.is_current_device && (
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-full)',
                                  background: 'var(--primary-color)',
                                  color: 'var(--text-on-primary)',
                                  fontSize: '0.68rem',
                                  fontWeight: 800
                                }}>
                                  هذا الجهاز
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                              آخر نشاط: {dev.last_active_at ? new Date(dev.last_active_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : 'الآن'}
                              {dev.ip_address ? ` • IP: ${dev.ip_address}` : ''}
                            </span>
                          </div>
                        </div>

                        {!dev.is_current_device && (
                          <button
                            type="button"
                            onClick={() => handleLogoutDevice(dev.device_id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(230, 57, 70, 0.1)',
                              border: '1px solid rgba(230, 57, 70, 0.3)',
                              color: '#E63946',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <LogOut size={13} />
                            <span>تسجيل الخروج</span>
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {userDevices.length > 1 && (
                  <button
                    type="button"
                    onClick={handleLogoutAllOtherDevices}
                    style={{
                      alignSelf: 'flex-start',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(230, 57, 70, 0.1)',
                      border: '1px solid rgba(230, 57, 70, 0.3)',
                      color: '#E63946',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <ShieldAlert size={15} />
                    <span>تسجيل الخروج من جميع الأجهزة الأخرى</span>
                  </button>
                )}
              </div>

              {/* Account Deletion & Danger Zone */}
              <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid rgba(193, 39, 45, 0.3)', display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-main)' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#C1272D', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Trash2 size={16} />
                  <span>منطقة الأمان وحذف الحساب</span>
                </h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
                  حذف الحساب نهائي وفوري ولا يمكن التراجع عنه. سيتم إلغاء أي اشتراكات سارية ومسح كافة سجلات المحادثات والامتحانات والبطاقات التعليمية فوراً.
                </p>
                <a
                  href="/delete-account"
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: '4px',
                    padding: '10px 18px',
                    background: 'rgba(193, 39, 45, 0.1)',
                    color: '#C1272D',
                    border: '1px solid rgba(193, 39, 45, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'var(--transition)'
                  }}
                >
                  <Trash2 size={14} />
                  <span>الانتقال لصفحة طلب حذف الحساب نهائياً</span>
                </a>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 5: Exams & Testing */}
        {activeTab === 'exams' && (
          <div className="mobile-main-with-nav" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '24px 16px' : '40px 24px', background: 'var(--bg-color)', direction: 'rtl', display: 'flex', flexDirection: 'column' }}>
            {isMobile && (
              <button 
                onClick={() => setActiveTab('chat')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  marginBottom: '24px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  fontFamily: 'var(--font-arabic)',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'var(--transition)',
                  alignSelf: 'flex-start'
                }}
              >
                <ArrowRight size={16} />
                <span>العودة للدردشة</span>
              </button>
            )}
            {!user ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '20px' }}>
                <div className="glass text-center animate-scale-in" style={{
                  maxWidth: '460px',
                  padding: '40px 30px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--card-bg)',
                  border: '1.5px solid var(--border-color)',
                  boxShadow: 'var(--shadow-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '20px'
                }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'var(--primary-light)',
                    border: '1.5px solid var(--border-primary)',
                    boxShadow: 'var(--shadow-glow)',
                    marginBottom: '8px'
                  }}>
                    <LogIn size={26} style={{ color: 'var(--primary-color)' }} />
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    تسجيل الدخول للمتابعة
                  </h3>
                  <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0 0 10px 0', textAlign: 'center' }}>
                    الرجاء تسجيل الدخول لعرض أو إنشاء أو تقديم الامتحانات التقييمية.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('login');
                        setShowAuthModal(true);
                      }}
                      className="btn-primary"
                      style={{
                        padding: '12px 24px',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        border: 'none',
                        cursor: 'pointer',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'var(--transition)'
                      }}
                    >
                      <LogIn size={16} />
                      <span>تسجيل الدخول</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('register');
                        setShowAuthModal(true);
                      }}
                      style={{
                        padding: '11px 24px',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        background: 'transparent',
                        border: '1.5px solid var(--border-color)',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'var(--transition)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary-color)';
                        e.currentTarget.style.color = 'var(--primary-color)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.color = 'var(--text-main)';
                      }}
                    >
                      <Sparkles size={16} />
                      <span>إنشاء حساب جديد</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px', width: '100%' }} className="animate-scale-in">
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-color)' }}>الامتحانات والاختبارات التقييمية</h2>
                  <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.92rem' }}>
                    قسم التقييم الذكي القائم على الذكاء الاصطناعي لقياس فهمك للمنهج الدراسي وتصحيح أخطائك.
                  </p>
                </div>
                
                {!selectedExam && (
                  <button
                    onClick={() => {
                      const targetGrade = user ? user.grade_level : chatGrade;
                      const activeSubjs = getActiveSubjectsForGrade(targetGrade);
                      const subj = examSubject || chatSubject || (activeSubjs[0]?.subject_name || '');
                      setExamSubject(subj);
                      setExamTopic('');
                      setSelectedExamLesson(null);
                      setLessonSearchQuery('');
                      setExamLessonTab('curriculum');
                      setShowExamCreateModal(true);
                      if (subj) fetchCurriculumStructure(targetGrade, subj);
                    }}
                    disabled={generatingExam}
                    className="btn-primary"
                    style={{
                      padding: '12px 22px',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-on-primary)',
                      background: 'var(--primary-color)',
                      boxShadow: '0 4px 14px rgba(193,39,45,0.3)',
                      transition: 'var(--transition)'
                    }}
                  >
                    {generatingExam ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>جاري توليد الامتحان...</span>
                      </>
                    ) : (
                      <>
                        <span>توليد امتحان مخصص جديد</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {selectedExam ? (
                /* Exam Session (Wizard or Results) */
                <div className="glass animate-scale-in" style={{ padding: '30px', borderRadius: 'var(--radius-lg)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                  
                  {examResult ? (
                    /* Exam Graded Result View */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '70px', height: '70px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-color)' }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a7 7 0 0 0-7 7c0 2.27 1 3.22 2 4h10c1-.78 2-1.73 2-4a7 7 0 0 0-7-7z"/></svg>
                      </div>

                      <div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0' }}>نتيجة التقييم: {selectedExam?.title || 'امتحان تقييمي'}</h3>
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          المادة: {selectedExam?.subject_name || ''} · الصف الدراسي: {GRADE_NAMES[selectedExam?.grade_level] || ''}
                        </p>
                      </div>

                      {/* Radial / Percentage Score Display */}
                      <div style={{
                        position: 'relative',
                        width: '140px',
                        height: '140px',
                        borderRadius: '50%',
                        background: `conic-gradient(${
                          examResult.score >= 80 ? 'var(--success-color)' : (examResult.score >= 50 ? 'orange' : 'var(--danger-color)')
                        } ${examResult.score * 3.6}deg, var(--border-color) 0deg)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-sm)'
                      }}>
                        <div style={{
                          width: '116px',
                          height: '116px',
                          borderRadius: '50%',
                          background: 'var(--card-bg)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span style={{ fontSize: '2rem', fontWeight: 900, color: examResult.score >= 80 ? 'var(--success-color)' : (examResult.score >= 50 ? 'orange' : 'var(--danger-color)') }}>
                            {examResult.score}%
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                            {examResult.score >= 80 ? 'ممتاز جداً' : (examResult.score >= 50 ? 'جيد (يحتاج تحسين)' : 'ضعيف')}
                          </span>
                        </div>
                      </div>

                      {/* Points / Rewards celebration pill */}
                      {Boolean(examResult.points_awarded && examResult.points_awarded > 0) && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(229, 169, 60, 0.15)', color: 'var(--secondary-color)', border: '1px solid rgba(229, 169, 60, 0.3)', padding: '6px 14px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '0.85rem' }}>
                            <Trophy size={16} />
                            <span>+{examResult.points_awarded} نقاط الترتيب</span>
                          </div>
                        </div>
                      )}

                      {/* Evaluation Text Block */}
                      <div style={{ width: '100%', textAlign: 'right', background: 'var(--sidebar-bg)', padding: '20px', borderRadius: '12px', borderRight: '4px solid var(--primary-color)', marginTop: '10px' }}>
                        <h4 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '8px' }}>تحليل الإجابات وتقييم EGS AI:</h4>
                        <div style={{ fontSize: '0.92rem', lineHeight: '1.6', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                          <MarkdownMessage content={examResult.evaluation} />
                        </div>
                      </div>

                      {/* Per-question corrections (revealed only after submission) */}
                      {Array.isArray(examResult.questions_review) && examResult.questions_review.length > 0 && (
                        <div style={{ width: '100%', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <h4 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary-color)', margin: 0 }}>مراجعة الأسئلة والإجابات النموذجية:</h4>
                          {examResult.questions_review.map((q: any, qIdx: number) => (
                            <div key={q.id || qIdx} style={{ background: 'var(--sidebar-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'flex-start' }}>
                                <span style={{ background: 'var(--primary-color)', color: 'var(--text-on-primary)', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>س {qIdx + 1}</span>
                                <span style={{ fontWeight: 700, fontSize: '0.92rem', lineHeight: '1.5' }}>{q.question}</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.86rem' }}>
                                {q.student_answer != null && (
                                  <div><strong>إجابتك:</strong> <span style={{ color: 'var(--text-secondary)' }}>{String(q.student_answer)}</span></div>
                                )}
                                <div><strong>الإجابة النموذجية:</strong> <span style={{ color: 'var(--success-color)', fontWeight: 700 }}>{q.correct_answer}</span></div>
                                {q.explanation && (
                                  <div style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}><strong>الشرح:</strong> {q.explanation}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setSelectedExam(null);
                          setExamResult(null);
                          setActiveExamAnswers({});
                        }}
                        className="btn-primary"
                        style={{
                          padding: '10px 24px',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          border: 'none',
                          cursor: 'pointer',
                          marginTop: '10px'
                        }}
                      >
                        الرجوع لقائمة الامتحانات
                      </button>
                    </div>
                  ) : (
                    /* Active Test taking */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                        <div>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0' }}>{selectedExam?.title || 'امتحان تقييمي'}</h3>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                            المادة: {selectedExam?.subject_name || ''} · الصف الدراسي: {GRADE_NAMES[selectedExam?.grade_level] || ''}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            className={examTimeRemaining <= 60 ? 'timer-pulse' : ''}
                            style={{
                              background: examTimeRemaining <= 60 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                              border: examTimeRemaining <= 60 ? '1.5px solid #ef4444' : '1px solid var(--border-color)',
                              color: examTimeRemaining <= 60 ? '#f87171' : 'var(--text-main)',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontWeight: 900,
                              fontFamily: 'monospace',
                              fontSize: '0.95rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Clock size={15} />
                            <span>
                              {(() => {
                                const mins = Math.floor(examTimeRemaining / 60);
                                const secs = examTimeRemaining % 60;
                                return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                              })()}
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              if (Object.keys(activeExamAnswers).length > 0 && !confirm('هل أنت متأكد من مغادرة الامتحان؟ لن يتم حفظ تقدمك.')) return;
                              setSelectedExam(null);
                              setActiveExamAnswers({});
                              localStorage.removeItem('egs_active_exam_id');
                              localStorage.removeItem('egs_active_exam_time');
                              setExamTimeRemaining(0);
                            }}
                            style={{
                              background: 'transparent',
                              border: '1.5px solid var(--border-color)',
                              color: 'var(--text-main)',
                              padding: '6px 14px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 700
                            }}
                          >
                            خروج وإلغاء
                          </button>
                        </div>
                      </div>

                      {/* Questions List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {(selectedExam.questions || []).map((q: any, qIdx: number) => (
                          <div key={q.id || qIdx} style={{ background: 'var(--sidebar-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'flex-start' }}>
                              <span style={{ background: 'var(--primary-color)', color: 'var(--text-on-primary)', borderRadius: '6px', padding: '2px 8px', fontSize: '0.78rem', fontWeight: 800 }}>
                                س {qIdx + 1}
                              </span>
                              <span style={{ fontWeight: 700, fontSize: '0.98rem', lineHeight: '1.5' }}>{q.question}</span>
                            </div>

                            {/* Answer Fields depending on type */}
                            {q.type === 'multiple_choice' && q.options && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {q.options.map((opt: string, oIdx: number) => {
                                  const isChecked = activeExamAnswers[q.id] === opt;
                                  return (
                                    <label
                                      key={oIdx}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: isChecked ? '1.5px solid var(--primary-color)' : '1px solid var(--border-color)',
                                        background: isChecked ? 'var(--primary-light)' : 'var(--card-bg)',
                                        cursor: 'pointer',
                                        fontSize: '0.88rem',
                                        transition: 'var(--transition)',
                                        fontWeight: 600
                                      }}
                                    >
                                      <input
                                        type="radio"
                                        name={`q-${q.id}`}
                                        checked={isChecked}
                                        onChange={() => {
                                          setActiveExamAnswers(prev => ({ ...prev, [q.id]: opt }));
                                        }}
                                        style={{ accentColor: 'var(--primary-color)', width: '16px', height: '16px' }}
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}

                            {q.type === 'true_false' && (
                              <div style={{ display: 'flex', gap: '14px' }}>
                                {[
                                  { val: 'true', label: 'صح' },
                                  { val: 'false', label: 'خطأ' }
                                ].map((tf) => {
                                  const isChecked = activeExamAnswers[q.id] === tf.val;
                                  return (
                                    <button
                                      key={tf.val}
                                      type="button"
                                      onClick={() => {
                                        setActiveExamAnswers(prev => ({ ...prev, [q.id]: tf.val }));
                                      }}
                                      style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: isChecked ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                        background: isChecked ? 'var(--primary-light)' : 'var(--card-bg)',
                                        color: 'var(--text-main)',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        fontSize: '0.88rem',
                                        transition: 'var(--transition)'
                                      }}
                                    >
                                      {tf.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {q.type === 'essay' && (
                              <textarea
                                rows={4}
                                placeholder="اكتب إجابتك المقالية بالتفصيل هنا..."
                                value={activeExamAnswers[q.id] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setActiveExamAnswers(prev => ({ ...prev, [q.id]: val }));
                                }}
                                style={{
                                  width: '100%',
                                  padding: '12px',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border-color)',
                                  outline: 'none',
                                  background: 'var(--card-bg)',
                                  color: 'var(--text-main)',
                                  fontSize: '0.88rem',
                                  lineHeight: '1.5'
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Desktop Actions */}
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '18px', display: isMobile ? 'none' : 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={handleSubmitExam}
                          disabled={gradingLoading || Object.keys(activeExamAnswers).length < (selectedExam?.questions?.length || 0)}
                          className="btn-primary"
                          style={{
                            padding: '12px 26px',
                            borderRadius: '10px',
                            fontWeight: 800,
                            fontSize: '0.92rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          {gradingLoading ? (
                            <>
                              <Loader2 className="animate-spin" size={16} />
                              <span>جاري تصحيح الامتحان بالذكاء الاصطناعي...</span>
                            </>
                          ) : (
                            <>
                              <Send size={16} />
                              <span>تسليم الامتحان للتصحيح</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mobile Sticky Bar for Exam Taking */}
                  {selectedExam && !examResult && isMobile && (
                    <div className="exam-taking-sticky-bar">
                      <div className="exam-progress-chip">
                        <span>تمت الإجابة:</span>
                        <strong style={{ color: 'var(--primary-color)' }}>
                          {Object.keys(activeExamAnswers).length} / {selectedExam?.questions?.length || 0}
                        </strong>
                      </div>
                      <button
                        type="button"
                        onClick={handleSubmitExam}
                        disabled={gradingLoading || Object.keys(activeExamAnswers).length < (selectedExam?.questions?.length || 0)}
                        className="btn-primary"
                        style={{
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-full)',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {gradingLoading ? (
                          <>
                            <Loader2 className="animate-spin" size={14} />
                            <span>جاري التصحيح...</span>
                          </>
                        ) : (
                          <>
                            <Send size={14} />
                            <span>تسليم الامتحان</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Main listing view */
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr', gap: '24px' }}>
                  
                  {/* Column 1: Available Exams */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>الامتحانات المتوفرة</h3>
                    
                    {loadingExams ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
                        <Loader2 className="animate-spin" size={30} style={{ color: 'var(--primary-color)' }} />
                      </div>
                    ) : exams.length === 0 ? (
                      <div className="glass" style={{ padding: '24px', borderRadius: '12px', color: 'var(--text-muted)', textAlign: 'center', border: '1px dashed var(--border-color)' }}>
                        لا توجد امتحانات مخصصة نشطة حالياً.
                        <button onClick={() => {
                          const targetGrade = user ? user.grade_level : chatGrade;
                          const activeSubjs = getActiveSubjectsForGrade(targetGrade);
                          const subj = examSubject || chatSubject || (activeSubjs[0]?.subject_name || '');
                          setExamSubject(subj);
                          setExamTopic('');
                          setSelectedExamLesson(null);
                          setLessonSearchQuery('');
                          setExamLessonTab('curriculum');
                          setShowExamCreateModal(true);
                          if (subj) fetchCurriculumStructure(targetGrade, subj);
                        }} style={{ display: 'block', margin: '12px auto 0', background: 'transparent', border: 'none', color: 'var(--primary-color)', fontWeight: 700, cursor: 'pointer' }}>
                          توليد أول امتحان مخصص الآن
                        </button>
                      </div>
                    ) : (
                      exams.map((ex: any) => (
                        <div key={ex.id} className="glass animate-scale-in" style={{ padding: '18px', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <div>
                            <h4 style={{ fontWeight: 800, fontSize: '0.98rem', margin: '0 0 4px' }}>{ex.title}</h4>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              <span>المادة: {ex.subject_name}</span>
                              <span>·</span>
                              <span>الصف: {GRADE_NAMES[ex.grade_level]}</span>
                              <span>·</span>
                              <span>الأسئلة: {ex.questions?.length || 3}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedExam(ex);
                              setActiveExamAnswers({});
                              setExamResult(null);
                              const durationSeconds = (ex.questions?.length || 5) * 120;
                              localStorage.setItem('egs_active_exam_id', ex.id);
                              localStorage.setItem('egs_active_exam_time', String(durationSeconds));
                              setExamTimeRemaining(durationSeconds);
                            }}
                            className="btn-primary"
                            style={{
                              padding: '8px 16px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <FileText size={14} />
                            <span>بدء التحدي</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Column 2: History of submissions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>سجل الدرجات والتقييمات</h3>
                    
                    {loadingExams ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
                        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--primary-color)' }} />
                      </div>
                    ) : submissions.length === 0 ? (
                      <div className="glass" style={{ padding: '20px', borderRadius: '12px', color: 'var(--text-muted)', textAlign: 'center', border: '1px dashed var(--border-color)', fontSize: '0.85rem' }}>
                        لم تقم بتقديم أي امتحانات بعد.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {submissions.map((sub: any) => {
                          const associatedExam = exams.find(e => e.id === sub.exam_id);
                          const title = associatedExam ? associatedExam.title : 'امتحان تقييمي ذكي';
                          const scoreColor = sub.score >= 80 ? 'var(--success-color)' : (sub.score >= 50 ? 'orange' : 'var(--danger-color)');
                          return (
                            <div key={sub.id} className="glass" style={{ padding: '14px', borderRadius: '10px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{title}</span>
                                <span style={{ fontWeight: 900, color: scoreColor, fontSize: '0.92rem', background: 'var(--sidebar-bg)', padding: '2px 8px', borderRadius: '6px' }}>
                                  {sub.score}%
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                <span>{new Date(sub.submitted_at).toLocaleDateString('ar-EG')}</span>
                                <button
                                  onClick={() => {
                                    const mockExam = associatedExam || {
                                      id: sub.exam_id,
                                      title: 'امتحان تقييمي ذكي سابق',
                                      subject_name: chatSubject,
                                      grade_level: user?.grade_level || chatGrade,
                                      questions: []
                                    };
                                    setSelectedExam(mockExam);
                                    setExamResult(sub);
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--primary-color)',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    padding: '0'
                                  }}
                                >
                                   عرض التقييم
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
            )}
          </div>
        )}

        {/* Flashcards (Subject-Level Stacked Active Recall) Tab */}
        {activeTab === 'flashcards' && (
          <div className="mobile-main-with-nav" style={{ flex: 1, padding: isMobile ? '16px' : '32px', display: 'flex', flexDirection: 'column', gap: '24px', direction: 'rtl', fontFamily: 'var(--font-arabic)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary-color)', margin: 0 }}>المدرب الذكي (Flashcards)</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '4px 0 0' }}>مجموعات مراجعة مجمعة حسب المواد الدراسية بنظام الكروت المتراكمة</p>
              </div>

              {!selectedFlashcardSubject && (
                <button
                  onClick={() => {
                    const targetGrade = user?.grade_level || chatGrade || '1_high';
                    const activeSubjects = getActiveSubjectsForGrade(targetGrade);
                    const subj = activeSubjects.length > 0 ? activeSubjects[0].subject_name : '';
                    setFlashcardSubject(subj);
                    setFlashcardTopic('');
                    setSelectedFlashcardLesson(null);
                    setLessonSearchQuery('');
                    setFlashcardLessonTab('curriculum');
                    setShowFlashcardCreateModal(true);
                    if (subj) fetchCurriculumStructure(targetGrade, subj);
                  }}
                  className="btn-primary"
                  style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                >
                  <span>إنشاء كروت تعليمية</span>
                </button>
              )}
            </div>

            {selectedFlashcardSubject ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Header Controls Bar inside Subject */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', background: 'var(--bg-card)', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => setSelectedFlashcardSubject(null)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
                    >
                      <ArrowRight size={16} />
                      <span>المواد</span>
                    </button>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary-color)', margin: 0 }}>{selectedFlashcardSubject}</h3>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        إجمالي {subjectCards.length} كارت تعليمي
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {/* View Mode Toggle */}
                    <div className="flashcard-view-mode-toggle">
                      <button
                        className={`flashcard-view-mode-btn ${flashcardViewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => setFlashcardViewMode('grid')}
                      >
                        <Grid size={15} />
                        <span>جميع الكروت</span>
                      </button>
                      <button
                        className={`flashcard-view-mode-btn ${flashcardViewMode === 'stack' ? 'active' : ''}`}
                        onClick={() => setFlashcardViewMode('stack')}
                      >
                        <Layers size={15} />
                        <span>مراجعة تفاعلية</span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        const targetGrade = user?.grade_level || chatGrade || '1_high';
                        setFlashcardSubject(selectedFlashcardSubject);
                        setFlashcardTopic('');
                        setSelectedFlashcardLesson(null);
                        setLessonSearchQuery('');
                        setFlashcardLessonTab('curriculum');
                        setShowFlashcardCreateModal(true);
                        if (selectedFlashcardSubject) fetchCurriculumStructure(targetGrade, selectedFlashcardSubject);
                      }}
                      className="btn-primary"
                      style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Plus size={15} />
                      <span>كارت جديد</span>
                    </button>
                  </div>
                </div>

                {/* Deck Filter Pills */}
                {subjectDecks.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 700 }}>المجموعات:</span>
                    <button
                      onClick={() => setDeckFilter(null)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        background: deckFilter === null ? 'var(--primary-light)' : 'rgba(255, 255, 255, 0.04)',
                        color: deckFilter === null ? 'var(--primary-color)' : 'var(--text-muted)',
                      }}
                    >
                      الكل ({subjectCards.length})
                    </button>
                    {subjectDecks.map(d => (
                      <div
                        key={d.id}
                        onClick={() => setDeckFilter(deckFilter === d.id ? null : d.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: deckFilter === d.id ? 'var(--primary-light)' : 'rgba(255, 255, 255, 0.04)',
                          color: deckFilter === d.id ? 'var(--primary-color)' : 'var(--text-muted)',
                        }}
                      >
                        <span>{d.title}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newTitle = prompt('إعادة تسمية المجموعة:', d.title);
                            if (newTitle) handleRenameDeck(d.id, newTitle);
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                          title="تعديل الاسم"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDeck(d.id);
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: 0 }}
                          title="حذف المجموعة"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {loadingDecks ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
                    <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary-color)' }} />
                  </div>
                ) : (() => {
                  const displayCards = deckFilter ? subjectCards.filter(c => c.deck_id === deckFilter) : subjectCards;

                  if (displayCards.length === 0) {
                    return (
                      <div className="glass" style={{ padding: '40px', borderRadius: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        لا توجد كروت تعليمية تعرض حسب هذا التحديد.
                      </div>
                    );
                  }

                  if (flashcardViewMode === 'grid') {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                            عرض جميع الكروت ({displayCards.length} كارت):
                          </span>
                          <button
                            onClick={() => {
                              const allRevealed = displayCards.every(c => revealedAnswers[c.id]);
                              const nextState: Record<string, boolean> = {};
                              displayCards.forEach(c => { nextState[c.id] = !allRevealed; });
                              setRevealedAnswers(nextState);
                            }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={14} />
                            <span>{displayCards.every(c => revealedAnswers[c.id]) ? 'إخفاء جميع الإجابات' : 'عرض جميع الإجابات'}</span>
                          </button>
                        </div>

                        <div className="flashcard-grid-container">
                          {displayCards.map((card) => {
                            const isRevealed = !!revealedAnswers[card.id];
                            const boxVal = card.box || 1;
                            const boxLabel = boxVal === 1 ? 'مبتدئ' : boxVal === 2 ? 'متوسط' : boxVal >= 5 ? 'متقن' : 'متقدم';
                            const boxBg = boxVal === 1 ? 'rgba(229, 169, 60, 0.15)' : boxVal === 2 ? 'rgba(30, 112, 186, 0.15)' : 'var(--primary-light)';
                            const boxColor = boxVal === 1 ? 'var(--secondary-color)' : boxVal === 2 ? 'var(--info-color)' : 'var(--primary-color)';

                            return (
                              <div key={card.id} className="flashcard-card-item">
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '0.72rem', background: 'var(--hover-bg)', color: 'var(--text-muted)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, border: '1px solid var(--border-color)' }}>
                                      {card.deck_title || 'كارت مراجعة'}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '0.7rem', background: boxBg, color: boxColor, padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                                        صندوق {boxVal} ({boxLabel})
                                      </span>
                                      <button
                                        onClick={() => setEditingCard(card)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                                        title="تعديل الكارت"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCard(card.id)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '2px' }}
                                        title="حذف الكارت"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>

                                  <div style={{ marginBottom: '12px' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>السؤال:</span>
                                    <p style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.6, margin: '4px 0 0', color: 'var(--text-main)' }}>
                                      {card.question}
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <button
                                    onClick={() => setRevealedAnswers(prev => ({ ...prev, [card.id]: !prev[card.id] }))}
                                    style={{
                                      background: isRevealed ? 'var(--primary-light)' : 'var(--hover-bg)',
                                      border: `1px solid ${isRevealed ? 'var(--border-primary)' : 'var(--border-color)'}`,
                                      color: isRevealed ? 'var(--primary-color)' : 'var(--text-main)',
                                      padding: '8px 14px',
                                      borderRadius: '10px',
                                      cursor: 'pointer',
                                      fontSize: '0.82rem',
                                      fontWeight: 700,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      width: '100%',
                                      transition: 'all 0.2s ease'
                                    }}
                                  >
                                    {isRevealed ? (
                                      <>
                                        <EyeOff size={14} />
                                        <span>إخفاء الإجابة</span>
                                      </>
                                    ) : (
                                      <>
                                        <Eye size={14} />
                                        <span>عرض الإجابة</span>
                                      </>
                                    )}
                                  </button>

                                  {isRevealed && (
                                    <div className="flashcard-answer-box">
                                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--success-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>الإجابة النموذجية:</span>
                                      <p style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.6, margin: '4px 0 12px', color: 'var(--text-main)' }}>
                                        {card.answer}
                                      </p>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>تقييم الاستدعاء:</span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                          {[1, 2, 3, 4, 5].map(rating => (
                                            <button
                                              key={rating}
                                              onClick={() => submitSubjectCardReview(card.id, rating)}
                                              style={{
                                                background: 'var(--hover-bg)',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-main)',
                                                borderRadius: '6px',
                                                padding: '2px 8px',
                                                fontSize: '0.72rem',
                                                fontWeight: 800,
                                                cursor: 'pointer'
                                              }}
                                              title={`درجة ${rating}`}
                                            >
                                              {rating}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (activeStackIndex >= displayCards.length) {
                    return (
                      <div className="glass" style={{ padding: '40px', borderRadius: '16px', textAlign: 'center', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                        <Award size={48} style={{ color: 'var(--primary-color)' }} />
                        <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>أحسنت! أتممت مراجعة كل الكروت</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>تمت مراجعة {doneCards.length} كارت في هذه الجلسة بنجاح.</p>
                        <button
                          onClick={() => { setActiveStackIndex(0); setDoneCards([]); setIsCardFlipped(false); }}
                          className="btn-primary"
                          style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <RotateCcw size={16} />
                          <span>خلط وإعادة المراجعة</span>
                        </button>
                      </div>
                    );
                  }

                  const activeCard = displayCards[activeStackIndex] || displayCards[0];

                  return (
                    <div style={{ maxWidth: '620px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Top Playing Card Controls Bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', padding: '12px 18px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                        <button
                          disabled={activeStackIndex === 0 || isDealingAway}
                          onClick={() => {
                            setIsCardFlipped(false);
                            setActiveStackIndex(prev => Math.max(0, prev - 1));
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: activeStackIndex === 0 ? 'var(--text-muted)' : 'var(--text-main)',
                            opacity: activeStackIndex === 0 ? 0.4 : 1,
                            cursor: activeStackIndex === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <ChevronRight size={18} />
                          <span>السابق</span>
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                            الكارت {activeStackIndex + 1} من {displayCards.length}
                          </span>
                        </div>

                        <button
                          disabled={activeStackIndex >= displayCards.length - 1 || isDealingAway}
                          onClick={() => advancePlayingCard(activeStackIndex + 1)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: activeStackIndex >= displayCards.length - 1 ? 'var(--text-muted)' : 'var(--text-main)',
                            opacity: activeStackIndex >= displayCards.length - 1 ? 0.4 : 1,
                            cursor: activeStackIndex >= displayCards.length - 1 ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>التالي</span>
                          <ChevronLeft size={18} />
                        </button>
                      </div>

                      {/* Stack Progress Bar */}
                      <div style={{ width: '100%', height: '6px', background: 'var(--hover-bg)', borderRadius: '3px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <div style={{ width: `${((activeStackIndex + 1) / displayCards.length) * 100}%`, height: '100%', background: 'var(--primary-color)', transition: 'width 0.3s ease' }} />
                      </div>

                      {/* Stacked Playing Cards (كوتشينة الكروت) Container */}
                      <div className="playing-card-stack-wrap">
                        {/* Layered Deck Backing 2 */}
                        {activeStackIndex + 2 < displayCards.length && (
                          <div
                            className="playing-card-deck-layer"
                            style={{
                              transform: 'translateY(16px) scale(0.92) rotate(3deg)',
                              opacity: 0.4,
                              zIndex: 1
                            }}
                          />
                        )}

                        {/* Layered Deck Backing 1 */}
                        {activeStackIndex + 1 < displayCards.length && (
                          <div
                            className="playing-card-deck-layer"
                            style={{
                              transform: 'translateY(8px) scale(0.96) rotate(-2deg)',
                              opacity: 0.75,
                              zIndex: 2
                            }}
                          />
                        )}

                        {/* Active Top Playing Card */}
                        <div
                          style={{ position: 'relative', width: '100%', height: isMobile ? '260px' : '280px', zIndex: 3 }}
                          className={isDealingAway ? 'playing-card-slide-off' : ''}
                        >
                          <div
                            className="flashcard-perspective"
                            style={{ width: '100%', height: '100%' }}
                            onClick={() => {
                              if (isDealingAway) return;
                              if (!isCardFlipped) {
                                setIsCardFlipped(true);
                              } else {
                                advancePlayingCard();
                              }
                            }}
                          >
                            <div className={`flashcard-container ${isCardFlipped ? 'flipped' : ''}`} style={{ width: '100%', height: '100%' }}>
                              <div className="flashcard-front" style={{ position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary-color)', fontWeight: 800 }}>
                                    {activeCard?.deck_title || 'كارت مراجعة'}
                                  </span>
                                  <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => setEditingCard(activeCard)}
                                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                      title="تعديل الكارت"
                                    >
                                      <Edit2 size={15} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteCard(activeCard?.id)}
                                      style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '4px' }}
                                      title="حذف الكارت"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </div>
                                <p style={{ fontSize: isMobile ? '1.05rem' : '1.2rem', fontWeight: 800, lineHeight: 1.6, margin: 0, overflowY: 'auto', maxHeight: isMobile ? '130px' : '140px' }}>
                                  {activeCard?.question}
                                </p>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '14px', border: '1px solid var(--border-color)', padding: '4px 14px', borderRadius: '20px', background: 'var(--hover-bg)' }}>
                                  اضغط للقلب ورؤية الإجابة
                                </span>
                              </div>

                              <div className="flashcard-back" style={{ position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--success-color)', fontWeight: 800 }}>الإجابة النموذجية</span>
                                  <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => setEditingCard(activeCard)}
                                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                      title="تعديل الكارت"
                                    >
                                      <Edit2 size={15} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteCard(activeCard?.id)}
                                      style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '4px' }}
                                      title="حذف الكارت"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </div>
                                <p style={{ fontSize: isMobile ? '1.02rem' : '1.15rem', fontWeight: 800, lineHeight: 1.6, margin: 0, overflowY: 'auto', maxHeight: isMobile ? '130px' : '140px' }}>
                                  {activeCard?.answer}
                                </p>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '14px', border: '1px solid var(--border-color)', padding: '4px 14px', borderRadius: '20px', background: 'var(--hover-bg)' }}>
                                  اضغط للتمرير للكارت التالي
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Leitner Rating Controls */}
                      {isCardFlipped && (
                        <div className="animate-scale-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--card-bg)', padding: isMobile ? '12px' : '16px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                          <p style={{ margin: '0 0 6px 0', fontSize: isMobile ? '0.78rem' : '0.85rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 700 }}>كيف كان استدعاؤك للمعلومة؟ (يتم السحب تلقائياً عند التقييم)</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: isMobile ? '6px' : '8px' }}>
                            {[
                              { val: 1, label: 'صعب جداً' },
                              { val: 2, label: 'خاطئ' },
                              { val: 3, label: 'مقبول' },
                              { val: 4, label: 'سهل' },
                              { val: 5, label: 'ممتاز' }
                            ].map(r => (
                              <button
                                key={r.val}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  submitSubjectCardReview(activeCard.id, r.val);
                                }}
                                style={{
                                  background: 'var(--hover-bg)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '10px',
                                  padding: isMobile ? '8px 2px' : '8px 4px',
                                  color: 'var(--text-main)',
                                  fontSize: isMobile ? '0.7rem' : '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  minHeight: isMobile ? '48px' : 'auto'
                                }}
                              >
                                <div style={{ fontSize: isMobile ? '0.92rem' : '1rem', marginBottom: '2px', color: 'var(--primary-color)' }}>{r.val}</div>
                                <div>{r.label}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Subject Grid View */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {loadingDecks ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
                    <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary-color)' }} />
                  </div>
                ) : flashcardDecks.length === 0 ? (
                  <div className="glass" style={{ padding: '60px 20px', borderRadius: '16px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)' }}>
                    <Brain size={48} style={{ color: 'var(--primary-color)', opacity: 0.5, marginBottom: '16px' }} />
                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>لا توجد كروت تعليمية بعد</p>
                    <p style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>أنشئ أول مجموعة كروت بالذكاء الاصطناعي أو اكتبها بنفسك الآن!</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {(() => {
                      const subjectGroups: Record<string, { subject_name: string; decks: any[]; total_count: number; due_count: number }> = {};
                      flashcardDecks.forEach(deck => {
                        const sName = deck.subject_name || 'عام';
                        if (!subjectGroups[sName]) {
                          subjectGroups[sName] = { subject_name: sName, decks: [], total_count: 0, due_count: 0 };
                        }
                        subjectGroups[sName].decks.push(deck);
                        subjectGroups[sName].total_count += (deck.total_count || 0);
                        subjectGroups[sName].due_count += (deck.due_count || 0);
                      });

                      return Object.values(subjectGroups).map(group => (
                        <div key={group.subject_name} className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--card-bg)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: 'var(--primary-color)' }}>{group.subject_name}</h3>
                            <span style={{ fontSize: '0.75rem', background: 'var(--primary-light)', color: 'var(--primary-color)', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                              {group.total_count} كارت
                            </span>
                          </div>

                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                            محتوى {group.decks.length} مجموعة كروت مجمعة
                          </p>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '12px' }}>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              المستحق للمراجعة: <strong style={{ color: group.due_count > 0 ? 'var(--danger-color)' : 'var(--success-color)' }}>{group.due_count}</strong>
                            </span>
                            
                            <button
                              onClick={() => fetchSubjectCards(group.subject_name)}
                              className="btn-primary"
                              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                            >
                              مراجعة الكروت المتراكمة
                            </button>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Flashcards Creation Modal (AI or Manual) */}
        {showFlashcardCreateModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '12px' : '20px' }}>
            <div className="glass-strong animate-scale-in" style={{ maxWidth: '680px', width: '100%', borderRadius: '24px', padding: isMobile ? '20px 16px' : '28px 24px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '92vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Brain size={22} style={{ color: 'var(--primary-color)' }} />
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary-color)' }}>إنشاء كروت تعليمية ذكية</h3>
                </div>
                <button onClick={() => setShowFlashcardCreateModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px', borderRadius: '8px' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Mode Selector */}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)', gap: '4px' }}>
                <button
                  onClick={() => setFlashcardCreateMode('ai')}
                  style={{ flex: 1, padding: '9px', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: flashcardCreateMode === 'ai' ? 'var(--primary-color)' : 'transparent', color: flashcardCreateMode === 'ai' ? 'var(--text-on-primary)' : 'var(--text-muted)', transition: 'all 0.15s ease' }}
                >
                  <Sparkles size={15} />
                  <span>توليد تلقائي بالذكاء الاصطناعي</span>
                </button>
                <button
                  onClick={() => setFlashcardCreateMode('manual')}
                  style={{ flex: 1, padding: '9px', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: flashcardCreateMode === 'manual' ? 'var(--primary-color)' : 'transparent', color: flashcardCreateMode === 'manual' ? 'var(--text-on-primary)' : 'var(--text-muted)', transition: 'all 0.15s ease' }}
                >
                  <Edit2 size={15} />
                  <span>كتابة يدوية للكروت</span>
                </button>
              </div>

              {/* Subject Selection */}
              {(() => {
                const currentGrade = user ? user.grade_level : chatGrade || '1_high';
                const activeSubjs = getActiveSubjectsForGrade(currentGrade);
                const curSubj = flashcardSubject || (activeSubjs[0]?.subject_name || '');
                const cacheKey = `${currentGrade}_${curSubj}`;
                const structure = curriculumStructures[cacheKey];
                const units = structure?.units || [];
                const hasUnits = structure?.hasCurriculum && units.length > 0;
                const totalLessonsCount = structure?.totalLessons || units.reduce((acc: number, u: any) => acc + (u.lessons?.length || 0), 0);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Subject Selection Dropdown */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>المادة الدراسية:</label>
                      <select
                        value={curSubj}
                        onChange={(e) => {
                          const newSubj = e.target.value;
                          setFlashcardSubject(newSubj);
                          setFlashcardTopic('');
                          setSelectedFlashcardLesson(null);
                          setLessonSearchQuery('');
                          setActiveUnitTab('all');
                          fetchCurriculumStructure(currentGrade, newSubj);
                        }}
                        className="form-input"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '0.88rem', cursor: 'pointer' }}
                      >
                        {activeSubjs.map(s => (
                          <option key={s.subject_name} value={s.subject_name}>{s.subject_name}</option>
                        ))}
                      </select>
                    </div>

                    {flashcardCreateMode === 'ai' ? (
                      /* AI Generation Fields with Lesson Selector */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <CurriculumLessonPicker
                          type="flashcard"
                          currentGrade={currentGrade}
                          currentSubject={curSubj}
                          structure={structure}
                          loading={loadingStructure}
                          activeLessonTab={flashcardLessonTab}
                          setActiveLessonTab={setFlashcardLessonTab}
                          selectedLesson={selectedFlashcardLesson}
                          setSelectedLesson={setSelectedFlashcardLesson}
                          customTopic={flashcardTopic}
                          setCustomTopic={setFlashcardTopic}
                          searchQuery={lessonSearchQuery}
                          setSearchQuery={setLessonSearchQuery}
                          activeUnitTab={activeUnitTab}
                          setActiveUnitTab={setActiveUnitTab}
                          expandedUnits={expandedUnits}
                          setExpandedUnits={setExpandedUnits}
                          isMobile={isMobile}
                          onFetchStructure={fetchCurriculumStructure}
                        />

                        {/* Card Count */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label className="form-label" style={{ fontSize: '0.82rem' }}>عدد الكروت المطلوب:</label>
                          <select
                            value={flashcardCount}
                            onChange={(e) => setFlashcardCount(Number(e.target.value))}
                            className="form-input"
                            style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
                          >
                            <option value={5}>5 كروت تعليمية</option>
                            <option value={10}>10 كروت تعليمية</option>
                            <option value={15}>15 كارت تعليمي</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            generateFlashcardDeck();
                          }}
                          disabled={generatingDecks || (!flashcardTopic.trim() && !selectedFlashcardLesson)}
                          className="btn-primary"
                          style={{ padding: '12px', borderRadius: '10px', fontWeight: 800, border: 'none', cursor: 'pointer', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                          {generatingDecks ? (
                            <>
                              <Loader2 className="animate-spin" size={16} />
                              <span>جاري توليد الكروت الذكية...</span>
                            </>
                          ) : (
                            <span>توليد الكروت الآن</span>
                          )}
                        </button>
                      </div>
                    ) : (
                /* Manual Creation Fields */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>عنوان المجموعة</label>
                    <input
                      type="text"
                      placeholder="مثال: ملخص مراجعة الفيزياء الحديثة"
                      value={manualDeckTitle}
                      onChange={(e) => setManualDeckTitle(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>قائمة الأسئلة والإجابات</label>
                    {manualCardsList.map((item, idx) => (
                      <div key={idx} className="glass" style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-color)' }}>الكارت {idx + 1}</span>
                          {manualCardsList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setManualCardsList(prev => prev.filter((_, i) => i !== idx))}
                              style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="السؤال..."
                          value={item.question}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualCardsList(prev => prev.map((c, i) => i === idx ? { ...c, question: val } : c));
                          }}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                        />
                        <input
                          type="text"
                          placeholder="الإجابة..."
                          value={item.answer}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualCardsList(prev => prev.map((c, i) => i === idx ? { ...c, answer: val } : c));
                          }}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setManualCardsList(prev => [...prev, { question: '', answer: '' }])}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed var(--border-color)', color: 'var(--primary-color)', padding: '10px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <PlusCircle size={16} />
                      <span>إضافة كارت آخر</span>
                    </button>
                  </div>

                  <button
                    onClick={handleManualCreateDeck}
                    disabled={generatingDecks || !manualDeckTitle.trim()}
                    className="btn-primary"
                    style={{ padding: '12px', borderRadius: '10px', fontWeight: 800, border: 'none', cursor: 'pointer', marginTop: '8px' }}
                  >
                    {generatingDecks ? 'جاري الحفظ...' : 'حفظ وإضافة الكروت'}
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  )}

        {/* Edit Card Modal */}
        {editingCard && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div className="glass" style={{ maxWidth: '480px', width: '100%', borderRadius: '20px', padding: '24px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary-color)' }}>تعديل الكارت</h3>
                <button onClick={() => setEditingCard(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>السؤال</label>
                <textarea
                  rows={3}
                  value={editingCard.question}
                  onChange={(e) => setEditingCard({ ...editingCard, question: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>الإجابة</label>
                <textarea
                  rows={3}
                  value={editingCard.answer}
                  onChange={(e) => setEditingCard({ ...editingCard, answer: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={() => setEditingCard(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>إلغاء</button>
                <button onClick={() => handleSaveCardEdit(editingCard.id, editingCard.question, editingCard.answer)} className="btn-primary" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>حفظ التعديلات</button>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard & Competition Tab */}
        {activeTab === 'leaderboard' && (
          <div className="mobile-main-with-nav" style={{ flex: 1, padding: isMobile ? '16px 12px' : '32px 24px', display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px', direction: 'rtl', fontFamily: 'var(--font-arabic)', overflowY: 'auto' }}>
            <div className="leaderboard-container">
              
              {/* Leaderboard Header & Filter Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button 
                    onClick={() => setActiveTab('chat')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      fontFamily: 'var(--font-arabic)',
                      boxShadow: 'var(--shadow-xs)'
                    }}
                    title="العودة للدردشة"
                  >
                    <ArrowRight size={15} />
                    <span>الدردشة</span>
                  </button>
                  <div>
                    <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 900, color: 'var(--primary-color)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Trophy size={isMobile ? 20 : 24} />
                      <span>المسابقة ولوحة المتصدرين</span>
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? '0.76rem' : '0.86rem', margin: '2px 0 0' }}>
                      أفضل 10 طلاب متفوقين حسب نقاط الترتيب والمثابرة الأكاديمية
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <button
                    onClick={() => setLeaderboardFilter('my')}
                    style={{
                      background: leaderboardFilter === 'my' ? 'var(--primary-color)' : 'transparent',
                      color: leaderboardFilter === 'my' ? 'var(--text-on-primary)' : 'var(--text-muted)',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    صفي الدراسي
                  </button>
                  <button
                    onClick={() => setLeaderboardFilter('all')}
                    style={{
                      background: leaderboardFilter === 'all' ? 'var(--primary-color)' : 'transparent',
                      color: leaderboardFilter === 'all' ? 'var(--text-on-primary)' : 'var(--text-muted)',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    الترتيب العام
                  </button>
                </div>
              </div>

              {loadingLeaderboard ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                  <Loader2 className="animate-spin" size={36} style={{ color: 'var(--primary-color)' }} />
                </div>
              ) : leaderboardData.length === 0 ? (
                <div className="glass" style={{ padding: '40px', borderRadius: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  لا يوجد طلاب مسجلون في لوحة المتصدرين بعد.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* OUT-OF-TOP-10 STUDENT RANK BANNER (Prominent card at the top) */}
                  {user && userLeaderboardRank && (!leaderboardData.some(r => r.user_id === user.id) || userLeaderboardRank.rank_number > 10) && (
                    <div className="user-current-rank-card animate-scale-in">
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '16px', flex: 1 }}>
                        <div 
                          className="leaderboard-rank rank-default" 
                          style={{ 
                            width: isMobile ? '44px' : '52px', 
                            height: isMobile ? '44px' : '52px', 
                            fontSize: isMobile ? '1.1rem' : '1.3rem', 
                            fontWeight: 900, 
                            borderColor: 'var(--primary-color)', 
                            background: 'rgba(125, 161, 70, 0.2)', 
                            color: 'var(--primary-color)' 
                          }}
                        >
                          #{userLeaderboardRank.rank_number}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: isMobile ? '0.92rem' : '1.05rem', fontWeight: 900, color: 'var(--text-main)' }}>
                              {user.name}
                            </span>
                            <span style={{ fontSize: '0.62rem', background: 'var(--primary-glow)', color: 'var(--primary-color)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                              أنت
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              ({GRADE_NAMES[userLeaderboardRank.grade_level || user.grade_level]})
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ffd700', fontSize: isMobile ? '0.78rem' : '0.85rem', fontWeight: 800 }}>
                              <Trophy size={14} />
                              <span>{userLeaderboardRank.points || points || 0} نقطة ترتيب</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ff7e7e', fontSize: isMobile ? '0.78rem' : '0.85rem', fontWeight: 700 }}>
                              <Flame size={14} />
                              <span>{userLeaderboardRank.study_streak || 1} يوم مثابرة</span>
                            </div>
                          </div>
                          {leaderboardData.length >= 10 && (userLeaderboardRank.points || points || 0) < (leaderboardData[leaderboardData.length - 1]?.points || 0) && (
                            <p style={{ margin: '6px 0 0', fontSize: isMobile ? '0.72rem' : '0.78rem', color: 'var(--text-secondary)' }}>
                              تفصلك <strong style={{ color: '#ffd700' }}>{Math.max(1, (leaderboardData[leaderboardData.length - 1].points || 0) - (userLeaderboardRank.points || points || 0) + 1)} نقطة</strong> فقط عن دخول قائمة أفضل 10 متصدرين!
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('exams');
                          setShowExamCreateModal(true);
                        }}
                        className="btn-primary"
                        style={{
                          padding: isMobile ? '8px 14px' : '10px 18px',
                          borderRadius: '10px',
                          fontSize: isMobile ? '0.78rem' : '0.84rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        <Zap size={15} />
                        <span>كسب نقاط بالامتحانات</span>
                      </button>
                    </div>
                  )}

                  {/* TOP 3 PODIUM (Gold, Silver, Bronze) */}
                  {leaderboardData.length >= 3 && (
                    <div className="leaderboard-podium-container animate-fade-in">
                      {/* Rank 2 - Silver */}
                      <div className={`leaderboard-podium-card second ${leaderboardData[1].user_id === user?.id ? 'is-current-user' : ''}`}>
                        <div className="leaderboard-rank rank-silver" style={{ margin: '0 auto 8px', width: isMobile ? '32px' : '40px', height: isMobile ? '32px' : '40px', fontSize: isMobile ? '0.9rem' : '1.05rem' }}>2</div>
                        <span style={{ fontSize: isMobile ? '0.82rem' : '0.95rem', fontWeight: 800, color: 'var(--text-main)', maxWidth: isMobile ? '90px' : '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {leaderboardData[1].name}
                        </span>
                        {leaderboardData[1].user_id === user?.id && (
                          <span style={{ fontSize: '0.62rem', background: 'var(--primary-glow)', color: 'var(--primary-color)', padding: '1px 5px', borderRadius: '4px', fontWeight: 800, marginTop: '2px' }}>أنت</span>
                        )}
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {GRADE_NAMES[leaderboardData[1].grade_level]}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#c0c0c0', fontSize: isMobile ? '0.78rem' : '0.88rem', fontWeight: 800, marginTop: '6px' }}>
                          <Trophy size={13} />
                          <span>{leaderboardData[1].points || 0}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#ff7e7e', fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 700, marginTop: '2px' }}>
                          <Flame size={11} />
                          <span>{leaderboardData[1].study_streak || 1} يوم</span>
                        </div>
                      </div>

                      {/* Rank 1 - Gold (Center, Elevated) */}
                      <div className={`leaderboard-podium-card first ${leaderboardData[0].user_id === user?.id ? 'is-current-user' : ''}`}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                          <Crown size={isMobile ? 18 : 22} style={{ color: '#ffd700', marginBottom: '2px' }} />
                          <div className="leaderboard-rank rank-gold" style={{ width: isMobile ? '38px' : '48px', height: isMobile ? '38px' : '48px', fontSize: isMobile ? '1.05rem' : '1.25rem' }}>1</div>
                        </div>
                        <span style={{ fontSize: isMobile ? '0.88rem' : '1.05rem', fontWeight: 900, color: 'var(--text-main)', maxWidth: isMobile ? '100px' : '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {leaderboardData[0].name}
                        </span>
                        {leaderboardData[0].user_id === user?.id && (
                          <span style={{ fontSize: '0.65rem', background: 'var(--primary-glow)', color: 'var(--primary-color)', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, marginTop: '2px' }}>أنت</span>
                        )}
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {GRADE_NAMES[leaderboardData[0].grade_level]}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ffd700', fontSize: isMobile ? '0.88rem' : '1.05rem', fontWeight: 900, marginTop: '6px' }}>
                          <Trophy size={15} />
                          <span>{leaderboardData[0].points || 0}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#ff7e7e', fontSize: isMobile ? '0.72rem' : '0.8rem', fontWeight: 800, marginTop: '2px' }}>
                          <Flame size={13} />
                          <span>{leaderboardData[0].study_streak || 1} يوم</span>
                        </div>
                      </div>

                      {/* Rank 3 - Bronze */}
                      <div className={`leaderboard-podium-card third ${leaderboardData[2].user_id === user?.id ? 'is-current-user' : ''}`}>
                        <div className="leaderboard-rank rank-bronze" style={{ margin: '0 auto 8px', width: isMobile ? '32px' : '40px', height: isMobile ? '32px' : '40px', fontSize: isMobile ? '0.9rem' : '1.05rem' }}>3</div>
                        <span style={{ fontSize: isMobile ? '0.82rem' : '0.95rem', fontWeight: 800, color: 'var(--text-main)', maxWidth: isMobile ? '90px' : '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {leaderboardData[2].name}
                        </span>
                        {leaderboardData[2].user_id === user?.id && (
                          <span style={{ fontSize: '0.62rem', background: 'var(--primary-glow)', color: 'var(--primary-color)', padding: '1px 5px', borderRadius: '4px', fontWeight: 800, marginTop: '2px' }}>أنت</span>
                        )}
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {GRADE_NAMES[leaderboardData[2].grade_level]}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#cd7f32', fontSize: isMobile ? '0.78rem' : '0.88rem', fontWeight: 800, marginTop: '6px' }}>
                          <Trophy size={13} />
                          <span>{leaderboardData[2].points || 0}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#ff7e7e', fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 700, marginTop: '2px' }}>
                          <Flame size={11} />
                          <span>{leaderboardData[2].study_streak || 1} يوم</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* REMAINING TOP 10 (Ranks 4 to 10) */}
                  {leaderboardData.slice(leaderboardData.length >= 3 ? 3 : 0, 10).length > 0 && (
                    isMobile ? (
                      /* Mobile Cards List for Ranks 4 to 10 */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {leaderboardData.slice(leaderboardData.length >= 3 ? 3 : 0, 10).map((row) => {
                          const isCurrentUser = row.user_id === user?.id;
                          return (
                            <div
                              key={row.user_id}
                              className={`leaderboard-mobile-card ${isCurrentUser ? 'is-current-user' : ''}`}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className="leaderboard-rank rank-default" style={{ width: '30px', height: '30px', fontSize: '0.82rem' }}>
                                  {row.rank_number}
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isCurrentUser ? 'var(--primary-color)' : 'var(--text-main)' }}>
                                      {row.name}
                                    </span>
                                    {isCurrentUser && (
                                      <span style={{ fontSize: '0.62rem', background: 'var(--primary-glow)', color: 'var(--primary-color)', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>أنت</span>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, marginTop: '2px' }}>
                                    <span>{GRADE_NAMES[row.grade_level]}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#ff7e7e' }}>
                                      <Flame size={11} />
                                      <span>{row.study_streak || 1}ي</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(229, 169, 60, 0.12)', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(229, 169, 60, 0.25)', color: 'var(--secondary-color)', fontWeight: 900, fontSize: '0.82rem' }}>
                                <Trophy size={13} />
                                <span>{row.points || 0}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Desktop View: Full Clean Glass Grid */
                      <div className="glass" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 160px 140px 120px', padding: '16px 20px', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-color)', fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <div>الترتيب</div>
                          <div>اسم الطالب</div>
                          <div>الصف الدراسي</div>
                          <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <Trophy size={14} style={{ color: '#ffd700' }} />
                            <span>نقاط الترتيب</span>
                          </div>
                          <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <Flame size={14} style={{ color: '#ff7e7e' }} />
                            <span>المثابرة</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {leaderboardData.slice(leaderboardData.length >= 3 ? 3 : 0, 10).map((row, idx) => {
                            const isCurrentUser = row.user_id === user?.id;

                            return (
                              <div
                                key={row.user_id}
                                className="leaderboard-row"
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '70px 1fr 160px 140px 120px',
                                  padding: '14px 20px',
                                  alignItems: 'center',
                                  borderBottom: idx < leaderboardData.length - 4 ? '1px solid rgba(255, 255, 255, 0.03)' : 'none',
                                  background: isCurrentUser ? 'var(--primary-light)' : 'transparent',
                                  fontWeight: isCurrentUser ? 800 : 500
                                }}
                              >
                                <div>
                                  <div className="leaderboard-rank rank-default" style={{ width: '30px', height: '30px', fontSize: '0.84rem' }}>
                                    {row.rank_number}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isCurrentUser ? 'var(--primary-color)' : 'var(--text-main)' }}>
                                  <span style={{ fontWeight: 800 }}>{row.name}</span>
                                  {isCurrentUser && <span style={{ fontSize: '0.7rem', background: 'var(--primary-glow)', color: 'var(--primary-color)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>أنت</span>}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                  {GRADE_NAMES[row.grade_level]}
                                </div>
                                <div style={{ textAlign: 'center', color: '#ffd700', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                  <Trophy size={14} />
                                  <span>{row.points || 0}</span>
                                </div>
                                <div style={{ textAlign: 'center', color: '#ff7e7e', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                  <Flame size={14} />
                                  <span>{row.study_streak || 1} يوم</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Mobile sheets (renders above everything when open) */}
      {renderSubjectSheet()}
      {renderModeSheet()}
      {renderModelSheet()}
      {renderUpgradeSheet()}

      {/* Mobile bottom tab bar — thumb-reachable primary navigation */}
      {isMobile && !(activeTab === 'exams' && selectedExam && !examResult) && (
        <nav className="bottom-nav" aria-label="التنقل السفلي" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <button
            type="button"
            className={`bottom-nav-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => {
              setActiveSessionId(null);
              setMessages([]);
              setActiveTab('chat');
              setShowSearch(false);
              setSidebarOpen(false);
            }}
          >
            <Plus size={20} />
            <span>دردشة</span>
          </button>
          <button
            type="button"
            className={`bottom-nav-item ${activeTab === 'exams' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('exams');
              setSidebarOpen(false);
            }}
          >
            <FileText size={20} />
            <span>الامتحانات</span>
          </button>
          <button
            type="button"
            className={`bottom-nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => {
              if (user) {
                setActiveTab('leaderboard');
              } else {
                setShowAuthModal(true);
              }
              setSidebarOpen(false);
            }}
          >
            <Trophy size={20} />
            <span>المسابقة</span>
          </button>
          <button
            type="button"
            className={`bottom-nav-item ${activeTab === 'flashcards' ? 'active' : ''}`}
            onClick={() => {
              if (user) {
                setActiveTab('flashcards');
              } else {
                setShowAuthModal(true);
              }
              setSidebarOpen(false);
            }}
          >
            <Brain size={20} />
            <span>المدرب</span>
          </button>
          <button
            type="button"
            className={`bottom-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => {
              if (user) {
                setActiveTab('profile');
              } else {
                setShowAuthModal(true);
              }
              setSidebarOpen(false);
            }}
          >
            <User size={20} />
            <span>حسابي</span>
          </button>
        </nav>
      )}

      {showExamCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: isMobile ? '12px' : '20px', direction: 'rtl' }}>
          <div className="glass-strong animate-scale-in" style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '680px', borderRadius: '24px', padding: isMobile ? '20px 16px' : '28px 24px', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontFamily: 'var(--font-arabic)', margin: isMobile ? '16px auto' : '32px auto', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={22} style={{ color: 'var(--primary-color)' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary-color)', margin: 0 }}>إنشاء امتحان مخصص بالذكاء الاصطناعي</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExamCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px', borderRadius: '8px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Subject Selector */}
            {(() => {
              const currentGrade = user ? user.grade_level : chatGrade;
              const activeSubjs = getActiveSubjectsForGrade(currentGrade);
              const curSubj = examSubject || chatSubject || (activeSubjs[0]?.subject_name || '');
              const cacheKey = `${currentGrade}_${curSubj}`;
              const structure = curriculumStructures[cacheKey];
              const units = structure?.units || [];
              const hasUnits = structure?.hasCurriculum && units.length > 0;
              const totalLessonsCount = structure?.totalLessons || units.reduce((acc: number, u: any) => acc + (u.lessons?.length || 0), 0);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Subject Dropdown */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>المادة الدراسية:</label>
                      <select
                        value={curSubj}
                        onChange={(e) => {
                          const newSubj = e.target.value;
                          setExamSubject(newSubj);
                          setExamTopic('');
                          setSelectedExamLesson(null);
                          setLessonSearchQuery('');
                          setActiveUnitTab('all');
                          fetchCurriculumStructure(currentGrade, newSubj);
                        }}
                        className="form-input"
                        style={{ cursor: 'pointer', width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '0.88rem' }}
                      >
                        {activeSubjs.map(s => (
                          <option key={s.subject_name} value={s.subject_name}>{s.subject_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Curriculum Lessons & Custom Topic Selector */}
                    <CurriculumLessonPicker
                      type="exam"
                      currentGrade={currentGrade}
                      currentSubject={curSubj}
                      structure={structure}
                      loading={loadingStructure}
                      activeLessonTab={examLessonTab}
                      setActiveLessonTab={setExamLessonTab}
                      selectedLesson={selectedExamLesson}
                      setSelectedLesson={setSelectedExamLesson}
                      customTopic={examTopic}
                      setCustomTopic={setExamTopic}
                      searchQuery={lessonSearchQuery}
                      setSearchQuery={setLessonSearchQuery}
                      activeUnitTab={activeUnitTab}
                      setActiveUnitTab={setActiveUnitTab}
                      expandedUnits={expandedUnits}
                      setExpandedUnits={setExpandedUnits}
                      isMobile={isMobile}
                      onFetchStructure={fetchCurriculumStructure}
                    />

                  {/* Question Mode Selection */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label" style={{ fontSize: '0.82rem' }}>طريقة تحديد الأسئلة:</label>
                    <select
                      value={examMode}
                      onChange={(e) => setExamMode(e.target.value as any)}
                      className="form-input"
                      style={{ cursor: 'pointer', width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
                    >
                      <option value="auto">توليد تلقائي شامل (دع الذكاء الاصطناعي يقرر)</option>
                      <option value="total_only">تحديد إجمالي عدد الأسئلة فقط</option>
                      <option value="custom_types">تحديد عدد كل نوع من الأسئلة بالتفصيل</option>
                    </select>
                  </div>

                  {examMode === 'total_only' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="form-label" style={{ fontSize: '0.82rem' }}>إجمالي عدد الأسئلة:</label>
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={examTotalCount}
                        onChange={(e) => setExamTotalCount(parseInt(e.target.value, 10) || 5)}
                        className="form-input"
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}

                  {examMode === 'custom_types' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>اختيار من متعدد:</label>
                        <input
                          type="number"
                          min={0}
                          value={examMcqCount}
                          onChange={(e) => setExamMcqCount(parseInt(e.target.value, 10) || 0)}
                          className="form-input"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>صح أم خطأ:</label>
                        <input
                          type="number"
                          min={0}
                          value={examTfCount}
                          onChange={(e) => setExamTfCount(parseInt(e.target.value, 10) || 0)}
                          className="form-input"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>أسئلة مقالية:</label>
                        <input
                          type="number"
                          min={0}
                          value={examEssayCount}
                          onChange={(e) => setExamEssayCount(parseInt(e.target.value, 10) || 0)}
                          className="form-input"
                        />
                      </div>
                    </div>
                  )}

                  {/* Generate Button */}
                  <button
                    type="button"
                    disabled={generatingExam || (!examTopic.trim() && !selectedExamLesson)}
                    onClick={() => {
                      const finalTopic = examTopic.trim() || (selectedExamLesson ? selectedExamLesson.title : 'المنهج بالكامل');
                      handleGenerateExam({
                        topic: finalTopic,
                        mode: examMode,
                        total_count: examTotalCount,
                        mcq_count: examMcqCount,
                        tf_count: examTfCount,
                        essay_count: examEssayCount
                      });
                    }}
                    className="btn-primary"
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      border: 'none',
                      cursor: 'pointer',
                      marginTop: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {generatingExam ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>جاري إنشاء امتحانك المخصص...</span>
                      </>
                    ) : (
                      <span>إنشاء الامتحان الآن</span>
                    )}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL: Image editor (crop + markup) */}
      {editingImage && (
        <ImageEditorModal
          src={editingImage.dataUrl}
          mimeType={editingImage.mimeType}
          onConfirm={handleEditedImage}
          onCancel={() => setEditingImage(null)}
        />
      )}

      {/* MODAL: Device Session Revoked Alert */}
      {sessionRevokedModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(12px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-strong animate-scale-in" style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '420px', borderRadius: 'var(--radius-lg)', padding: '28px 24px', boxShadow: 'var(--shadow-xl)', border: '1px solid rgba(230, 57, 70, 0.4)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(230, 57, 70, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E63946' }}>
              <ShieldAlert size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>تم تسجيل الخروج من هذا الجهاز</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.6' }}>
                تم إنهاء الجلسة على هذا الجهاز لأن الحساب تم تسجيل الدخول إليه من أجهزة متعددة وتجاوز الحد الأقصى المسموح به (3 أجهزة)، أو تم تسجيل الخروج منه لحماية أمان الحساب.
              </p>
            </div>
            <button
              onClick={() => {
                setSessionRevokedModal(false);
                setAuthTab('login');
                setShowAuthModal(true);
              }}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '4px' }}
            >
              <span>تسجيل الدخول مجدداً على هذا الجهاز</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Direct Mobile PWA Installation Guide */}
      {showIosInstallModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            zIndex: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setShowIosInstallModal(false)}
        >
          <div 
            className="glass-strong animate-scale-in"
            style={{
              maxWidth: '420px',
              width: '100%',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              direction: 'rtl',
              boxShadow: 'var(--shadow-xl)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Smartphone size={20} style={{ color: 'var(--primary-color)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {isIosDevice ? 'إضافة EGS AI إلى الشاشة الرئيسية (iOS)' : 'تثبيت EGS AI على شاشة الهاتف'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosInstallModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>

            {isIosDevice ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'var(--alpha-white-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                    1
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    اضغط على أيقونة <strong style={{ color: 'var(--primary-color)' }}>المشاركة (Share)</strong> في شريط متصفح Safari أسفل الشاشة.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'var(--alpha-white-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                    2
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    مرر للأسفل واختر <strong style={{ color: 'var(--primary-color)' }}>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'var(--alpha-white-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                    3
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    اضغط على <strong style={{ color: 'var(--primary-color)' }}>إضافة (Add)</strong> وسيظهر التطبيق فوراً على شاشتك.
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'var(--alpha-white-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                    1
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    اضغط على زر <strong style={{ color: 'var(--primary-color)' }}>القائمة (النقاط الثلاث ⋮)</strong> في متصفحك.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'var(--alpha-white-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                    2
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    اختر <strong style={{ color: 'var(--primary-color)' }}>تثبيت التطبيق (Install App)</strong> أو <strong style={{ color: 'var(--primary-color)' }}>إضافة إلى الشاشة الرئيسية</strong>.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'var(--alpha-white-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                    3
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    اضغط على <strong style={{ color: 'var(--primary-color)' }}>تثبيت</strong> وسيبدأ التطبيق مباشرة من شاشتك الرئيسية.
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowIosInstallModal(false)}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: Authentication Overlay */}
      {showAuthModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(12px)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: '20px 10px' }}>
          <div className="glass-strong animate-scale-in" style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '420px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)', margin: isMobile ? '20px auto' : '40px auto', flexShrink: 0 }}>
            
            {/* Modal Brand Header */}
            <div style={{ padding: '22px 24px 0', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '46px', height: '46px', borderRadius: '14px', background: 'var(--primary-light)', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                <img src="/logo.png" alt="EGS AI Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>EGS AI</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '16px' }}>مساعدك الذكي في المنهج الدراسي</p>
            </div>

            {/* Tab Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', margin: '0 4px' }}>
              <button
                onClick={() => { setAuthTab('login'); setOtpStep(false); }}
                style={{
                  flex: 1, padding: '13px 16px', border: 'none',
                  background: 'transparent', fontWeight: 700, fontSize: '0.88rem',
                  color: authTab === 'login' ? 'var(--primary-color)' : 'var(--text-muted)',
                  borderBottom: authTab === 'login' ? '2px solid var(--primary-color)' : '2px solid transparent',
                  cursor: 'pointer', transition: 'var(--transition)', fontFamily: 'var(--font-arabic)',
                }}
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => { setAuthTab('register'); setOtpStep(false); }}
                style={{
                  flex: 1, padding: '13px 16px', border: 'none',
                  background: 'transparent', fontWeight: 700, fontSize: '0.88rem',
                  color: authTab === 'register' ? 'var(--primary-color)' : 'var(--text-muted)',
                  borderBottom: authTab === 'register' ? '2px solid var(--primary-color)' : '2px solid transparent',
                  cursor: 'pointer', transition: 'var(--transition)', fontFamily: 'var(--font-arabic)',
                }}
              >
                إنشاء حساب جديد
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleAuthSubmit} style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px', color: 'var(--text-main)' }}>
              
              {authError && (
                <div className="alert alert-danger">
                  <AlertCircle size={14} />
                  <span>{authError}</span>
                </div>
              )}

              {/* Sign up details / Login details */}
              {!otpStep ? (
                <>
                  {authTab === 'register' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label className="form-label">الاسم بالكامل:</label>
                      <input
                        type="text" required value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="أدخل اسمك الكريم"
                        className="form-input"
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label className="form-label">البريد الإلكتروني:</label>
                    <input
                      type="email" required value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@egsaiedu.com"
                      className="form-input"
                      style={{ textAlign: 'left', direction: 'ltr' }}
                    />
                  </div>

                  {authTab === 'register' && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label className="form-label">السنة الدراسية (الصف):</label>
                        <select
                          value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}
                          className="form-input"
                          style={{ cursor: 'pointer' }}
                        >
                          {Object.entries(GRADE_NAMES)
                            .filter(([key]) => activeGradeLevels.length === 0 || activeGradeLevels.includes(key))
                            .map(([key, name]) => (
                              <option key={key} value={key} style={{ background: 'var(--card-bg)' }}>{name}</option>
                            ))
                          }
                        </select>
                      </div>

                      {gradeLevel === '2_high' && (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label className="form-label">المسار الدراسي (البكالوريا):</label>
                            <select
                              value={selectedTrack}
                              onChange={(e) => {
                                const newTrack = e.target.value;
                                setSelectedTrack(newTrack);
                                const electives = getElectiveSubjectsForTrack(newTrack);
                                setSelectedElective(electives.length > 0 ? electives[0] : '');
                              }}
                              className="form-input"
                              style={{ cursor: 'pointer' }}
                            >
                              {Object.values(BACCALAUREATE_TRACKS)
                                .filter(t => activeTracks.length === 0 || activeTracks.includes(t.id))
                                .map((track) => (
                                  <option key={track.id} value={track.id} style={{ background: 'var(--card-bg)' }}>{track.name}</option>
                                ))
                              }
                            </select>
                          </div>

                          {(() => {
                            const electives = getElectiveSubjectsForTrack(selectedTrack);
                            if (electives.length === 0) return null;
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label className="form-label">المادة الاختيارية للمسار:</label>
                                <select
                                  value={selectedElective || electives[0]}
                                  onChange={(e) => setSelectedElective(e.target.value)}
                                  className="form-input"
                                  style={{ cursor: 'pointer' }}
                                >
                                  {electives.map((subj) => (
                                    <option key={subj} value={subj} style={{ background: 'var(--card-bg)' }}>{subj}</option>
                                  ))}
                                </select>
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label className="form-label">كلمة المرور:</label>
                    <input
                      type="password" required value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="أدخل كلمة مرور قوية"
                      className="form-input"
                    />
                  </div>

                  {authTab === 'register' && (
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: '1.6' }}>
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        style={{ marginTop: '3px', width: '15px', height: '15px', accentColor: 'var(--primary-color)', flexShrink: 0, cursor: 'pointer' }}
                      />
                      <span>
                        أوافق على{' '}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', fontWeight: 700 }}>سياسة الخصوصية</a>
                        {' '}و{' '}
                        <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', fontWeight: 700 }}>شروط الاستخدام</a>
                      </span>
                    </label>
                  )}

                  {/* Google OAuth Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '5px 0' }}>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>أو بواسطة</span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                    </div>
                    
                    <div id="google-signin-button" style={{ minHeight: '40px', width: '100%', display: 'flex', justifyContent: 'center' }}></div>
                  </div>
                </>
              ) : (
                /* OTP Verification Step */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center' }}>
                  <div style={{ background: 'var(--primary-light)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '14px', margin: '0 auto', border: '1px solid var(--border-primary)' }}>
                    <Lock size={24} style={{ color: 'var(--primary-color)' }} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 800, fontSize: '1.05rem' }}>أدخل رمز التحقق (OTP)</h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                      تم إرسال رمز التحقق إلى البريد الإلكتروني {email}.
                    </p>
                  </div>
                  <input
                    type="text" required maxLength={6} value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="أدخل الرمز"
                    className="form-input"
                    style={{ textAlign: 'center', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '10px', direction: 'ltr' }}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => { setShowAuthModal(false); resetAuthForm(); }}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '12px', fontFamily: 'var(--font-arabic)', borderRadius: 'var(--radius-sm)' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={authLoading || (authTab === 'register' && !otpStep && !termsAccepted)}
                  className="btn-primary"
                  style={{ flex: 2, padding: '12px', fontFamily: 'var(--font-arabic)', borderRadius: 'var(--radius-sm)' }}
                >
                  {authLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <span>{otpStep ? 'تأكيد الرمز' : (authTab === 'login' ? 'دخول' : 'إنشاء حساب')}</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 1B: Google Signup Grade Selection */}
      {showGoogleGradeModal && googleTempUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(12px)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: '20px 10px' }}>
          <div className="glass-strong animate-scale-in" style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '420px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)', padding: '24px', margin: isMobile ? '20px auto' : '40px auto', flexShrink: 0 }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '46px', height: '46px', borderRadius: '14px', background: 'var(--primary-light)', border: '1px solid var(--border-primary)', marginBottom: '10px' }}>
                <BookOpen size={24} style={{ color: 'var(--primary-color)' }} />
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>اختر سنتك الدراسية</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>مرحباً بك {googleTempUser.name}! يرجى اختيار السنة الدراسية لإتمام إعداد حسابك.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label className="form-label">السنة الدراسية (الصف):</label>
                <select
                  value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}
                  className="form-input"
                  style={{ cursor: 'pointer', width: '100%' }}
                >
                  {Object.entries(GRADE_NAMES)
                    .filter(([key]) => activeGradeLevels.length === 0 || activeGradeLevels.includes(key))
                    .map(([key, name]) => (
                      <option key={key} value={key} style={{ background: 'var(--card-bg)' }}>{name}</option>
                    ))
                  }
                </select>
              </div>

              {gradeLevel === '2_high' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label className="form-label">المسار الدراسي (البكالوريا):</label>
                    <select
                      value={googleSelectedTrack}
                      onChange={(e) => {
                        const newTrack = e.target.value;
                        setGoogleSelectedTrack(newTrack);
                        const electives = getElectiveSubjectsForTrack(newTrack);
                        setGoogleSelectedElective(electives.length > 0 ? electives[0] : '');
                      }}
                      className="form-input"
                      style={{ cursor: 'pointer', width: '100%' }}
                    >
                      {Object.values(BACCALAUREATE_TRACKS)
                        .filter(t => activeTracks.length === 0 || activeTracks.includes(t.id))
                        .map((track) => (
                          <option key={track.id} value={track.id} style={{ background: 'var(--card-bg)' }}>{track.name}</option>
                        ))
                      }
                    </select>
                  </div>

                  {(() => {
                    const electives = getElectiveSubjectsForTrack(googleSelectedTrack);
                    if (electives.length === 0) return null;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label className="form-label">المادة الاختيارية للمسار:</label>
                        <select
                          value={googleSelectedElective || electives[0]}
                          onChange={(e) => setGoogleSelectedElective(e.target.value)}
                          className="form-input"
                          style={{ cursor: 'pointer', width: '100%' }}
                        >
                          {electives.map((subj) => (
                            <option key={subj} value={subj} style={{ background: 'var(--card-bg)' }}>{subj}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}
                </>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setShowGoogleGradeModal(false); setGoogleTempUser(null); }}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '12px', fontFamily: 'var(--font-arabic)', borderRadius: 'var(--radius-sm)' }}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => handleGoogleLogin(googleTempUser.credential, gradeLevel, googleSelectedTrack, googleSelectedElective)}
                  className="btn-primary"
                  style={{ flex: 2, padding: '12px', fontFamily: 'var(--font-arabic)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {authLoading ? <Loader2 size={16} className="animate-spin" /> : 'تأكيد ودخول'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Curriculum Markdown Content */}
      {editCurriculumId && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.65)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: '20px 10px' }}>
          <div className="glass animate-scale-in" style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '780px', height: '90vh', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', margin: isMobile ? '20px auto' : '40px auto', flexShrink: 0 }}>
            
            {/* Header */}
            <div style={{ background: 'var(--primary-color)', color: 'var(--text-on-primary)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>محرر المنهج الدراسي المباشر</h3>
                <p style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '2px' }}>تعديل محتوى Markdown وإعادة فهرسة الحصيلة العلمية تلقائياً للطلاب.</p>
              </div>
              <BookOpen size={24} />
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCurriculumEdit} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '24px', gap: '16px', color: 'var(--text-main)' }}>
              {editModalError && (
                <div style={{ background: 'rgba(230, 57, 70, 0.1)', color: 'var(--danger-color)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={14} />
                  <span>{editModalError}</span>
                </div>
              )}

              {/* Metadata editor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>اسم المادة:</label>
                  <input
                    type="text"
                    required
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--sidebar-bg)', color: 'var(--text-main)' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>الصف الدراسي:</label>
                  <select
                    value={editGrade}
                    onChange={(e) => setEditGrade(e.target.value)}
                    style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--sidebar-bg)', color: 'var(--text-main)' }}
                  >
                    {Object.entries(GRADE_NAMES).map(([key, name]) => (
                      <option key={key} value={key} style={{ background: 'var(--card-bg)' }}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Content editor */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>محتوى المنهج بالتفصيل (Markdown):</label>
                {editModalLoading ? (
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--sidebar-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary-color)' }} />
                  </div>
                ) : (
                  <textarea
                    required
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="# الدرس الأول..."
                    style={{ flex: 1, padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--sidebar-bg)', color: 'var(--text-main)', resize: 'none', fontSize: '0.9rem', lineHeight: '1.6', fontFamily: 'monospace', direction: 'rtl', textAlign: 'right' }}
                  />
                )}
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditCurriculumId(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--alpha-white-5)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={editModalLoading}
                  style={{
                    flex: 2,
                    padding: '12px',
                    border: 'none',
                    background: 'var(--primary-color)',
                    color: 'var(--text-on-primary)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary-color)'}
                >
                  {editModalLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <span>حفظ المنهج ونشره فورياً</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 3B: Manual Units & Lessons Index Manager */}
      {unitsModalCurr && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: isMobile ? '12px' : '24px 16px', direction: 'rtl' }}>
          <div className="glass-strong animate-scale-in" style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '820px', minHeight: '520px', maxHeight: '90vh', borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', margin: isMobile ? '10px auto' : '20px auto', flexShrink: 0, color: 'var(--text-main)', fontFamily: 'var(--font-arabic)' }}>
            
            {/* Header */}
            <div style={{ background: 'var(--primary-color)', color: 'var(--text-on-primary)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
                  <Layers size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>فهرس الوحدات والدروس اليدوي</h3>
                    <span style={{ background: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      {GRADE_NAMES[unitsModalCurr.grade_level] || unitsModalCurr.grade_level}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '4px', margin: 0 }}>
                    مادة: {unitsModalCurr.subject_name} — أضف الوحدات والدروس بدقة لتحديد نطاق الامتحانات والكروت الذكية للطلاب.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnitsModalCurr(null)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'var(--text-on-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px', borderRadius: '8px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body / Units Container */}
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {unitsModalError && (
                <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '10px' }}>
                  <AlertCircle size={16} />
                  <span>{unitsModalError}</span>
                </div>
              )}

              {unitsModalSuccess && (
                <div style={{ background: 'rgba(125, 161, 70, 0.15)', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.88rem' }}>
                  <CheckCircle2 size={16} />
                  <span>{unitsModalSuccess}</span>
                </div>
              )}

              {/* Units list */}
              {unitsList.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', border: '1.5px dashed var(--border-color)', borderRadius: '16px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <BookOpen size={36} style={{ color: 'var(--primary-color)', opacity: 0.6 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>لم يتم إضافة وحدات بعد لهذا المنهج</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>اضغط على الزر أدناه لبدء إضافة الوحدة الأولى والدروس التابعة لها.</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddUnit}
                    className="btn-primary"
                    style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', border: 'none' }}
                  >
                    <Plus size={16} />
                    <span>إضافة الوحدة الأولى</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {unitsList.map((unit, unitIdx) => (
                    <div
                      key={unit.id || unitIdx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                      }}
                    >
                      {/* Unit Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
                          <span style={{ background: 'var(--primary-color)', color: 'var(--text-on-primary)', padding: '3px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            الوحدة {unit.unitNumber || (unitIdx + 1)}
                          </span>
                          <input
                            type="text"
                            value={unit.title}
                            onChange={(e) => handleUpdateUnitTitle(unitIdx, e.target.value)}
                            placeholder={`عنوان الوحدة ${unitIdx + 1}`}
                            className="form-input"
                            style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem', fontWeight: 800, borderRadius: '8px' }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteUnit(unitIdx)}
                            style={{ background: 'transparent', border: '1px solid rgba(230, 57, 70, 0.3)', color: 'var(--danger-color)', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
                            title="حذف الوحدة بالكامل"
                          >
                            <Trash2 size={14} />
                            <span>حذف الوحدة</span>
                          </button>
                        </div>
                      </div>

                      {/* Unit Lessons Multi-line Text Area & Ordering */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BookOpen size={16} style={{ color: 'var(--primary-color)' }} />
                            <span>قائمة الدروس (اكتب كل درس في سطر منفصل بالترتيب):</span>
                          </label>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            يتم ترتيب وفهرسة الدروس تلقائياً حسب ترتيب الأسطر (السطر 1 = الدرس 1، السطر 2 = الدرس 2، وهكذا).
                          </span>
                        </div>

                        <textarea
                          value={unit.lessonsText !== undefined ? unit.lessonsText : (unit.lessons || []).map(l => l.title).join('\n')}
                          onChange={(e) => handleUpdateUnitLessonsText(unitIdx, e.target.value)}
                          placeholder={`الدرس الأول\nالدرس الثاني\nالدرس الثالث`}
                          className="form-input"
                          rows={Math.max(4, Math.min(10, ((unit.lessonsText !== undefined ? unit.lessonsText : (unit.lessons || []).map(l => l.title).join('\n')).split('\n').length + 1)))}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            fontSize: '0.88rem',
                            borderRadius: '10px',
                            lineHeight: '1.7',
                            minHeight: '110px',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            background: 'rgba(0, 0, 0, 0.25)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-main)',
                            boxSizing: 'border-box'
                          }}
                        />

                        {/* Live auto-ordering preview */}
                        {(unit.lessons || []).length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                              <span>الترتيب التلقائي المعتمد ({unit.lessons.length} دروس):</span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--primary-color)', fontWeight: 800 }}>مرتبة ومفهرسة تلقائياً</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                              {unit.lessons.map((lesson, lIdx) => (
                                <div
                                  key={lesson.id || lIdx}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'var(--primary-light)',
                                    border: '1px solid var(--border-primary)',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    fontSize: '0.78rem'
                                  }}
                                >
                                  <span style={{ fontWeight: 800, color: 'var(--primary-color)', minWidth: '18px' }}>
                                    {lesson.lessonNumber || (lIdx + 1)}.
                                  </span>
                                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                                    {lesson.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 2px' }}>
                            اكتب أسماء الدروس في الصندوق أعلاه (كل درس في سطر منفصل) وسيتم ترقيمها وترتيبها تلقائياً.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add another Unit button */}
                  <button
                    type="button"
                    onClick={handleAddUnit}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '14px',
                      borderRadius: '14px',
                      border: '1.5px dashed var(--border-color)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      color: 'var(--primary-color)',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-light)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                  >
                    <PlusCircle size={18} />
                    <span>إضافة وحدة جديدة (+ Unit)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px', justifyContent: 'flex-end', background: 'var(--sidebar-bg)', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setUnitsModalCurr(null)}
                className="btn-secondary"
                style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700 }}
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={unitsModalLoading}
                onClick={handleSaveUnits}
                className="btn-primary"
                style={{ padding: '10px 24px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {unitsModalLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                <span>حفظ الفهرس</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 4: Report AI Response */}
      {reportTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.65)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: '20px 10px' }}>
          <div className="glass animate-scale-in" style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '440px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)', margin: isMobile ? '20px auto' : '40px auto', flexShrink: 0 }}>
            <div style={{ background: 'var(--danger-color)', color: '#fff', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} />
                <h3 style={{ fontWeight: 700, fontSize: '1.05rem' }}>الإبلاغ عن رد غير مناسب</h3>
              </div>
              <button
                type="button"
                onClick={() => { setReportTarget(null); setReportReason(''); setReportDone(false); }}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px', color: 'var(--text-main)' }}>
              {reportDone ? (
                <div className="alert alert-success">
                  <Check size={16} />
                  <span>تم إرسال بلاغك بنجاح. شكراً لمساعدتنا في تحسين الخدمة!</span>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    أخبرنا لماذا كانت هذه الإجابة غير مناسبة أو غير صحيحة (اختياري). سيتم مراجعة بلاغك من قبل فريق الإدارة.
                  </p>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="مثال: الإجابة غير صحيحة علمياً، أو غير مناسبة..."
                    className="form-input"
                    rows={4}
                    style={{ resize: 'vertical', fontFamily: 'var(--font-arabic)' }}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => { setReportTarget(null); setReportReason(''); }}
                      className="btn-secondary"
                      style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-sm)' }}
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitReport}
                      disabled={reportLoading}
                      className="btn-primary"
                      style={{ flex: 2, padding: '12px', borderRadius: 'var(--radius-sm)' }}
                    >
                      {reportLoading ? <Loader2 size={16} className="animate-spin" /> : <span>إرسال البلاغ</span>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Kashier Payment Success Celebratory Modal */}
      {paymentSuccessData && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)', zIndex: 1100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', direction: 'rtl' }}>
          <div className="glass-strong animate-scale-in" style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '480px', borderRadius: 'var(--radius-lg)', padding: '32px', boxShadow: 'var(--shadow-xl)', border: '2px solid var(--primary-color)', color: 'var(--text-main)', textAlign: 'center', position: 'relative' }}>
            
            {/* Header Icon Badge */}
            <div style={{ width: '68px', height: '68px', borderRadius: 'var(--radius-full)', background: 'var(--primary-light)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', border: '2px solid var(--primary-color)' }}>
              <CheckCircle size={36} />
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--primary-light)', color: 'var(--primary-color)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 800, marginBottom: '12px' }}>
              <Sparkles size={14} />
              <span>تأكيد الاشتراك عبر كاشير</span>
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary-color)', margin: '0 0 8px' }}>
              تم تفعيل اشتراكك بنجاح!
            </h2>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 0 20px' }}>
              تهانينا! تم ترقية حسابك إلى باقة Pro وشحن رصيدك بنجاح. أصبحت كافة ميزات المساعد الذكي الفائق متاحة لك الآن.
            </p>

            {/* Plan summary box */}
            <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>الباقة المفعلة:</span>
                <span style={{ fontWeight: 800, color: 'var(--primary-color)' }}>{paymentSuccessData.planTitle}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>النقاط المضافة للرصيد:</span>
                <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>+{paymentSuccessData.bonusCoins} نقطة</span>
              </div>
            </div>

            {/* Features summary */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={14} color="var(--primary-color)" /> وصول كامل لنموذج Pro وميزة التفكير</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={14} color="var(--primary-color)" /> تجديد يومي للرصيد حتى 50 نقطة</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={14} color="var(--primary-color)" /> توليد واختبار امتحانات غير محدودة</li>
            </ul>

            <button
              type="button"
              onClick={() => {
                setPaymentSuccessData(null);
                setActiveTab('chat');
              }}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--primary-color)',
                color: 'var(--text-on-primary)',
                fontWeight: 900,
                fontSize: '0.95rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'var(--transition)'
              }}
            >
              <span>ابدأ استخدام المساعد الذكي الآن</span>
              <Sparkles size={16} />
            </button>

          </div>
        </div>
      )}

      {/* Kashier Payment Error Toast */}
      {paymentErrorToast && (
        <div style={{ position: 'fixed', bottom: isMobile ? 'calc(76px + env(safe-area-inset-bottom, 0px))' : '24px', left: isMobile ? '12px' : '24px', right: isMobile ? '12px' : 'auto', zIndex: 1200, maxWidth: isMobile ? 'calc(100% - 24px)' : '400px', background: 'var(--card-bg)', border: '1px solid var(--danger-color)', borderRadius: 'var(--radius-md)', padding: '14px 18px', boxShadow: 'var(--shadow-xl)', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-main)', direction: 'rtl' }}>
          <AlertCircle size={20} color="var(--danger-color)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.86rem', fontWeight: 600, flex: 1 }}>{paymentErrorToast}</span>
          <button onClick={() => setPaymentErrorToast(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Currency Verification Notification Toast */}
      {currencyVerificationToast && (
        <div style={{ position: 'fixed', bottom: isMobile ? 'calc(76px + env(safe-area-inset-bottom, 0px))' : '24px', left: isMobile ? '12px' : '24px', right: isMobile ? '12px' : 'auto', zIndex: 1200, maxWidth: isMobile ? 'calc(100% - 24px)' : '420px', background: 'var(--card-bg)', border: '1px solid var(--primary-color)', borderRadius: 'var(--radius-md)', padding: '14px 18px', boxShadow: 'var(--shadow-xl)', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-main)', direction: 'rtl' }}>
          <ShieldCheck size={20} color="var(--primary-color)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.86rem', fontWeight: 600, flex: 1 }}>{currencyVerificationToast}</span>
          <button onClick={() => setCurrencyVerificationToast(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* MODAL: Placeholder Curriculum Notice for Students */}
      {placeholderModalCurriculum && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(12px)', zIndex: 1100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', direction: 'rtl' }}>
          <div className="glass-strong animate-scale-in" style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '460px', borderRadius: 'var(--radius-lg)', padding: '30px 24px', boxShadow: 'var(--shadow-xl)', border: '1px solid rgba(229, 169, 60, 0.4)', color: 'var(--text-main)', textAlign: 'center', position: 'relative' }}>
            
            <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-full)', background: 'rgba(229, 169, 60, 0.15)', color: 'var(--accent-gold, #E5A93C)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(229, 169, 60, 0.3)' }}>
              <Clock size={32} />
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(229, 169, 60, 0.15)', color: 'var(--accent-gold, #E5A93C)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.78rem', fontWeight: 800, marginBottom: '12px' }}>
              <span>قيد الإعداد والتجهيز</span>
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 10px' }}>
              منهج {placeholderModalCurriculum.subject_name}
            </h3>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.7', margin: '0 0 24px' }}>
              عزيزي الطالب، نعمل حالياً على إعداد وتنسيق وفهرسة منهج <strong>{placeholderModalCurriculum.subject_name}</strong> بالذكاء الاصطناعي ومراجعته بأعلى دقة. سيتم رفع المحتوى وإتاحته لك قريباً جداً لمساعدتك في الدراسة وتوليد الاختبارات والكروت الذكية.
            </p>

            <button
              type="button"
              onClick={() => setPlaceholderModalCurriculum(null)}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Admin Attach File to Placeholder Curriculum */}
      {attachCurriculumModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(12px)', zIndex: 1100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', direction: 'rtl' }}>
          <div className="glass-strong animate-scale-in" style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '480px', borderRadius: 'var(--radius-lg)', padding: '26px', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)', color: 'var(--text-main)', position: 'relative' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={20} style={{ color: 'var(--primary-color)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>رفع ملف منهج: {attachCurriculumModal.subject_name}</h3>
              </div>
              <button
                type="button"
                onClick={() => { setAttachCurriculumModal(null); setAttachFile(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '18px' }}>
              اختر ملف المنهج بصيغة Markdown (.md) للمادة <strong>{attachCurriculumModal.subject_name}</strong> ({GRADE_NAMES[attachCurriculumModal.grade_level]}). سيقوم النظام فوراً بتجزئة المحتوى وتوليد التضمينات الشعاعية (Vector Embeddings) وتفعيل المادة لجميع الطلاب.
            </p>

            <form onSubmit={handleAttachFileToPlaceholder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>اختر ملف المنهج (.md):</label>
                <input
                  type="file"
                  accept=".md"
                  required
                  onChange={(e) => setAttachFile(e.target.files ? e.target.files[0] : null)}
                  style={{ padding: '10px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--sidebar-bg)', color: 'var(--text-main)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setAttachCurriculumModal(null); setAttachFile(null); }}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '11px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={attachLoading || !attachFile}
                  className="btn-primary"
                  style={{ flex: 2, padding: '11px', borderRadius: 'var(--radius-sm)', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {attachLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>جاري معالجة وتضمين المنهج...</span>
                    </>
                  ) : (
                    <span>رفع وفهرسة المنهج</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
