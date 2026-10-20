const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript'); const fs = require('node:fs'); const vm = require('node:vm');
const learning = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/game/learning.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {exports:learning});
const recall = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/game/recall.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {exports:recall,require:()=>learning});
const service = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/game/cafeService.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {exports:service});
const api = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/game/chapterOne.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: api, require: name => name === './cafeService' ? service : recall });

// Legacy shift scenarios now prepare their cups through the actual recipe actions.
const apply = api.actShift;
api.actShift = (state, action) => {
 if (action.type === 'finish' && state.stage === 'report' && state.service) {
   for(let i=0;i<20 && service.closingStep(state.service);i++) {
     const task=service.closingStep(state.service); state=apply(state,{type:'service',action:{type:'station',station:task.station}}).state;
     if(task.hold) for(let t=0;t<16;t++) state=apply(state,{type:'service',action:{type:'tick',seconds:.25,held:task.station}}).state;
   }
 }
 if(action.type !== 'prepare' || !['brew','serve'].includes(state.stage) || state.tray.length>=2) return apply(state,action);
 let message=''; const step=a=>{const r=apply(state,{type:'service',action:a});state=r.state;message=r.message||message;};
 for(let attempts=0;attempts<80;attempts++) {
   const task=service.nextServiceStep(state.service,action.drink,state.day);
   if(task.waiting) { for(let t=0;t<40;t++){step({type:'tick',seconds:.25});if(action.perfect && state.service.coffee==='extracting' && state.service.coffeeTime<2) {step({type:'release'});break;}} }
   else {step({type:'station',station:task.station}); if(task.hold) {for(let t=0;t<(action.perfect && ['tea','water'].includes(task.station)?5:16);t++)step({type:'tick',seconds:.25,held:task.station});if(action.perfect)step({type:'release'});} }
   if(task.station==='tray') return {state,message};
 }
 throw Error('Recipe failed '+action.drink);
};

test('a new player can serve three customers without a written-answer action', () => {
 let s=api.newShift();const act=a=>s=api.actShift(s,a).state;
 act({type:'prepare',drink:'coffee'});assert.equal(s.stage,'briefing');
 act({type:'begin'});
 for(const c of api.customers) {
  act({type:'collect'});assert.equal(s.stage,'order');
  act({type:'listen'});
  for(let i=0;i<c.count;i++){act({type:'prepare',drink:c.drink});s=api.readShift(JSON.stringify(s));assert.equal(s.tray.length,i+1);}
  act({type:'serve'});assert.equal(s.stage,'pay');assert.equal(s.tray.length,0);
  act({type:'collect'});s=api.readShift(JSON.stringify(s));
 }
 assert.equal(s.stage,'report');assert.equal(s.earnings,1150);act({type:'finish'});assert.equal(s.stage,'done');
});
test('wrong drinks are physical cups and customer feedback repairs the order', () => {
 let s=api.actShift(api.newShift(),{type:'begin'}).state;
 s=api.actShift(s,{type:'listen'}).state;s=api.actShift(s,{type:'prepare',drink:'tea'}).state;
 assert.equal(s.tray[0],'tea');s=api.readShift(JSON.stringify(s));assert.equal(s.tray[0],'tea');
 const result=api.actShift(s,{type:'serve'});assert.match(result.message,/One coffee/);assert.equal(result.state.mistakes,1);assert.equal(result.state.stage,'brew');assert.equal(result.state.tray.length,0);
 s=api.actShift(result.state,{type:'prepare',drink:'coffee'}).state;s=api.actShift(s,{type:'prepare',drink:'coffee'}).state;
 assert.equal(api.actShift(s,{type:'prepare',drink:'water'}).state.tray.length,2);
 assert.equal(api.actShift(s,{type:'serve'}).state.stage,'brew','Wrong quantity must be returned');
 assert.equal(api.actShift(s,{type:'clear'}).state.tray.length,0);
});

test('register refuses incorrect orders and requires exact bill and change', () => {
 let s = api.actShift(api.newShift(), { type: 'begin' }).state;
 const wrong = api.actShift(s, { type: 'take-order', drink: 'tea', count: 1 });
 assert.equal(wrong.state.stage, 'order'); assert.equal(wrong.state.mistakes, 1);
 s = api.actShift(wrong.state, { type: 'take-order', drink: 'coffee', count: 1 }).state;
 assert.equal(s.stage, 'brew'); assert.equal(api.readShift(JSON.stringify(s)).ticket.drink, 'coffee');
 s = api.actShift(s, { type: 'prepare', drink: 'coffee' }).state;
 s = api.actShift(s, { type: 'serve' }).state;
 assert.equal(api.paymentFor(s), 500);
 for (const payment of [{ total: 450, change: 0 }, { total: 500, change: 50 }, { total: NaN, change: 50 }]) {
  assert.equal(api.actShift(s, { type: 'checkout', ...payment }).state.stage, 'pay');
 }
 s = api.actShift(s, { type: 'checkout', total: 450, change: 50 }).state;
 assert.equal(s.customer, 1); assert.equal(s.earnings, 450); assert.equal(s.ticket, undefined);
 assert.equal(api.actShift(s, { type: 'checkout', total: 450, change: 50 }).state.earnings, 450);
});

test('later shifts vary Japanese orders and survive reload through the complete register flow', () => {
 for (const day of [2, 3, 4]) {
  let s = api.actShift(api.newShift(day), { type: 'begin' }).state;
  assert.notEqual(api.getCustomer(s).line, api.getCustomer({ customer: 0, day: day - 1 }).line);
  for (let i = 0; i < 3; i++) {
   const c = api.getCustomer(s);
   s = api.actShift(s, { type: 'take-order', drink: c.drink, count: c.count }).state;
   s = api.readShift(JSON.stringify(s)); assert.equal(s.day, day); assert.equal(s.ticket.count, c.count);
   for (let cup = 0; cup < c.count; cup++) s = api.actShift(s, { type: 'prepare', drink: c.drink }).state;
   s = api.actShift(s, { type: 'serve' }).state;
   s = api.actShift(s, { type: 'checkout', total: c.total, change: api.paymentFor(s) - c.total }).state;
   const loaded = api.readShift(JSON.stringify(s)); assert.equal(loaded.earnings, s.earnings); s = loaded;
  }
  assert.equal(s.stage, 'report');
 }
});
test('save migration repairs invalid state and keeps beginner assistance through reload', () => {
 assert.equal(api.readShift('{').stage,'briefing');
 assert.equal(api.readShift('{"version":1,"stage":"brew","customer":99}').stage,'briefing');
 const s=api.readShift(JSON.stringify({version:1,stage:'brew',customer:1,tray:['coffee','tea','invalid'],earnings:9999,helped:true}));
 assert.equal(s.earnings,450);assert.equal(s.tray.length,2);assert.equal(s.helped,true);
 assert.equal(api.readShift('{"version":1,"stage":"serve","customer":0,"tray":["coffee"]}').tray[0],'coffee');
});

const plain = value => JSON.parse(JSON.stringify(value));

test('the next-task guide follows the real service state and repairs wrong trays', () => {
 let state = api.newShift();
 assert.equal(api.serviceGuide(state).target, 'barista');
 state = api.actShift(state, {type:'hire'}).state;
 assert.equal(api.serviceGuide(state).target, 'shift-register');
 state = api.actShift(state, {type:'begin'}).state;
 assert.equal(api.serviceGuide(state).step, 0);
 state = api.actShift(state, {type:'greet',correct:true}).state;
 assert.equal(api.serviceGuide(state).step, 1);
 state = api.actShift(state, {type:'take-order',drink:'coffee',count:1}).state;
 assert.equal(api.serviceGuide(state).target, 'shift-grinder');
 state = api.actShift(state, {type:'prepare',drink:'tea'}).state;
 assert.equal(api.serviceGuide(state).target, 'shift-return');
 state = api.actShift(state, {type:'clear'}).state;
 state = api.actShift(state, {type:'prepare',drink:'coffee'}).state;
 assert.equal(api.serviceGuide(state).step, 3);
 assert.equal(api.serviceGuide(state).target, 'shift-customer');
 state = api.actShift(state, {type:'serve'}).state;
 assert.equal(api.serviceGuide(state).step, 4);
 assert.equal(api.serviceGuide(state).target, 'shift-register');
});
function completeVisit(state) {
 const customer = api.getCustomer(state);
 state = api.actShift(state, { type: 'take-order', drink: customer.drink, count: customer.count }).state;
 for (let cup = 0; cup < customer.count; cup++) state = api.actShift(state, { type: 'prepare', drink: customer.drink }).state;
 state = api.actShift(state, { type: 'serve' }).state;
 return api.actShift(state, { type: 'checkout', total: customer.total, change: api.paymentFor(state) - customer.total });
}

test('seven days build persistent friendships and a chapter ending', () => {
 let state;
 const titles = new Set();
 for (let day = 1; day <= 7; day++) {
  state = api.newShift(day, state);
  titles.add(api.dayStory(day).title);
  state = api.actShift(state, { type: 'begin' }).state;
  for (let customer = 0; customer < 3; customer++) {
   state = completeVisit(state).state;
   state = api.readShift(JSON.stringify(state));
  }
  assert.equal(state.stage, 'report');
  assert.equal(state.understoodToday.length, day === 1 ? 2 : 3);
  const result = api.actShift(state, { type: 'finish' }); state = result.state;
  if (day === 7) assert.match(result.message, /friends have kept a place/);
 }
 assert.equal(titles.size, 7);
 assert.deepEqual(plain(state.relationships), [7, 7, 7]);
 assert.match(api.customerContext(state), /grandmother/);
 assert.match(api.relationshipSummary(state)[0].description, /friend/);
 const replay = api.newShift(1, state);
 assert.deepEqual(plain(replay.relationships), [7, 7, 7]);
 assert.equal(replay.earnings, 0); assert.equal(replay.understoodToday.length, 0);
 assert.notEqual(api.dayStory(999).title, api.dayStory(7).title);
});

test('a gesture gives one clue without translating the order, including after reload', () => {
 let state = api.actShift(api.newShift(3), { type: 'begin' }).state;
 const customer = api.getCustomer(state);
 const clue = api.actShift(state, { type: 'clue' });
 assert.match(clue.message, /one finger|two fingers/);
 assert.equal(clue.message.includes(customer.translation), false);
 assert.equal(clue.message.includes(customer.drink), false);
 state = api.readShift(JSON.stringify(clue.state));
 assert.equal(state.helped, true); assert.equal(state.translated, false);
 state = completeVisit(state).state;
 assert.equal(state.relationships[0], 1); assert.equal(state.understoodToday.length, 0);
 const aroma = api.actShift(api.actShift(api.newShift(2), { type: 'begin' }).state, { type: 'clue' });
 assert.match(aroma.message, /green leaves/);
 assert.doesNotMatch(aroma.message, /one finger|two fingers|One tea|Two teas/);
 const translation = api.actShift(aroma.state, { type: 'help' });
 assert.equal(translation.state.translated, true); assert.match(translation.message, /tea/);
});

test('dictionary assistance preserves friendship without giving independent recall credit', () => {
 let state = api.actShift(api.newShift(2), { type: 'begin' }).state;
 const consulted = api.actShift(state, { type: 'consult' });
 assert.match(consulted.message, /dictionary/);
 assert.equal(consulted.message.includes(api.getCustomer(state).translation), false);
 state = api.readShift(JSON.stringify(consulted.state));
 assert.equal(state.helped, true); assert.equal(state.translated, false);
 state = completeVisit(state).state;
 assert.equal(state.relationships[0], 1); assert.equal(state.understoodToday.length, 0);
 assert.equal(state.helped, false, 'Assistance applies only to the current encounter');
 const translated = api.actShift(state, { type: 'help' }).state;
 assert.equal(api.actShift(translated, { type: 'consult' }).state.translated, true);
 const briefing = api.newShift(2);
 assert.equal(api.actShift(briefing, { type: 'consult' }).state, briefing);
});

test('order and payment retries keep friendship and prevent independent credit', () => {
 let state = api.actShift(api.newShift(2), { type: 'begin' }).state;
 state = api.actShift(state, { type: 'take-order', drink: 'coffee', count: 2 }).state;
 assert.equal(state.customerMistakes, 1); assert.equal(state.translated, false);
 state = completeVisit(api.readShift(JSON.stringify(state))).state;
 assert.equal(state.relationships[0], 1); assert.equal(state.customerMistakes, 0);
 const customer = api.getCustomer(state);
 state = api.actShift(state, { type: 'take-order', drink: customer.drink, count: customer.count }).state;
 for (let cup = 0; cup < customer.count; cup++) state = api.actShift(state, { type: 'prepare', drink: customer.drink }).state;
 state = api.actShift(state, { type: 'serve' }).state;
 state = api.actShift(state, { type: 'checkout', total: -1, change: -1 }).state;
 state = api.readShift(JSON.stringify(state)); assert.equal(state.customerMistakes, 1);
 state = api.actShift(state, { type: 'checkout', total: customer.total, change: api.paymentFor(state) - customer.total }).state;
 assert.equal(state.relationships[1], 1);
 state = completeVisit(state).state;
 assert.equal(state.relationships[2], 1);
 const again = api.actShift(state, { type: 'collect' }).state;
 assert.deepEqual(plain(again.relationships), [1, 1, 1]);
});

test('old v1 saves migrate and malformed relationship data is bounded', () => {
 const legacy = api.readShift(JSON.stringify({ version: 1, stage: 'order', customer: 1, day: 2, helped: true }));
 assert.equal(legacy.translated, true); assert.deepEqual(plain(legacy.relationships), [0, 0, 0]);
 assert.deepEqual(plain(legacy.understoodToday), []);
 const loaded = api.readShift(JSON.stringify({ ...api.newShift(5), stage: 'report', relationships: [-3, 999, '7', 4], understoodToday: [0, 0, 2, -1, 4, '1'] }));
 assert.deepEqual(plain(loaded.relationships), [0, 7, 0]);
 assert.deepEqual(plain(loaded.understoodToday), [0, 2]);
 const firstDay = api.readShift(JSON.stringify(api.newShift()));
 assert.equal(firstDay.translated, true); assert.equal(firstDay.helped, true);
});

test('greetings persist once per customer and duplicate attempts cannot count again', () => {
 let state = api.actShift(api.newShift(2), { type: 'begin' }).state;
 assert.equal(state.greeted, false);
 state = api.actShift(state, { type: 'greet', correct: true }).state;
 state = api.readShift(JSON.stringify(state));
 assert.equal(state.greeted, true);
 for (const correct of [true, false]) {
  const duplicate = api.actShift(state, { type: 'greet', correct });
  assert.equal(duplicate.state, state); assert.equal(duplicate.state.mistakes, 0);
 }
 state = completeVisit(state).state;
 assert.equal(state.greeted, false); assert.equal(state.customer, 1);
 assert.equal(state.relationships[0], 1);
 state = api.actShift(state, { type: 'greet', correct: true }).state;
 assert.equal(state.greeted, true);
 const brief = api.newShift(2);
 assert.equal(api.actShift(brief, { type: 'greet', correct: true }).state, brief);
 assert.equal(api.readShift(JSON.stringify({ ...brief, greeted: true })).greeted, false);
 assert.equal(api.readShift(JSON.stringify({ version: 1, stage: 'order', customer: 0, day: 2 })).greeted, false);
});

test('a greeting retry survives reload without losing friendship or giving independent credit', () => {
 let state = api.actShift(api.newShift(2), { type: 'begin' }).state;
 state = api.actShift(state, { type: 'greet', correct: false }).state;
 assert.equal(state.mistakes, 1); assert.equal(state.customerMistakes, 1);
 assert.equal(state.greeted, false); assert.equal(state.translated, false);
 state = api.actShift(api.readShift(JSON.stringify(state)), { type: 'greet', correct: true }).state;
 assert.equal(state.greeted, true); assert.equal(state.customerMistakes, 1);
 state = completeVisit(state).state;
 assert.equal(state.relationships[0], 1); assert.equal(state.understoodToday.length, 0);
 assert.equal(state.greeted, false); assert.equal(state.customerMistakes, 0);
});

test('typed recall accepts kana and ordinary romaji but rejects fragments and guesses', () => {
 for (const input of ['どうぞ','douzo','dōzo','DOUZO!']) assert.equal(recall.matchesRecall(input,'どうぞ'),true);
 for (const input of ['do','1','coffee','']) assert.equal(recall.matchesRecall(input,'どうぞ'),false);
 assert.equal(recall.matchesRecall('2 tea','Two teas'),true);
 assert.equal(recall.matchesRecall('one coffee please','One coffee'),false);
 for (const q of learning.lessons.flatMap(lesson => lesson.questions)) {
  assert.equal(recall.acceptsQuestion(q.answers[q.correct],q),true);
  const word=learning.words.find(word=>word.id===q.word);if(word.japanese===q.answers[q.correct]) assert.equal(recall.acceptsQuestion(word.romaji,q),true,word.romaji);
 }
 const q=learning.reviewQuestion(learning.words[0]);assert.equal(recall.acceptsQuestion('good morning',q),true);
 for (const [id, answers] of [['object', ['object marker', 'object particle', 'marks the object']], ['request', ['please', 'please give me', 'give me please']]]) {
  const grammar = learning.reviewQuestion(learning.words.find(word => word.id === id));
  for (const answer of answers) assert.equal(recall.acceptsQuestion(answer, grammar), true, `${id}: ${answer}`);
  assert.equal(recall.acceptsQuestion('coffee', grammar), false);
 }
});

test('accepting the job persists before starting work and preserves a fresh shift', () => {
 const fresh = api.newShift();
 const hired = api.actShift(fresh, { type: 'hire' });
 assert.equal(hired.state.hired, true);
 assert.equal(hired.state.stage, 'briefing');
 assert.match(hired.message, /Walk around the right end/);
 const saved = api.readShift(JSON.stringify(hired.state));
 assert.equal(saved.hired, true);
 assert.match(api.shiftObjective(saved), /Walk around/);
 assert.equal(api.actShift(saved, { type: 'begin' }).state.stage, 'order');
 assert.equal(api.readShift(JSON.stringify(fresh)).hired, false);
 assert.equal(api.readShift(JSON.stringify({ ...fresh, stage: 'order' })).hired, true);
});

test('chapter completion survives reload and advances to ongoing café days, with no day-one reset', () => {
 let state = api.actShift(api.newShift(7), { type: 'begin' }).state;
 for (let i = 0; i < 3; i++) state = completeVisit(state).state;
 assert.equal(api.nextShift(state), state, 'Closing the café is required before advancing');
 const ending = api.actShift(state, { type: 'finish' });
 assert.match(ending.message, /Chapter One complete.*Chapter Two is coming soon/);
 state = api.readShift(JSON.stringify(ending.state));
 assert.equal(state.chapterCompleted, true);
 state = api.nextShift(state);
 assert.equal(state.day, 8); assert.equal(state.stage, 'briefing');
 assert.equal(state.chapterCompleted, true); assert.equal(api.isFreePlay(state), true);
 assert.deepEqual(plain(state.relationships), [1, 1, 1]);
 assert.equal(state.tips, 0); assert.equal(state.tray.length, 0);
 assert.doesNotMatch(api.dayStory(8).arrival, /first morning|reading evening begins/);
 const lines = new Set();
 for (let day = 8; day <= 13; day++) {
  state = api.actShift(state, { type: 'begin' }).state;
  lines.add(api.getCustomer(state).line);
  assert.doesNotMatch(api.getCustomer(state).farewell, /beckons you inside|your chair/);
  for (let i = 0; i < 3; i++) state = completeVisit(state).state;
  const closed = api.actShift(state, { type: 'finish' });
  assert.doesNotMatch(closed.message, /Chapter One complete/);
  state = api.nextShift(api.readShift(JSON.stringify(closed.state)));
  assert.equal(state.day, day + 1); assert.equal(state.chapterCompleted, true);
 }
 assert.equal(lines.size, 6, 'All three drinks and both quantities return in free play');
 assert.equal(api.readShift(JSON.stringify({ version: 1, stage: 'done', customer: 2, day: 7 })).chapterCompleted, true, 'Legacy endings unlock free play');
});

test('optional conversations build friendship once and do not masquerade as independent recall', () => {
 let state = api.actShift(api.newShift(4), { type: 'begin' }).state;
 assert.equal(api.actShift(state, { type: 'chat', reply: 0 }).state, state);
 state = api.actShift(state, { type: 'greet', correct: true }).state;
 state = api.actShift(state, { type: 'help' }).state;
 const chatted = api.actShift(state, { type: 'chat', reply: 0 });
 assert.equal(chatted.state.relationships[0], 1); assert.equal(chatted.state.chatted, true);
 state = api.readShift(JSON.stringify(chatted.state));
 assert.equal(api.actShift(state, { type: 'chat', reply: 1 }).state, state, 'Cannot farm friendship');
 state = completeVisit(state).state;
 assert.equal(state.relationships[0], 2); assert.equal(state.chatted, false);
 assert.equal(state.understoodToday.length, 0, 'Translated small talk is discovery, not recall');
 assert.notEqual(api.customerConversation({ ...state, day: 4 }).line, api.customerConversation({ ...state, day: 5 }).line);
});

test('perfect pours earn tips only on correct completed visits, including across reload', () => {
 let state = api.actShift(api.newShift(), { type: 'begin' }).state;
 state = api.actShift(state, { type: 'take-order', drink: 'coffee', count: 1 }).state;
 state = api.actShift(state, { type: 'prepare', drink: 'tea', perfect: true }).state;
 state = api.actShift(state, { type: 'serve' }).state;
 assert.equal(state.visitPerfect, 0); assert.equal(state.tips, 0); assert.equal(state.trayQuality.length, 0);
 state = api.actShift(state, { type: 'prepare', drink: 'coffee', perfect: true }).state;
 state = api.readShift(JSON.stringify(state)); assert.equal(state.trayQuality[0], true);
 state = api.actShift(state, { type: 'clear' }).state;
 assert.equal(state.trayQuality.length, 0);
 state = api.actShift(state, { type: 'prepare', drink: 'coffee', perfect: true }).state;
 state = api.actShift(state, { type: 'serve' }).state;
 state = api.readShift(JSON.stringify(state)); assert.equal(state.visitPerfect, 1);
 assert.equal(state.tips, 0, 'The sale is still uncommitted');
 state = api.actShift(state, { type: 'checkout', total: 450, change: 50 }).state;
 assert.equal(state.earnings, 450); assert.equal(state.tips, 25); assert.equal(state.perfectServed, 1);
 assert.equal(api.actShift(state, { type: 'checkout', total: 450, change: 50 }).state.tips, 25);
 assert.equal(state.visitPerfect, 0); assert.equal(state.streak, 0, 'A retried visit does not advance the service streak');
 state = completeVisit(state).state;
 assert.equal(state.streak, 1); assert.equal(state.bestStreak, 1);
 assert.equal(state.tips, 25, 'Regular cups remain playable without a timing bonus');
});

test('café goals vary by day and reward optional play without blocking the story', () => {
 assert.notEqual(api.cafeGoal(api.newShift(8)).label, api.cafeGoal(api.newShift(9)).label);
 assert.equal(api.cafeGoal({ ...api.newShift(1), perfectServed: 2 }).complete, true);
 assert.equal(api.cafeGoal({ ...api.newShift(2), bestStreak: 3 }).complete, true);
 assert.equal(api.cafeGoal({ ...api.newShift(3), understoodToday: [0, 1] }).complete, true);
 let state = api.actShift(api.newShift(7), { type: 'begin' }).state;
 for (let i = 0; i < 3; i++) state = completeVisit(state).state;
 assert.equal(api.cafeGoal(state).complete, false);
 assert.equal(api.actShift(state, { type: 'finish' }).state.chapterCompleted, true);
});
