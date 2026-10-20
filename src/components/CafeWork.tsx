import type { Shift, ShiftAction } from '@/game/chapterOne';
import { serviceGuide } from '@/game/chapterOne';
import type { Progress } from '@/game/learning';
import { preparationWords, words, wordHelp } from '@/game/learning';
import { closingStep, nextServiceStep, workStatus } from '@/game/cafeService';
import SpeakButton from './SpeakButton';
import RiveFeedback from './RiveFeedback';
import { pronounce } from '@/game/pronunciation';
import { useEffect, useState } from 'react';
import '../cafe-work.css';

export default function CafeWork({ shift, progress, onAction }: { shift: Shift; progress: Progress; onAction: (action: ShiftAction) => void }) {
  const [helped, setHelped] = useState<string[]>([]);
  const s = shift.service;
  const guide = serviceGuide(shift);
  const task = !s ? null : shift.stage === 'report' ? closingStep(s) : guide.target === 'shift-customer' ? { label: 'Bring your tray to the customer', word: 'serve' } : guide.target === 'shift-return' ? { label: 'Return the incorrect cups', word: 'cup' } : nextServiceStep(s, shift.ticket?.drink ?? 'coffee', shift.day);
  const work = s ? workStatus(s) : null;
  const word = words.find(w => w.id === task?.word && preparationWords(shift.day ?? 1).includes(w.id));
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!word || event.repeat || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === 'KeyH') setHelped(before => before.includes(word.id) ? before : [...before,word.id]);
      if (event.code === 'KeyL') void pronounce(word.japanese).finished.catch(() => {});
    };
    window.addEventListener('keydown',key);
    return () => window.removeEventListener('keydown',key);
  }, [word]);
  if (!s || (!['brew','serve','report'].includes(shift.stage) && !s.manual)) return null;
  const support = word && wordHelp(progress, word.id, helped.includes(word.id));
  const clean = s.vessels.filter(c => c.state === 'clean').length, dirty = s.vessels.filter(c => c.state === 'dirty').length;
  return <aside className="cafe-work" aria-label="Café workbench">
    <div className="cafe-work-heading"><span>{shift.stage === 'report' ? 'CLOSING TIME' : `DAY ${shift.day ?? 1} · AT THE COUNTER`}</span><small>{clean} clean · {dirty} to wash</small></div>
    <strong>{task?.label ?? 'The café is ready for tomorrow'}</strong>
    {word && <div className="work-word"><ruby lang="ja">{word.japanese}{word.reading !== word.japanese && <rt>{word.reading}</rt>}</ruby><SpeakButton text={word.japanese} />{support?.romaji && <small>{word.romaji}</small>}{support?.english ? <span>{word.english}</span> : <button onClick={() => setHelped([...helped,word.id])}>Meaning</button>}</div>}
    {word && <small>H · Meaning &nbsp; L · Listen</small>}
    {work && <div className="cafe-work-progress"><RiveFeedback fraction={work.fraction} /><span>{work.label} · {Math.round(work.fraction*100)}%</span><progress aria-label={work.label} max={1} value={work.fraction} /><small>{work.station === 'coffee' ? 'Extraction runs automatically. Hold E at the machine and release in green for a perfect cup.' : work.pouring ? work.fraction >= .65 && work.fraction <= .9 ? 'Release E · perfect pour' : 'Hold E to pour. Your progress stays if you stop.' : s.manual ? 'Hold E to continue.' : 'You can tidy or check supplies while this finishes.'}</small></div>}
    {!work && s.vessels.some(c => c.state === 'filled') && <RiveFeedback fraction={1} />}
    {shift.ticket?.drink === 'tea' && s.tea === 'empty' && <div className="tea-portions" role="group" aria-label="Teapot batch size">{([1,2] as const).map(count => <button key={count} aria-pressed={s.portions === count} onClick={() => onAction({type:'service',action:{type:'portions',count}})}>{count} {count === 1 ? 'cup' : 'cups'}</button>)}</div>}
    {(shift.day ?? 1) >= 3 && <details><summary>Supplies & recipe</summary><p>Beans {s.stock.coffee}/4 · Tea {s.stock.tea}/4<br />Refill freely at the pantry.</p><p>Tea: kettle → leaves → hot water → steep → cup → tray.<br />Coffee: grinder → tamp → attach → cup → extract → tray.<br />Water: glass → pitcher → tray.</p></details>}
    {(shift.day ?? 1) === 1 && <small>Haru handles returned cups today. Take your time.</small>}
  </aside>;
}
