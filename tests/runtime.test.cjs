const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const THREE = require('three');

function load(file, imports = {}, globals = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/game', file + '.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => imports[name] ?? (name === 'three' ? THREE : name === './cafeService' ? load('cafeService') : require(name)), ...globals });
  return exports;
}
const { InteractionSystem } = load('interaction');
const { SimulationClock, FIXED_STEP } = load('simulation');
const { disposeScene } = load('resources');
const box = (z, depth = 1, material = new THREE.MeshStandardMaterial()) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, depth), material);
  mesh.position.z = z;
  return mesh;
};
const register = (system, mesh, id, range = 10) => system.register({ mesh, id, type: 'info', prompt: id, range, interact() {} });

test('opaque walls block targets; hidden walls, glass and invisible triggers do not', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const target = box(-3), wall = box(-1, .1);
  scene.add(target, wall);
  const system = new InteractionSystem(scene);
  register(system, target, 'target');
  assert.equal(system.update(camera), null);
  wall.visible = false;
  assert.equal(system.update(camera).id, 'target');
  wall.visible = true;
  wall.material.visible = false;
  assert.equal(system.update(camera).id, 'target');
  wall.material.visible = true;
  wall.material.transparent = true;
  assert.equal(system.update(camera).id, 'target');
  wall.material.transparent = false;
  assert.equal(system.update(camera), null);
  wall.userData.blocksInteraction = false;
  assert.equal(system.update(camera).id, 'target');
  const hiddenLocation = new THREE.Group(); scene.add(hiddenLocation); hiddenLocation.add(target); hiddenLocation.visible = false;
  assert.equal(system.update(camera), null);
  assert.equal(system.trigger(), false);
  system.dispose(); disposeScene(scene);
});

test('nearest ray surface and hit distance determine target and range', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const long = box(-5, 8), small = box(-3);
  scene.add(long, small);
  const system = new InteractionSystem(scene);
  register(system, long, 'long', 1.5); register(system, small, 'small');
  assert.equal(system.update(camera).id, 'long', 'Origin is outside range, nearest surface is inside');
  system.dispose(); disposeScene(scene);
});

test('café aim assistance reaches small stations but respects walls, range and hidden customers', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(); camera.position.y = 1.65;
  const station = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, .3), new THREE.MeshStandardMaterial());
  station.position.set(.2, 1.3, -1.5); scene.add(station);
  const system = new InteractionSystem(scene);
  system.register({ mesh: station, id: 'station', type: 'dialogue', prompt: 'Hold E', range: 2, aimAssist: true, interact() {} });
  assert.equal(system.update(camera).id, 'station', 'Station can sit just below the crosshair');
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2, 3, .1), new THREE.MeshStandardMaterial()); wall.position.set(0, 1, -.7); scene.add(wall);
  assert.equal(system.update(camera), null, 'Assistance cannot reach through a wall');
  wall.visible = false; station.position.z = -3;
  assert.equal(system.update(camera), null, 'Assistance cannot extend interaction range');
  station.position.z = -1.5; station.userData.interactionDisabled = true;
  assert.equal(system.update(camera), null, 'Departing customers cannot be selected');
  system.dispose(); disposeScene(scene);
});

test('real customer collisions keep the player out of faces and clear when customers leave', async () => {
  const { CharacterMotor } = load('physics');
  const position = new THREE.Vector3(0, .03, 1);
  const motor = await CharacterMotor.create(position);
  motor.addBoxCollider(0, -.06, 0, 4, .06, 4);
  motor.setCustomers([{x:0,z:-1}]);
  for (let step = 0; step < 150; step++) motor.move(0, -2.35/60, 1/60, position);
  assert.ok(position.z > -.45, `Camera entered customer: ${position.z}`);
  motor.setCustomers([]);
  for (let step = 0; step < 45; step++) motor.move(0, -2.35/60, 1/60, position);
  assert.ok(position.z < -1.5, 'Departed customer must not leave an invisible obstacle');
  motor.dispose();
});

test('shared and array materials remain untouched; clones and result stay stable until selection changes', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const material = new THREE.MeshStandardMaterial({ emissive: 0x224466, emissiveIntensity: .65 });
  const group = new THREE.Group(), a = box(-2, 1, material), b = box(-3, 1, material), outside = box(-2, 1, material);
  outside.position.x = 4;
  const originals = Array(6).fill(material); a.material = originals;
  group.add(a, b); scene.add(group, outside);
  const system = new InteractionSystem(scene); register(system, group, 'shared');
  const first = system.update(camera), clone = a.material[0];
  assert.notEqual(clone, material); assert.equal(a.material[1], clone); assert.equal(b.material, clone);
  assert.equal(outside.material, material); assert.equal(material.emissiveIntensity, .65); assert.equal(material.emissive.getHex(), 0x224466);
  assert.equal(system.update(camera), first); assert.equal(a.material[0], clone);
  let disposed = 0; clone.addEventListener('dispose', () => disposed++);
  camera.rotation.y = Math.PI;
  assert.equal(system.update(camera), null);
  assert.equal(a.material, originals); assert.equal(b.material, material); assert.equal(disposed, 1);
  system.dispose(); system.dispose(); assert.equal(disposed, 1); disposeScene(scene);
});

test('fixed steps preserve one second at 10/30/60/144 FPS and irregular frame intervals', () => {
  for (const fps of [10, 30, 60, 144]) {
    const clock = new SimulationClock(); let total = 0, steps = 0;
    for (let i = 0; i < fps; i++) clock.advance(1 / fps, dt => { assert.equal(dt, FIXED_STEP); total += dt; steps++; });
    assert.equal(steps, 60); assert.ok(Math.abs(total - 1) < 1e-9); assert.ok(clock.alpha < 1);
  }
  const clock = new SimulationClock(); let total = 0;
  for (const dt of [.01, .19, .1, .05, .15, .25, .25]) clock.advance(dt, step => total += step);
  assert.ok(Math.abs(total - 1) < 1e-9);
  let steps = 0;
  clock.advance(10, () => steps++); assert.equal(steps, 15, 'Long stalls have bounded catch-up');
  clock.advance(0, () => steps++); clock.advance(NaN, () => steps++); assert.equal(steps, 15);
  clock.advance(.005, () => {}); clock.reset(); assert.equal(clock.alpha, 0);
});

test('scene disposal frees shared resources once and is repeatable', () => {
  const scene = new THREE.Scene(), geometry = new THREE.BoxGeometry(), texture = new THREE.Texture(), cachedFace = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture });
  material.userData.ownedTextures = [texture, cachedFace, cachedFace];
  const counts = { geometry: 0, material: 0, texture: 0, cachedFace: 0 };
  geometry.addEventListener('dispose', () => counts.geometry++);
  material.addEventListener('dispose', () => counts.material++);
  texture.addEventListener('dispose', () => counts.texture++);
  cachedFace.addEventListener('dispose', () => counts.cachedFace++);
  scene.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, [material, material]));
  scene.environment = texture;
  disposeScene(scene); disposeScene(scene);
  assert.deepEqual(counts, { geometry: 1, material: 1, texture: 1, cachedFace: 1 });
  assert.equal(scene.children.length, 0);
});

const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function engineHarness({ motorWait, fontWait, buildError = false, rendererError = false, onService } = {}) {
  const document = new EventTarget(); document.hidden = false; document.pointerLockElement = null;
  document.fonts = { load: () => fontWait?.promise ?? Promise.resolve() };
  document.exitPointerLock = () => { document.pointerLockElement = null; };
  const window = new EventTarget(); window.devicePixelRatio = 1;
  const frames = new Map(), timers = new Map(); let id = 0;
  const counts = { motor: 0, renderer: 0, journey: 0, geometry: 0, error: 0, ready: 0, interact: 0 };
  const pours = [];
  const motor = { dispose: () => counts.motor++, move: (x,z,dt,out) => { out.x += x; out.z += z; }, grounded: true };
  class Renderer {
    constructor() { if (rendererError) throw Error('renderer'); this.domElement = new EventTarget(); Object.assign(this.domElement, { style: {}, focus() {}, setAttribute() {}, remove() {} }); this.shadowMap = {}; }
    setSize() {} setPixelRatio() {} render() {} dispose() { counts.renderer++; }
  }
  class Journey { dispose() { counts.journey++; } setHidden() {} resize() {} }
  const { GameEngine } = load('engine', {
    three: { ...THREE, WebGLRenderer: Renderer },
    './physics': { CharacterMotor: { create: () => motorWait?.promise ?? Promise.resolve(motor) }, EYE_HEIGHT: 1.66 },
    './interaction': { InteractionSystem }, './simulation': { SimulationClock }, './resources': { disposeScene },
    './chapterOne': load('chapterOne'),
    './dialogue': load('dialogue'), './trainJourney': { TrainJourney: Journey },
    './cafeStreet': { STREET_SPAWN: new THREE.Vector3(), STREET_YAW: 0, STREET_SKY: 0, buildCafeStreet(scene) {
      const mesh = box(-10); mesh.geometry.addEventListener('dispose', () => counts.geometry++); scene.add(mesh);
      if (buildError) throw Error('builder');
      return { cafeInterior: new THREE.Group() };
    } },
  }, {
    document, window, AbortController, ResizeObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; }, cancelAnimationFrame: key => frames.delete(key),
    setTimeout: fn => { timers.set(++id, fn); return id; }, clearTimeout: key => timers.delete(key), console: { error() {} },
  });
  const engine = new GameEngine({ clientWidth: 1440, clientHeight: 900, appendChild() {} }, {
    onReady: () => counts.ready++, onError: () => counts.error++, onInteract: () => counts.interact++, onLockChange() {}, onDialogue() {}, onDialogueUpdate() {}, onInfo() {}, onService, onPrepare: (drink, perfect) => pours.push({ drink, perfect }),
  });
  return { engine, counts, frames, timers, motor, document, pours };
}

async function liveKitchen(initialService) {
 const cafe = load('cafeService'), chapter = load('chapterOne', { './cafeService': cafe });
 let shift = { ...chapter.newShift(3), stage: 'brew', service: initialService, ticket: { drink: 'coffee', count: 1 } };
 const actions = []; let h;
 h = engineHarness({ onService(action) {
  actions.push(action);shift = chapter.actShift(shift, { type: 'service', action }).state;h.engine.setShiftPresentation(shift);
 } });
 await flush();h.engine.journey.dispose();h.engine.journey = null;h.engine.inCafe = true;h.engine.position.set(100,.03,97.4);
 h.engine.beginPlay('mouse');h.engine.setShiftPresentation(shift);
 let now = 1000;h.engine.tick(now);
 return { ...h, actions, get shift() { return shift; }, setStage(stage) { shift = { ...shift, stage };h.engine.setShiftPresentation(shift); },
  jump(seconds) { now += seconds * 1000;h.engine.tick(now); },
  advance(seconds) { const frames = Math.ceil(seconds / .125);for(let i=0;i<frames;i++){now += seconds * 1000 / frames;h.engine.tick(now);} },
 };
}

test('real service callbacks brew only during active play and resume without offline catch-up', async () => {
 const cafe = load('cafeService');let service = cafe.freshService();
 for(let i=0;i<2;i++)service=cafe.actService(service,{type:'station',station:'kettle'},3).state;
 const h=await liveKitchen(service);const e=h.engine;
 try {
  h.advance(1);assert.equal(h.shift.service.kettleTime,7);assert.ok(h.actions.some(action=>action.type==='tick'));
  const pauses=[
   ['notebook',()=>e.openStudy(),()=>e.closeStudy()],
   ['conversation',()=>e.dialogue.start({speaker:'Haru',text:'Take your time.',japaneseText:'どうぞ'}),()=>{e.dialogue.end();e.start();}],
   ['pause menu',()=>e.pause(),()=>e.start()],
   ['hidden tab',()=>{h.document.hidden=true;h.document.dispatchEvent(new Event('visibilitychange'));},()=>{h.document.hidden=false;h.document.dispatchEvent(new Event('visibilitychange'));e.start();}],
   ['suspended viewport',()=>e.setViewportSuspended(true),()=>{e.setViewportSuspended(false);e.start();}],
  ];
  for(const [name,enter,leave] of pauses){
   const remaining=h.shift.service.kettleTime,calls=h.actions.length;enter();h.jump(60);h.advance(1);
   assert.equal(h.shift.service.kettleTime,remaining,`${name} must freeze brewing`);assert.equal(h.actions.length,calls,`${name} must not dispatch service work`);
   leave();h.jump(60);assert.equal(h.shift.service.kettleTime,remaining,`${name} must not catch up hidden wall time`);
   h.advance(.5);assert.equal(h.shift.service.kettleTime,remaining-.5,`${name} must resume normal brewing`);
  }
  for(const stage of ['briefing','order','pay','report']){
   const before=h.shift.service.kettleTime;h.setStage(stage);h.advance(.5);assert.equal(h.shift.service.kettleTime,before-.5,`Existing jobs continue during ${stage}`);
  }
  assert.equal(h.counts.error,0);
 } finally {e.dispose();}
});

test('manual service work requires E at the matching station while stationary and survives notebook pause', async () => {
 const cafe=load('cafeService');let service=cafe.freshService();
 for(const station of ['cups','water'])service=cafe.actService(service,{type:'station',station},3).state;
 const h=await liveKitchen(service),e=h.engine;let aimed='shift-water';e.interaction.update=()=>({id:aimed,prompt:'Work'});
 try {
  h.advance(.5);assert.equal(h.shift.service.manual.elapsed,0,'Looking at a station does not pour');
  e.keys.add('KeyE');aimed='shift-tea';h.advance(.5);assert.equal(h.shift.service.manual.elapsed,0,'Holding at a different station does not pour');
  aimed='shift-water';h.advance(.5);assert.equal(h.shift.service.manual.elapsed,.5);
  e.keys.add('KeyW');h.advance(.5);assert.equal(h.shift.service.manual.elapsed,.5,'Walking away cannot continue pouring');e.keys.delete('KeyW');
  h.advance(.25);assert.equal(h.shift.service.manual.elapsed,.75);
  e.openStudy();const calls=h.actions.length;h.jump(45);assert.equal(h.shift.service.manual.elapsed,.75);assert.equal(h.actions.length,calls);
  e.closeStudy();h.jump(45);h.advance(.5);assert.equal(h.shift.service.manual.elapsed,.75,'Resuming clears held input without losing partial work');
  e.keys.add('KeyE');h.advance(.375);assert.equal(h.shift.service.manual.elapsed,1.125);
  e.keys.add('KeyW');h.advance(.125);const release=new Event('keyup');release.code='KeyE';h.document.dispatchEvent(release);
  assert.equal(h.shift.service.manual?.elapsed,1.125,'Releasing while walking cannot finish the saved pour');e.keys.delete('KeyW');
  e.keys.add('KeyE');h.advance(.5);assert.equal(h.shift.service.manual,undefined);assert.equal(h.shift.service.vessels.filter(cup=>cup.state==='filled').length,1);
  h.advance(1);assert.equal(h.shift.service.vessels.filter(cup=>cup.state==='filled').length,1,'Continued hold cannot manufacture another cup');assert.equal(h.counts.error,0);
 } finally {e.dispose();}
});

test('unmount before motor resolves frees the late motor exactly once', async () => {
  const motorWait = deferred(), h = engineHarness({ motorWait });
  h.engine.dispose(); h.engine.dispose(); motorWait.resolve(h.motor); await flush();
  assert.equal(h.counts.motor, 1); assert.equal(h.counts.ready, 0); assert.equal(h.frames.size, 0);
});

test('unmount during fonts cancels wait and does not double-free the motor', async () => {
  const fontWait = deferred(), h = engineHarness({ fontWait }); await flush();
  assert.equal(h.timers.size, 1); h.engine.dispose(); await flush();
  assert.equal(h.timers.size, 0); fontWait.resolve(); await flush(); h.engine.dispose();
  assert.equal(h.counts.motor, 1); assert.equal(h.counts.ready, 0); assert.equal(h.counts.error, 0);
});

test('partial builder and renderer failure clean up and report only once', async () => {
  for (const options of [{ buildError: true }, { rendererError: true }]) {
    const h = engineHarness(options); await flush(); h.engine.dispose();
    assert.equal(h.counts.motor, 1); assert.equal(h.counts.geometry, 1); assert.equal(h.counts.error, 1);
    assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
    if (options.rendererError) assert.equal(h.counts.journey, 1);
  }
});

test('fatal render errors and context loss stop the loop and free the runtime', async () => {
  for (const contextLoss of [false, true]) {
    const h = engineHarness(); await flush();
    if (contextLoss) h.engine.renderer.domElement.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    else { h.engine.journey = null; h.engine.renderer.render = () => { throw Error('frame'); }; h.frames.clear(); h.engine.tick(1000); }
    assert.equal(h.engine.alive, false); assert.equal(h.frames.size, 0);
    assert.equal(h.counts.error, 1); assert.equal(h.counts.motor, 1); assert.equal(h.counts.renderer, 1);
    h.engine.tick(2000); h.engine.dispose(); assert.equal(h.counts.error, 1); assert.equal(h.counts.motor, 1);
  }
});

test('engine advances real movement at low/high FPS and publishes stable prompts once', async () => {
  for (const fps of [10, 60, 144]) {
    const h = engineHarness(); await flush();
    h.engine.journey.dispose(); h.engine.journey = null; h.engine.beginPlay('mouse'); h.engine.keys.add('KeyW');
    const result = { id: 'stable', prompt: 'Read' }; h.engine.interaction.update = () => result;
    h.engine.tick(1000);
    for (let i = 1; i <= fps; i++) h.engine.tick(1000 + i * 1000 / fps);
    assert.ok(Math.abs(h.engine.position.z + 2.35) < 1e-8);
    assert.equal(h.counts.interact, 1);
    h.engine.pause(); assert.equal(h.counts.interact, 2); assert.equal(h.engine.simulation.alpha, 0);
    h.engine.dispose();
  }
});

test('real Rapier motor tolerates repeated disposal', async () => {
  const { CharacterMotor } = load('physics');
  const motor = await CharacterMotor.create(new THREE.Vector3());
  motor.dispose(); assert.doesNotThrow(() => motor.dispose());
});

test('releasing E in the timing window pours once; holding through it remains playable', async () => {
 const h = engineHarness(); await flush();
 const e = h.engine; e.journey = null; e.beginPlay('mouse'); e.shiftStage = 'brew';
 const target = { id: 'shift-coffee', prompt: 'Pour' };
 e.interaction.update = () => target;
 const start = () => { e.keys.add('KeyE'); e.work = { id: target.id, elapsed: 0, published: -1 }; };
 const release = () => { const event = new Event('keyup'); event.code = 'KeyE'; h.document.dispatchEvent(event); };
 start(); e.updateWork(1.12, target); release(); release();
 assert.deepEqual(h.pours, [{ drink: 'coffee', perfect: true }]);
 start(); e.updateWork(.3, target); release();
 assert.equal(h.pours.length, 1, 'An early release does not produce a cup');
 start(); e.updateWork(1.6, target); release();
 assert.deepEqual(h.pours[1], { drink: 'coffee', perfect: false });
 start(); e.updateWork(1.5, target); release();
 assert.deepEqual(h.pours[2], { drink: 'coffee', perfect: false }, 'Just missing green still gives a regular cup');
 start(); e.updateWork(1.12, target); e.pause(); release();
 assert.equal(h.pours.length, 3, 'Pausing cancels an unfinished pour');
 e.beginPlay('mouse'); start(); e.updateWork(1.12, target);
 e.interaction.update = () => ({ id: 'shift-tea', prompt: 'Pour' }); release();
 assert.equal(h.pours.length, 3, 'Looking away before release cannot finish the old station');
 e.dispose();
});

test('cafe service aisle and staff pantry are reachable with the real player motor', async () => {
 const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
 const { RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js');
 const ctx = new Proxy({}, { get(target, key) {
  if (key in target) return target[key];
  if (key === 'createLinearGradient') return () => ({ addColorStop() {} });
  return () => {};
 }, set(target, key, value) { target[key] = value; return true; } });
 const { buildCafeInterior } = load('cafeInterior', {
  'three/addons/geometries/RoundedBoxGeometry.js': { RoundedBoxGeometry },
  'three/addons/utils/BufferGeometryUtils.js': { mergeGeometries },
  './textures': { makeTextTexture: () => new THREE.Texture() },
  './avatar': { avatarProfiles: { haru: {} }, createAvatar: () => ({ group: new THREE.Group(), setExpression() {} }) },
 }, { document: { createElement: () => ({ getContext: () => ctx }) } });
 const room = buildCafeInterior();
 const { CharacterMotor } = load('physics');
 const position = new THREE.Vector3(0, .03, 2);
 const motor = await CharacterMotor.create(position);
 motor.addBoxCollider(0, -.06, 0, 3.5, .06, 3.5);
 for (const c of room.colliders) motor.addBoxCollider(c.x, c.y, c.z, c.hw, c.hh, c.hd);
 const walkTo = (x, z) => {
  for (let step = 0; step < 600; step++) {
   const dx = x - position.x, dz = z - position.z, distance = Math.hypot(dx, dz);
   if (distance < .04) break;
   const travel = Math.min(distance, 2.35 / 60);
   motor.move(dx / distance * travel, dz / distance * travel, 1 / 60, position);
  }
  assert.ok(Math.hypot(position.x - x, position.z - z) < .12, `Cannot reach ${x}, ${z}: stopped at ${position.x}, ${position.z}`);
 };
 walkTo(2.2, .7); walkTo(2.2, -2.4);
 walkTo(1.4, -2.4); walkTo(-2.8, -2.4); // till to all three drink stations
 walkTo(1.4, -2.4); walkTo(2.6, -2.4); walkTo(2.6, -4.4); // through staff doorway
 walkTo(2.6, -2.4); walkTo(2.2, .7); walkTo(0, 2);
 motor.dispose(); disposeScene(room.group);
});

test('real café preparation stations are selectable through their tools but never through an opaque wall', async () => {
 const { mergeGeometries }=await import('three/addons/utils/BufferGeometryUtils.js');
 const { RoundedBoxGeometry }=await import('three/addons/geometries/RoundedBoxGeometry.js');
 const ctx=new Proxy({}, {get(target,key){if(key in target)return target[key];if(key==='createLinearGradient')return()=>({addColorStop(){}});return()=>{};},set(target,key,value){target[key]=value;return true;}});
 const textures={makeTextTexture:()=>new THREE.Texture()};
 const avatar={avatarProfiles:{haru:{}},getAvatarProfile:()=>({}),createAvatar:()=>({group:new THREE.Group(),setExpression(){},update(){}})};
 const interior=load('cafeInterior',{'three/addons/geometries/RoundedBoxGeometry.js':{RoundedBoxGeometry},'three/addons/utils/BufferGeometryUtils.js':{mergeGeometries},'./textures':textures,'./avatar':avatar},{document:{createElement:()=>({getContext:()=>ctx})}});
 const materials=new Proxy({shadow:new THREE.MeshBasicMaterial({transparent:true,opacity:.2})},{get(target,key){return target[key]??(target[key]=new THREE.MeshStandardMaterial());}});
 const {buildCafeStreet}=load('cafeStreet',{
  'three/addons/utils/BufferGeometryUtils.js':{mergeGeometries},'./streetMaterials':{createStreetMaterials:()=>materials},'./textures':textures,
  './components':interior,'./atmosphere':{addLaneAtmosphere(){}},'./cafeEquipment':load('cafeEquipment'),
  './customerService':load('customerService',{'./chapterOne':load('chapterOne'),'./avatar':avatar}),
 });
 const scene=new THREE.Scene(),system=new InteractionSystem(scene),camera=new THREE.PerspectiveCamera();
 const world=buildCafeStreet(scene,{addBoxCollider(){}},system);world.cafeInterior.visible=true;world.equipment.setState(load('cafeService').freshService());
 const points={coffee:[-2.12,-2.45],tea:[-1.05,-2.45],water:[.25,-2.45],cups:[.65,-2.45],kettle:[-.35,-2.45],grinder:[-2.95,-2.45],tray:[.85,-2.45],sink:[2.25,-2.45],pantry:[2.6,-2.4],wipe:[1.4,-2.45],return:[2.1,-2.45]};
 try {
  for(const [station,[x,z]]of Object.entries(points)){
   const target=world.interactables.find(item=>item.id==='shift-'+station);assert.ok(target,`${station} must exist in the actual café`);
   camera.position.set(100+x,1.69,100+z);const aim=target.mesh.getWorldPosition(new THREE.Vector3());aim.y=1.43;camera.lookAt(aim);
   assert.equal(system.update(camera)?.id,target.id,`${station} must be reachable at its actual tool position`);
   const wall=new THREE.Mesh(new THREE.BoxGeometry(2,3,.04),new THREE.MeshStandardMaterial());
   // Keep the obstruction in front of the tool's pick volume, rather than inside it.
   wall.position.lerpVectors(camera.position,aim,.12);wall.position.y=1.5;wall.rotation.y=Math.atan2(aim.x-camera.position.x,aim.z-camera.position.z);scene.add(wall);
   assert.equal(system.update(camera),null,`${station} pick volume must respect opaque walls`);
   wall.removeFromParent();wall.geometry.dispose();wall.material.dispose();
   assert.equal(system.update(camera)?.id,target.id,`${station} must recover when the obstruction is removed`);
  }
  world.cafeInterior.visible=false;assert.equal(system.update(camera),null,'The hidden café cannot expose station targets');
 } finally {system.dispose();disposeScene(scene);}
});
