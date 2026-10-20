if (!import.meta.env.DEV) throw new Error('The QA fixture is development-only.');
// Development-only QA page. Never imported by the shipped game.
// Use localhost, separate from the player's save at 127.0.0.1.
import React from 'react';
import { createRoot } from 'react-dom/client';
import GameExperience from '/src/components/GameCanvas.tsx';
import { GameEngine } from '/src/game/engine.ts';
import { SHIFT_KEY, newShift, readShift, getCustomer, actShift } from '/src/game/chapterOne.ts';
import { freshService, nextServiceStep, closingStep } from '/src/game/cafeService.ts';
import { SAVE_KEY } from '/src/game/learning.ts';
import '/src/index.css';
import '/src/learning.css';
import '/src/story.css';

const pendingRestore = sessionStorage.getItem('mikanra.playtest.restore');
if (pendingRestore) { for (const [key,value] of JSON.parse(pendingRestore)) { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key,value); }sessionStorage.removeItem('mikanra.playtest.restore'); }
const pendingFixture = sessionStorage.getItem('mikanra.playtest.fixture');
if (pendingFixture) { localStorage.setItem(SHIFT_KEY,pendingFixture);sessionStorage.removeItem('mikanra.playtest.fixture'); }
let engine;
const backupKey = 'mikanra.playtest.original';
if (!sessionStorage.getItem(backupKey)) sessionStorage.setItem(backupKey, JSON.stringify([SHIFT_KEY, SAVE_KEY].map(key => [key, localStorage.getItem(key)])));
const initialize = GameEngine.prototype.initialize;
GameEngine.prototype.initialize = async function () { engine = this; await initialize.call(this); };
const qa = document.createElement('details');
qa.style.cssText = 'position:fixed;bottom:0;left:0;z-index:100;background:#fff;color:#18261d;padding:8px;font:11px system-ui;max-width:600px;max-height:170px;overflow:auto';
qa.innerHTML = '<summary>Playtest controls (development only)</summary><div id="qa-buttons"></div><pre id="qa-state"></pre>';
document.body.append(qa);
const buttons = qa.querySelector('#qa-buttons');
function button(label, run) { const b = document.createElement('button'); b.textContent = label; b.style.cssText = 'margin:4px;padding:5px;border:1px solid #789'; b.onclick = run; buttons.append(b); }
const shift = () => readShift(localStorage.getItem(SHIFT_KEY));
function save(state) { sessionStorage.setItem('mikanra.playtest.fixture', JSON.stringify(state)); location.reload(); }
button('Restore original test-origin save', () => {
  sessionStorage.setItem('mikanra.playtest.restore', sessionStorage.getItem(backupKey));
  sessionStorage.removeItem(backupKey); location.reload();
});
button('Fresh chapter fixture', () => save(newShift()));
button('Final evening fixture', () => {
  let s = newShift(7, { relationships: [6, 6, 6] }); s = actShift(s, { type: 'begin' }).state;
  for (let i = 0; i < 3; i++) {
    const c = getCustomer(s);
    s = actShift(s, { type: 'greet', correct: true }).state;
    s = actShift(s, { type: 'take-order', drink: c.drink, count: c.count }).state;
    for (let j = 0; j < c.count; j++) {
      for (let n=0;n<80;n++) {
        const task = nextServiceStep(s.service,c.drink,s.day);
        if (task.waiting) for(let t=0;t<40;t++) s=actShift(s,{type:'service',action:{type:'tick',seconds:.25}}).state;
        else {s=actShift(s,{type:'service',action:{type:'station',station:task.station}}).state; if(task.hold) for(let t=0;t<16;t++) s=actShift(s,{type:'service',action:{type:'tick',seconds:.25,held:task.station}}).state;}
        if(task.station==='tray') break;
      }
    }
    s = actShift(s, { type: 'serve' }).state;
    s = actShift(s, { type: 'collect' }).state;
  }
  s.service = freshService(); save(s);
});
button('Enter café', () => { engine.finishArrival(); engine.enterCafe(); engine.beginPlay('mouse'); qa.open = false; });
function aim(id) {
  qa.open = false;
  const target = engine.worldData.interactables.find(t => t.id === id);
  const p = target.mesh.getWorldPosition(engine.position.clone());
  engine.position.set(p.x, .03, id === 'shift-customer' ? p.z - 1.25 : id === 'barista' ? p.z + 1.35 : p.z - .85);
  engine.motor.teleport(engine.position); engine.resetMovement();
  engine.yaw = id === 'barista' ? 0 : Math.PI; engine.pitch = id === 'barista' ? 0 : -.28;
  engine.beginPlay('mouse');
  engine.camera.position.copy(engine.position); engine.camera.position.y += 1.66;
  engine.camera.rotation.set(engine.pitch, engine.yaw, 0);
}
for (const id of ['barista', 'shift-register', 'shift-customer', 'shift-coffee', 'shift-tea', 'shift-water', 'shift-return','shift-cups','shift-kettle','shift-grinder','shift-tray','shift-sink','shift-pantry','shift-wipe']) button('Aim ' + id, () => aim(id));
window.mikanraQA = { get engine() { return engine; }, shift, aim, getCustomer, newShift, freshService, nextServiceStep, closingStep, save };
const screenshotData = document.createElement('textarea');
screenshotData.setAttribute('aria-label', 'Screenshot JPEG data'); screenshotData.rows = 1; screenshotData.style.width = '100%'; qa.append(screenshotData);
button('Save screenshot evidence', () => {
  const bytes = Uint8Array.from(atob(screenshotData.value), char => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
  const link = document.createElement('a'); link.href = url; link.download = 'mikanra-playtest.jpg'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); screenshotData.value = '';
});
setInterval(() => {
  const state = shift();
  qa.querySelector('#qa-state').textContent = JSON.stringify({ day: state.day, stage: state.stage, customer: state.customer, tray: state.tray, quality: state.trayQuality, tips: state.tips, helped: state.helped, chapterCompleted: state.chapterCompleted, target: engine?.interaction.currentTarget?.id, work: engine?.work?.elapsed }, null, 1);
}, 250);
createRoot(document.getElementById('root')).render(React.createElement(GameExperience));
