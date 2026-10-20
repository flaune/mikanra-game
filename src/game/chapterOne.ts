import { actService, freshService, readService, trayVessels, transferTray, completeVisit, closingStep, nextServiceStep } from './cafeService';
import type { CafeService, ServiceAction, Drink } from './cafeService';
export type { Drink } from './cafeService';
export type Stage = 'briefing' | 'order' | 'brew' | 'serve' | 'pay' | 'report' | 'done';
export interface Shift {
  hired?: boolean;
  version: 1; stage: Stage; customer: number; mistakes: number; earnings: number; tray: Drink[]; helped: boolean;
  day?: number; ticket?: { drink: Drink; count: number }; translated?: boolean;
  relationships?: number[]; understoodToday?: number[]; customerMistakes?: number; greeted?: boolean;
  chatted?: boolean; chapterCompleted?: boolean; trayQuality?: boolean[]; visitPerfect?: number;
  tips?: number; perfectServed?: number; streak?: number; bestStreak?: number;
  languageHelp?: string[];
  languageMisses?: string[];
  service?: CafeService;
  comprehension?: { drink: boolean; count: boolean; assisted: string[] };
}
export const SHIFT_KEY = 'mikanra.chapter-one.v1';
export const CHAPTER_DAYS = 7;
export const POUR_SECONDS = 1.6;
export const PERFECT_POUR_START = .65;
export const PERFECT_POUR_END = .9;
export const customers = [
  { name: 'Aoi', role: 'Bookshop assistant', line: 'コーヒーを一つください。', romaji: 'Kōhī o hitotsu kudasai.', translation: 'One coffee, please.', drink: 'coffee' as Drink, count: 1, total: 450, color: 0x5c8196, farewell: '“My shop is just across the lane. Come say hello sometime.”' },
  { name: 'Ren', role: 'On a lunch break', line: 'お茶を二つください。', romaji: 'Ocha o futatsu kudasai.', translation: 'Two teas, please.', drink: 'tea' as Drink, count: 2, total: 700, color: 0xa57054, farewell: '“One for me, one for my colleague. You made our afternoon.”' },
  { name: 'Yui', role: 'Your last customer', line: 'お水を一つください。', romaji: 'Omizu o hitotsu kudasai.', translation: 'One water, please.', drink: 'water' as Drink, count: 1, total: 0, color: 0x74865b, farewell: '“ありがとうございます。Good luck with your new job!”' },
];
export const drinkPrices: Record<Drink, number> = { coffee: 450, tea: 350, water: 0 };

const weekStories = [
  { title: 'A place at the counter', arrival: 'Your first morning at Café Mikan. Haru leaves a notebook beside your new apron. Aoi from the bookshop will be your first customer; Haru stays nearby while you learn.', closing: 'You lock up beneath the unfinished poster. Tomorrow, the same faces will return with different orders.' },
  { title: 'Rain on Mikan Lane', arrival: 'Rain taps on the awning. Aoi has brought the poster inside to keep its ink from running.', closing: 'The poster is drying behind the counter. You recognize a few words that were only shapes yesterday.' },
  { title: 'Three small errands', arrival: 'Someone has drawn a lantern on the poster. Your regulars arrive carrying paper, string, and folded chairs.', closing: 'The objects belong to the same plan: a reading evening at the bookshop, four days from now.' },
  { title: 'An empty chair', arrival: 'Aoi marks a chair beside the bookshop door. She looks from the sketch to you, then waits for your reply.', closing: 'The empty chair has your name beneath it. You have been invited to help welcome the neighborhood.' },
  { title: 'A practice run', arrival: 'Ren carries a tray between the café and bookshop. Tonight is a rehearsal; each order matters to someone waiting next door.', closing: 'The rehearsal ends with warm cups and a stack of bookmarks. Repeated words are becoming familiar voices.' },
  { title: 'Before the lights', arrival: 'Yui tests a paper lantern outside. The room is nearly ready, but everyone still needs a quiet moment at your counter.', closing: 'The lantern stays lit after closing. Tomorrow, your regulars will be hosts, and you will be part of their evening.' },
  { title: 'A lane full of voices', arrival: 'The bookshop doors are open. Aoi, Ren, and Yui stop at your counter before the first guests arrive.', closing: 'Seven days after your first shift, the reading evening begins. Your notebook holds a week of guesses, corrections, and people you now know.' },
];
const arrivals = [
  ['Aoi sets a book beside the till and studies your new name badge.', 'Ren checks the clock, then waves to a colleague waiting outside.', 'Yui pauses beside the window and sketches the striped awning.'],
  ['Aoi shakes the rain from a folded poster. She carefully smooths its corners.', 'Ren arrives with two damp umbrellas and a grateful smile.', 'Yui shelters a roll of paper inside her coat.'],
  ['Aoi shows you the small lantern drawn in the margin of her poster.', 'Ren puts a bundle of folded chairs outside the door before coming in.', 'Yui has ink on her fingers and a bag of paper scraps.'],
  ['Aoi points at an empty chair in her sketch, then at your name badge.', 'Ren measures the bookshop doorway with a piece of string.', 'Yui leaves a paper lantern on the empty chair by the window.'],
  ['Aoi carries a pile of bookmarks. One has a space for your first Japanese note.', 'Ren is trying the delivery route from your counter to the bookshop.', 'Yui comes in after hanging the lanterns and rubs her tired hands.'],
  ['Aoi pauses over the first page she will read tomorrow. The corner is worn soft.', 'Ren counts the chairs, then crosses one more name off his list.', 'Yui watches the lantern outside sway gently beneath the awning.'],
  ['Aoi has tucked your bookmark inside the book she will read tonight.', 'Ren has changed out of his work jacket. He holds the door for the first guests.', 'Yui lights the lantern beside the chair reserved for you.'],
];
const farewells = [
  customers.map(customer => customer.farewell),
  ['Aoi leaves the drying poster in your care.', 'Ren carries the cups toward the umbrellas outside.', 'Yui promises to return when the paper is dry.'],
  ['Aoi traces the lantern in her drawing before leaving.', 'Ren heads next door to unfold the chairs.', 'Yui leaves a small paper scrap shaped like a leaf.'],
  ['Aoi writes your name beneath the empty chair.', 'Ren leaves enough string to hang the poster.', 'Yui turns the lantern so its little window faces your counter.'],
  ['Aoi saves one of the blank bookmarks for you.', 'Ren carries the order next door for the rehearsal.', 'Yui folds the paper leaf into a bookmark.'],
  ['Aoi says she hopes you will listen to the first reading.', 'Ren says the room is ready for tomorrow.', 'Yui leaves the lantern glowing until your shift ends.'],
  ['Aoi opens her book to the page marked with your note.', 'Ren pulls the bookshop door open and beckons you inside.', 'Yui points to your chair beneath the lantern.'],
];
const japaneseDrink: Record<Drink, string> = { coffee: 'コーヒー', tea: 'お茶', water: 'お水' };
const romajiDrink: Record<Drink, string> = { coffee: 'Kōhī', tea: 'Ocha', water: 'Omizu' };
const validDay = (day: number | undefined) => typeof day === 'number' && Number.isInteger(day) ? Math.max(1, Math.min(999, day)) : 1;
export const isFreePlay = (shift: Pick<Shift, 'day'>) => validDay(shift.day) > CHAPTER_DAYS;
const storyIndex = (day: number | undefined) => Math.min(7, validDay(day)) - 1;
const relationshipsFor = (values: unknown): number[] => customers.map((_, index) => {
  const value = Array.isArray(values) ? values[index] : 0;
  return Number.isInteger(value) ? Math.max(0, Math.min(7, value)) : 0;
});

export function dayStory(day: number): { title: string; arrival: string; closing: string } {
  if (day > CHAPTER_DAYS) return {
    title: 'Another morning at Mikan',
    arrival: 'Haru turns the sign to OPEN. The reading evening has become a happy memory, and your regulars have new orders. Take your time, try today’s café goal, and enjoy making this place your own.',
    closing: 'The last cups are washed and the till is closed. Your regulars will be back tomorrow. Chapter Two is coming soon; the café is always here for another shift.',
  };
  return { ...weekStories[storyIndex(day)] };
}
export function relationshipSummary(shift: Pick<Shift, 'relationships'>): { name: string; value: number; description: string }[] {
  const values = relationshipsFor(shift.relationships);
  return customers.map((customer, index) => ({ name: customer.name, value: values[index], description: values[index] >= 4 ? 'A friend who feels at home here' : values[index] >= 2 ? 'A familiar face who returns to you' : values[index] > 0 ? 'A neighbor you made welcome' : 'A new face to get to know' }));
}
export function customerContext(shift: Pick<Shift, 'customer' | 'day' | 'relationships'>): string {
  const trust = relationshipsFor(shift.relationships)[shift.customer] ?? 0;
  const moment = isFreePlay(shift) ? ['Aoi has found a new book to read by your window.', 'Ren waves from the doorway. “The usual place, a different drink today.”', 'Yui brings another paper leaf for the little lantern by your counter.'][shift.customer] : arrivals[storyIndex(shift.day)][shift.customer];
  const personal = isFreePlay(shift)
    ? ['She says your window seat has become her favorite place to read.', 'He still meets his retired colleague here for a quiet cup.', 'She shows you a new sketch of the lantern beside your counter.']
    : ['She admits this is her first time reading aloud for a crowd.', 'He says the reading evening is a farewell for his retiring colleague.', 'She says her grandmother taught her how to fold these lanterns.'];
  return `${moment}${trust >= 4 ? ` ${personal[shift.customer]}` : trust >= 2 ? ' Your familiar greeting makes them relax.' : ''}`;
}
export function getCustomer(state: Pick<Shift, 'customer' | 'day'>) {
  const original = customers[state.customer];
  const day = validDay(state.day);
  if (day === 1) return original;
  const drink = (['coffee', 'tea', 'water'] as Drink[])[(state.customer + day - 1) % 3];
  const count = (state.customer + day) % 2 + 1;
  return { ...original, drink, count, total: drinkPrices[drink] * count, line: `${japaneseDrink[drink]}を${count === 1 ? '一つ' : '二つ'}ください。`, translation: `${count === 1 ? 'One' : 'Two'} ${drink}${count === 2 ? 's' : ''}, please.`, romaji: `${romajiDrink[drink]} o ${count === 1 ? 'hitotsu' : 'futatsu'} kudasai.`, farewell: day > CHAPTER_DAYS ? ['Aoi leaves a bookmark beside her empty cup. “See you tomorrow.”', 'Ren waves on his way out. “Same time tomorrow?”', 'Yui sketches a tiny cup on your receipt. “For the collection.”'][state.customer] : farewells[storyIndex(day)][state.customer] };
}
export function paymentFor(state: Shift) { const total = getCustomer(state).total; return total === 0 ? 0 : total <= 500 ? 500 : 1000; }
export const newShift = (day = 1, previous?: Pick<Shift, 'relationships' | 'chapterCompleted' | 'service'>): Shift => ({ service: previous?.service ? { ...freshService(), stock: { ...previous.service.stock } } : freshService(), version: 1, stage: 'briefing', customer: 0, mistakes: 0, customerMistakes: 0, greeted: false, chatted: false, earnings: 0, tray: [], trayQuality: [], visitPerfect: 0, tips: 0, perfectServed: 0, streak: 0, bestStreak: 0, helped: validDay(day) === 1, translated: validDay(day) === 1, day: validDay(day), chapterCompleted: previous?.chapterCompleted === true || day > CHAPTER_DAYS, relationships: relationshipsFor(previous?.relationships), understoodToday: [] });
/** Advance the story once, then keep the café open without replaying the finale. */
export function nextShift(state: Shift): Shift {
  return state.stage === 'done' ? newShift(validDay(state.day) + 1, state) : state;
}
export function cafeGoal(state: Shift) {
  const index = (validDay(state.day) - 1) % 3;
  const goals = [
    { label: 'Land two perfect pours', value: state.perfectServed ?? 0, target: 2 },
    { label: 'Serve three visits without a retry', value: state.bestStreak ?? 0, target: 3 },
    { label: 'Understand two orders without a hint', value: state.understoodToday?.length ?? 0, target: 2 },
  ];
  const goal = goals[index];
  return { ...goal, value: Math.min(goal.target, goal.value), complete: goal.value >= goal.target };
}
export function chapterEnding(state: Shift) {
  const friends = relationshipSummary(state).filter(bond => bond.value >= 4).length;
  return friends >= 2
    ? 'Aoi opens the book marked with your note. Ren pulls out your chair, and Yui’s lantern lights the page. A week ago, these voices were strangers. Tonight, your friends have kept a place for you.'
    : 'Aoi opens her book, Ren pulls out your chair, and Yui lights the lantern. There are still words to discover, but you no longer have to find them alone. The reading evening begins with a place for you.';
}

const chatStories = [
  ['“I work at the bookshop across the lane. A quiet cup before opening is my favorite part of the morning.”', '“Two cups means I get to bring a little of this café back to my colleague.”', '“I draw the places I want to remember. Your awning is next on my page.”'],
  ['“I’m making a poster for a reading evening. The rain almost washed away all my work!”', '“We shared an umbrella on the way here. I think the drinks will help us dry out.”', '“Paper lanterns and rain are a terrible combination. May I leave these here?”'],
  ['“The lantern on the poster was Yui’s idea. It makes the whole thing feel warmer.”', '“Those chairs outside are for the reading evening. I volunteered before I counted them.”', '“My grandmother taught me to fold lanterns. I’m making one for every table.”'],
  ['“There’s an empty chair on my sketch. I’d like it to be yours. Will you come?”', '“We could use your welcome at the reading evening. People relax when they hear a friendly voice.”', '“This lantern is for your chair. You’re part of the neighborhood now.”'],
  ['“Would you leave a note on this bookmark? Even a little thank-you would mean a lot.”', '“I’m rehearsing the delivery route. If I spill anything, you didn’t see it.”', '“All the lanterns are up. I think I’ve earned a quiet moment here.”'],
  ['“I’m nervous about reading aloud. It helps to think of everyone as friends at a café.”', '“The reading evening is for my retiring colleague. I hope he knows we’ll miss him.”', '“Grandmother would have loved seeing her lanterns here. Thank you for looking after them.”'],
  ['“Your bookmark is in my book. I’ll look at it when I get nervous tonight.”', '“Everything is ready next door. We saved a chair for our favorite new barista.”', '“Look for the lantern beside your chair. I’ll see you there after closing.”'],
];
export function customerConversation(state: Shift) {
  const freeLines = [
    ['“Someone asked for the book we read that evening. I told them it goes well with a cup from here.”', '“I finished a new chapter this morning. What makes a good ending for you?”'],
    ['“My old colleague still stops by for a cup. Retirement hasn’t changed his favorite café.”', '“It’s a busy day, but this little break makes it feel manageable.”'],
    ['“I’m folding a new lantern. I think it needs the color of your awning.”', '“I brought my sketchbook. There’s always something new to notice here.”'],
  ];
  return {
    topic: ['Ask about the bookshop', 'Ask how the day is going', 'Ask about the lanterns'][state.customer],
    line: isFreePlay(state) ? freeLines[state.customer][validDay(state.day) % 2] : chatStories[storyIndex(state.day)][state.customer],
    replies: [
      { japanese: 'ありがとうございます', reading: 'arigatō gozaimasu', meaning: 'Thank you.', word: 'thanks', response: '“Thank you, too.” They smile. There’s a little less distance across the counter now.' },
      { japanese: 'どうぞ', reading: 'dōzo', meaning: 'Please, make yourself at home.', word: 'serve', response: '“I think I will.” They settle in by the window. Sometimes a small invitation is enough.' },
    ],
  };
}
export function readShift(raw: string | null): Shift {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (value?.version !== 1 || !['briefing','order','brew','serve','pay','report','done'].includes(value.stage) || !Number.isInteger(value.customer) || value.customer < 0 || value.customer > 2) return newShift();
    const customer = ['report','done'].includes(value.stage) ? 2 : value.stage === 'briefing' ? 0 : value.customer;
    const day = validDay(value.day);
    const earnings = customers.slice(0, ['report','done'].includes(value.stage) ? 3 : customer).reduce((sum, _, index) => sum + getCustomer({ customer: index, day }).total, 0);
    const expected = getCustomer({ customer, day });
    const ticket = ['brew','serve','pay'].includes(value.stage) && value.ticket?.drink === expected.drink && value.ticket?.count === expected.count ? { drink: expected.drink, count: expected.count } : undefined;
    const helped = (day === 1 && customer === 0) || value.helped === true;
    const mistakes = Number.isInteger(value.mistakes) && value.mistakes >= 0 ? value.mistakes : 0;
    const understoodToday = Array.isArray(value.understoodToday) ? value.understoodToday.filter((index: unknown, position: number, indices: unknown[]) => Number.isInteger(index) && (index as number) >= 0 && (index as number) < (['report', 'done'].includes(value.stage) ? 3 : customer) && indices.indexOf(index) === position) : [];
    const bounded = (field: unknown, max: number) => Number.isInteger(field) ? Math.max(0, Math.min(max, field as number)) : 0;
    const cups = ['brew','serve'].includes(value.stage) && Array.isArray(value.tray) ? value.tray.map((drink: unknown, index: number) => ({ drink, perfect: value.trayQuality?.[index] === true })).filter((cup: { drink: unknown }) => ['coffee','tea','water'].includes(cup.drink as string)).slice(0,2) : [];
    const service = readService(value.service, cups.map((cup: { drink: Drink }) => cup.drink), cups.map((cup: { perfect: boolean }) => cup.perfect), value.stage === 'pay' ? expected.count : 0);
    // Vessels own the tray. Old cached arrays can disagree after an interrupted save.
    if (!['brew','serve'].includes(value.stage)) service.vessels = service.vessels.map(cup => cup.state === 'tray' ? { id: cup.id, state: 'dirty' } : cup);
    if (value.stage !== 'pay') service.vessels = completeVisit(service, day).vessels;
    const loadedTray = trayVessels(service);
    return { languageMisses: Array.isArray(value.languageMisses) ? value.languageMisses.filter((id: unknown) => typeof id === 'string').slice(0,20) : [], languageHelp: Array.isArray(value.languageHelp) ? value.languageHelp.filter((id: unknown) => typeof id === 'string').slice(0,20) : [], service, comprehension: value.comprehension && typeof value.comprehension.drink === 'boolean' && typeof value.comprehension.count === 'boolean' ? { drink: value.comprehension.drink, count: value.comprehension.count, assisted: Array.isArray(value.comprehension.assisted) ? value.comprehension.assisted.filter((id: unknown) => typeof id === 'string').slice(0, 20) : [] } : undefined, hired: value.hired === true || value.stage !== 'briefing' || day > 1, version: 1, stage: value.stage, customer, day, ticket, helped, translated: value.translated === true || (value.translated === undefined && helped), mistakes, customerMistakes: Number.isInteger(value.customerMistakes) && value.customerMistakes >= 0 ? Math.min(mistakes, value.customerMistakes) : mistakes, greeted: ['order','brew','serve','pay'].includes(value.stage) && value.greeted === true, earnings, relationships: relationshipsFor(value.relationships), understoodToday,
      chatted: ['order','brew','serve','pay'].includes(value.stage) && value.chatted === true,
      chapterCompleted: value.chapterCompleted === true || day > CHAPTER_DAYS || (day === CHAPTER_DAYS && value.stage === 'done'),
      tray: loadedTray.map(cup => cup.drink!), trayQuality: loadedTray.map(cup => cup.perfect === true),
      visitPerfect: value.stage === 'pay' ? bounded(value.visitPerfect, expected.count) : 0,
      tips: bounded(value.tips, 150), perfectServed: bounded(value.perfectServed, 6), streak: bounded(value.streak, 3), bestStreak: bounded(value.bestStreak, 3) };
  } catch { return newShift(); }
}
export type ShiftAction = { type: 'checkout'; total: number; change: number } | { type: 'service'; action: ServiceAction } | { type: 'hire' } | { type: 'begin' } | { type: 'greet'; correct: boolean } | { type: 'chat'; reply: number } | { type: 'listen' } | { type: 'help' } | { type: 'clue' } | { type: 'consult'; word?: string } | { type: 'prepare'; drink: Drink; perfect?: boolean } | { type: 'serve' } | { type: 'clear' } | { type: 'collect' } | { type: 'finish' } | { type: 'take-order'; drink: Drink; count: number; assisted?: string[] };
export function actShift(state: Shift, action: ShiftAction): { state: Shift; message: string; word?: string } {
  const customer = getCustomer(state);
  if (action.type === 'service') {
    const recipeActive = ['brew','serve'].includes(state.stage);
    const housekeeping = action.action.type === 'station' && ['sink','pantry','wipe','return'].includes(action.action.station);
    const continuingWork = ['tick','release'].includes(action.action.type);
    if (!recipeActive && (state.stage === 'done' || (!housekeeping && !continuingWork))) return { state, message: 'Confirm an order before preparing drinks.' };
    const result = actService(state.service ?? readService(null, state.tray, state.trayQuality), action.action, validDay(state.day));
    if (result.state === state.service) return { state, message: result.message };
    const cups = trayVessels(result.state);
    return { state: { ...state, service: result.state, tray: cups.map(cup => cup.drink!), trayQuality: cups.map(cup => cup.perfect === true) }, message: result.message, word: result.word };
  }

  if (state.stage === 'briefing' && action.type === 'hire') return { state: { ...state, hired: true }, message: 'Haru hands you an apron. Walk around the right end of the counter and meet him at the register.' };
  const mistake = () => ({ ...state, mistakes: state.mistakes + 1, customerMistakes: (state.customerMistakes ?? 0) + 1 });
  if (['order','brew','serve','pay'].includes(state.stage) && state.greeted && !state.chatted && action.type === 'chat') {
    const reply = customerConversation(state).replies[action.reply];
    if (!reply) return { state, message: 'Choose a reply to keep the conversation going.' };
    const relationships = relationshipsFor(state.relationships);
    relationships[state.customer] = Math.min(7, relationships[state.customer] + 1);
    return { state: { ...state, chatted: true, relationships }, message: `${reply.response} Your friendship grows. Asking for language help never takes that away.` };
  }
  if (state.stage === 'order' && action.type === 'greet') {
    if (state.greeted) return { state, message: `${customer.name} has already returned your greeting. Listen to their order.` };
    if (action.correct !== true) return { state: { ...mistake(), languageMisses: [...new Set([...(state.languageMisses ?? []),'welcome'])] }, message: `${customer.name} waits by the counter. Try a greeting that welcomes them in.` };
    return { state: { ...state, greeted: true }, message: `${customer.name} returns your greeting and steps up to the register.` };
  }
  if (state.stage === 'order' && action.type === 'take-order') {
    const orderWords = [customer.drink, customer.count === 2 ? 'two' : 'one'];
    const assisted = [...new Set([...(action.assisted ?? []), ...(state.languageHelp ?? []).filter(word => orderWords.includes(word)), ...(state.translated || (state.helped && !state.languageHelp?.length) ? orderWords : [])])];
    if (action.drink !== customer.drink || action.count !== customer.count) return { state: { ...mistake(), languageMisses: [...new Set([...(state.languageMisses ?? []), ...(action.drink !== customer.drink ? [customer.drink] : []), ...(action.count !== customer.count ? [customer.count === 2 ? 'two' : 'one'] : [])])], comprehension: { drink: action.drink === customer.drink, count: action.count === customer.count, assisted } }, message: `${customer.name} shakes their head and repeats: 「${customer.line}」. Check the drink and the number of cups.` };
    return { state: { ...state, stage: 'brew', tray: [], trayQuality: [], ticket: { drink: action.drink, count: action.count }, comprehension: { drink: true, count: true, assisted } }, message: 'Order confirmed. Follow the recipe at the counter, then bring the finished cups to your customer.' };
  }
  if (state.stage === 'pay' && action.type === 'checkout') {
    if (action.total !== customer.total || action.change !== paymentFor(state) - customer.total) return { state: mistake(), message: 'The till does not balance. Add the menu prices, then subtract the bill from the cash received.' };
    return actShift(state, { type: 'collect' });
  }
  if (['order','brew','serve','pay'].includes(state.stage) && action.type === 'clue') {
    const aroma = { coffee: 'the warm, roasted aroma near the grinder', tea: 'the green leaves beside the kettle', water: 'the clear pitcher catching the window light' }[customer.drink];
    const clue = (state.customer + validDay(state.day)) % 2 === 0 ? `${customer.name} glances toward ${aroma}. They repeat the first word slowly.` : `${customer.name} holds up ${customer.count === 1 ? 'one finger' : 'two fingers'}, then gestures toward the empty cups. Listen for the word after を.`;
    const word = (state.customer + validDay(state.day)) % 2 === 0 ? customer.drink : customer.count === 2 ? 'two' : 'one';
    return { state: { ...state, helped: true, translated: state.translated ?? state.helped, languageHelp: [...new Set([...(state.languageHelp ?? []), word])] }, message: clue };
  }
  if (['order','brew','serve','pay'].includes(state.stage) && action.type === 'consult' && action.word) return { state: { ...state, languageHelp: [...new Set([...(state.languageHelp ?? []), action.word])] }, message: 'The meaning is beside the Japanese. Help is always welcome.' };
  if (['order','brew','serve','pay'].includes(state.stage) && action.type === 'consult') return { state: { ...state, helped: true, translated: state.translated ?? state.helped, languageHelp: [...new Set([...(state.languageHelp ?? []), customer.drink, customer.count === 2 ? 'two' : 'one'])] }, message: 'You check a word in the dictionary. Keep its meaning in mind for the next encounter.' };
  if (['order','brew','serve','pay'].includes(state.stage) && action.type === 'help') return { state: { ...state, helped: true, translated: true }, message: `${customer.line} · ${customer.translation}` };
  if (state.stage === 'briefing' && action.type === 'begin') return { state: { ...state, stage: 'order', hired: true }, message: `${dayStory(state.day ?? 1).arrival} ${customerContext(state)}` };
  if (state.stage === 'order' && action.type === 'listen') return { state: { ...state, stage: 'brew', tray: [], trayQuality: [], helped: true }, message: `${customer.name}'s order is on your ticket. Prepare the drinks, then bring your tray back.` };
  if (['brew','serve'].includes(state.stage) && action.type === 'prepare') {
    if (state.service) return { state, message: 'Prepare the recipe and move its finished cup onto the tray.' };
    if (state.tray.length >= 2) return { state, message: 'Your tray holds two cups. Serve it or clear it at the return station.' };
    const tray = [...state.tray, action.drink];
    const trayQuality = [...state.tray.map((_, index) => state.trayQuality?.[index] === true), action.perfect === true];
    return { state: { ...state, tray, trayQuality, stage: 'brew' }, message: `${action.perfect ? 'Perfect pour! +¥25 tip when served. ' : ''}${action.drink === 'coffee' ? 'コーヒー · kōhī' : action.drink === 'tea' ? 'お茶 · ocha' : 'お水 · omizu'} ready. ${tray.length} ${tray.length === 1 ? 'cup' : 'cups'} on your tray.` };
  }
  if (['brew','serve'].includes(state.stage) && action.type === 'clear' && state.service) return actShift(state, { type: 'service', action: { type: 'station', station: 'return' } });
  if (['brew','serve'].includes(state.stage) && action.type === 'clear') return { state: { ...state, tray: [], trayQuality: [], stage: 'brew' }, message: 'Tray cleared. Check the order and prepare a fresh tray.' };
  if (['brew','serve'].includes(state.stage) && action.type === 'serve') {
    if (!state.tray.length) return { state, message: 'Your tray is empty. Prepare a drink before offering it.' };
    if (state.tray.length !== customer.count || state.tray.some(drink => drink !== customer.drink)) {
      return { state: { ...mistake(), stage: 'brew', service: state.service ? transferTray(state.service, false, validDay(state.day)) : undefined, tray: [], trayQuality: [] }, message: `${customer.name}: “${customer.line}” (${customer.translation}) Haru takes the returned tray. Prepare ${customer.count} ${customer.drink}${customer.count > 1 ? 's' : ''} and try again.` };
    }
    return { state: { ...state, stage: 'pay', service: state.service ? transferTray(state.service, true) : undefined, tray: [], trayQuality: [], visitPerfect: state.tray.filter((_, index) => state.trayQuality?.[index]).length }, message: `${customer.name}: “ありがとうございます！” Arigatō gozaimasu — thank you! ${customer.total ? 'Your customer left payment at the register.' : 'Water is free. Close the visit at the register.'}` };
  }
  if (state.stage === 'pay' && action.type === 'collect') {
    const understood = state.comprehension ? state.comprehension.drink && state.comprehension.count && state.comprehension.assisted.length === 0 && !(state.languageMisses?.length) : !state.helped && !(state.languageMisses?.length);
    const relationships = relationshipsFor(state.relationships);
    relationships[state.customer] = Math.min(7, relationships[state.customer] + 1);
    const understoodToday = [...(state.understoodToday ?? []), ...(understood ? [state.customer] : [])];
    const streak = (state.customerMistakes ?? 0) === 0 ? (state.streak ?? 0) + 1 : 0;
    const perfect = state.visitPerfect ?? 0;
    const next: Shift = { ...state, service: state.service ? completeVisit(state.service, validDay(state.day)) : undefined, comprehension: undefined, languageMisses: [], languageHelp: [], relationships, understoodToday, earnings: state.earnings + customer.total, tips: (state.tips ?? 0) + perfect * 25, perfectServed: (state.perfectServed ?? 0) + perfect, visitPerfect: 0, streak, bestStreak: Math.max(streak, state.bestStreak ?? 0), tray: [], trayQuality: [], ticket: undefined, helped: false, translated: false, customerMistakes: 0, greeted: false, chatted: false, customer: Math.min(2, state.customer + 1), stage: state.customer === 2 ? 'report' : 'order' };
    const feedback = understood ? `${customer.name} smiles: you understood each other without a hint. Your friendship grows.` : `${customer.name} thanks you for taking the time to understand. Your friendship grows, with or without language help.`;
    return { state: next, message: `${customer.farewell} ${feedback} ${state.customer === 2 ? dayStory(state.day ?? 1).closing : customerContext(next)}` };
  }
  if (state.stage === 'report' && action.type === 'finish') {
    if (state.service && validDay(state.day) >= 2 && closingStep(state.service)) return { state, message: 'Finish the closing tasks before closing the till.' };
    const finale = validDay(state.day) === CHAPTER_DAYS;
    return { state: { ...state, stage: 'done', chapterCompleted: state.chapterCompleted || finale || isFreePlay(state) }, message: finale ? `${chapterEnding(state)} Chapter One complete. Chapter Two is coming soon. Keep running Café Mikan in free play.` : `${dayStory(state.day ?? 1).closing} The next morning brings another chance to understand.` };
  }
  return { state, message: 'Follow your current objective to continue the shift.' };
}
export function shiftObjective(state: Shift): string {
  return serviceGuide(state).title;
}

/** Shared by the checklist and world marker so they always describe the same task. */
export function serviceGuide(state: Shift) {
  const customer = getCustomer(state);
  if (state.stage === 'briefing') return state.hired || validDay(state.day) > 1
    ? { step: -1, target: 'shift-register', title: 'Walk around the counter and open the café', hint: 'Use the gap at the right end. Look at the register and press E.' }
    : { step: -1, target: 'barista', title: 'Talk to Haru about the job', hint: 'Walk toward the owner behind the counter. Look at him and press E.' };
  if (state.stage === 'order') return state.greeted
    ? { step: 1, target: 'shift-customer', title: `Listen to ${customer.name}’s order`, hint: 'Press E to talk. Listen, choose the drink and cups, then repeat the order.' }
    : { step: 0, target: 'shift-customer', title: `Welcome ${customer.name}`, hint: 'Look at your customer and press E. Say a greeting to begin.' };
  if (['brew', 'serve'].includes(state.stage)) {
    const wrongTray = state.tray.some(drink => drink !== customer.drink) || state.tray.length > customer.count;
    if (wrongTray) return { step: 2, target: 'shift-return', title: 'Return the extra or incorrect cups', hint: 'Press E at Return tray, empty it, then prepare your confirmed order again.' };
    if (state.tray.length < customer.count && state.service) {
      const task = nextServiceStep(state.service, state.ticket?.drink ?? customer.drink, validDay(state.day));
      return { step: 2, target: `shift-${task.station}`, title: task.label, hint: task.waiting ? 'Brewing continues while you tidy. There is no time penalty.' : `${task.hold ? 'Hold' : 'Press'} E · ${task.japanese}` };
    }
    if (state.tray.length < customer.count) return { step: 2, target: `shift-${customer.drink}`, title: `Prepare ${customer.count - state.tray.length} more ${customer.drink} ${customer.count - state.tray.length === 1 ? 'cup' : 'cups'}`, hint: 'Hold E to fill. Release in the green zone for a perfect pour, or keep holding for a regular cup.' };
    return { step: 3, target: 'shift-customer', title: `Serve your tray to ${customer.name}`, hint: 'Walk to your customer, press E, and offer the tray with どうぞ (dōzo).' };
  }
  if (state.stage === 'pay') return { step: 4, target: 'shift-register', title: 'Finish the visit at the register', hint: 'Press E at the till. Read the price, return change, and thank your customer.' };
  if (state.stage === 'report' && state.service && validDay(state.day) >= 2) {
    const task = closingStep(state.service);
    if (task) return { step: 5, target: `shift-${task.station}`, title: task.label, hint: `${task.hold ? 'Hold' : 'Press'} E · Put the café to bed before reviewing the till.` };
  }
  if (state.stage === 'report') return { step: 5, target: 'shift-register', title: 'All three customers served — close the café', hint: 'Press E at the register to talk to Haru and finish today’s shift.' };
  return { step: 5, target: 'shift-register', title: validDay(state.day) === CHAPTER_DAYS ? 'Chapter One complete · Chapter Two coming soon' : 'Shift complete. Your next morning is waiting.', hint: state.chapterCompleted ? 'Press E at the register to keep running the café in free play, or explore the lane.' : 'Press E at the register to come back tomorrow, or explore the lane.' };
}

export function spokenPrice(total: number) {
  return ({ 0: '零円です。', 350: '三百五十円です。', 450: '四百五十円です。', 700: '七百円です。', 900: '九百円です。' } as Record<number, string>)[total] ?? `${total}円です。`;
}
