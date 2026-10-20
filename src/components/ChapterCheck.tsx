import { useEffect, useRef, useState } from 'react';
import type { Progress } from '@/game/learning';
import SpeakButton from './SpeakButton';
const chapterCheckQuestions = [
  { phrase: 'お茶を一つください。', reading: 'おちゃをひとつください。', prompt: 'What would you prepare?', answers: ['One tea','Two coffees','Two waters'], correct: 0, meaning: 'One tea, please.' },
  { phrase: 'コーヒーを二つください。', reading: 'コーヒーをふたつください。', prompt: 'What would you prepare?', answers: ['One coffee','Two teas','Two coffees'], correct: 2, meaning: 'Two coffees, please.' },
  { phrase: '', reading: '', prompt: 'Offer the finished tray to your customer.', answers: ['すみません','どうぞ','いらっしゃいませ'], correct: 1, meaning: 'どうぞ — Here you are.' },
];
export default function ChapterCheck({ progress, onAnswer, onHelp }: { progress: Progress; onAnswer: (index: number, correct: boolean, assisted: boolean) => void; onHelp?: (index: number) => void }) {
  const [open, setOpen] = useState(false); const [help, setHelp] = useState(false); const [feedback, setFeedback] = useState('');
  const content = useRef<HTMLDivElement>(null);
  const answeredIndex = useRef<number | null>(null);
  const answers = progress.chapterCheck ?? []; const q = chapterCheckQuestions[answers.length];
  const assisted = help || progress.alwaysHelp === true || (progress.chapterCheckHelp ?? []).includes(answers.length);
  const independent = answers.filter(a => a.correct && !a.assisted).length, guided = answers.filter(a => a.correct && a.assisted).length;
  useEffect(() => { if (open) content.current?.focus(); }, [open, feedback]);
  return <section className="comprehension-check" aria-label="Optional Japanese comprehension check"><h3>What can you understand now?</h3><p>A small optional check. Listening again is welcome.</p>
    {!open ? <button onClick={() => { setOpen(true); if (progress.alwaysHelp && q) onHelp?.(answers.length); }}>{q ? 'Try the Japanese check' : 'View Japanese check results'}</button> : <div ref={content} tabIndex={-1}>
      {feedback ? <><p className="check-feedback" role="status">{feedback}</p><button onClick={() => { setFeedback(''); setHelp(false); answeredIndex.current = null; if (progress.alwaysHelp && q) onHelp?.(answers.length); }}>Continue</button></> : q ? <><p>Question {answers.length + 1} of 3 · {q.prompt}</p>{q.phrase && <p lang="ja"><ruby>{q.phrase}<rt>{q.reading}</rt></ruby> <SpeakButton text={q.phrase} /></p>}{assisted && <p>{q.meaning}</p>}<div role="group" aria-label="Choose your answer">{q.answers.map((a,i) => <button key={a} lang={q.phrase ? 'en' : 'ja'} onClick={() => {
        if (answeredIndex.current === answers.length) return;
        answeredIndex.current = answers.length;
        onAnswer(answers.length, i === q.correct, assisted);
        setFeedback(`${i === q.correct ? 'You understood it.' : 'Keep practicing — here is the meaning.'} ${q.meaning}`);
      }}>{a}</button>)}</div><button aria-pressed={assisted} onClick={() => { setHelp(true); onHelp?.(answers.length); }}>{assisted ? 'Meaning shown' : 'Show meaning'}</button></> : <p role="status">{independent}/3 understood independently · {guided} with help · {answers.length - independent - guided} to revisit. You can keep practicing with your neighbors.</p>}
      <small>This checks a few café phrases, rather than overall fluency.</small>
      <button onClick={() => setOpen(false)}>Leave the check for later</button>
    </div>}
  </section>;
}
