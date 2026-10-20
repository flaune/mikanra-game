import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import '../dialogue.css';
import SpeakButton from './SpeakButton';

interface Props {
  speaker: string;
  text: string;
  children?: ReactNode;
  onContinue?: () => void;
  onClose?: () => void;
  continueLabel?: string;
  spokenText?: string;
}

/** One conversation, one box. The first press reveals; the next advances. */
export default function DialogueBox({ speaker, text, children, onContinue, onClose, continueLabel = 'Continue', spokenText }: Props) {
  const [revealed, setRevealed] = useState(0);
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    box.current?.focus({ preventScroll: true });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setRevealed(text.length); return; }
    setRevealed(0);
    const started = performance.now();
    const timer = setInterval(() => {
      const count = Math.min(text.length, Math.floor((performance.now() - started) / 24) * 3);
      // Timer callbacks can be delayed by rendering; completed/skipped text never retreats.
      setRevealed(value => Math.max(value, count));
      if (count >= text.length) clearInterval(timer);
    }, 24);
    return () => clearInterval(timer);
  }, [text]);
  const complete = revealed >= text.length;
  const advance = () => { if (!complete) setRevealed(text.length); else onContinue?.(); };
  return <section ref={box} tabIndex={-1} className={`jrpg-dialogue${spokenText ? ' has-speech' : ''}`} aria-label={`${speaker} dialogue`} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); onClose?.(); }
    if (event.target !== event.currentTarget) return;
    if (['Enter', ' ', 'e', 'E'].includes(event.key)) { event.preventDefault(); if (!event.repeat) advance(); }
  }}>
    <header className="jrpg-speaker">{speaker}</header>
    {spokenText && <SpeakButton text={spokenText} autoPlay />}
    <div className="jrpg-text" onClick={advance}>
      <p aria-hidden="true">{text.slice(0, revealed)}<span className="jrpg-cursor">{complete ? ' ▾' : ''}</span></p>
      <p className="sr-only">{text}</p>
    </div>
    {complete && children && <div className="jrpg-actions">{children}</div>}
    <footer className="jrpg-footer">
      {!complete ? <button onClick={advance}>Show text</button> : onContinue ? <button onClick={advance}>{continueLabel} <span aria-hidden="true">▾</span></button> : <span>Choose a reply</span>}
      {onClose && <button onClick={onClose}>Back <small>Esc</small></button>}
    </footer>
  </section>;
}
