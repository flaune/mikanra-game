import JapaneseWord from './JapaneseWord';
import { wordAssisted } from '@/game/learning';
import { closingStep } from '@/game/cafeService';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { actShift, getCustomer, paymentFor, drinkPrices, dayStory, spokenPrice, customerContext, customerConversation } from '@/game/chapterOne';
import type { Shift, ShiftAction, Drink } from '@/game/chapterOne';
import type { Progress } from '@/game/learning';
import DecodedOrder from './DecodedOrder';
import DialogueBox from './DialogueBox';
import ShiftSummary from './ShiftSummary';
import { SpeakButton } from './LearningPanel';
import { pronounce } from '@/game/pronunciation';

interface Props {
  target: string; shift: Shift; progress: Progress; notesOpen: boolean;
  onChange: (shift: Shift) => void; onGuess: (id: string, meaning: string) => void;
  onCheck: (index: number, correct: boolean, assisted: boolean) => void;
  onCheckHelp?: (index: number) => void;
  onUse: (id: string, correct: boolean, assisted: boolean) => void;
  onDiscover: (ids: string[]) => void; onRecall: (id: string, correct: boolean) => void;
  onClose: () => void; onPractice: () => void; onNotebook: () => void; onRestart: () => void;
}
const menu: { id: Drink; label: string; reading: string }[] = [
  { id: 'coffee', label: 'コーヒー', reading: 'kōhī' }, { id: 'tea', label: 'お茶', reading: 'ocha' }, { id: 'water', label: 'お水', reading: 'omizu' },
];
const say = (text: string) => { void pronounce(text).finished.catch(() => {}); };
const morningGuidance = (day: number) => [
  'Today I’ll guide each recipe and handle the returned cups. Take your time with the kettle, teapot, coffee machine, and pitcher.',
  'Today the returned cups are yours to wash. Four reusable vessels are enough: wash the returned cups together at the cleanup workbench while the kettle heats or the tea steeps.',
  'Today you manage the tea leaves and coffee beans too. The pantry has free refills. Check stock and wash cups while a drink brews.',
  'You know the routine now. Familiar Japanese meanings will fade as you use them. Kana and listening stay available, and you can reveal any meaning.',
  'Our reading evening is getting close. A neighbor may wait behind your customer. Finish one ticket at a time; nobody is in a hurry.',
  'This morning is our reading-evening rehearsal. Bring together greeting, careful preparation, clean cups, stocked ingredients, and a friendly goodbye.',
  'The reading evening is here. Run one warm morning together, then close up and join the neighbors. There is an optional Japanese check afterward.',
][Math.min(6, Math.max(0, day - 1))];

/** Conversations belong to the person or workstation the player actually reached. */
export default function ShiftPanel({ target, shift, progress, notesOpen, onChange, onGuess, onDiscover, onUse, onCheck, onCheckHelp, onClose, onPractice, onNotebook, onRestart }: Props) {
  const [page, setPage] = useState(0);
  const [drink, setDrink] = useState<Drink | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [thanked, setThanked] = useState(false);
  const [bill, setBill] = useState('');
  const [change, setChange] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeSpeaker, setNoticeSpeaker] = useState('');
  const [chatting, setChatting] = useState(false);
  const [chatReply, setChatReply] = useState('');
  const customer = getCustomer(shift);
  const conversation = customerConversation(shift);
  const assisted = shift.translated ?? shift.helped;
  const supported = (id: string) => wordAssisted(progress, id, assisted, shift.languageHelp);
  const assistIds = [customer.drink,customer.count === 2 ? 'two' : 'one'].filter(supported);
  const act = (action: ShiftAction) => {
    const result = actShift(shift, action);
    onChange(result.state); setMessage(result.message);
    if (action.type === 'checkout') setNoticeSpeaker(customer.name);
    return result;
  };
  const chatButton = shift.greeted && !shift.chatted ? <button className="customer-chat-button" onClick={() => { setChatting(true); setChatReply(''); }}>{conversation.topic} <small>Optional chat · ♥</small></button> : null;
  const checkout = (total: number, returned: number) => {
    const result = act({ type: 'checkout', total, change: returned });
    if (result.state.stage !== 'pay') { onDiscover(['thanks']); setNotice(result.message); }
  };
  const box = (speaker: string, text: string, children?: ReactNode, onContinue?: () => void, continueLabel?: string, spokenText?: string) => <DialogueBox key={`${speaker}-${shift.stage}-${page}-${notice}`} speaker={speaker} text={text} spokenText={spokenText ?? (text.includes('ありがとうございます') ? 'ありがとうございます' : undefined)} onClose={onClose} onContinue={onContinue} continueLabel={continueLabel}>{children}</DialogueBox>;
  let content;
  if (notice) content = box(noticeSpeaker || customer.name, notice, undefined, onClose, 'Return to work');
  else if (shift.stage === 'report' && (shift.day ?? 1) >= 2 && shift.service && closingStep(shift.service)) content = box('Haru', `A good shift ends with a clean café. ${closingStep(shift.service)!.label}. Follow the marker, then return to the till.`, undefined, onClose, 'Finish closing tasks');
  else if (shift.stage === 'report' || shift.stage === 'done') content = <ShiftSummary progress={progress} onCheck={onCheck} onCheckHelp={onCheckHelp} shift={shift} wordCount={Object.keys(progress.memories).length} onFinish={() => act({ type: 'finish' })} onNext={() => { onRestart(); onClose(); }} onClose={onClose} />;
  else if (chatting) content = box(customer.name, chatReply || conversation.line, chatReply ? undefined : <>
    <p className="order-instruction">A small reply is enough. Both are friendly; this is a conversation.</p>
    {conversation.replies.map((reply, index) => <button className="chat-reply" key={reply.word} onClick={() => {
      say(reply.japanese); onDiscover([reply.word]); setChatReply(act({ type: 'chat', reply: index }).message);
    }}><span lang="ja">{reply.japanese}</span>{progress.romaji && <small>{reply.reading}</small>}<small>{reply.meaning}</small></button>)}
  </>, () => { setChatting(false); setChatReply(''); setMessage(''); }, chatReply ? 'Back to their order' : 'Listen to their order');
  else if (shift.stage === 'briefing') {
    if (!shift.hired && (shift.day ?? 1) === 1) {
      const lines = [
        'You came about the help-wanted notice? I’m Haru. Welcome to Café Mikan.',
        'This is Chapter One: seven mornings at Café Mikan, leading up to the neighborhood reading evening. Listen, make drinks, and get to know the people who return.',
        'How about a paid trial shift this morning?',
      ];
      content = box('Haru', lines[page], page === 2 ? <><button onClick={() => act({ type: 'hire' })}>I’d like to try.</button><button onClick={onClose}>Let me look around first.</button></> : undefined, page < 2 ? () => setPage(page + 1) : undefined);
    } else if (target === 'barista') content = box('Haru', 'Your apron is on the hook. Follow the green marker around the right end of the counter to the register. We’ll learn the Japanese for each task as we work: welcome, order, prepare, serve, and payment.', <button onClick={onPractice}>Practice a few words</button>, onClose, 'Put on your apron');
    else content = box('Haru', `${dayStory(shift.day ?? 1).title}\n${dayStory(shift.day ?? 1).arrival}\n${morningGuidance(shift.day ?? 1)}\nReady? Open the café and welcome your first customer.`, undefined, () => { act({ type: 'begin' }); onClose(); }, 'Open the café');
  } else if (target === 'barista') {
    content = box('Haru', message || `${morningGuidance(shift.day ?? 1)}\n${shift.stage === 'order' ? 'Welcome them with 「いらっしゃいませ」. Listen for the drink and number of cups. Take a moment to chat if you like. Asking for help never costs friendship.' : ['brew', 'serve'].includes(shift.stage) ? 'Press E near a preparation tool to settle at the workbench. Follow its next action to grind, brew or pour. Clean cups and the serving tray are handled for you. Escape steps away; your progress stays.' : 'Choose the bill and count out change at the register. Water is free; just thank your customer.'}`, <><button onClick={() => act({ type: 'help' })}>Help with this order</button><button onClick={onPractice}>Practice words</button></>, onClose, 'Thanks, Haru');
  } else if (target === 'shift-return') {
    content = box('Return station', message || `There are ${shift.tray.length} cups on your tray. You can empty it here and try again.`, shift.tray.length ? <button onClick={() => { act({ type: 'clear' }); onClose(); }}>Return the cups</button> : undefined, onClose, 'Back to work');
  } else if (shift.stage === 'order') {
    content = !shift.greeted ? box(customer.name, `${customerContext(shift)}\nHow will you welcome them?`, <>
      {supported('welcome') && <div className="phrase-hint"><span>HARU’S TIP · STAFF GREETING</span><JapaneseWord id="welcome" progress={progress} revealed={supported('welcome')} /><SpeakButton text="いらっしゃいませ" autoPlay /></div>}
      {[{ id: 'thanks', phrase: 'ありがとうございます' }, { id: 'welcome', phrase: 'いらっしゃいませ' }, { id: 'excuse', phrase: 'すみません' }].map(({ id, phrase }) => <button key={id} onClick={() => {
      say(phrase);
      const correct = phrase === 'いらっしゃいませ';
      onUse('welcome', correct, supported('welcome'));
      act({ type: 'greet', correct });
      if (correct) onDiscover([customer.drink, customer.count === 2 ? 'two' : 'one', 'object', 'request']);
    }}><JapaneseWord id={id} progress={progress} revealed={supported(id)} /></button>)}
      {!supported('welcome') && <button onClick={() => { act({ type: 'consult', word: 'welcome' }); }}>Teach me the greeting</button>}
      {message && <p className="jrpg-feedback" role="status">{message}</p>}</>) : box(customer.name, customer.line, <>
      <p className="order-instruction">Listen for the drink and number of cups. Tap a word to hear it on its own.</p>
      <div className="jrpg-order"><DecodedOrder drink={customer.drink} count={customer.count} helped={shift.translated ?? shift.helped} progress={progress} onGuess={onGuess} revealedIds={shift.languageHelp} onReveal={id => act({ type: 'consult', word: id })} /></div>
      <div className="order-choice-group" role="group" aria-label="Choose a drink"><span>1. Drink</span>{menu.map(item => <button key={item.id} aria-pressed={drink === item.id} onClick={() => { setDrink(item.id); say(item.label); }}><JapaneseWord id={item.id} progress={progress} revealed={supported(item.id)} /></button>)}</div>
      <div className="order-choice-group" role="group" aria-label="Choose number of cups"><span>2. Cups</span>{[1, 2].map(value => <button key={value} aria-pressed={count === value} onClick={() => { setCount(value); say(value === 1 ? '一つ' : '二つ'); }}><JapaneseWord id={value === 1 ? 'one' : 'two'} progress={progress} revealed={supported(value === 1 ? 'one' : 'two')} /></button>)}</div>
      <button disabled={!drink || count === null} onClick={() => {
        if (!drink || count === null) return;
        onUse(customer.drink, drink === customer.drink, supported(customer.drink));
        onUse(customer.count === 2 ? 'two' : 'one', count === customer.count, supported(customer.count === 2 ? 'two' : 'one'));
        const result = act({ type: 'take-order', drink, count, assisted: assistIds });
        if (result.state.stage === 'brew') setNotice(`They nod. Your order ticket is ready. Press E at a work area and follow the guided recipe. Clean cups are placed for you and finished drinks move onto your tray. Escape steps away, then bring the tray back here.`);

      }}>Repeat the order</button>
      {chatButton}
      <button onClick={() => act({ type: 'clue' })}>Watch their gesture</button><button onClick={() => act({ type: 'help' })}>Teach me this order</button>
      {message && <p className="jrpg-feedback" role="status">{message}</p>}
    </>, undefined, undefined, customer.line);
  } else if (['brew', 'serve'].includes(shift.stage)) {
    content = box(customer.name, message || (shift.tray.length ? `You bring ${shift.tray.length} ${shift.tray.length === 1 ? 'cup' : 'cups'} to the counter. 「${customer.line}」` : `「${customer.line}」\nThey wait while you prepare the drinks. Press E at a work area to prepare the order. Your finished drinks move onto the tray automatically.`), target === 'shift-customer' && shift.tray.length ? <>
      <p className="order-instruction">What will you say as you offer the tray?</p>
      {supported('serve') && <div className="phrase-hint"><JapaneseWord id="serve" progress={progress} revealed={supported('serve')} /><SpeakButton text="どうぞ" autoPlay /></div>}
      {[{ id: 'excuse', phrase: 'すみません' }, { id: 'serve', phrase: 'どうぞ' }, { id: 'welcome', phrase: 'いらっしゃいませ' }].map(({ id, phrase }) => <button key={id} onClick={() => {
        say(phrase);
        const correct = id === 'serve';
        onUse('serve', correct, supported('serve'));
        if (!correct) { setMessage('Try a phrase that offers something to your customer. The tray is still with you.'); return; }
        const result = act({ type: 'serve' });
        if (result.state.stage === 'pay') setNotice('ありがとうございます！\nThey take the drinks and leave their payment by the till. Return to the register to finish the visit.');
      }}><JapaneseWord id={id} progress={progress} revealed={supported(id)} /></button>)}
      {!supported('serve') && <button onClick={() => act({ type: 'consult', word: 'serve' })}>Help with the serving phrase</button>}
    </> : undefined, onClose, shift.tray.length ? target === 'shift-register' ? 'Bring the tray to your customer' : 'Back to work' : 'Prepare the drinks');
  } else if (shift.stage === 'pay') {
    content = target !== 'shift-register' ? box(customer.name, 'ありがとうございます！\nYour payment is waiting at the register.', chatButton, onClose, 'Go to the till') : box(customer.name, paymentFor(shift) ? `They place ¥${paymentFor(shift)} on the till. Tell them the total, then count out their change.` : 'Water is on the house. A warm thank-you is all you need.', <>
      <div className="phrase-hint"><span>SAY THE TOTAL</span><p lang="ja">{spokenPrice(customer.total)}</p><small>“It’s {customer.total} yen.”{(assisted || message) && paymentFor(shift) > 0 && <><br />{customer.count} × ¥{drinkPrices[customer.drink]} = ¥{customer.total} · Change: ¥{paymentFor(shift) - customer.total}</>}</small><SpeakButton text={spokenPrice(customer.total)} autoPlay /></div>
      {!thanked ? <div className="order-choice-group" role="group" aria-label="Thank your customer"><span>Thank your customer</span>{[{ id: 'welcome', phrase: 'いらっしゃいませ' }, { id: 'thanks', phrase: 'ありがとうございます' }, { id: 'morning', phrase: 'おはようございます' }].map(({ id, phrase }) => <button key={id} onClick={() => {
        say(phrase);
        const correct = id === 'thanks';
        onUse('thanks', correct, supported('thanks'));
        if (correct) { setThanked(true); onDiscover(['thanks']); setMessage('They smile. Now finish the payment.'); }
        else setMessage('Choose a phrase that thanks your customer. You can ask Haru for its meaning.');
      }}><JapaneseWord id={id} progress={progress} revealed={supported(id)} /></button>)}{!supported('thanks') && <button onClick={() => act({ type: 'consult', word: 'thanks' })}>Help with the thank-you phrase</button>}</div> : <p role="status" lang="ja">ありがとうございます！</p>}
      {paymentFor(shift) > 0 ? <>
        <div className="till-totals" role="group" aria-label="Choose the bill total"><span>Bill</span>{[350, 450, 700, 900].map(total => <button key={total} aria-pressed={bill === String(total)} onClick={() => { setBill(String(total)); say(spokenPrice(total)); }}>¥{total}</button>)}</div>
        <div className="jrpg-payment"><label>Bill ¥<input aria-label="Bill amount" inputMode="numeric" value={bill} onChange={event => setBill(event.target.value.replace(/\D/g, '').slice(0, 4))} /></label><label>Change ¥<input aria-label="Change amount" inputMode="numeric" value={change} onChange={event => setChange(event.target.value.replace(/\D/g, '').slice(0, 4))} /></label></div>
        <div className="till-coins" role="group" aria-label="Count out change"><span>Add coins</span>{[500, 100, 50, 10].map(coin => <button key={coin} aria-label={`Add ${coin} yen to change`} onClick={() => setChange(String(Math.min(9999, Number(change) + coin)))}>+¥{coin}</button>)}<button onClick={() => setChange('0')}>Clear change</button></div>
        <button disabled={!thanked || !bill.length || !change.length} onClick={() => checkout(Number(bill), Number(change))}>Return change · Finish the visit</button>
      </> : <button disabled={!thanked} onClick={() => checkout(0, 0)}>Finish the visit</button>}
      {chatButton}
      <small>{menu.map(item => `${item.label} ¥${drinkPrices[item.id]}`).join(' · ')}</small>
      {message && <p className="jrpg-feedback" role="status">{message}</p>}
    </>);
  }
  return <div className="jrpg-service" hidden={notesOpen}>
    <nav className="jrpg-service-tools" aria-label="Conversation tools"><button onClick={onNotebook}>Word notebook</button></nav>
    {content}
  </div>;
}
