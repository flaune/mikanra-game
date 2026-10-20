/** Small, curated beginner syllabus. Progress is independent of rendering. */
export interface Word { id: string; japanese: string; reading: string; romaji: string; english: string; note: string }
export const words: Word[] = [
  { id: 'morning', japanese: 'おはようございます', reading: 'おはようございます', romaji: 'ohayō gozaimasu', english: 'Good morning (polite)', note: 'A polite morning greeting. The shorter おはよう is for people you know well.' },
  { id: 'welcome', japanese: 'いらっしゃいませ', reading: 'いらっしゃいませ', romaji: 'irasshaimase', english: 'Welcome (said by staff)', note: 'Staff welcome customers with this phrase. Customers do not normally say it back.' },
  { id: 'coffee', japanese: 'コーヒー', reading: 'コーヒー', romaji: 'kōhī', english: 'Coffee', note: 'Katakana is often used for loanwords. Each ー lengthens the vowel before it.' },
  { id: 'water', japanese: '水', reading: 'みず', romaji: 'mizu', english: 'Water', note: 'お水 (おみず) is a polite way to refer to water when ordering.' },
  { id: 'tea', japanese: 'お茶', reading: 'おちゃ', romaji: 'ocha', english: 'Tea', note: '茶 means tea. The prefix お makes the word sound polite.' },
  { id: 'please', japanese: 'コーヒーをください', reading: 'コーヒーをください', romaji: 'kōhī o kudasai', english: 'Coffee, please', note: 'Use [thing] をください to ask for something. The particle を is pronounced “o”.' },
  { id: 'one', japanese: '一つ', reading: 'ひとつ', romaji: 'hitotsu', english: 'One item', note: 'A general-purpose counter. コーヒーを一つください means “One coffee, please”.' },
  { id: 'two', japanese: '二つ', reading: 'ふたつ', romaji: 'futatsu', english: 'Two items', note: '二つ is read ふたつ. For cups, 二杯 (にはい) is also used; we start with the general counter.' },
  { id: 'price', japanese: '四百五十円', reading: 'よんひゃくごじゅうえん', romaji: 'yonhyaku gojū en', english: '450 yen', note: '四百 = 400, 五十 = 50, 円 = yen. A coffee on our menu costs 450円.' },
  { id: 'thanks', japanese: 'ありがとうございます', reading: 'ありがとうございます', romaji: 'arigatō gozaimasu', english: 'Thank you (polite)', note: 'A polite thank-you that works with customers, colleagues, and people you have just met.' },
  { id: 'serve', japanese: 'どうぞ', reading: 'どうぞ', romaji: 'dōzo', english: 'Here you are / go ahead', note: 'Say どうぞ as you offer something. Its meaning depends on the situation.' },
  { id: 'excuse', japanese: 'すみません', reading: 'すみません', romaji: 'sumimasen', english: 'Excuse me / sorry', note: 'Use it to get someone’s attention politely, or to apologize.' },
  { id: 'cafe', japanese: '喫茶', reading: 'きっさ', romaji: 'kissa', english: 'Tea / coffee service', note: '喫茶 appears in the name 喫茶みかん. 喫茶店 (きっさてん) means coffee shop, often a traditional one.' },
  { id: 'books', japanese: '書店', reading: 'しょてん', romaji: 'shoten', english: 'Bookstore', note: 'The sign reads みどり書店: Midori Bookstore. 本屋 (ほんや) is another word for a bookstore.' },
  { id: 'cleaning', japanese: 'クリーニング', reading: 'クリーニング', romaji: 'kurīningu', english: 'Dry cleaning / cleaning service', note: 'The shop sign says さくらクリーニング. A self-service laundromat is コインランドリー.' },
  { id: 'vending', japanese: '自販機', reading: 'じはんき', romaji: 'jihanki', english: 'Vending machine', note: 'A shortened form of 自動販売機 (じどうはんばいき). Look for つめたい: cold.' },
  { id: 'object', japanese: 'を', reading: 'を', romaji: 'o', english: 'Marks the requested thing', note: 'This particle marks the object of an action. In コーヒーをください it marks coffee as the thing requested. Pronounce it “o”, even though its kana is を.' },
  { id: 'request', japanese: 'ください', reading: 'ください', romaji: 'kudasai', english: 'Please give me', note: 'Put the thing you want before をください. The same request pattern works with coffee, tea, or water.' },
  { id: 'cup', japanese: 'カップ', reading: 'カップ', romaji: 'kappu', english: 'Cup', note: 'Take a clean cup before filling it.' },
  { id: 'leaves', japanese: '茶葉', reading: 'ちゃば', romaji: 'chaba', english: 'Tea leaves', note: 'Measure tea leaves into the teapot before adding hot water.' },
  { id: 'hot-water', japanese: 'お湯', reading: 'おゆ', romaji: 'oyu', english: 'Hot water', note: 'お湯 is hot water. お水 is drinking water.' },
  { id: 'pour', japanese: '注ぐ', reading: 'そそぐ', romaji: 'sosogu', english: 'Pour', note: 'The dictionary form of the verb: pour into the cup.' },
  { id: 'wash', japanese: '洗う', reading: 'あらう', romaji: 'arau', english: 'Wash', note: 'Wash returned cups so you can use them again.' },
  { id: 'ready', japanese: 'できました', reading: 'できました', romaji: 'dekimashita', english: 'It is ready', note: 'A useful phrase when something has been completed.' },
];
export interface Question { prompt: string; japanese?: string; answers: string[]; correct: number; word: string; explanation: string }
export interface Lesson { title: string; subtitle: string; story: string; words: string[]; questions: Question[] }
export const lessons: Lesson[] = [
  { title: 'A warm welcome', subtitle: 'あいさつ / GREETINGS', story: 'Haru, the owner, waves you over. “Good morning! First, let’s learn how we greet each other—and our customers.”', words: ['morning', 'welcome'], questions: [
    { prompt: 'It is morning. Greet your new colleague politely.', answers: ['いらっしゃいませ', 'おはようございます', 'すみません'], correct: 1, word: 'morning', explanation: 'おはようございます greets a colleague in the morning. いらっしゃいませ welcomes a customer.' },
    { prompt: 'The doorbell rings. Welcome a customer into the café.', answers: ['いらっしゃいませ', 'おはようございます', 'ありがとうございます'], correct: 0, word: 'welcome', explanation: 'いらっしゃいませ is the greeting staff use when a customer enters.' },
  ] },
  { title: 'Read the menu', subtitle: 'メニュー / DRINKS', story: '“A good barista knows the menu. Take your time with the kana. That long line in コーヒー is part of the sound.”', words: ['coffee', 'water', 'tea'], questions: [
    { prompt: 'Find coffee on the menu.', answers: ['お茶', '水', 'コーヒー'], correct: 2, word: 'coffee', explanation: 'コーヒー is coffee. お茶 is tea; 水 is water.' },
    { prompt: 'A customer asks for みず. Which item should you bring?', answers: ['コーヒー', '水', 'お茶'], correct: 1, word: 'water', explanation: '水 is read みず and means water.' },
    { prompt: 'Find tea on the menu.', answers: ['お茶', '水', 'コーヒー'], correct: 0, word: 'tea', explanation: 'お茶 (おちゃ) means tea.' },
  ] },
  { title: 'One polite request', subtitle: 'をください / ASKING', story: '“Now imagine you are the customer. Put what you want before をください. The little を sounds like ‘o’.”', words: ['please', 'excuse'], questions: [
    { prompt: 'Get the barista’s attention politely.', answers: ['どうぞ', 'いらっしゃいませ', 'すみません'], correct: 2, word: 'excuse', explanation: 'すみません works as “Excuse me” when you want someone’s attention.' },
    { prompt: 'Complete “Coffee, please”: コーヒー ___ ください。', answers: ['を', 'の', 'に'], correct: 0, word: 'please', explanation: 'を marks the thing you are requesting. Here it is pronounced “o”.' },
    { prompt: 'Use the same pattern to ask for water.', answers: ['水です', '水をください', '水のコーヒー'], correct: 1, word: 'water', explanation: '水をください means “Water, please”. You can reuse this pattern with other things.' },
  ] },
  { title: 'Take an order', subtitle: 'ひとつ・ふたつ / QUANTITIES', story: 'A regular settles in by the window. “Next, listen for how many. One item is ひとつ. Two items is ふたつ.”', words: ['one', 'two'], questions: [
    { prompt: 'Read the order. How many coffees?', japanese: 'コーヒーを二つください。', answers: ['One coffee', 'Two coffees', 'Two teas'], correct: 1, word: 'two', explanation: '二つ (ふたつ) means two items. The customer wants two coffees.' },
    { prompt: 'Order one tea using the general counter.', answers: ['お茶を二つください', '水を一つください', 'お茶を一つください'], correct: 2, word: 'one', explanation: 'お茶 is tea; 一つ (ひとつ) is one item. The counter comes before ください.' },
  ] },
  { title: 'At the register', subtitle: 'お会計 / THE BILL', story: '“Our house coffee is 450 yen. Japanese prices are built from numbers, then 円. Read it once, then try without the guide.”', words: ['price', 'thanks'], questions: [
    { prompt: 'Which price matches よんひゃくごじゅうえん?', answers: ['¥450', '¥540', '¥400'], correct: 0, word: 'price', explanation: 'よんひゃく is 400, ごじゅう is 50, and えん is yen: 450円.' },
    { prompt: 'The customer pays. Thank them politely.', answers: ['すみません', 'ありがとうございます', 'いらっしゃいませ'], correct: 1, word: 'thanks', explanation: 'ありがとうございます is a polite thank-you. Use it after receiving payment.' },
  ] },
  { title: 'Your first service', subtitle: 'できました / PUT IT TOGETHER', story: '“You have got this.” Haru steps aside. Read the order, hand it over, and finish your first shift. Earlier phrases return without their guides.', words: ['serve'], questions: [
    { prompt: 'A new customer walks in. What do you say?', answers: ['ありがとうございます', 'どうぞ', 'いらっしゃいませ'], correct: 2, word: 'welcome', explanation: 'Start with いらっしゃいませ to welcome the customer.' },
    { prompt: 'Prepare the right tray for this order.', japanese: 'お茶を二つください。', answers: ['Two teas', 'One tea', 'Two coffees'], correct: 0, word: 'two', explanation: 'お茶 is tea and 二つ means two. Put two teas on the tray.' },
    { prompt: 'Offer the tray to the customer: “Here you are.”', answers: ['すみません', 'どうぞ', 'おはようございます'], correct: 1, word: 'serve', explanation: 'どうぞ fits when you offer a drink or invite someone to take it.' },
    { prompt: 'The customer thanks you. Which phrase did they use?', answers: ['いらっしゃいませ', 'コーヒーをください', 'ありがとうございます'], correct: 2, word: 'thanks', explanation: 'ありがとうございます means “Thank you”. First shift complete!' },
  ] },
];
export interface Memory { seen: number; streak: number; due: number }
export interface UseEvidence { guided: number; independent: number; visits: string[] }
export interface ChapterCheckAnswer { correct: boolean; assisted: boolean }
export interface Progress { version: 1; completed: number; memories: Record<string, Memory>; guesses?: Record<string, string>; uses?: Record<string, UseEvidence>; chapterCheck?: ChapterCheckAnswer[]; chapterCheckHelp?: number[]; alwaysHelp?: boolean; romaji: boolean; graphics: 'handheld' | 'crisp'; motion: boolean }
export const SAVE_KEY = 'mikanra.learning.v1';
export const freshProgress = (): Progress => ({ version: 1, completed: 0, memories: {}, romaji: true, graphics: 'crisp', motion: false });
export function parseProgress(raw: string | null): Progress {
  const fresh = freshProgress();
  try {
    const data = JSON.parse(raw ?? 'null');
    if (!data || data.version !== 1) return fresh;
    fresh.completed = Number.isInteger(data.completed) ? Math.max(0, Math.min(lessons.length, data.completed)) : 0;
    fresh.romaji = data.romaji !== false;
    // Question positions are meaningful; never move a later result into a broken slot.
    fresh.chapterCheck = [];
    if (Array.isArray(data.chapterCheck)) for (const answer of data.chapterCheck.slice(0, 3)) {
      if (typeof answer?.correct !== 'boolean' || typeof answer?.assisted !== 'boolean') break;
      fresh.chapterCheck.push({ correct: answer.correct, assisted: answer.assisted });
    }
    fresh.chapterCheckHelp = Array.isArray(data.chapterCheckHelp) ? [...new Set<number>(data.chapterCheckHelp.filter((index: unknown) => Number.isInteger(index) && (index as number) >= 0 && (index as number) < 3))] : [];
    fresh.alwaysHelp = data.alwaysHelp === true;
    fresh.uses = {};
    if (data.graphics === 'crisp' || data.graphics === 'handheld') fresh.graphics = data.graphics;
    fresh.motion = data.motion === true;
    fresh.guesses = {};
    for (const word of words) {
      const use = data.uses?.[word.id];
      if (use && Number.isInteger(use.guided) && Number.isInteger(use.independent)) fresh.uses[word.id] = { guided: Math.max(0, Math.min(999, use.guided)), independent: Math.max(0, Math.min(999, use.independent)), visits: Array.isArray(use.visits) ? use.visits.filter((v: unknown) => typeof v === 'string').slice(-30) : [] };
      if (typeof data.guesses?.[word.id] === 'string') fresh.guesses[word.id] = data.guesses[word.id].slice(0, 100);
      const entry = data.memories?.[word.id];
      if (entry && Number.isFinite(entry.seen) && Number.isFinite(entry.streak) && Number.isFinite(entry.due)) {
        fresh.memories[word.id] = { seen: Math.max(1, Math.min(9999, Math.floor(entry.seen))), streak: Math.max(0, Math.min(5, Math.floor(entry.streak))), due: Math.max(0, entry.due) };
      }
    }
  } catch { /* Corrupt or older saves safely start a fresh syllabus. */ }
  return fresh;
}
export function wordHelp(progress: Progress, id: string, revealed = false) {
  const use = progress.uses?.[id];
  // Notebook recall is also independent evidence; preparation itself is guided.
  const independent = Math.max(use?.independent ?? 0, progress.memories[id]?.streak ?? 0);
  return { english: !!progress.alwaysHelp || revealed || (use?.guided ?? 0) < 2,
    romaji: progress.romaji && (!!progress.alwaysHelp || revealed || independent < 2) };
}
/** A personal hypothesis and replayed audio do not reveal the dictionary answer. */
export function wordAssisted(progress: Progress, id: string, translated = false, revealedIds: readonly string[] = []): boolean {
  return wordHelp(progress, id, translated || revealedIds.includes(id)).english;
}
/** One assessed use per word per visit; physical preparation only teaches. */
export function recordUse(progress: Progress, id: string, correct: boolean, assisted: boolean, visit: string, now = Date.now()): Progress {
  if (!words.some(word => word.id === id)) return progress;
  const before = progress.uses?.[id] ?? { guided: 0, independent: 0, visits: [] };
  if (before.visits.includes(visit)) return progress;
  const next = !correct ? recordRecall(progress, id, false, now) : assisted ? discover(progress, [id], now) : recordRecall(progress, id, true, now);
  return { ...next, uses: { ...next.uses, [id]: { guided: Math.min(999, before.guided + Number(correct && assisted)), independent: Math.min(999, before.independent + Number(correct && !assisted)), visits: [...before.visits, visit].slice(-30) } } };
}
export const preparationWords = (day: number) => ['cup','leaves','hot-water', ...(day >= 2 ? ['pour','wash'] : []), ...(day >= 3 ? ['ready'] : [])];
export function discover(progress: Progress, ids: string[], now = Date.now()): Progress {
  const memories = { ...progress.memories };
  for (const id of ids) if (words.some(word => word.id === id) && !memories[id]) memories[id] = { seen: 1, streak: 0, due: now };
  return { ...progress, memories };
}
export function recordRecall(progress: Progress, id: string, correct: boolean, now = Date.now()): Progress {
  if (!words.some(word => word.id === id)) return progress;
  const before = progress.memories[id] ?? { seen: 0, streak: 0, due: now };
  const streak = correct ? Math.min(5, before.streak + 1) : 0;
  // Unassisted recall earns a longer interval; misses return after a minute.
  const intervals = [60_000, 600_000, 86_400_000, 259_200_000, 604_800_000, 1_209_600_000];
  return { ...progress, memories: { ...progress.memories, [id]: { seen: before.seen + 1, streak, due: now + intervals[streak] } } };
}
export function reviewQueue(progress: Progress, now = Date.now()): Word[] {
  return words.filter(word => progress.memories[word.id]?.due <= now).sort((a, b) => progress.memories[a.id].due - progress.memories[b.id].due);
}
export function reviewQuestion(word: Word): Question {
  const distractors = words.filter(item => item.id !== word.id);
  const index = words.indexOf(word);
  const answers = [distractors[(index + 3) % distractors.length].english, distractors[(index + 8) % distractors.length].english];
  const correct = index % 3; answers.splice(correct, 0, word.english);
  return { prompt: 'Write the meaning from memory.', japanese: word.japanese, answers, correct, word: word.id, explanation: `${word.japanese} — ${word.english}. ${word.note}` };
}
