import type { Question } from './learning';
import { words } from './learning';
/** Accept ordinary keyboard romaji as well as Japanese, without substring guessing. */
export function normalizeRecall(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[ōô]/g, 'ou').replace(/[ūû]/g, 'uu').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s.,!?。、「」・'’"()（）¥￥-]/g, '');
}
const aliases: Record<string, string[]> = {
  'おはようございます': ['ohayou gozaimasu','ohayo gozaimasu'],
  'いらっしゃいませ': ['irasshaimase'], 'コーヒー': ['koohii','kouhii','kohii','coffee'],
  '水': ['mizu','みず','お水','omizu'], 'お茶': ['ocha','おちゃ'], 'すみません': ['sumimasen'],
  'を': ['o','wo'], '水をください': ['mizu o kudasai','omizu wo kudasai','mizu wo kudasai'],
  'お茶を一つください': ['ocha o hitotsu kudasai','ocha wo hitotsu kudasai'],
  'どうぞ': ['douzo','dozo'], 'ありがとうございます': ['arigatou gozaimasu','arigato gozaimasu'],
  'One coffee': ['1 coffee','one coffee','coffee 1'], 'Two coffees': ['2 coffees','two coffee','2 coffee'],
  'One tea': ['1 tea'], 'Two teas': ['2 teas','two tea','2 tea'], 'One water': ['1 water','water 1'],
  '¥450': ['450','450 yen','四百五十円','よんひゃくごじゅうえん','yonhyaku gojuu en'],
};
export function matchesRecall(input: string, expected: string): boolean {
  const value = normalizeRecall(input);
  if (!value) return false;
  return [expected, ...(aliases[expected] ?? [])].some(answer => normalizeRecall(answer) === value);
}
export function recallAnswers(question: Question): string[] {
  const expected = question.answers[question.correct];
  const word = words.find(word => word.id === question.word);
  const values = [expected, ...(aliases[expected] ?? [])];
  if (word?.japanese === expected) values.push(word.romaji, word.reading);
  // Review prompts ask for meaning, so accept plain dictionary translations.
  if (word && question.prompt === 'Write the meaning from memory.') {
    values.push(word.english.replace(/\s*\(.+?\)/g,''), word.english.split(' / ')[0].replace(/\s*\(.+?\)/g,''));
    const extra: Record<string, string[]> = { morning: ['good morning'],welcome:['welcome'],please:['coffee please'],one:['one','1'],two:['two','2'],thanks:['thank you','thanks'],serve:['here you are','go ahead'],excuse:['excuse me','sorry'],cafe:['coffee service','tea service','tea coffee service'],cleaning:['dry cleaning'],vending:['vending machine'],object:['object marker','object particle','marks the object'],request:['please','please give me','give me please'] };
    values.push(...(extra[word.id] ?? []));
  }
  return values;
}
export function acceptsQuestion(input: string, question: Question): boolean {
  return recallAnswers(question).some(answer => matchesRecall(input, answer));
}
export function answerGuide(question: Question): string {
  const expected = question.answers[question.correct];
  const word = words.find(word => word.id === question.word);
  return `${expected}${word?.japanese === expected ? ` · ${word.romaji}` : aliases[expected]?.[0] ? ` · ${aliases[expected][0]}` : ''}`;
}
