import { useEffect, useRef, useState } from 'react';
import { lessons, words, reviewQueue, reviewQuestion } from '@/game/learning';
import { acceptsQuestion, answerGuide } from '@/game/recall';
import type { Progress, Question, Word } from '@/game/learning';
import SpeakButton from './SpeakButton';
export { default as SpeakButton } from './SpeakButton';

export function HaruPortrait() {
  return <svg viewBox="0 0 120 140" role="img" aria-label="Haru, the café owner"><path fill="#e9bc71" d="M0 0h120v140H0z"/><circle cx="64" cy="55" r="43" fill="#f6dca5"/><path fill="#e5ddc1" d="M10 140v-29q3-25 35-26h30q32 1 35 26v29"/><path fill="#395c54" d="M33 96h54l5 44H27z"/><path stroke="#395c54" strokeWidth="7" d="M36 89v30m47-30v30"/><path fill="#dba780" d="M49 77h24v23q-13 12-24 0"/><ellipse cx="60" cy="53" rx="31" ry="35" fill="#ecc49b"/><path fill="#303536" d="M28 49q-12-45 34-42 41 3 31 43L82 34q-37 6-46-7z"/><path fill="none" stroke="#303536" strokeWidth="3" d="M34 49h-9m62 0h9M54 51h12"/><g fill="none" stroke="#303536" strokeWidth="3"><circle cx="43" cy="53" r="12"/><circle cx="77" cy="53" r="12"/></g><g fill="#303536"><circle cx="44" cy="54" r="2"/><circle cx="76" cy="54" r="2"/></g><path fill="none" stroke="#a3664b" strokeWidth="2" strokeLinecap="round" d="m59 56-3 10h5m-10 8q9 8 18-1"/><path fill="#e9bc71" d="M49 119h23v17H49z"/><path fill="#395c54" d="M55 123h11v2H55z"/></svg>;
}

function WordCard({ word, romaji }: { word: Word; romaji: boolean }) {
  return <article className="word-card"><div><ruby lang="ja">{word.japanese}{word.reading !== word.japanese && <rt>{word.reading}</rt>}</ruby><SpeakButton text={word.japanese} /></div>{romaji && <p className="reading">{word.romaji}</p>}<strong>{word.english}</strong><p>{word.note}</p></article>;
}

interface NotebookProps {
  progress: Progress;
  collected: Word[];
  due: Word[];
  onGuess: (id: string, meaning: string) => void;
  onReference: (id: string) => void;
  onReview: () => void;
  onReviewWord: (word: Word) => void;
  onSettings: (settings: Partial<Pick<Progress, 'romaji' | 'graphics' | 'motion' | 'alwaysHelp'>>) => void;
}

function NotebookEntry({ word, progress, onGuess, onReference, onReview }: {
  word: Word; progress: Progress; onGuess: NotebookProps['onGuess']; onReference: NotebookProps['onReference']; onReview: () => void;
}) {
  const [meaning, setMeaning] = useState(progress.guesses?.[word.id] ?? '');
  const [revealed, setRevealed] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const composing = useRef(false);
  const memory = progress.memories[word.id];
  const confidence = memory.streak >= 3 ? 'Remembered' : memory.streak === 2 ? 'Familiar' : memory.streak === 1 ? 'Tentative' : 'Not yet recalled';
  return <section className="lexicon-entry" aria-labelledby="lexicon-word-title">
    <div className="lexicon-entry-heading"><div><span className="eyebrow">WORD FOUND</span><h2 id="lexicon-word-title" lang="ja">{word.japanese}</h2></div><SpeakButton text={word.japanese} /></div>
    <p className="lexicon-reading" lang="ja">{word.reading}{progress.romaji && <span lang="en">{word.romaji}</span>}</p>
    <form className="lexicon-hypothesis" onSubmit={event => { event.preventDefault(); if (composing.current) return; onGuess(word.id, meaning.trim()); setMeaning(meaning.trim()); setSavedNote(true); }}>
      <label htmlFor="lexicon-meaning">My interpretation</label>
      <input id="lexicon-meaning" value={meaning} maxLength={100} autoComplete="off" placeholder="What could this mean?" aria-describedby="lexicon-note-guidance" onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onChange={event => { setMeaning(event.target.value); setSavedNote(false); }} />
      <p id="lexicon-note-guidance">Keep a guess here, then test it in the café. You can change your mind.</p>
      <div><button className="mikan-primary" type="submit">Save interpretation <b>↵</b></button><span role="status">{savedNote ? 'Saved in your field notes.' : ''}</span></div>
    </form>
    <div className="lexicon-memory"><div><span className="lexicon-recall-dots" aria-hidden="true">{[0, 1, 2].map(index => <i key={index} className={memory.streak > index ? 'earned' : ''} />)}</span><strong>{confidence}</strong><small>{memory.streak} consecutive {memory.streak === 1 ? 'recall' : 'recalls'} without help</small></div><span>{memory.due <= Date.now() ? 'Ready to review' : `Next review · ${new Date(memory.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}</span></div>
    <button className="mikan-secondary" type="button" onClick={onReview}>Try this word from memory <b>→</b></button>
    <div className="lexicon-reference"><button className="lexicon-reference-toggle" type="button" aria-expanded={revealed} aria-controls="lexicon-reference-meaning" onClick={() => { if (!revealed) onReference(word.id); setRevealed(value => !value); }}>{revealed ? 'Hide dictionary meaning' : 'Reveal dictionary meaning'} <span aria-hidden="true">{revealed ? '−' : '+'}</span></button>
      <div id="lexicon-reference-meaning" hidden={!revealed}>{revealed && <><span className="eyebrow">DICTIONARY REFERENCE</span><strong>{word.english}</strong><p>{word.note}</p><small>This reference is separate from your interpretation.</small></>}</div>
    </div>
  </section>;
}

function WordNotebook({ progress, collected, due, onGuess, onReference, onReview, onReviewWord, onSettings }: NotebookProps) {
  const [selected, setSelected] = useState(collected[0]?.id ?? '');
  const word = collected.find(item => item.id === selected) ?? collected[0];
  return <>
    <div className="lexicon-toolbar"><div className="chapter-label">YOUR WORD COLLECTION <span>{collected.length} / {words.length}</span></div>{collected.length > 0 && <button className="mikan-secondary" type="button" onClick={onReview}>{due.length ? `Practice ${due.length} due ${due.length === 1 ? 'word' : 'words'}` : 'Practice collected words'} <b>→</b></button>}</div>
    <p className="lexicon-guidance">Listen. Notice what happens. Write what you think the words mean.</p>
    {word ? <div className="lexicon-workspace">
      <nav className="lexicon-index" aria-label="Collected Japanese words">{collected.map((item, index) => <button key={item.id} className="lexicon-token" type="button" aria-pressed={word.id === item.id} aria-label={`Inspect ${item.japanese}${progress.guesses?.[item.id] ? `, your interpretation: ${progress.guesses[item.id]}` : ', no interpretation yet'}`} onClick={() => setSelected(item.id)}>
        <span className="lexicon-token-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span className="lexicon-token-copy"><strong lang="ja">{item.japanese}</strong><small>{progress.guesses?.[item.id] || 'No interpretation yet'}</small></span>{progress.memories[item.id].due <= Date.now() && <span className="lexicon-due" title="Ready for review" aria-label="Ready for review">•</span>}
      </button>)}</nav>
      <NotebookEntry key={word.id} word={word} progress={progress} onGuess={onGuess} onReference={onReference} onReview={() => onReviewWord(word)} />
    </div> : <div className="empty-notebook"><span lang="ja">はじめの一歩</span><p>Your first word is waiting.<br />Take a customer’s order or read a street sign with E.</p></div>}
    <details className="lexicon-settings"><summary>Study & picture settings</summary><fieldset className="learning-settings"><legend>Make yourself comfortable</legend><label><input type="checkbox" checked={progress.alwaysHelp === true} onChange={event => onSettings({ alwaysHelp: event.target.checked })} /> Always show Japanese meanings and readings</label><label><input type="checkbox" checked={progress.romaji} onChange={event => onSettings({ romaji: event.target.checked })} /> Show romaji during study</label><label><input type="checkbox" checked={progress.motion} onChange={event => onSettings({ motion: event.target.checked })} /> Walking bob and sprint zoom</label><label>Picture style <select value={progress.graphics} onChange={event => onSettings({ graphics: event.target.value as Progress['graphics'] })}><option value="handheld">Handheld · soft 3D, sharp text</option><option value="crisp">Crisp · native resolution</option></select></label></fieldset></details>
  </>;
}

interface Props {
  mode: 'lesson' | 'notebook'; progress: Progress; saved: boolean;
  onDiscover: (ids: string[]) => void; onRecall: (id: string, correct: boolean) => void; onGuess: (id: string, meaning: string) => void; onReference: (id: string) => void;
  onComplete: (index: number) => void; onSettings: (settings: Partial<Pick<Progress, 'romaji' | 'graphics' | 'motion' | 'alwaysHelp'>>) => void; onClose: () => void;
}

export default function LearningPanel({ mode, progress, saved, onDiscover, onRecall, onGuess, onReference, onComplete, onSettings, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'notebook' | 'teach' | 'quiz' | 'summary'>(mode === 'notebook' || progress.completed === lessons.length ? 'notebook' : 'teach');
  const [lessonIndex, setLessonIndex] = useState(Math.min(progress.completed, lessons.length - 1));
  const [queue, setQueue] = useState<Question[]>([]);
  const [review, setReview] = useState(false);
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [response, setResponse] = useState('');
  const composing = useRef(false);
  const answerInput = useRef<HTMLInputElement>(null);
  const [retries, setRetries] = useState(0);
  const [hint, setHint] = useState(false);
  const [missed, setMissed] = useState(false);
  const [score, setScore] = useState(0);
  const lesson = lessons[lessonIndex];
  const question = queue[step];
  const due = reviewQueue(progress);
  const collected = words.filter(word => progress.memories[word.id]);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  useEffect(() => { content.current?.focus(); content.current?.scrollTo(0, 0); }, [view, step]);
  useEffect(() => {
    if (view !== 'quiz') return;
    // Replacing disabled choices or the retry button must not leave focus on body.
    const target = answer === null ? answerInput.current : content.current?.querySelector<HTMLButtonElement>('.answer-feedback button');
    target?.focus({ preventScroll: true });
  }, [view, step, answer]);

  const startQuiz = () => {
    onDiscover(lesson.words); setQueue(lesson.questions); setReview(false); setStep(0); setScore(0); setRetries(0); setResponse(''); setAnswer(null); setHint(false); setMissed(false); setView('quiz');
  };
  const openReview = (reviewWords: Word[]) => {
    setQueue(reviewWords.slice(0, 8).map(reviewQuestion)); setReview(true); setStep(0); setScore(0); setRetries(0); setResponse(''); setAnswer(null); setHint(false); setMissed(false); setView('quiz');
  };
  const startReview = () => openReview(due.length ? due : collected);
  const submitRecall = () => {
    if (composing.current || answer !== null || !question || !response.trim()) return;
    const correct = acceptsQuestion(response, question);
    setAnswer(correct);
    onRecall(question.word, correct && !hint && !missed);
    if (correct && !hint && !missed) setScore(value => value + 1);
    if (!correct) setMissed(true);
  };
  const next = () => {
    if (!answer) { setAnswer(null); setResponse(''); return; }
    let nextQueue = queue;
    // A copied or assisted answer is teaching, not evidence of recall. Revisit after other prompts.
    if (hint || missed) { nextQueue = [...queue, ...(step + 1 === queue.length && queue.length > 1 ? [queue[0]] : []), question]; setQueue(nextQueue); setRetries(value => value + 1); }
    if (step + 1 === nextQueue.length) {
      if (!review) onComplete(lessonIndex);
      setView('summary');
    } else { setStep(value => value + 1); setAnswer(null); setResponse(''); setHint(false); setMissed(false); }
  };

  return <dialog ref={dialog} className="learning-dialog" aria-labelledby="learning-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="learning-shell">
      <header className="learning-header"><div><span className="eyebrow">MIKANRA / EVERYDAY JAPANESE</span><h1 id="learning-title">{view === 'notebook' ? 'Your field notes' : review ? 'A little practice' : 'Optional phrase practice'}<span lang="ja">{view === 'notebook' ? 'ことばノート' : 'はじめての仕事'}</span></h1></div><button className="close-learning" onClick={onClose} aria-label="Close notebook or lesson">✕<small>ESC</small></button></header>
      <div className={`learning-layout${view === 'notebook' ? ' lexicon-layout' : ''}`}>
        {view !== 'notebook' && <aside className="lesson-sidebar"><div className="owner-card"><HaruPortrait /><div><strong>HARU</strong><span>Owner, Café Mikan</span><p>“A little every day.<br />You’ll get there.”</p></div></div><ol className="lesson-route">{lessons.map((item, i) => <li key={item.title} className={i < progress.completed ? 'complete' : i === lessonIndex ? 'current' : ''}><span>{i < progress.completed ? '✓' : `0${i + 1}`}</span><div>{item.title}<small>{i < progress.completed ? 'SHIFT STAMP EARNED' : i === progress.completed ? 'UP NEXT' : 'ON YOUR JOURNEY'}</small></div></li>)}</ol><div className="save-note"><i />{saved ? 'Progress saved on this device' : 'Session only · storage unavailable'}</div></aside>}
        <div ref={content} tabIndex={-1} className={`lesson-content${view === 'notebook' ? ' lexicon-content' : ''}`}>
          {view === 'teach' && <><div className="chapter-label">LESSON 0{lessonIndex + 1} <span>{lesson.subtitle}</span></div><h2>{lesson.title}<em>.</em></h2><p className="story-copy">{lesson.story}</p><div className="study-words">{lesson.words.map(id => <WordCard key={id} word={words.find(word => word.id === id)!} romaji={progress.romaji} />)}</div><div className="lesson-bottom"><span>Read, say it aloud, then try from memory.<br />No timer. Mistakes are part of learning.</span><button className="mikan-primary" onClick={startQuiz}>I’m ready to try <b>→</b></button></div></>}
          {view === 'quiz' && question && <><div className="chapter-label">{review ? 'RECALL PRACTICE' : lesson.subtitle}<span>{step + 1} / {queue.length}</span></div><div className="quiz-track"><span style={{ width: `${step / queue.length * 100}%` }} /></div><h2 className="question-title">{question.prompt}</h2>{question.japanese && <div className="customer-line"><span>{review ? 'YOUR NOTEBOOK' : 'CUSTOMER SAYS'}</span><p lang="ja">{question.japanese}</p><SpeakButton text={question.japanese} /></div>}<form className="recall-form" onSubmit={event => { event.preventDefault(); submitRecall(); }}>
            <label htmlFor="recall-response">{review ? 'Write the meaning in English' : /[ぁ-龯]/.test(question.answers[question.correct]) ? 'Write the phrase in Japanese or romaji' : 'Write your answer'}</label>
            <input ref={answerInput} id="recall-response" onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} autoComplete="off" spellCheck={false} value={response} disabled={answer !== null} onChange={event => setResponse(event.target.value)} aria-describedby="recall-guidance" />
            {answer === null && <button className="mikan-primary" disabled={!response.trim()} type="submit">Check my recall →</button>}
          </form>
          {answer === null ? <div className="hint-row" id="recall-guidance"><button onClick={() => { setHint(true); answerInput.current?.focus(); }} aria-pressed={hint}>Teach me this phrase</button><span>{hint ? answerGuide(question) : 'Recall it yourself. Romaji works; you do not need a Japanese keyboard.'}</span></div> : <div className={`answer-feedback ${answer ? 'success' : ''}`} role="status"><strong>{answer ? hint || missed ? 'Now try it again later without the guide.' : 'よくできました！ Recalled from memory.' : 'Let’s learn it, then try again.'}</strong><p>{question.explanation}</p><p>{answerGuide(question)}</p><button className="mikan-primary" onClick={next}>{!answer ? 'Try from memory' : step + 1 === queue.length && !hint && !missed ? 'See how you did' : 'Continue'} <b>→</b></button></div>}</>}
          {view === 'summary' && <div className="shift-summary"><div className="shift-seal" lang="ja">{review ? '復習' : '合格'}<small>{review ? 'PRACTICED' : 'STAMP EARNED'}</small></div><div className="chapter-label">{review ? 'NOTEBOOK REVIEW' : `LESSON 0${lessonIndex + 1} COMPLETE`}</div><h2>{!review && progress.completed === lessons.length ? 'Training complete. Your shift awaits.' : 'A little more confident.'}</h2><p>{score} successful recalls without hints. {retries > 0 ? `${retries} assisted prompts revisited from memory.` : ''}</p><p className="story-copy">{!review && progress.completed === lessons.length ? 'You have practiced the phrases. Return to Haru to begin your real shift: take orders, prepare drinks, serve customers, and settle their bills.' : 'Words that needed help will return sooner. Come back to your notebook for a little practice tomorrow.'}</p><div className="summary-actions">{!review && lessonIndex + 1 < lessons.length && <button className="mikan-primary" onClick={() => { setLessonIndex(value => value + 1); setView('teach'); }}>Next lesson <b>→</b></button>}<button className="mikan-secondary" onClick={() => setView('notebook')}>Open field notes</button><button className="mikan-secondary" onClick={onClose}>Back to the café</button></div></div>}
          {view === 'notebook' && <><WordNotebook progress={progress} collected={collected} due={due} onGuess={onGuess} onReference={onReference} onReview={startReview} onReviewWord={word => openReview([word])} onSettings={onSettings} /><div className="save-note"><i />{saved ? 'Progress saved on this device' : 'Session only · storage unavailable'}</div></>}
        </div>
      </div>
    </div>
  </dialog>;
}
