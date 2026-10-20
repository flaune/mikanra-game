const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const load = (name, imports = {}, globals = {}) => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/game/${name}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: name => imports[name], ...globals });
  return exports;
};
const clips = load('voiceClips');
const { pronunciationKey } = load('pronunciation', { './voiceClips': clips });

test('every syllabus word, Japanese quiz answer, and seven-day order has bundled audio', () => {
  const { words, lessons } = load('learning');
  const { getCustomer, spokenPrice } = load('chapterOne', {'./cafeService':load('cafeService')});
  const phrases = words.flatMap(word => [word.japanese, word.reading]);
  for (const lesson of lessons) for (const question of lesson.questions) {
    if (question.japanese) phrases.push(question.japanese);
    phrases.push(...question.answers.filter(answer => /[ぁ-龯]/u.test(answer)));
  }
  for (let day = 1; day <= 7; day++) for (let customer = 0; customer < 3; customer++) {
    const order = getCustomer({ day, customer }); phrases.push(order.line, spokenPrice(order.total));
  }
  for (const phrase of phrases) {
    const clip = clips.voiceClips[pronunciationKey(phrase)];
    assert.ok(clip, `Missing phrase: ${phrase}`);
    assert.ok(fs.statSync(`public${clip}`).size > 1000, `Missing or empty audio: ${phrase}`);
  }
});

test('bundled playback works without any installed voice, preserves pitch and cancels older speech', async () => {
  const audio = [];
  class AudioStub {
    constructor(src) { this.src = src; this.paused = false; audio.push(this); }
    play() { return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const api = load('pronunciation', { './voiceClips': clips }, { Audio: AudioStub, window: {} });
  const first = api.pronounce('コーヒーを一つください。');
  assert.ok(audio[0].src.endsWith('.mp3'));
  const second = api.pronounce('二つ', true);
  assert.equal(audio[0].paused, true); await first.finished;
  assert.equal(audio[1].playbackRate, .72); assert.equal(audio[1].preservesPitch, true);
  audio[1].onended(); await second.finished;
});

test('blocked autoplay can be retried and unavailable fallback never uses an English voice', async () => {
  let rejectPlay = true;
  class AudioStub {
    play() { return rejectPlay ? Promise.reject(Object.assign(new Error(), { name: 'NotAllowedError' })) : Promise.resolve(); }
    pause() {}
  }
  const api = load('pronunciation', { './voiceClips': clips }, { Audio: AudioStub, window: { speechSynthesis: { getVoices: () => [{ lang: 'en-US' }] } } });
  await assert.rejects(api.pronounce('どうぞ').finished, /Tap Listen/);
  rejectPlay = false;
  const retry = api.pronounce('どうぞ'); retry.cancel(); await retry.finished;
  await assert.rejects(api.pronounce('未収録の単語').finished, /Couldn’t play audio/);
});

test('bundled speech stays within a subdirectory deployment', async () => {
  const audio = [];
  class AudioStub {
    constructor(src) { this.src = src; audio.push(this); }
    play() { return Promise.resolve(); }
    pause() {}
  }
  const api = load('pronunciation', { './voiceClips': clips }, {
    Audio: AudioStub, window: {}, URL,
    document: { baseURI: 'https://example.test/mikanra-game/' },
  });
  const playback = api.pronounce('コーヒー');
  assert.match(audio[0].src, /^\/mikanra-game\/audio\/ja\/ja-\d+\.mp3$/);
  playback.cancel(); await playback.finished;
});
