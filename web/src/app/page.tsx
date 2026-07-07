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
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  LogIn,
  Bell,
  ArrowRight
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
  searchSteps?: SearchStep[]; // v2 RAG search steps for display
}


interface Curriculum {
  id: string;
  grade_level: string;
  subject_name: string;
  file_name: string;
  created_at: string;
}

const GRADE_NAMES: Record<string, string> = {
  '1_middle': 'الصف الأول الإعدادي',
  '2_middle': 'الصف الثاني الإعدادي',
  '3_middle': 'الصف الثالث الإعدادي',
  '1_high': 'الصف الأول الثانوي',
  '2_high': 'الصف الثاني الثانوي',
  '3_high': 'الصف الثالث الثانوي'
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
            background: 'rgba(125,161,70,0.6)', display: 'inline-block'
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

const AudioPlayerMessage = ({ mimeType, base64Data, transcription }: { mimeType: string; base64Data: string; transcription: string }) => {
  const [playing, setPlaying] = useState(false);
  const [showText, setShowText] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error('Audio play error:', err));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-player-message" style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      width: '100%',
      maxWidth: '320px',
      boxShadow: 'var(--shadow-sm)',
      direction: 'rtl'
    }}>
      <audio
        ref={audioRef}
        src={`data:${mimeType};base64,${base64Data}`}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={togglePlay}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--primary-color)',
            color: '#fff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '1rem',
            boxShadow: '0 2px 8px rgba(125, 161, 70, 0.3)'
          }}
        >
          {playing ? '⏸️' : '▶️'}
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              if (audioRef.current) {
                audioRef.current.currentTime = parseFloat(e.target.value);
                setCurrentTime(audioRef.current.currentTime);
              }
            }}
            style={{
              width: '100%',
              height: '4px',
              borderRadius: '2px',
              accentColor: 'var(--primary-color)',
              background: 'rgba(255, 255, 255, 0.2)',
              cursor: 'pointer'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {transcription && (
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '8px' }}>
          <button
            type="button"
            onClick={() => setShowText(!showText)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-color)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '2px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'var(--font-arabic)'
            }}
          >
            <span>{showText ? '📖 إخفاء النص المقروء' : '📖 عرض النص المقروء'}</span>
          </button>
          {showText && (
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderLeft: '2px solid var(--primary-color)',
              borderRadius: '4px',
              fontSize: '0.85rem',
              color: 'var(--text-main)',
              lineHeight: '1.4',
              whiteSpace: 'pre-wrap'
            }}>
              {transcription}
            </div>
          )}
        </div>
      )}
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
        <span className={isThinking ? 'animate-spin' : ''} style={{ display: 'inline-block', fontSize: '1rem', lineHeight: 1 }}>⚛</span>
        <span>
          {isThinking 
            ? `جارٍ التفكير (${duration || 0} ثانية)...` 
            : `فكّر لمدة ${duration || 1} ثانية`}
        </span>
        <span style={{ 
          fontSize: '0.7rem', 
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.22s ease',
          display: 'inline-block',
        }}>▶</span>
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
    const sanitized = React.useMemo(() => {
      if (typeof window === 'undefined') return '';
      try {
        return DOMPurify.sanitize(svgContent, {
          USE_PROFILES: { svg: true, svgFilters: false },
          FORBID_TAGS: ['script', 'foreignObject', 'style'],
          FORBID_ATTR: ['onload', 'onerror', 'onclick', 'href', 'xlink:href'],
        });
      } catch (e) {
        console.error('SVG sanitize error:', e);
        return '';
      }
    }, [svgContent]);

    if (!sanitized) return null;

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
          justifyContent: 'center'
        }}
      >
        <div
          style={{ maxWidth: '100%', color: 'var(--text-main)' }}
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
            boxShadow: '0 4px 10px rgba(125,161,70,0.2)'
          }}
        >
          بدء الامتحان الآن
        </button>
      </div>
    );
  };

  // Formatted chat message parser wrapper
  const FormattedChatMessage = ({ 
    content, 
    sender,
    onGoToExams,
    onAnswerSubmit
  }: { 
    content: string; 
    sender: 'user' | 'ai';
    onGoToExams: (exam: any) => void;
    onAnswerSubmit: (text: string) => void;
  }) => {
    if (sender === 'user') {
      return <div style={{ whiteSpace: 'pre-wrap', direction: 'rtl' }}>{content}</div>;
    }

    let displayContent = content;
    let quizData: any = null;
    let examData: any = null;

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

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {displayContent.trim() && <MarkdownMessage content={displayContent} />}
        {quizData && <InteractiveQuizCard quiz={quizData} onAnswerSubmit={onAnswerSubmit} />}
        {examData && <InteractiveExamInviteCard exam={examData} onGoToExams={() => onGoToExams(examData)} />}
      </div>
    );
  };

  // ─── v2: SearchStepsPanel — shows RAG search process to the student ──────
  const SearchStepsPanel = ({ steps, isSearching }: { steps?: SearchStep[]; isSearching?: boolean }) => {
    const [collapsed, setCollapsed] = React.useState(false);

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
            <span style={{ fontSize: '0.95rem' }}>{isSearching && allSteps.length === 0 ? '⏳' : '🔍'}</span>
            <span style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.8rem' }}>
              {isSearching && allSteps.length === 0 ? 'جاري البحث في المنهج...' : 'خطوات البحث الذكي'}
            </span>
          </div>
          {allSteps.length > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', userSelect: 'none' }}>
              {collapsed ? '▼ عرض' : '▲ إخفاء'}
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
                <span style={{ fontSize: '0.95rem', minWidth: '20px', textAlign: 'center' }}>{s.icon}</span>
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

export default function App() {

  // Navigation & Views
  const [activeTab, setActiveTab] = useState<'chat' | 'admin' | 'beta' | 'profile' | 'exams'>('chat');

  // Points / Coins & Model States
  const [coins, setCoins] = useState<number>(50.0);
  const [selectedModel, setSelectedModel] = useState<'flash' | 'pro'>('flash');
  const [thinkingEnabled, setThinkingEnabled] = useState<boolean>(false);

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

  // Exam Customization State
  const [showExamCreateModal, setShowExamCreateModal] = useState(false);
  const [examTopic, setExamTopic] = useState('');
  const [examMode, setExamMode] = useState<'auto' | 'total_only' | 'custom_types'>('auto');
  const [examTotalCount, setExamTotalCount] = useState<number>(5);
  const [examMcqCount, setExamMcqCount] = useState<number>(2);
  const [examTfCount, setExamTfCount] = useState<number>(2);
  const [examEssayCount, setExamEssayCount] = useState<number>(1);
  
  // Auth Form Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('3_high');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Google OAuth Extra States
  const [showGoogleGradeModal, setShowGoogleGradeModal] = useState(false);
  const [googleTempUser, setGoogleTempUser] = useState<any>(null);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatSubject, setChatSubject] = useState('');
  const [chatGrade, setChatGrade] = useState('3_high'); // for guests
  const [chatLoading, setChatLoading] = useState(false);
  const [guestMessagesCount, setGuestMessagesCount] = useState(0);
  const [deviceId, setDeviceId] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
  const [uploadGrade, setUploadGrade] = useState('3_high');
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
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
  const [editGrade, setEditGrade] = useState('3_high');
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [editModalError, setEditModalError] = useState('');

  // Admin Dashboard Stats State
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Configuration Settings State
  const [activeGradeLevels, setActiveGradeLevels] = useState<string[]>(['1_middle', '2_middle', '3_middle', '1_high', '2_high', '3_high']);
  const [activeCurriculumIds, setActiveCurriculumIds] = useState<string[]>([]);

  // Profile Update State
  const [profileName, setProfileName] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileOtp, setProfileOtp] = useState('');
  const [profileOtpStep, setProfileOtpStep] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ text: '', type: '' });

  // Responsive Layout
  const [isMobile, setIsMobile] = useState(false);

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
      alert('ليس لديك رصيد كافٍ من النقاط لإنشاء الامتحان. سيتجدد رصيدك تلقائياً غداً.');
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
      const res = await fetch('/api/exams/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subject_name: chatSubject,
          grade_level: currentGrade,
          ...customParams
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل توليد الامتحان');

      await loadExamsData();
      setSelectedExam(data);
      setActiveExamAnswers({});
      setExamResult(null);
      setShowExamCreateModal(false); // Close custom creator modal
    } catch (e: any) {
      alert(e.message || 'فشل توليد الامتحان بالذكاء الاصعتاعي');
    } finally {
      setGeneratingExam(false);
    }
  };

  const handleSubmitExam = async () => {
    if (!selectedExam) return;
    if (coins <= 0) {
      alert('ليس لديك رصيد كافٍ من النقاط لتصحيح الامتحان. سيتجدد رصيدك تلقائياً غداً.');
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // New audio recording and API states
  const skipHistoryReloadRef = useRef(false);
  const tempAudioBlobRef = useRef<Blob | null>(null);
  const [pendingAudio, setPendingAudio] = useState<{ base64: string; mimeType: string } | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [showModelMenu, setShowModelMenu] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = localStorage.getItem('egs_gemini_api_key');
      if (key) setGeminiKeyInput(key);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recording]);

  const startWebRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: BlobPart[] = [];
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      let recognition: any = null;
      let transcriptText = '';

      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'ar-EG';
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              transcriptText += event.results[i][0].transcript;
            } else {
              currentTranscript += event.results[i][0].transcript;
            }
          }
          const fullText = transcriptText + currentTranscript;
          if (fullText.trim()) {
            setInputMessage(fullText);
          }
        };

        recognition.onerror = (event: any) => {
          const errorType = event.error;
          console.warn('Speech recognition error type:', errorType);
          if (errorType === 'not-allowed') {
            alert('يرجى السماح بصلاحية الميكروفون لتشغيل ميزة تحويل الصوت إلى نص.');
          }
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      } else {
        console.warn('SpeechRecognition is not supported in this browser.');
      }

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        if (speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.stop();
          } catch (e) {}
          speechRecognitionRef.current = null;
        }

        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());

        setTranscribing(true);
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          setPendingAudio({
            base64: base64String,
            mimeType: 'audio/webm'
          });
          setTranscribing(false);
        };
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setRecordingDuration(0);
    } catch (err: any) {
      alert(`فشل بدء التسجيل: ${err.message || err}`);
    }
  };

  const stopWebRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setRecording(false);
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
      speechRecognitionRef.current = null;
    }
  };

  const transcribeWebAudio = async (blob: Blob) => {
    // Left as stub to prevent external reference failures
  };

  const handleSaveGeminiKey = (key: string) => {
    localStorage.setItem('egs_gemini_api_key', key);
    setShowGeminiModal(false);
  };

  // Helper for suggestions clicking
  const handleSuggestionClick = (text: string) => {
    setInputMessage(text);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);
  };

  // Helper to render suggestion chips
  const renderSuggestionChips = () => (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '20px' }}>
      {[
        { label: 'شرح درس', text: 'اشرح لي الفصل الأول في مادة الفيزياء بأسلوب مبسط وشيق مع ذكر أمثلة.' },
        { label: 'تلخيص', text: 'لخص لي أهم القوانين والمصطلحات المقررة في الفيزياء الكهربية.' },
        { label: 'أسئلة', text: 'هل يمكنك أن تضع لي أسئلة مراجعة على الفصل الخاص بالمركببات الكيميائية؟' },
        { label: 'حل مسائل', text: 'ساعدني في حل وتفصيل بعض المسائل الهندسية والفيزيائية الصعبة.' },
      ].map((chip, i) => (
        <button
          key={i}
          type="button"
          onClick={() => handleSuggestionClick(chip.text)}
          className="suggestion-chip"
        >
          <span>{chip.label}</span>
        </button>
      ))}
    </div>
  );

  const getActiveSubjectsForGrade = (grade: string) => {
    const filtered = curriculums.filter(c => c.grade_level === grade);
    if (activeCurriculumIds.length === 0) return filtered;
    return filtered.filter(c => activeCurriculumIds.includes(c.id));
  };

  useEffect(() => {
    const targetGrade = user ? user.grade_level : chatGrade;
    const availableSubjects = getActiveSubjectsForGrade(targetGrade);
    if (availableSubjects.length > 0) {
      const exists = availableSubjects.some(s => s.subject_name === chatSubject);
      if (!exists) {
        setChatSubject(availableSubjects[0].subject_name);
      }
    } else {
      setChatSubject('');
    }
  }, [user, chatGrade, curriculums, activeCurriculumIds]);

  // Helper to render input form (centered or bottom)
  const renderInputForm = (isCentered: boolean) => {
    const targetGrade = user ? user.grade_level : chatGrade;
    const activeSubjects = getActiveSubjectsForGrade(targetGrade);
    const hasMessage = inputMessage.trim().length > 0;

    const activeSession = sessions.find(s => s.id === activeSessionId);
    const isSessionCourseValid = !activeSessionId || !activeSession || curriculums.some(c => 
      c.subject_name === activeSession.subject_name && 
      c.grade_level === activeSession.grade_level &&
      activeCurriculumIds.includes(c.id)
    );

    const currentGrade = user ? user.grade_level : chatGrade;
    const hasCurriculum = curriculums.some(c => 
      c.subject_name === chatSubject && 
      c.grade_level === currentGrade
    );

    const guestLimitReached = !user && guestMessagesCount >= 5;

    let isDisabled = chatLoading;
    let placeholderText = chatSubject ? `اسألني عن أي شيء في منهج ${chatSubject}...` : 'اسألني عن أي شيء...';

    if (guestLimitReached) {
      isDisabled = true;
      placeholderText = "لقد استنفدت الرسائل الـ 5 المجانية المتاحة لك كزائر. يرجى تسجيل الدخول للمتابعة!";
    } else if (!isSessionCourseValid) {
      isDisabled = true;
      placeholderText = "Please continue in another chat because the course has changed or been deleted.";
    } else if (!hasCurriculum && chatSubject) {
      isDisabled = true;
      placeholderText = "المنهج الدراسي غير متوفر حالياً. (The course is unavailable.)";
    }

    const toggleModelMenu = () => {
      setShowModelMenu(prev => !prev);
    };

    const handleModelSelect = (model: 'flash' | 'pro') => {
      // Beta: Pro model unlocked for all registered users (no payment tiers yet)
      if (model === 'pro' && !user) {
        alert('يرجى تسجيل الدخول لاستخدام نموذج المحترفين (Pro).');
      } else {
        setSelectedModel(model);
      }
      setShowModelMenu(false);
    };

    return (
      <form onSubmit={handleSendMessage} style={{ width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        {pendingAudio && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(125, 161, 70, 0.1)',
            border: '1px solid var(--primary-color)',
            borderRadius: '12px',
            padding: '8px 14px',
            marginBottom: '10px',
            direction: 'rtl'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: 600 }}>
              <span>تم تسجيل رسالة صوتية بنجاح</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setPendingAudio(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="input-textarea-container">
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
            placeholder={recording ? 'جاري تسجيل الصوت... اضغط على زر الإيقاف للإتمام' : placeholderText}
            disabled={isDisabled || recording}
            rows={1}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: '0.95rem',
              lineHeight: '1.55',
              minHeight: '26px',
              maxHeight: '200px',
              padding: '4px 6px',
              color: 'var(--text-main)',
              direction: 'rtl',
              textAlign: 'right',
              fontFamily: 'var(--font-arabic)',
            }}
          />
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '8px',
            borderTop: '1px solid var(--alpha-white-5)',
            paddingTop: '8px',
            direction: 'rtl'
          }}>
            {/* Left side: Model Selector dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={toggleModelMenu}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'var(--alpha-white-4)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '0.78rem',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                  fontFamily: 'var(--font-arabic)',
                }}
              >
                <span>{selectedModel === 'pro' ? 'Pro' : 'Fast'}</span>
                <span style={{ fontSize: '0.6rem' }}>▼</span>
              </button>
              {showModelMenu && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  right: 0,
                  marginBottom: '8px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  zIndex: 1000,
                  minWidth: '150px',
                }}>
                  <button
                    type="button"
                    onClick={() => handleModelSelect('flash')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: selectedModel === 'flash' ? 'var(--primary-light)' : 'transparent',
                      color: selectedModel === 'flash' ? 'var(--primary-color)' : 'var(--text-main)',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'right',
                      width: '100%',
                      fontFamily: 'var(--font-arabic)',
                    }}
                  >
                    سريع (Flash)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModelSelect('pro')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      background: selectedModel === 'pro' ? 'var(--primary-light)' : 'transparent',
                      color: selectedModel === 'pro' ? 'var(--primary-color)' : 'var(--text-main)',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'right',
                      width: '100%',
                      fontFamily: 'var(--font-arabic)',
                    }}
                  >
                    <span>محترف (Pro)</span>
                    {!user && <Lock size={11} style={{ opacity: 0.6 }} />}
                  </button>
                </div>
              )}
            </div>

            {/* Right side: Chips, Voice Rec, Thinking, Send */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Subject chip */}
              {messages.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--primary-light)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-color)', cursor: 'default' }}>
                  <BookOpen size={11} />
                  <span>المادة:</span>
                  <select
                    value={chatSubject}
                    onChange={(e) => setChatSubject(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', fontWeight: 700, outline: 'none', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--font-arabic)' }}
                  >
                    {activeSubjects.length > 0 ? (
                      activeSubjects.map(c => (
                        <option key={c.id} value={c.subject_name} style={{ background: 'var(--card-bg)', color: 'var(--text-main)' }}>{c.subject_name}</option>
                      ))
                    ) : (
                      <option value="" disabled style={{ background: 'var(--card-bg)', color: 'var(--text-muted)' }}>لا يوجد مواد مفعلة</option>
                    )}
                  </select>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--primary-light)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                  <BookOpen size={11} />
                  <span>{chatSubject}</span>
                </div>
              )}

              {/* Grade chip */}
              {!user && messages.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--alpha-white-4)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  <select
                    value={chatGrade}
                    onChange={(e) => setChatGrade(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontWeight: 600, outline: 'none', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--font-arabic)' }}
                  >
                    {Object.entries(GRADE_NAMES)
                      .filter(([key]) => (activeGradeLevels.length === 0 || activeGradeLevels.includes(key)) && curriculums.some(c => c.grade_level === key))
                      .map(([key, name]) => (
                        <option key={key} value={key} style={{ background: 'var(--card-bg)', color: 'var(--text-main)' }}>{name}</option>
                      ))
                    }
                  </select>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--alpha-white-4)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  <span>{user ? GRADE_NAMES[user.grade_level] : (GRADE_NAMES[chatGrade] || '')}</span>
                </div>
              )}



              {/* Thinking Button (CoT) — unlocked for all registered users during beta */}
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    alert('يرجى تسجيل الدخول لاستخدام ميزة التفكير.');
                  } else {
                    setThinkingEnabled(!thinkingEnabled);
                  }
                }}
                style={{
                  background: thinkingEnabled ? 'var(--primary-color)' : 'var(--alpha-white-4)',
                  border: '1px solid var(--border-color)',
                  color: thinkingEnabled ? 'var(--text-on-primary)' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'var(--transition-fast)',
                  opacity: !user ? 0.6 : 1,
                  fontFamily: 'var(--font-arabic)',
                }}
              >
                <span>تفكير</span>
                {!user && <Lock size={10} style={{ opacity: 0.6 }} />}
              </button>

              {/* Send button */}
              <button
                type="submit"
                disabled={isDisabled || (!hasMessage && !pendingAudio) || recording}
                className={`send-button ${(hasMessage || pendingAudio) && !isDisabled && !recording ? 'active' : ''}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </form>
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
        }
      });
  };

  // Load Initial Settings, DeviceID and Auth
  useEffect(() => {
    // Load theme
    const savedTheme = localStorage.getItem('egs_theme') || 'system';
    setTheme(savedTheme as any);
    applyTheme(savedTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      const currentSaved = localStorage.getItem('egs_theme') || 'system';
      if (currentSaved === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // Generate or read device guest ID
    let devId = localStorage.getItem('egs_device_id');
    if (!devId) {
      devId = 'device_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('egs_device_id', devId);
    }
    setDeviceId(devId);

    // Check url search params for redirected token from mobile
    let storedToken = localStorage.getItem('egs_token');
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('token');
      if (tokenParam) {
        storedToken = tokenParam;
        localStorage.setItem('egs_token', tokenParam);
        setToken(tokenParam);
        // Clean query parameter from URL
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
      } catch (e) {}
    } else if (storedToken) {
      setToken(storedToken);
    }

    // Load configurations
    loadSystemConfig(devId, storedToken);

    // Load notifications and dismissed-ids
    try {
      const storedDismissed = localStorage.getItem('egs_dismissed_notifications');
      if (storedDismissed) setDismissedNotifIds(JSON.parse(storedDismissed));
    } catch (e) {}
    fetch('/api/notifications?target=web')
      .then(res => res.json())
      .then(data => { if (data.success) setActiveNotifications(data.notifications); })
      .catch(() => {});

    // Responsive design detection
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false); // Collapsed by default on mobile
      } else {
        setSidebarOpen(true); // Open by default on desktop
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

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
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
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
        setCoins(data.user.coins === undefined ? 50.0 : data.user.coins);
        setShowAuthModal(false);
        resetAuthForm();

      } else {
        // Register step 1: Send registration details
        if (!otpStep) {
          if (!termsAccepted) {
            throw new Error('يجب الموافقة على سياسة الخصوصية وشروط الاستخدام لإتمام التسجيل.');
          }
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, grade_level: gradeLevel, password, terms_accepted: true })
          });
          const data = await res.json();
          
          if (!res.ok) {
            throw new Error(data.error || 'فشل عملية التسجيل');
          }

          setOtpStep(true);
        } else {
          // Register step 2: Verify OTP
          const hasRegisteredBefore = localStorage.getItem('egs_registered_before') === 'true';
          const res = await fetch('/api/auth/otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp: otpCode, has_registered_before: hasRegisteredBefore })
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
          setCoins(data.user.coins === undefined ? 50.0 : data.user.coins);
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

  const handleGoogleLogin = async (credential: string, selectedGrade?: string) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, grade_level: selectedGrade })
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
        setToken(data.token);
        setUser(data.user);
        setCoins(data.user.coins === undefined ? 50.0 : data.user.coins);
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
    localStorage.removeItem('egs_token');
    localStorage.removeItem('egs_user');
    setToken(null);
    setUser(null);
    setCoins(50.0);
    setActiveTab('chat');
    loadSystemConfig(deviceId, null);
  };
  const handleUpdateUserGrade = async (newGrade: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/auth/update-grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ grade_level: newGrade })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحديث السنة الدراسية.');

      // Update state and storage
      const updatedUser = { ...user, grade_level: newGrade };
      setUser(updatedUser);
      localStorage.setItem('egs_user', JSON.stringify(updatedUser));
      
      // Clear current active session & chat history to select lessons for new grade
      setActiveSessionId(null);
      setMessages([]);
      
      setProfileMessage({ text: 'تم تحديث السنة الدراسية بنجاح.', type: 'success' });
    } catch (err: any) {
      setProfileMessage({ text: err.message || 'فشل تحديث السنة الدراسية.', type: 'danger' });
    }
  };

  // Chat Operation
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const messageToSend = customText || inputMessage;
    if ((!messageToSend.trim() && !pendingAudio) || chatLoading) return;

    let userMsg = messageToSend;
    if (pendingAudio && !customText) {
      userMsg = `[AUDIO_MESSAGE:${pendingAudio.mimeType};${pendingAudio.base64}]${inputMessage}`;
    }

    // Client-side coins check
    if (coins <= 0) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        message: '⚠️ **انتهى الرصيد المتاح!**\n\nلقد استنفدت رصيد النقاط المتاح لك لهذا اليوم. سيتجدد رصيدك تلقائياً غداً.'
      }]);
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
        message: '⚠️ **يلزم تسجيل الدخول**\n\nنموذج المحترفين وميزة التفكير متاحة فقط للمستخدمين المسجلين.'
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
        message: '⚠️ **المنهج غير متوفر**\n\nالمنهج الدراسي غير متوفر حالياً لهذه المادة. (The course is unavailable.)'
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

    if (!customText) {
      setInputMessage('');
    }
    setPendingAudio(null);
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
          history: !user ? messages.map(m => ({ sender: m.sender, message: m.message })) : undefined
        })
      });

      if (!res.ok) {
        const data = await res.json();
        // Handle limits
        if (data.error === 'limit_reached') {
          setMessages(prev => [...prev, {
            sender: 'ai',
            message: `⚠️ **انتهى الحد اليومي للرسائل!**\n\n${data.message}`
          }]);
          if (!token) {
            setTimeout(() => {
              setAuthTab('register');
              setShowAuthModal(true);
            }, 3000);
          }
        } else {
          throw new Error(data.message || 'حدث خطأ أثناء إرسال الرسالة.');
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
                    fetch('/api/log', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        event: 'stream_content_received',
                        contentLength: currentContent.length,
                        chunk: dataObj.content
                      })
                    }).catch(() => {});
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
                  } else if (dataObj.type === 'done') {
                    isThinking = false;
                    clearInterval(timerInterval);
                    
                    if (dataObj.duration) {
                      currentDuration = dataObj.duration;
                    }

                    fetch('/api/log', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        event: 'stream_done_received',
                        duration: currentDuration,
                        session_id: dataObj.session_id,
                        finalContentLength: currentContent.length
                      })
                    }).catch(() => {});

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
        message: `❌ حدث خطأ في الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى. (التفاصيل: ${err.message})`
      }]);
    } finally {
      setChatLoading(false);
    }
  };


  // Admin Operations
  const handleUploadCurriculum = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMessage({ text: '', type: '' });

    if (!uploadSubject || !uploadFile) {
      setAdminMessage({ text: 'يرجى ملء جميع الحقول واختيار ملف المنهج.', type: 'danger' });
      return;
    }

    setAdminLoading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('grade_level', uploadGrade);
    formData.append('subject_name', uploadSubject);

    try {
      const res = await fetch('/api/admin/curriculum', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAdminMessage({ text: data.message, type: 'success' });
      setUploadSubject('');
      setUploadFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('curriculum_file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      loadCurriculums();
    } catch (err: any) {
      setAdminMessage({ text: err.message || 'فشل رفع الملف', type: 'danger' });
    } finally {
      setAdminLoading(false);
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
      setProfileMessage({ text: 'تم إرسال رمز التحقق التجريبي. يرجى استخدام "111111" للتأكيد.', type: 'success' });
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

  console.log("RENDERING APP messages:", messages);

  // Guest mode now opens the main interface normally

  return (
    <div 
      suppressHydrationWarning={true} 
      className="flex h-screen w-screen overflow-hidden bg-gradient-light" 
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
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '14px', background: 'var(--primary-light)', border: '1px solid rgba(125,161,70,0.2)', marginBottom: '10px', overflow: 'hidden' }}>
              <img src="/logo.png" alt="EGS AI Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span className="text-gradient">EGS AI</span>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--primary-color)', background: 'var(--primary-light)', border: '1px solid rgba(125,161,70,0.25)', borderRadius: 'var(--radius-full)', padding: '2px 7px', letterSpacing: '0.02em' }}>BETA</span>
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '3px' }}>
              مساعدك الذكي في المنهج الدراسي
            </p>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0 -4px' }} />

          {/* Navigation */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {[
              { icon: <Plus size={17} />, label: 'دردشة جديدة', action: () => { setActiveSessionId(null); setMessages([]); setActiveTab('chat'); if (isMobile) setSidebarOpen(false); }, isActive: activeTab === 'chat' && !activeSessionId },
              { icon: <Search size={17} />, label: 'البحث في الدردشات', action: () => { setActiveTab('chat'); setShowSearch(prev => !prev); if (isMobile) setSidebarOpen(false); }, isActive: showSearch },
              { icon: <Sparkles size={17} />, label: 'النسخة التجريبية (Beta)', action: () => { setActiveTab('beta'); if (isMobile) setSidebarOpen(false); }, isActive: activeTab === 'beta' },
              { icon: <FileText size={17} />, label: 'الامتحانات والاختبارات', action: () => { setActiveTab('exams'); if (isMobile) setSidebarOpen(false); }, isActive: activeTab === 'exams' },
              ...(user ? [{ icon: <User size={17} />, label: 'الملف الشخصي', action: () => { setActiveTab('profile'); if (isMobile) setSidebarOpen(false); }, isActive: activeTab === 'profile' }] : []),
              ...(user?.role === 'admin' ? [{ icon: <Settings size={17} />, label: 'لوحة التحكم', action: () => { setActiveTab('admin'); if (isMobile) setSidebarOpen(false); }, isActive: activeTab === 'admin' }] : []),
              { icon: <Globe size={17} />, label: 'التطبيقات المتاحة', action: () => alert('تطبيق الهاتف المحمول متوفر للتحميل!'), isActive: false }
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
          </nav>

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
                  boxShadow: '0 4px 10px rgba(125,161,70,0.3)'
                }}>
                  {user.name ? user.name[0].toUpperCase() : <User size={16} />}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-main)' }}>{user.name}</h4>
                  <div style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span className={`plan-badge plan-badge-${user.plan_type}`}>
                      {user.plan_type === 'pro' ? 'Pro' : user.plan_type === 'max' ? 'Max' : 'مجاني'}
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
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--sidebar-bg)',
              borderBottom: '1px solid var(--border-color)',
              height: '64px',
              zIndex: 5,
              color: 'var(--text-main)'
            }}>
              {/* Right Side: Upgrade & User Profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--alpha-white-4)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                  <span>{coins.toFixed(2)} نقطة</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowNotifCenter(prev => !prev)}
                    style={{
                      background: 'var(--alpha-white-4)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '50%',
                      width: '34px',
                      height: '34px',
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
                    <div style={{ position: 'absolute', top: '42px', right: 0, width: '320px', maxHeight: '400px', overflowY: 'auto', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 50, padding: '10px' }} className="custom-scrollbar">
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', padding: '6px 8px 10px', borderBottom: '1px solid var(--border-color)', marginBottom: '6px' }}>الإشعارات</div>
                      {activeNotifications.filter(n => !dismissedNotifIds.includes(n.id)).length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '20px 0' }}>لا توجد إشعارات جديدة</p>
                      ) : (
                        activeNotifications.filter(n => !dismissedNotifIds.includes(n.id)).map(n => (
                          <div key={n.id} style={{ padding: '10px 8px', borderRadius: 'var(--radius-sm)', marginBottom: '4px', background: 'var(--alpha-white-2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)' }}>{n.title}</span>
                              <button onClick={() => handleDismissNotification(n.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                                <X size={13} />
                              </button>
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{n.body}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab('beta')}
                  className="pulse-primary"
                  style={{
                    background: 'var(--primary-light)',
                    color: 'var(--primary-color)',
                    border: '1px solid rgba(125, 161, 70, 0.25)',
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
                  <Sparkles size={13} />
                  <span>Beta</span>
                </button>
                {user ? (
                  <div
                    onClick={() => setActiveTab('profile')}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--primary-color)',
                      color: 'var(--text-on-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)'
                    }}
                    title={user.name}
                  >
                    {user.name ? user.name[0].toUpperCase() : <User size={16} />}
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
                      padding: '6px 14px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    تسجيل الدخول
                  </button>
                )}
              </div>

              {/* Left Side: Sidebar Toggle & Model Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
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
                  onClick={() => setActiveTab('beta')}
                  title="EGS AI ما زالت في مرحلة تجريبية"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    transition: 'var(--transition)',
                    background: 'var(--primary-light)',
                    border: '1px solid rgba(125, 161, 70, 0.2)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-glow)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary-light)'}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>EGS AI</span>
                  <span style={{ fontWeight: 800, fontSize: '0.68rem', color: 'var(--primary-color)', letterSpacing: '0.02em' }}>BETA</span>
                </div>
              </div>
            </header>

            {/* Chat Area Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column' }} className="custom-scrollbar">
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
                      Log in to continue
                    </h3>
                    <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0 0 10px 0' }}>
                      يرجى تسجيل الدخول لمتابعة استخدام المنصة التعليمية وطرح الأسئلة.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('login');
                        setShowAuthModal(true);
                      }}
                      className="btn-primary"
                      style={{
                        padding: '12px 32px',
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
                      <span>تسجيل الدخول للمتابعة / Log in to continue</span>
                    </button>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                  <div className="animate-scale-in" style={{
                    width: '100%',
                    maxWidth: '720px',
                    margin: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '28px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      {/* Animated AI Icon */}
                      <div style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}>
                        <div style={{
                          position: 'absolute',
                          inset: '-10px',
                          borderRadius: '50%',
                          border: '1.5px solid rgba(125, 161, 70, 0.2)',
                          animation: 'pulse-ring 2.5s ease-out infinite',
                        }} />
                        <div style={{
                          background: 'var(--primary-light)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '72px',
                          height: '72px',
                          borderRadius: '22px',
                          fontSize: '2.4rem',
                          border: '1px solid rgba(125, 161, 70, 0.2)',
                          boxShadow: 'var(--shadow-glow)',
                          overflow: 'hidden',
                        }}>
                          <img src="/logo.png" alt="EGS AI Logo" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                        </div>
                      </div>
                      <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                        ما الذي تريد مذاكرته اليوم؟
                      </h2>
                      <p style={{ color: 'var(--text-muted)', marginTop: '10px', fontSize: '0.97rem', lineHeight: 1.6, maxWidth: '520px', margin: '10px auto 0' }}>
                        {user 
                          ? <>ابحث وافهم أي جزء من منهج <strong style={{ color: 'var(--primary-color)' }}>{chatSubject}</strong> للصف {GRADE_NAMES[user.grade_level]} مباشرة. (رصيدك الحالي: {coins.toFixed(2)} نقطة)</>
                          : <>ابحث وافهم أي جزء من المناهج المتاحة كزائر (رصيدك التجريبي الحالي: {coins.toFixed(2)} نقاط).</>
                        }
                      </p>
                      {!user && (
                        <button
                          onClick={() => {
                            setAuthTab('login');
                            setShowAuthModal(true);
                          }}
                          style={{
                            marginTop: '16px',
                            padding: '8px 24px',
                            borderRadius: '20px',
                            background: 'var(--primary-color)',
                            color: 'var(--text-on-primary)',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: 'var(--shadow-sm)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'var(--transition)'
                          }}
                        >
                          <LogIn size={15} />
                          <span>تسجيل الدخول الآن</span>
                        </button>
                      )}
                    </div>

                    {/* Suggestion Chips */}
                    {renderSuggestionChips()}

                    {/* Centered input form */}
                    <div style={{ width: '100%' }}>
                      {renderInputForm(true)}
                    </div>
                    <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '10px', lineHeight: '1.6' }}>
                      EGS AI ذكاء اصطناعي وقد يرتكب أخطاءً — تحقق دائماً من المناهج والكتب المدرسية الرسمية.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
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
                          maxWidth: msg.sender === 'user' ? '80%' : '90%', 
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

                        {/* Message body */}
                        {(msg.message || msg.sender === 'user') && (
                          msg.sender === 'user' ? (
                            msg.message.startsWith('[AUDIO_MESSAGE:') ? (
                              (() => {
                                const match = msg.message.match(/^\[AUDIO_MESSAGE:([^;]+);([^\]]+)\]([\s\S]*)$/);
                                if (match) {
                                  const mimeType = match[1];
                                  const base64Data = match[2];
                                  const transcription = match[3];
                                  return (
                                    <AudioPlayerMessage
                                      mimeType={mimeType}
                                      base64Data={base64Data}
                                      transcription={transcription}
                                    />
                                  );
                                }
                                return (
                                  <div className="message-bubble-user">
                                    <div style={{ whiteSpace: 'pre-wrap', direction: 'rtl' }}>{msg.message}</div>
                                  </div>
                                );
                              })()
                            ) : (
                              <div className="message-bubble-user">
                                <div style={{ whiteSpace: 'pre-wrap', direction: 'rtl' }}>{msg.message}</div>
                              </div>
                            )
                          ) : (
                            <div className="message-bubble-ai markdown-body">
                              {msg.message ? (
                                <FormattedChatMessage 
                                  content={msg.message} 
                                  sender={msg.sender} 
                                  onGoToExams={(exam) => {
                                    setSelectedExam(exam);
                                    setActiveTab('exams');
                                  }}
                                  onAnswerSubmit={(text) => {}}
                                />
                              ) : (
                                <div className="typing-dots">
                                  <div className="typing-dot" />
                                  <div className="typing-dot" />
                                  <div className="typing-dot" />
                                </div>
                              )}
                            </div>
                          )
                        )}
                        
                        {/* Actions below bubble */}
                        {msg.sender === 'ai' && msg.message && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(msg.message)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.7rem',
                                opacity: 0.7,
                                transition: 'var(--transition)'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                            >
                              <Copy size={10} />
                              <span>نسخ الإجابة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const prevUserMsg = [...messages.slice(0, index)].reverse().find(m => m.sender === 'user');
                                setReportTarget({ content: msg.message, userQuery: prevUserMsg?.message || '' });
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.7rem',
                                opacity: 0.7,
                                transition: 'var(--transition)'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--danger-color)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                            >
                              <AlertCircle size={10} />
                              <span>الإبلاغ عن الرد</span>
                            </button>
                            <span
                              title="الإجابات مُولَّدة تلقائياً بواسطة ذكاء اصطناعي وقد تحتوي أخطاء"
                              style={{ fontSize: '0.68rem', color: 'var(--text-muted)', opacity: 0.6, cursor: 'default' }}
                            >
                              ⚠️ قد يخطئ الذكاء الاصطناعي
                            </span>
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
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>EGS AI يفكر ويبحث في المنهج...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Bar */}
            {messages.length > 0 && (
              <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-color)', background: 'var(--sidebar-bg)' }}>
                {renderInputForm(false)}
                <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.6' }}>
                  EGS AI ذكاء اصطناعي وقد يرتكب أخطاءً — تحقق دائماً من المناهج والكتب المدرسية الرسمية. الإجابات مُولَّدة تلقائياً ولسنا مسؤولين عنها بشكل كامل.
                </p>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: Beta Notice */}
        {activeTab === 'beta' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '24px 16px' : '40px 24px', background: 'var(--bg-color)' }}>
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
            <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-scale-in">

              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--primary-light)', color: 'var(--primary-color)', padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', fontWeight: 800, marginBottom: '16px' }}>
                  <Sparkles size={15} />
                  <span>نسخة تجريبية (Beta)</span>
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-color)' }}>EGS AI ما زالت في مرحلة تجريبية</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '10px', fontSize: '0.95rem', lineHeight: '1.7' }}>
                  نعمل حالياً على تطوير النسخة النهائية من المنصة. خلال فترة البيتا، جميع الميزات المتاحة — بما في ذلك نموذج Pro وميزة التفكير — مفتوحة مجاناً لكل الطلاب المسجلين.
                </p>
              </div>

              <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                <h4 style={{ fontWeight: 800, color: 'var(--primary-color)', marginBottom: '10px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={16} />
                  <span>الدفع والاشتراكات</span>
                </h4>
                <p style={{ lineHeight: '1.7', fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
                  خاصية الدفع والاشتراكات المدفوعة غير متاحة حالياً وسيتم تفعيلها قريباً مع إطلاق النسخة النهائية من المنصة، قبل شهر أغسطس 2026. سيتم إعلامك بكل التفاصيل فور توفرها.
                </p>
              </div>

              {/* Points system info card */}
              <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-lg)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', direction: 'rtl' }}>
                <h4 style={{ fontWeight: 800, color: 'var(--primary-color)', marginBottom: '8px', fontSize: '0.95rem' }}>💡 نظام النقاط والاحتساب الفعلي للاستهلاك:</h4>
                <p style={{ lineHeight: '1.6', fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                  رصيدك من النقاط يُخصم تلقائياً بحسب الاستهلاك الفعلي لكل رسالة (بناءً على طول السؤال والإجابة)، ويتجدد رصيدك يومياً.
                  <br />
                  الرصيد الحالي: <strong>{coins.toFixed(2)} نقطة</strong>
                </p>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 3: Admin Dashboard */}
        {activeTab === 'admin' && user?.role === 'admin' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '24px 16px' : '40px 24px', background: 'var(--bg-color)' }}>
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
                  تفعيل الصفوف الدراسية المتاحة للطلاب
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  حدد الصفوف الدراسية التي ترغب في السماح للطلاب الجدد باختيارها عند التسجيل، والطلاب الحاليين بمناقشتها.
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

              {/* Two Column Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                
                {/* Upload Curriculum */}
                <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text-main)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Upload size={18} />
                    <span>رفع ملف منهج جديد (.md)</span>
                  </h3>

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

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>اسم المادة الدراسية:</label>
                      <input
                        type="text"
                        value={uploadSubject}
                        onChange={(e) => setUploadSubject(e.target.value)}
                        placeholder="مثال: الفيزياء، التاريخ، الجغرافيا"
                        style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--sidebar-bg)', color: 'var(--text-main)' }}
                      />
                    </div>

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
                          <span>جاري تحليل وتجزئة الملف...</span>
                        </>
                      ) : (
                        <span>رفع وتجهيز بيانات المنهج</span>
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
                          <th style={{ padding: '12px 8px' }}>السنة الدراسية</th>
                          <th style={{ padding: '12px 8px' }}>الملف المرفوع</th>
                          <th style={{ padding: '12px 8px' }}>تاريخ الرفع</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center' }}>النشاط والنشر</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center' }}>العمليات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {curriculums.map((curr) => {
                          const isCurrActive = activeCurriculumIds.includes(curr.id);
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
                              <td style={{ padding: '12px 8px' }}>{GRADE_NAMES[curr.grade_level]}</td>
                              <td style={{ padding: '12px 8px', direction: 'ltr', textAlign: 'right' }}>{curr.file_name}</td>
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
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
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
                            <th style={{ padding: '10px 8px', textAlign: 'center' }}>رصيد غير محدود</th>
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
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '24px 16px' : '40px 24px', background: 'var(--bg-color)' }}>
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
                      onChange={(e) => handleUpdateUserGrade(e.target.value)}
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
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>أدخل الرمز التجريبي "111111" لتأكيد التغيير</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>رمز التحقق المرسل:</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={profileOtp}
                        onChange={(e) => setProfileOtp(e.target.value)}
                        placeholder="111111"
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

              {/* Beta status card */}
              <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '14px', color: 'var(--text-main)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} />
                  <span>حالة الحساب</span>
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-light)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 700 }}>كل الميزات مفتوحة خلال البيتا</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                      نموذج Pro وميزة التفكير متاحان مجاناً لكل الطلاب المسجلين حتى إطلاق النسخة النهائية.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('beta')}
                  className="btn-secondary"
                  style={{ alignSelf: 'flex-start' }}
                >
                  تفاصيل النسخة التجريبية
                </button>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 5: Exams & Testing */}
        {activeTab === 'exams' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '24px 16px' : '40px 24px', background: 'var(--bg-color)', direction: 'rtl', display: 'flex', flexDirection: 'column' }}>
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
                    Log in to continue
                  </h3>
                  <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0 0 10px 0', textAlign: 'center' }}>
                    الرجاء تسجيل الدخول لعرض أو إنشاء أو تقديم الامتحانات التقييمية.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('login');
                      setShowAuthModal(true);
                    }}
                    className="btn-primary"
                    style={{
                      padding: '12px 32px',
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
                    <span>تسجيل الدخول / Log in to continue</span>
                  </button>
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
                      setExamTopic('');
                      setShowExamCreateModal(true);
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
                      boxShadow: '0 4px 12px rgba(125,161,70,0.25)',
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
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0' }}>نتيجة التقييم: {selectedExam.title}</h3>
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          المادة: {selectedExam.subject_name} · الصف الدراسي: {GRADE_NAMES[selectedExam.grade_level]}
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

                      {/* Evaluation Text Block */}
                      <div style={{ width: '100%', textAlign: 'right', background: 'var(--sidebar-bg)', padding: '20px', borderRadius: '12px', borderRight: '4px solid var(--primary-color)', marginTop: '10px' }}>
                        <h4 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '8px' }}>تحليل الإجابات وتقييم EGS AI:</h4>
                        <div style={{ fontSize: '0.92rem', lineHeight: '1.6', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                          <MarkdownMessage content={examResult.evaluation} />
                        </div>
                      </div>

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
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0' }}>{selectedExam.title}</h3>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                            المادة: {selectedExam.subject_name} · الصف الدراسي: {GRADE_NAMES[selectedExam.grade_level]}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (Object.keys(activeExamAnswers).length > 0 && !confirm('هل أنت متأكد من مغادرة الامتحان؟ لن يتم حفظ تقدمك.')) return;
                            setSelectedExam(null);
                            setActiveExamAnswers({});
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

                      {/* Questions List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {selectedExam.questions.map((q: any, qIdx: number) => (
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

                      {/* Actions */}
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '18px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={handleSubmitExam}
                          disabled={gradingLoading || Object.keys(activeExamAnswers).length < selectedExam.questions.length}
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
                              <span>📤</span>
                              <span>تسليم الامتحان للتصحيح</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Main listing view */
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
                  
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
                        <button onClick={() => { setExamTopic(''); setShowExamCreateModal(true); }} style={{ display: 'block', margin: '12px auto 0', background: 'transparent', border: 'none', color: 'var(--primary-color)', fontWeight: 700, cursor: 'pointer' }}>
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
                            }}
                            className="btn-primary"
                            style={{
                              padding: '8px 16px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            بدء التحدي 📝
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
                                  عرض التقييم 🔍
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

      </main>

      {showExamCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' }}>
          <div className="glass-strong animate-scale-in" style={{ background: 'var(--card-bg)', width: '90%', maxWidth: '520px', borderRadius: 'var(--radius-lg)', padding: '30px', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontFamily: 'var(--font-arabic)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-color)' }}>إنشاء امتحان مخصص بالذكاء الاصطناعي</h3>
              <button onClick={() => setShowExamCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="form-label">الموضوع الدراسي للاختبار:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: قوانين نيوتن، الحملة الفرنسية، التكاثر في النبات..."
                  value={examTopic}
                  onChange={(e) => setExamTopic(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="form-label">طريقة تحديد الأسئلة:</label>
                <select
                  value={examMode}
                  onChange={(e) => setExamMode(e.target.value as any)}
                  className="form-input"
                  style={{ cursor: 'pointer', width: '100%' }}
                >
                  <option value="auto">توليد تلقائي بالكامل (دع الذكاء الاصطناعي يقرر)</option>
                  <option value="total_only">تحديد إجمالي عدد الأسئلة فقط</option>
                  <option value="custom_types">تحديد عدد كل نوع من الأسئلة بالتفصيل</option>
                </select>
              </div>

              {examMode === 'total_only' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="form-label">إجمالي عدد الأسئلة:</label>
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

              <button
                disabled={generatingExam || !examTopic.trim()}
                onClick={() => handleGenerateExam({
                  topic: examTopic,
                  mode: examMode,
                  total_count: examTotalCount,
                  mcq_count: examMcqCount,
                  tf_count: examTfCount,
                  essay_count: examEssayCount
                })}
                className="btn-primary"
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '10px',
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
          </div>
        </div>
      )}

      {/* MODAL 2: Gemini Key Setup Overlay */}
      {showGeminiModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-strong animate-scale-in" style={{ background: 'var(--card-bg)', width: '90%', maxWidth: '420px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)' }}>
            
            <div style={{ padding: '22px 24px 0', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '46px', height: '46px', borderRadius: '14px', background: 'var(--primary-light)', border: '1px solid rgba(125,161,70,0.2)', overflow: 'hidden' }}>
                <img src="/logo.png" alt="EGS AI Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-arabic)' }}>إعداد مفتاح Gemini API</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '16px', fontFamily: 'var(--font-arabic)' }}>مطلب لتفريغ التسجيلات الصوتية بدقة شديدة.</p>
            </div>

            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px', color: 'var(--text-main)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font-arabic)' }}>مفتاح API Key الخاص بك:</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--input-bg)',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4', fontFamily: 'var(--font-arabic)' }}>
                * يتم حفظ هذا المفتاح محلياً في متصفحك فقط ولا يتم إرساله إلى خوادمنا. يمكنك الحصول على مفتاح مجاني من Google AI Studio.
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleSaveGeminiKey(geminiKeyInput)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'var(--primary-color)',
                    color: 'var(--text-on-primary)',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-arabic)',
                  }}
                >
                  حفظ واستمرار
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGeminiModal(false);
                    tempAudioBlobRef.current = null;
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'var(--alpha-white-4)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-arabic)',
                  }}
                >
                  إلغاء
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 1: Authentication Overlay */}
      {showAuthModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(12px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-strong animate-scale-in" style={{ background: 'var(--card-bg)', width: '90%', maxWidth: '420px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)' }}>
            
            {/* Modal Brand Header */}
            <div style={{ padding: '22px 24px 0', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '46px', height: '46px', borderRadius: '14px', background: 'var(--primary-light)', border: '1px solid rgba(125,161,70,0.2)', overflow: 'hidden' }}>
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
                  <div style={{ background: 'var(--primary-light)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '14px', margin: '0 auto', border: '1px solid rgba(125,161,70,0.2)' }}>
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
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(12px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-strong animate-scale-in" style={{ background: 'var(--card-bg)', width: '90%', maxWidth: '420px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)', padding: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '46px', height: '46px', borderRadius: '14px', background: 'var(--primary-light)', border: '1px solid rgba(125,161,70,0.2)', marginBottom: '10px' }}>
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
                  onClick={() => handleGoogleLogin(googleTempUser.credential, gradeLevel)}
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
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass animate-scale-in" style={{ background: 'var(--card-bg)', width: '95%', maxWidth: '780px', height: '90vh', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
            
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

      {/* MODAL 4: Report AI Response */}
      {reportTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass animate-scale-in" style={{ background: 'var(--card-bg)', width: '90%', maxWidth: '440px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)' }}>
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

    </div>
  );
}
