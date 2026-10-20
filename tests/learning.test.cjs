const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/game/learning.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: exportsObject });
const { freshProgress, parseProgress, discover, recordRecall, reviewQueue, words, lessons, reviewQuestion, recordUse, wordHelp, wordAssisted, preparationWords } = exportsObject;

test('new games use crisp graphics while saved picture preferences are respected', () => {
  assert.equal(freshProgress().graphics, 'crisp');
  assert.equal(parseProgress(JSON.stringify({ version: 1, graphics: 'handheld' })).graphics, 'handheld');
  assert.equal(parseProgress(JSON.stringify({ version: 1, graphics: 'crisp' })).graphics, 'crisp');
  assert.equal(parseProgress(JSON.stringify({ version: 1, graphics: 'invalid' })).graphics, 'crisp');
});

test('personal interpretations survive saves without counting as successful recall', () => {
  const progress = discover(freshProgress(), ['tea'], 1000);
  progress.guesses = { tea: 'maybe coffee', two: 'x'.repeat(150), unknown: 'invented', water: 42 };
  const loaded = parseProgress(JSON.stringify(progress));
  assert.equal(loaded.guesses.tea, 'maybe coffee');
  assert.equal(loaded.guesses.two.length, 100);
  assert.equal(loaded.guesses.unknown, undefined);
  assert.equal(loaded.guesses.water, undefined);
  assert.equal(loaded.memories.tea.streak, 0);
  assert.equal(loaded.memories.tea.due, 1000);
  assert.equal(parseProgress(JSON.stringify(freshProgress())).completed, 0);
});

test('save reader recovers from corruption and rejects invalid review entries', () => {
  assert.equal(parseProgress('{').completed, 0);
  assert.equal(parseProgress('{"version":99,"completed":4}').completed, 0);
  const repaired = parseProgress(JSON.stringify({ version: 1, completed: 100, memories: { coffee: { seen: 3, streak: -5, due: 30 }, water: { due: 'tomorrow' }, unknown: { seen: 1, streak: 1, due: 0 } } }));
  assert.equal(repaired.completed, lessons.length); assert.equal(repaired.memories.coffee.streak, 0);
  assert.equal(repaired.memories.water, undefined); assert.equal(repaired.memories.unknown, undefined);
});
test('discovery never resets an existing spaced review schedule', () => {
  let state = discover(freshProgress(), ['coffee'], 100);
  state = recordRecall(state, 'coffee', true, 100);
  assert.equal(discover(state, ['coffee'], 200).memories.coffee.due, 600100);
  assert.equal(reviewQueue(state, 200).length, 0);
  assert.equal(reviewQueue(state, 600100)[0].id, 'coffee');
});
test('unassisted recalls lengthen intervals; errors reset streak and return sooner', () => {
  let state = recordRecall(freshProgress(), 'tea', true, 0);
  state = recordRecall(state, 'tea', true, 600000);
  assert.equal(state.memories.tea.streak, 2);
  assert.equal(state.memories.tea.due, 87000000);
  state = recordRecall(state, 'tea', false, 700000);
  assert.equal(state.memories.tea.streak, 0); assert.equal(state.memories.tea.due, 760000);
  assert.equal(parseProgress(JSON.stringify(state)).memories.tea.due, 760000);
});
test('syllabus and review questions have valid unique answers and known word references', () => {
  assert.equal(new Set(words.map(word => word.id)).size, words.length);
  for (const question of [...lessons.flatMap(lesson => lesson.questions), ...words.map(reviewQuestion)]) {
    assert.ok(words.some(word => word.id === question.word));
    assert.equal(new Set(question.answers).size, 3); assert.ok(question.correct >= 0 && question.correct < 3);
    assert.ok(question.explanation.trim());
  }
});

test('two supported visits fade meanings, then two independent visits fade romaji', () => {
  let progress = freshProgress();
  assert.equal(wordHelp(progress, 'tea').english, true);
  progress = recordUse(progress, 'tea', true, true, 'day1-visit1', 100);
  assert.equal(wordHelp(progress, 'tea').english, true);
  const duplicate = recordUse(progress, 'tea', true, true, 'day1-visit1', 200);
  assert.equal(duplicate, progress);
  progress = recordUse(progress, 'tea', true, true, 'day1-visit2', 300);
  assert.equal(wordHelp(progress, 'tea').english, false);
  assert.equal(wordHelp(progress, 'tea').romaji, true);
  assert.equal(progress.memories.tea.streak, 0, 'guided use must not earn independent recall');
  progress = recordUse(progress, 'tea', true, false, 'day2-visit1', 400);
  assert.equal(wordHelp(progress, 'tea').romaji, true);
  progress = recordUse(progress, 'tea', true, false, 'day2-visit2', 500);
  assert.equal(wordHelp(progress, 'tea').romaji, false);
  assert.equal(progress.memories.tea.streak, 2);
  const loaded = parseProgress(JSON.stringify(progress));
  assert.equal(wordHelp(loaded, 'tea').english, false);
  assert.equal(wordHelp(loaded, 'tea').romaji, false);
  assert.equal(recordUse(loaded, 'tea', true, false, 'day2-visit2', 600), loaded);
});

test('first attempts are assessed once per word and do not contaminate another order component', () => {
  let progress = recordUse(freshProgress(), 'tea', false, false, 'visit-1', 100);
  progress = recordUse(progress, 'two', true, true, 'visit-1', 100);
  assert.equal(progress.uses.tea.guided, 0);
  assert.equal(progress.uses.tea.independent, 0);
  assert.equal(progress.uses.two.guided, 1);
  assert.equal(progress.memories.tea.streak, 0);
  assert.equal(recordUse(progress, 'tea', true, true, 'visit-1', 200), progress, 'a corrected retry must not become new evidence');
  progress = recordUse(progress, 'tea', true, false, 'visit-2', 300);
  assert.equal(progress.uses.tea.independent, 1);
  assert.equal(progress.uses.two.independent, 0);
  assert.equal(recordUse(progress, 'not-a-word', true, false, 'visit-2'), progress);
});

test('help is per word, tentative guesses are not official translations, and settings remain available', () => {
  let progress = freshProgress();
  for (const id of ['tea', 'two']) for (const visit of ['1', '2']) progress = recordUse(progress, id, true, true, visit);
  progress.guesses = { tea: 'maybe coffee' };
  assert.equal(wordAssisted(progress, 'tea'), false);
  assert.equal(wordAssisted(progress, 'tea', false, ['two']), false);
  assert.equal(wordAssisted(progress, 'two', false, ['two']), true);
  assert.equal(wordAssisted(progress, 'tea', true), true);
  assert.equal(wordHelp({ ...progress, alwaysHelp: true }, 'tea').english, true);
  assert.equal(wordHelp({ ...progress, romaji: false }, 'tea', true).romaji, false);
});

test('independent notebook recall can fade preparation romaji without pretending preparation was unassisted', () => {
  let progress = recordUse(freshProgress(), 'leaves', true, true, 'prep-1');
  progress = recordUse(progress, 'leaves', true, true, 'prep-2');
  progress = recordRecall(progress, 'leaves', true, 100);
  assert.equal(wordHelp(progress, 'leaves').romaji, true);
  progress = recordRecall(progress, 'leaves', true, 200);
  assert.equal(wordHelp(progress, 'leaves').romaji, false);
  assert.equal(progress.uses.leaves.independent, 0);
  assert.equal(progress.uses.leaves.guided, 2);
  assert.equal(wordHelp(progress, 'leaves', true).romaji, true, 'help remains one tap away');
  assert.equal(wordHelp(parseProgress(JSON.stringify(progress)), 'leaves').romaji, false);
});

test('pending finale help survives a reload and malformed result slots never change question order', () => {
  const progress = parseProgress(JSON.stringify({ version: 1, chapterCheck: [{ correct: true, assisted: false }], chapterCheckHelp: [1, 1, 2, -1, 3, '0'] }));
  assert.equal(progress.chapterCheck.length, 1);
  assert.equal(progress.chapterCheck[0].assisted, false);
  assert.deepEqual(Array.from(progress.chapterCheckHelp), [1, 2]);
  const broken = parseProgress(JSON.stringify({ version: 1, chapterCheck: [{ correct: true, assisted: false }, null, { correct: true, assisted: true }] }));
  assert.equal(broken.chapterCheck.length, 1);
  assert.equal(parseProgress(JSON.stringify({ version: 1 })).chapterCheck.length, 0);
});

test('preparation vocabulary introduces at most three new entries per morning', () => {
  const introduced = new Set();
  for (let day = 1; day <= 7; day++) {
    const today = preparationWords(day).filter(id => !introduced.has(id));
    assert.ok(today.length <= 3);
    for (const id of today) { assert.ok(words.some(word => word.id === id)); introduced.add(id); }
  }
  assert.equal(introduced.size, 6);
});

function loadComponent(name, dependencies = {}) {
  const componentExports = {};
  const source = fs.readFileSync(path.join(__dirname, `../src/components/${name}.tsx`), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports: componentExports, require: id => id === '@/game/learning' ? exportsObject : dependencies[id] ?? require(id) });
  return componentExports.default;
}

test('mastered Japanese rendering retains kana while fading romaji and English', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const JapaneseWord = loadComponent('JapaneseWord');
  const progress = { ...freshProgress(), uses: { tea: { guided: 2, independent: 2, visits: ['1', '2', '3', '4'] } } };
  const render = revealed => renderToStaticMarkup(React.createElement(JapaneseWord, { id: 'tea', progress, revealed }));
  assert.match(render(false), /お茶/);
  assert.match(render(false), /<rt>おちゃ<\/rt>/);
  assert.doesNotMatch(render(false), /ocha|Tea/);
  assert.match(render(true), /ocha/);
  assert.match(render(true), /Tea/);
});

test('decoded orders reveal only requested meanings and reading water includes the polite prefix', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const DecodedOrder = loadComponent('DecodedOrder', {
    './LearningPanel': { SpeakButton: () => null },
    '@/game/pronunciation': { pronounce: () => ({ finished: Promise.resolve() }) },
  });
  const progress = { ...freshProgress(), guesses: { water: 'maybe rain' }, uses: Object.fromEntries(['water', 'object', 'two', 'request'].map(id => [id, { guided: 2, independent: 2, visits: ['1', '2', '3', '4'] }])) };
  const props = { drink: 'water', count: 2, helped: false, progress, onGuess() {}, onReveal() {} };
  const hidden = renderToStaticMarkup(React.createElement(DecodedOrder, props));
  assert.match(hidden, /お水<rt>おみず<\/rt>/);
  assert.match(hidden, /maybe rain/);
  assert.doesNotMatch(hidden, />Water<|Two items|omizu|futatsu/);
  const revealed = renderToStaticMarkup(React.createElement(DecodedOrder, { ...props, revealedIds: ['two'] }));
  assert.match(revealed, /Two items/);
  assert.doesNotMatch(revealed, />Water</);
});
