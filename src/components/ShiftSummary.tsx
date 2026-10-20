import ChapterCheck from './ChapterCheck';
import type { Progress } from '@/game/learning';
import { useEffect, useRef } from 'react';
import { cafeGoal, chapterEnding, CHAPTER_DAYS, dayStory, isFreePlay, relationshipSummary } from '@/game/chapterOne';
import type { Shift } from '@/game/chapterOne';

export default function ShiftSummary({ shift, wordCount, onFinish, onNext, onClose, progress, onCheck, onCheckHelp }: {
  progress?: Progress; onCheck?: (index: number, correct: boolean, assisted: boolean) => void;
  onCheckHelp?: (index: number) => void;
  shift: Shift; wordCount: number; onFinish: () => void; onNext: () => void; onClose: () => void;
}) {
  const card = useRef<HTMLElement>(null);
  useEffect(() => { card.current?.focus(); }, [shift.stage]);
  const day = shift.day ?? 1;
  const ending = shift.stage === 'done' && day === CHAPTER_DAYS;
  const goal = cafeGoal(shift);
  return <div className="summary-scrim"><section ref={card} tabIndex={-1} className={`cafe-shift-summary${ending ? ' chapter-ending' : ''}`} aria-label={ending ? 'Chapter One complete' : 'Café shift summary'} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
  }}>
    <span className="summary-kicker">{ending ? 'CHAPTER ONE / 第一章 · COMPLETE' : isFreePlay(shift) ? `CAFÉ DAY ${day} / FREE PLAY` : `CHAPTER ONE / DAY ${day} OF ${CHAPTER_DAYS}`}</span>
    {ending && <div className="ending-lantern" aria-hidden="true">灯</div>}
    <h1>{ending ? 'A place to belong.' : shift.stage === 'report' ? 'One good day at Mikan.' : 'See you in the morning.'}</h1>
    <p className="summary-story">{ending ? chapterEnding(shift) : dayStory(day).closing}</p>
    <div className="shift-stats" aria-label="Today’s café results">
      <div><strong>3</strong><span>neighbors served</span></div><div><strong>¥{shift.earnings.toLocaleString()}</strong><span>café sales</span></div>
      <div><strong>¥{shift.tips ?? 0}</strong><span>perfect-pour tips</span></div><div><strong>{shift.understoodToday?.length ?? 0} / 3</strong><span>orders without hints</span></div>
    </div>
    <p className="summary-goal"><b>{goal.complete ? '✦ Goal complete' : 'Today’s café goal'}</b> {goal.label} · {goal.value} / {goal.target}</p>
    <div className="summary-friends" aria-label="Your regulars">{relationshipSummary(shift).map(bond => <div key={bond.name}><strong>{bond.name}</strong><span aria-label={`Friendship ${bond.value} of 7`}>{'♥'.repeat(bond.value)}{'♡'.repeat(7 - bond.value)}</span><small>{bond.description}</small></div>)}</div>
    {ending ? <div className="chapter-next"><span lang="ja">つづく</span><h2>Chapter Two is coming soon.</h2><p>Your story will continue. Until then, keep the café open: new orders, little conversations, perfect pours, and Japanese practice. Your friendships and notebook stay with you.</p><small>{wordCount} Japanese words discovered · 21 café visits across the week</small></div> : <p className="summary-reassurance">Every visit builds friendship. Haru is always happy to help with the words.</p>}
    {ending && progress && onCheck && <ChapterCheck progress={progress} onAnswer={onCheck} onHelp={onCheckHelp} />}
    <div className="summary-actions"><button className="summary-primary" onClick={shift.stage === 'report' ? onFinish : onNext}>{shift.stage === 'report' ? day === CHAPTER_DAYS ? 'Close the café · Join the reading evening' : 'Close the café' : ending ? 'Keep running the café' : isFreePlay(shift) ? 'Open another café day' : 'Start the next morning'} <span aria-hidden="true">→</span></button><button onClick={onClose}>Step away from the counter</button></div>
  </section></div>;
}
