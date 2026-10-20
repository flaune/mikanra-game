import { useId, useRef, useState } from 'react';
import type { Progress } from '@/game/learning';
import { words, wordHelp } from '@/game/learning';
import { SpeakButton } from './LearningPanel';
import { pronounce } from '@/game/pronunciation';

interface Props { drink: string; count: number; helped: boolean; revealedIds?: string[]; progress: Progress; onReveal: (id: string) => void; onGuess: (id: string, meaning: string) => void }
/** Personal interpretations stay tentative: serving the order supplies evidence. */
export default function DecodedOrder({ drink, count, helped, progress, onGuess, onReveal, revealedIds = [] }: Props) {
  const ids = [drink, 'object', count === 2 ? 'two' : 'one', 'request'];
  const [selected, setSelected] = useState<string | null>(null);
  const [meaning, setMeaning] = useState('');
  const inputId = useId();
  const meaningId = useId();
  const opener = useRef<HTMLButtonElement | null>(null);
  const composing = useRef(false);
  const close = () => { setSelected(null); opener.current?.focus(); };
  const word = words.find(item => item.id === selected);
  const help = word ? wordHelp(progress, word.id, helped || revealedIds.includes(word.id)) : null;
  return <div className="decoded-order">
    <p lang="ja" className="word-sentence">{ids.map(id => {
      const item = words.find(entry => entry.id === id)!;
      return <button key={id} className={progress.guesses?.[id] ? 'word-interpreted' : ''} aria-label={`Inspect ${item.japanese}`} aria-expanded={selected === id} onClick={event => { opener.current = event.currentTarget; setSelected(id); setMeaning(progress.guesses?.[id] ?? ''); void pronounce(id === 'water' ? 'お水' : item.japanese).finished.catch(() => {}); }}>
        <ruby>{id === 'water' ? 'お水' : item.japanese}{item.reading !== item.japanese && <rt>{id === 'water' ? 'おみず' : item.reading}</rt>}</ruby>{wordHelp(progress,id,helped || revealedIds.includes(id)).romaji && <small lang="en">{id === 'water' ? 'omizu' : item.romaji}</small>}<small lang="en">{wordHelp(progress,id,helped || revealedIds.includes(id)).english ? item.english : progress.guesses?.[id] || '···'}</small>
      </button>;
    })}<span className="sentence-stop">。</span></p>
    {word && <form className="deduction-entry" onSubmit={event => { event.preventDefault(); if (composing.current || !meaning.trim()) return; onGuess(word.id, meaning.trim()); close(); }} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); if (!composing.current && !event.nativeEvent.isComposing) close(); } }}>
      <div className="deduction-entry-head"><ruby lang="ja">{word.japanese}{word.reading !== word.japanese && <rt>{word.reading}</rt>}</ruby><SpeakButton text={word.japanese} /><button type="button" onClick={close} aria-label="Close word interpretation">×</button></div>
      <button type="button" className="word-help" aria-expanded={help!.english} aria-controls={meaningId} onClick={() => { if (!help!.english) onReveal(word.id); }}>{help!.english ? 'Meaning shown' : 'Show meaning'}</button>
      <p id={meaningId} hidden={!help!.english} lang="en">{help!.english ? word.english : ''}</p>
      {help!.romaji && <p className="deduction-reading" lang="en">{word.romaji}</p>}
      <label htmlFor={inputId}>Your interpretation (optional)</label>
      <input id={inputId} autoFocus maxLength={100} value={meaning} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onChange={event => setMeaning(event.target.value)} placeholder="What could this mean?" autoComplete="off" />
      <button className="mikan-primary" disabled={!meaning.trim()}>Keep this meaning</button>
      <small>You can listen or reveal the meaning without writing. Your notes stay tentative until you try them in the café.</small>
    </form>}
  </div>;
}
