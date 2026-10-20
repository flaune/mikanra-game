import { useEffect, useRef, useState } from 'react';
import type { Shift } from '@/game/chapterOne';
import { getCustomer } from '@/game/chapterOne';
import type { Progress } from '@/game/learning';
import { preparationWords, words, wordHelp } from '@/game/learning';
import { guidedStep, workStatus } from '@/game/cafeService';
import type { WorkMode } from '@/game/cafeService';
import type { Workbench } from '@/game/cafeLayout';
import SpeakButton from './SpeakButton';
import RiveFeedback from './RiveFeedback';
import { pronounce } from '@/game/pronunciation';
import '../cafe-work.css';

interface Props { shift: Shift; progress: Progress; area: Workbench | null; mode: WorkMode; onInput: (held: boolean, key?: string) => void; onMode: (mode: WorkMode) => void; onExit: () => void }
export default function CafeWork({shift,progress,area,mode,onInput,onMode,onExit}: Props) {
  const [helped,setHelped]=useState<string[]>([]);
  const primary=useRef<HTMLButtonElement>(null);
  const s=shift.service, customer=getCustomer(shift);
  const task=s?guidedStep(s,shift.ticket?.drink??customer.drink,shift.ticket?.count??customer.count as 1|2,shift.day,mode):null;
  const word=words.find(w=>w.id===task?.word&&preparationWords(shift.day??1).includes(w.id));
  const support=word&&wordHelp(progress,word.id,helped.includes(word.id));
  const work=s?workStatus(s):null;
  useEffect(()=>{if(area)primary.current?.focus({preventScroll:true});},[area]);
  useEffect(()=>{
    if(!area||!word)return;
    const key=(event:KeyboardEvent)=>{if(event.repeat)return;if(event.code==='KeyH')setHelped(before=>before.includes(word.id)?before:[...before,word.id]);if(event.code==='KeyL')void pronounce(word.japanese).finished.catch(()=>{});};
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[area,word]);
  if(!s)return null;
  const correctTray=shift.tray.length===customer.count&&shift.tray.every(drink=>drink===customer.drink);
  if(!area)return ['brew','serve','report'].includes(shift.stage)?<aside className="workbench-hint"><span>{shift.stage==='report'?'Closing time':`${customer.name} · ${shift.tray.length}/${customer.count} cups on the tray`}</span><strong>{correctTray?'Bring your tray to the customer':'E at a work area · prepare without aiming at each tool'}</strong></aside>:null;
  const dirty=s.vessels.filter(c=>c.state==='dirty').length;
  const recipe=['brew','serve'].includes(shift.stage);
  const ready=recipe&&correctTray;
  return <section className="cafe-work workbench-panel" aria-label="Café workbench" data-area={area}>
    <header><span>CAFE MIKAN / {area==='coffee'?'COFFEE':area==='tea'?'TEA & WATER':'CLEANUP'}</span><button onClick={onExit} aria-label="Leave workbench">Step away <kbd>Esc</kbd></button></header>
    <div className="bench-order"><span>{recipe?`${customer.name}’s order`:'Take your time'}</span>{recipe&&<><p lang="ja">{customer.line}</p><SpeakButton text={customer.line}/><small>{shift.tray.length} / {customer.count} cups on the tray</small></>}</div>
    <div className="bench-step"><strong aria-live="polite">{task?.label??(ready?'Your tray is ready':mode==='restock'?'Supplies are full':mode==='wash'?'All returned cups are clean':'Ready for tomorrow')}</strong>
      {word&&<div className="work-word"><ruby lang="ja">{word.japanese}{word.reading!==word.japanese&&<rt>{word.reading}</rt>}</ruby><SpeakButton text={word.japanese}/>{support?.romaji&&<small>{word.romaji}</small>}{support?.english?<span>{word.english}</span>:<button onClick={()=>setHelped(before=>[...before,word.id])}>Meaning</button>}</div>}
      {word&&<small>H · Meaning &nbsp; L · Listen</small>}
      {work&&<div className="cafe-work-progress"><RiveFeedback fraction={work.fraction}/><progress aria-label={work.label} max={1} value={work.fraction}/><span>{work.label} · {Math.round(work.fraction*100)}%</span><small>{work.pouring?'Hold E and release in green for an optional perfect cup. Holding to the end works too.':s.manual?'Hold to continue. Progress stays if you step away.':'Runs automatically. You can wash cups while you wait.'}</small></div>}
      {task&&<button ref={primary} className="bench-primary" disabled={!!task.waiting} data-step={task.key}
        onClick={()=>{if(!task.hold){onInput(true,task.key);onInput(false);}}}
        onPointerDown={event=>{if(task.hold){event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);onInput(true,task.key);}}}
        onPointerUp={()=>{if(task.hold)onInput(false);}} onPointerCancel={()=>onInput(false)} onLostPointerCapture={()=>onInput(false)}
        onKeyDown={event=>{if(task.hold&&[' ','Enter'].includes(event.key)){event.preventDefault();if(!event.repeat)onInput(true,task.key);}}}
        onKeyUp={event=>{if(task.hold&&[' ','Enter'].includes(event.key)){event.preventDefault();onInput(false);}}}>
        <span>{task.waiting?'Please wait':task.hold?'Hold E or hold here':'E · '+task.label}</span>
      </button>}
      {!task&&<button ref={primary} className="bench-primary" onClick={onExit}>{ready?'Take the tray to your customer':'Return to the café'}</button>}
    </div>
    <footer><small>{s.vessels.filter(c=>c.state==='clean').length} clean cups · {dirty} to wash</small><div>
      {recipe&&mode!=='recipe'&&<button onClick={()=>onMode('recipe')}>Back to the drink</button>}
      {dirty>0&&mode!=='wash'&&mode!=='cleanup'&&<button disabled={!!s.manual} onClick={()=>onMode('wash')}>Wash cups</button>}
      {mode!=='restock'&&<button disabled={!!s.manual} onClick={()=>onMode('restock')}>Refill supplies</button>}
      {shift.stage==='report'&&mode!=='cleanup'&&<button onClick={()=>onMode('cleanup')}>Closing tasks</button>}
    </div></footer>
  </section>;
}
