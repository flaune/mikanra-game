import type { Workbench } from '@/game/cafeLayout';
import type { WorkMode } from '@/game/cafeService';
import CafeWork from './CafeWork';
import { preparationWords, recordUse, wordHelp } from '@/game/learning';
import type { ServiceAction } from '@/game/cafeService';
import { useEffect, useRef, useState, useCallback } from "react";
import { GameEngine } from "@/game/engine";
import type { InteractionResult } from "@/game/interaction";
import type { DialogueNode } from "@/game/dialogue";
import { MobileNotice, TitleScreen } from './TitleScreen';
import ShiftPanel from './ShiftPanel';
import DialogueBox from './DialogueBox';
import { SHIFT_KEY, readShift, shiftObjective, serviceGuide, actShift, customers, getCustomer, nextShift, isFreePlay, cafeGoal, CHAPTER_DAYS } from '@/game/chapterOne';
import LearningPanel, { SpeakButton } from './LearningPanel';
import { SAVE_KEY, parseProgress, discover, recordRecall, words } from '@/game/learning';


interface InfoPopup {
  japanese: string;
  romaji: string;
  english: string;
}

// Phones and touch-only tablets get a lightweight notice, without starting WebGL.
export default function GameExperience() {
  const [{ mobile, initialized }, setViewport] = useState(() => {
    const mobile = matchMedia('(pointer: coarse), (max-width: 700px)').matches;
    return { mobile, initialized: !mobile };
  });
  useEffect(() => {
    const media = matchMedia('(pointer: coarse), (max-width: 700px)');
    const update = () => setViewport(previous => ({
      mobile: media.matches,
      initialized: previous.initialized || !media.matches,
    }));
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return <>
    {initialized && <div hidden={mobile} className="w-full h-full"><GameCanvas suspended={mobile} /></div>}
    {mobile && <MobileNotice />}
  </>;
}

function GameCanvas({ suspended }: { suspended: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const infoDialogRef = useRef<HTMLDialogElement>(null);
  const [locked, setLocked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [workbench,setWorkbench]=useState<Workbench|null>(null);
  const [workMode,setWorkMode]=useState<WorkMode>('recipe');
  const [freeMouseLook, setFreeMouseLook] = useState(false);
  const [phase, setPhase] = useState<'title' | 'arrival' | 'game'>('title');
  const [muted, setMuted] = useState(false);
  const [location, setLocation] = useState<'street' | 'cafe'>('street');
  const [objective, setObjective] = useState('Your first shift · Find Café Mikan under the striped awning');
  const [interaction, setInteraction] = useState<InteractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [dialogueActive, setDialogueActive] = useState(false);
  const [dialogueNode, setDialogueNode] = useState<DialogueNode | null>(null);
  const [info, setInfo] = useState<InfoPopup | null>(null);
  const [panel, setPanel] = useState<'lesson' | 'notebook' | null>(null);
  const [progress, setProgress] = useState(() => { try { return parseProgress(localStorage.getItem(SAVE_KEY)); } catch { return parseProgress(null); } });
  const [shift, setShift] = useState(() => { try { return readShift(localStorage.getItem(SHIFT_KEY)); } catch { return readShift(null); } });
  const [shiftTarget, setShiftTarget] = useState<string | null>(null);
  const timerOnly = useRef(false);
  const lastSave = useRef(0);
  const [serviceMessage, setServiceMessage] = useState('');
  const [direction, setDirection] = useState<{ bearing: number; distance: number; route: boolean } | null>(null);
  const shiftRef = useRef(shift); shiftRef.current = shift;
  useEffect(() => {
    if (timerOnly.current && Date.now() - lastSave.current < 1000) return;
    try { localStorage.setItem(SHIFT_KEY, JSON.stringify(shift)); lastSave.current = Date.now(); } catch { setSaved(false); }
  }, [shift]);
  useEffect(() => {
    const flush = () => { try { localStorage.setItem(SHIFT_KEY, JSON.stringify(shiftRef.current)); } catch { setSaved(false); } };
    window.addEventListener('blur', flush); document.addEventListener('visibilitychange', flush);
    return () => { flush(); window.removeEventListener('blur', flush); document.removeEventListener('visibilitychange', flush); };
  }, []);
  const serviceAction = (action: ServiceAction) => {
    const before = shiftRef.current;
    const result = actShift(before, { type: 'service', action });
    const a = before.service, b = result.state.service;
    const transition = !!a && !!b && (a.kettle !== b.kettle || a.tea !== b.tea || a.coffee !== b.coffee ||
      !!a.manual !== !!b.manual || a.vessels.some((cup,index) => cup.state !== b.vessels[index]?.state));
    timerOnly.current = action.type === 'tick' && !transition;
    if (before !== result.state) {
      shiftRef.current = result.state; setShift(result.state); engineRef.current?.setShiftPresentation(result.state);
      if (result.word && preparationWords(before.day ?? 1).includes(result.word)) setProgress(p => recordUse(p, result.word!, true, true, 'prep-'+(before.day ?? 1)+'-'+before.customer));
    }
    if (result.message) setServiceMessage(result.message);
  };
  const [saved, setSaved] = useState(true);
  const lessonObjective = location === 'cafe' || shift.stage === 'done' ? shiftObjective(shift) : 'Find Café Mikan · Follow the striped awning on your left';
  const servedCount = ['report','done'].includes(shift.stage) ? 3 : shift.customer;
  const guide = serviceGuide(shift);
  const goal = cafeGoal(shift);

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); setSaved(true); } catch { setSaved(false); }
    engineRef.current?.setPresentation(progress.graphics, progress.motion);
  }, [progress]);

  useEffect(() => {
    if (!containerRef.current) return;
    setWorkbench(null);setPhase('title'); setReady(false); setPlaying(false); setLocked(false);
    setLocation('street');
    setShiftTarget(null); setPanel(null); setServiceMessage(''); setDirection(null);
    setDialogueActive(false); setDialogueNode(null); setInfo(null); setInteraction(null); setError(null);

    const engine = new GameEngine(containerRef.current, {
      onWorkbench: (area,mode) => {setWorkbench(area);setWorkMode(mode);},
      onReady: () => setReady(true),
      onLockChange: (isLocked) => setLocked(isLocked),
      onPlayChange: setPlaying,
      onLookModeChange: (mode) => setFreeMouseLook(mode === 'mouse'),
      onArrival: () => setPhase('game'),
      onObjective: message => { setObjective(message); if (message.startsWith('Walk around') || message.startsWith('Take an order') || message.startsWith('Your tray')) setServiceMessage(message); },
      onGuide: setDirection,
      onLesson: () => { setShiftTarget('barista'); },
      onShift: target => { setShiftTarget(target); },
      onService: serviceAction,
      onNotebook: () => setPanel('notebook'),
      onLocation: setLocation,
      onInteract: (result) => setInteraction(result),
      onDialogue: (active) => setDialogueActive(active),
      onDialogueUpdate: (node) => setDialogueNode(node),
      onInfo: (popup) => {
        setInfo(popup);
        const word = words.find(item => item.japanese === popup?.japanese);
        if (word) setProgress(previous => discover(previous, [word.id]));
      },
      onError: (message) => setError(message),
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => { if (ready) engineRef.current?.setShiftPresentation(shift); }, [ready, shift, location]);
  useEffect(() => { if (!serviceMessage) return; const timer = setTimeout(() => setServiceMessage(''), 5500); return () => clearTimeout(timer); }, [serviceMessage]);
  useEffect(() => { if (ready) engineRef.current?.setPresentation(progress.graphics, progress.motion); }, [ready, progress.graphics, progress.motion]);

  useEffect(() => {
    engineRef.current?.setViewportSuspended(suspended);
  }, [suspended]);

  useEffect(() => {
    const dialog = infoDialogRef.current;
    if (!info || suspended || !dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, [info, suspended]);

  const handleStart = useCallback(() => {
    if (phase !== 'game' || playing || dialogueActive || panel || shiftTarget) return;
    engineRef.current?.start();
  }, [phase, playing, dialogueActive, panel, shiftTarget]);

  const handleJourney = () => {
    if (!ready || phase !== 'title') return;
    if (shift.hired || shift.stage !== 'briefing' || (shift.day ?? 1) > 1) {
      setPhase('game'); engineRef.current?.resumeCafe(); return;
    }
    setPhase('arrival');
    engineRef.current?.beginJourney(muted);
  };

  const handleDialogueChoice = useCallback((index: number) => {
    engineRef.current?.dialogueChoose(index);
  }, []);

  const handleDialogueAdvance = useCallback(() => {
    engineRef.current?.dialogueAdvance();
  }, []);

  const handleDismissInfo = useCallback(() => {
    // Release modal focus before the engine focuses its canvas to resume play.
    infoDialogRef.current?.close();
    engineRef.current?.dismissInfo();
    setInfo(null);
  }, []);

  const openNotebook = () => { engineRef.current?.openStudy(); setPanel('notebook'); };

  return (
    <div className="relative w-full h-full" data-phase={phase} data-playing={playing} data-look-mode={freeMouseLook ? 'mouse' : 'pointer-lock'} data-pointer-locked={locked}>
      <div
        ref={containerRef}
        className="w-full h-full"
        onClick={handleStart}
      />
      {phase === 'game' && progress.graphics === 'handheld' && <div className="handheld-finish" aria-hidden="true" />}
      {shiftTarget && !suspended && <ShiftPanel onCheckHelp={index => setProgress(p => index >= 0 && index < 3 && index === (p.chapterCheck?.length ?? 0) ? { ...p, chapterCheckHelp: [...new Set([...(p.chapterCheckHelp ?? []),index])] } : p)} onCheck={(index, correct, assisted) => setProgress(p => index === (p.chapterCheck?.length ?? 0) && index < 3 ? { ...p, chapterCheck: [...(p.chapterCheck ?? []), {correct,assisted}] } : p)} notesOpen={panel !== null} key={`${shiftTarget}-${shift.day ?? 1}`} progress={progress} onGuess={(id, meaning) => setProgress(previous => ({ ...discover(previous, [id]), guesses: { ...previous.guesses, [id]: meaning } }))} onDiscover={ids => setProgress(previous => discover(previous, ids))} target={shiftTarget} shift={shift} onUse={(id, correct, assisted) => setProgress(p => recordUse(p, id, correct, assisted, `visit-${shift.day ?? 1}-${shift.customer}`))} onChange={next => { timerOnly.current = false; shiftRef.current = next; setShift(next); }} onNotebook={() => { engineRef.current?.openStudy(); setPanel('notebook'); }} onPractice={() => { setShiftTarget(null); setPanel('lesson'); }} onRestart={() => { timerOnly.current = false; const next = nextShift(shiftRef.current); shiftRef.current = next; setShift(next); }} onRecall={(id, correct) => setProgress(previous => recordRecall(previous, id, correct))} onClose={() => { setShiftTarget(null); engineRef.current?.closeStudy(); }} />}
      {panel && !suspended && <LearningPanel mode={panel} progress={progress} saved={saved}
        onGuess={(id, meaning) => setProgress(previous => ({ ...discover(previous, [id]), guesses: { ...previous.guesses, [id]: meaning } }))}
        onReference={id => {
          const current = shiftRef.current;
          if (!['order', 'brew', 'serve', 'pay'].includes(current.stage)) return;
          const customer = getCustomer(current);
          const relevant = [customer.drink, customer.count === 2 ? 'two' : 'one', 'object', 'request', ...(!current.greeted ? ['welcome'] : []), ...(['brew','serve'].includes(current.stage) ? ['serve'] : []), ...(current.stage === 'pay' ? ['thanks'] : [])];
          if (!relevant.includes(id)) return;
          const next = actShift(current, { type: 'consult', word: id }).state;
          shiftRef.current = next; setShift(next);
        }}
        onDiscover={ids => setProgress(previous => discover(previous, ids))}
        onRecall={(id, correct) => setProgress(previous => recordRecall(previous, id, correct))}
        onComplete={index => setProgress(previous => ({ ...previous, completed: Math.max(previous.completed, Math.min(index + 1, previous.completed + 1)) }))}
        onSettings={settings => setProgress(previous => ({ ...previous, ...settings }))}
        onClose={() => { setPanel(null); if (!shiftTarget) engineRef.current?.closeStudy(); }} />}

      {phase === 'game' && playing && location === 'cafe' && !panel && <CafeWork key={`${shift.day}-${shift.customer}`} shift={shift} progress={progress} area={workbench} mode={workMode} onInput={(held,key)=>engineRef.current?.workbenchInput(held,key)} onMode={mode=>engineRef.current?.setWorkbenchMode(mode)} onExit={()=>engineRef.current?.leaveWorkbench()} />}
      {phase === 'game' && playing && serviceMessage && <div className="service-toast" role="status">{serviceMessage}</div>}
      {phase === 'game' && playing && !workbench && location === 'cafe' && ['brew','serve','pay'].includes(shift.stage) && <div className="order-ticket"><span>{getCustomer(shift).name.toUpperCase()}’S ORDER / ご注文</span><p lang="ja">{getCustomer(shift).line}</p><small>{wordHelp(progress,getCustomer(shift).drink).romaji || wordHelp(progress,getCustomer(shift).count === 2 ? 'two' : 'one').romaji ? getCustomer(shift).romaji : 'Listen, then match your tray.'}</small><SpeakButton text={getCustomer(shift).line} />{(shift.translated ?? shift.helped) && <p className="ticket-meaning">{getCustomer(shift).translation}</p>}{shift.stage !== 'pay' && <div className="ticket-tray"><b>Tray · {shift.tray.length} / {getCustomer(shift).count} cups</b><small>{shift.tray.length ? shift.tray.join(' · ') : 'Empty — fill a cup at the marked station'}</small></div>}</div>}
      {/* Crosshair */}
      {phase === 'game' && playing && !workbench && !dialogueActive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
        </div>
      )}

      {/* Interaction prompt */}
      {phase === 'game' && playing && !workbench && interaction && !dialogueActive && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-black/70 backdrop-blur-sm border border-white/15">
            <kbd className="px-2.5 py-1 rounded-md bg-white/15 text-white text-sm font-semibold font-mono">
              E
            </kbd>
            <div className="flex flex-col">
              {interaction.japanesePrompt && (
                <span className="text-white text-sm font-medium">
                  {interaction.japanesePrompt}
                </span>
              )}
              <span className="text-white/60 text-xs">
                {interaction.prompt}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Info popup (sign reading) */}
      {info && (
        <dialog
          ref={infoDialogRef}
          aria-labelledby="vocabulary-title"
          aria-describedby="vocabulary-reading vocabulary-meaning"
          className="m-0 w-full h-full max-w-none max-h-none border-0 p-0 bg-black/40 backdrop-blur-sm open:flex items-center justify-center"
          onCancel={event => { event.preventDefault(); handleDismissInfo(); }}
          onClick={event => { if (event.target === event.currentTarget) handleDismissInfo(); }}
        >
          <div className="discovery-card">
            <span className="eyebrow">FIELD NOTES / WORD DISCOVERED</span>
            <p id="vocabulary-title" lang="ja" className="text-4xl font-bold text-white mb-3 tracking-wide">
              {info.japanese}
            </p>
            <p id="vocabulary-reading" className="text-white/70 text-sm mb-1 italic">
              {info.romaji}
            </p>
            <p id="vocabulary-meaning" className="text-white/50 text-xs mb-4">
              {info.english}
            </p>
            <SpeakButton text={info.japanese} />
            <p className="discovery-saved">Added to your notebook · J to review</p>
            <button type="button" autoFocus onClick={handleDismissInfo} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white/70 text-xs">
              Close <span aria-hidden="true">· Esc</span>
            </button>
          </div>
        </dialog>
      )}

      {dialogueActive && dialogueNode && <DialogueBox speaker={dialogueNode.speaker} text={`${dialogueNode.japaneseText}\n${dialogueNode.text}`} spokenText={dialogueNode.japaneseText} onContinue={dialogueNode.choices ? undefined : handleDialogueAdvance}>
        {dialogueNode.choices?.map((choice, index) => <button key={index} onClick={() => handleDialogueChoice(index)}>{choice.japaneseText} · {choice.text}</button>)}
      </DialogueBox>}

      {!error && phase !== 'game' && <TitleScreen arriving={phase === 'arrival'} ready={ready} muted={muted} continuing={shift.hired || shift.stage !== 'briefing' || (shift.day ?? 1) > 1} onMute={() => setMuted(value => !value)} onPlay={handleJourney} />}
      {phase === 'game' && <div className="rail-reveal" aria-hidden="true" />}
      {phase === 'game' && ready && !playing && !error && !dialogueActive && !info && !panel && !shiftTarget && (
        <div className="rail-pause">
          <span className="rail-kicker">TAKE YOUR TIME / ひと休み</span>
          <h1>ON A BREAK.</h1>
          <p title={objective}>{lessonObjective}</p>
          <button className="rail-play" onClick={handleStart}><span>{location === 'cafe' ? 'BACK TO THE CAFÉ' : 'BACK TO THE STREETS'}</span><b aria-hidden="true">↗</b></button>
          <button className="pause-notebook mikan-secondary" onClick={openNotebook}>Field notes & settings</button>
          <p className="pause-notebook">Enter the café, talk to Haru, then walk around the right end of the counter to work.</p>
          <div className="rail-controls"><span>WASD · Walk</span><span>Mouse · Look</span><span>E · Interact</span><span>Esc · Pause</span></div>
          {freeMouseLook && <small>Mouse capture is unavailable in this preview. Move the mouse to look, or use arrow keys.</small>}
        </div>
      )}

      {phase === 'game' && ready && playing && !dialogueActive && !info && (
        <>
        <div className="street-location pointer-events-none"><span className="mikan-mark">✳</span><div>{location === 'cafe' ? '喫茶 みかん' : 'みかん小路'}<small>{location === 'cafe' ? 'CAFÉ MIKAN' : 'MIKAN LANE'}</small></div></div>
        <div className="rail-objective pointer-events-none" hidden={!!workbench || location === 'cafe' && (['brew','serve','report'].includes(shift.stage) || !!shift.service?.manual)}><span>{isFreePlay(shift) ? `CAFÉ DAY ${shift.day} · FREE PLAY` : `CH. 1 · DAY ${shift.day ?? 1} / ${CHAPTER_DAYS}`} <b>{servedCount} / 3 SERVED</b></span><p>{lessonObjective}</p>{location === 'cafe' && <>
          {guide.step >= 0 && guide.step < 5 && <ol className="service-checklist" aria-label="Customer service steps">{['Welcome', 'Order', 'Prepare', 'Serve', 'Payment'].map((step, index) => <li key={step} aria-current={index === guide.step ? 'step' : undefined} className={index < guide.step ? 'complete' : ''}>{index < guide.step ? '✓' : index + 1} {step}</li>)}</ol>}
          <small className="service-guide-hint">{guide.hint}</small>
          <small className={`cafe-goal${goal.complete ? ' achieved' : ''}`}>{goal.complete ? '✦' : '◇'} {goal.label} · {goal.value}/{goal.target}<b>Tips ¥{shift.tips ?? 0}</b></small>
          {direction && <div className="service-direction"><span aria-hidden="true" style={{ transform: `rotate(${direction.bearing}deg)` }}>↑</span><small>{direction.route ? 'Around the right end of the counter' : direction.distance < 1.4 ? 'Your next task is close by' : Math.abs(direction.bearing) > 100 ? 'Turn around toward the green marker' : direction.bearing < -25 ? 'Look left toward the green marker' : direction.bearing > 25 ? 'Look right toward the green marker' : 'Follow the green marker'}<b>{direction.distance.toFixed(1)} m</b></small></div>}
        </>}<div className="stamp-track">{customers.map((customer, i) => <i key={customer.name} className={i < servedCount ? 'earned' : ''} />)}</div></div>
        <div className="play-tools"><button onClick={openNotebook}><kbd>J</kbd> Field notes <span>{Object.keys(progress.memories).length}</span></button><button onClick={() => engineRef.current?.pause()}>Ⅱ <span>Pause</span></button></div>
        <div hidden={!!workbench} className="rail-game-hint pointer-events-none">WASD · Walk <span>Mouse / Arrows · Look</span> E · Interact <span>J · Field notes</span></div>
        </>
      )}

      {/* Loading overlay */}
      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-center max-w-md px-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
