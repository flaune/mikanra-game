/** Café rules are independent of meshes, animation and browser time. */
export type Drink = 'coffee' | 'tea' | 'water';
export type Station = 'cups' | 'kettle' | 'tea' | 'grinder' | 'coffee' | 'water' | 'tray' | 'sink' | 'pantry' | 'return' | 'wipe';
export type VesselState = 'clean' | 'reserved' | 'filled' | 'tray' | 'served' | 'dirty';
export interface Vessel { id: number; state: VesselState; drink?: Drink; perfect?: boolean }
export interface CafeService {
  vessels: Vessel[]; activeCup?: number;
  kettle: 'empty' | 'filled' | 'heating' | 'hot'; kettleTime: number; hotWater: number;
  tea: 'empty' | 'leaves' | 'steeping' | 'ready'; teaTime: number; portions: 1 | 2; teaLeft: number;
  coffee: 'empty' | 'ground' | 'tamped' | 'locked' | 'extracting' | 'ready'; coffeeTime: number; coffeeCup?: number;
  stock: { tea: number; coffee: number }; counterDirty: boolean; washed: number;
  guided?: boolean;
  manual?: { station: 'tea' | 'water' | 'sink' | 'wipe'; elapsed: number; cup?: number; batch?: boolean };
}
export type ServiceAction = { type: 'station'; station: Station } | { type: 'portions'; count: 1 | 2 } |
  { type: 'tick'; seconds: number; held?: Station } | { type: 'release' } |
  { type: 'guided'; step: string; drink: Drink; count: 1 | 2; mode?: WorkMode };
export type WorkMode = 'recipe' | 'cleanup' | 'wash' | 'restock';
export interface GuidedStep extends ServiceStep { key: string }
export interface ServiceStep { station: Station; label: string; japanese: string; word?: string; hold?: boolean; waiting?: number }
export const freshService = (): CafeService => ({ vessels: Array.from({ length: 4 }, (_, id) => ({ id, state: 'clean' })), kettle: 'empty', kettleTime: 0, hotWater: 0, tea: 'empty', teaTime: 0, portions: 1, teaLeft: 0, coffee: 'empty', coffeeTime: 0, stock: { tea: 2, coffee: 2 }, counterDirty: false, washed: 0 });
export const trayVessels = (s: CafeService) => s.vessels.filter(cup => cup.state === 'tray');
const number = (v: unknown, max: number) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0;
/** Malformed equipment resets safely; completed legacy trays remain usable. */
export function readService(raw: unknown, tray: Drink[] = [], quality: boolean[] = [], served = 0): CafeService {
  const fresh = freshService();
  if (!raw || typeof raw !== 'object') {
    tray.map((drink, i) => ({ drink, perfect: quality[i] === true })).filter(cup => ['coffee','tea','water'].includes(cup.drink)).slice(0, 2).forEach((cup, i) => { fresh.vessels[i] = { id: i, state: 'tray', ...cup }; });
    const count = Math.floor(number(served, 4));
    fresh.vessels.filter(cup => cup.state === 'clean').slice(0, count).forEach(cup => { cup.state = 'served'; });
    return fresh;
  }
  const r = raw as Partial<CafeService>;
  const states: VesselState[] = ['clean','reserved','filled','tray','served','dirty'];
  if (!Array.isArray(r.vessels) || r.vessels.length !== 4 || r.vessels.some((cup, i) => cup?.id !== i || !states.includes(cup.state))) return readService(null, tray, quality, served);
  const s: CafeService = { ...fresh,
    vessels: r.vessels.map(cup => ({ id: cup.id, state: cup.state, ...(['coffee','tea','water'].includes(cup.drink ?? '') ? { drink: cup.drink, perfect: cup.perfect === true } : {}) })),
    kettle: ['empty','filled','heating','hot'].includes(r.kettle ?? '') ? r.kettle! : 'empty', kettleTime: number(r.kettleTime, 8), hotWater: number(r.hotWater, 2),
    tea: ['empty','leaves','steeping','ready'].includes(r.tea ?? '') ? r.tea! : 'empty', teaTime: number(r.teaTime, 6), portions: r.portions === 2 ? 2 : 1, teaLeft: number(r.teaLeft, 2),
    coffee: ['empty','ground','tamped','locked','extracting','ready'].includes(r.coffee ?? '') ? r.coffee! : 'empty', coffeeTime: number(r.coffeeTime, 6),
    stock: { tea: Math.floor(number(r.stock?.tea, 4)), coffee: Math.floor(number(r.stock?.coffee, 4)) }, counterDirty: r.counterDirty === true, washed: Math.floor(number(r.washed, 999)), guided: r.guided === true,
  };
  s.hotWater = Math.floor(s.hotWater); s.teaLeft = Math.floor(s.teaLeft);
  if (s.kettle === 'empty') s.hotWater = 0;
  if (['filled','heating'].includes(s.kettle)) s.hotWater = 2;
  if (s.kettle === 'heating' && !s.kettleTime) s.kettle = 'hot';
  if (s.kettle === 'hot' && !s.hotWater) s.kettle = 'empty';
  if (s.kettle !== 'heating') s.kettleTime = 0;
  if (!s.teaLeft) s.tea = 'empty';
  if (s.tea === 'empty') s.teaLeft = 0;
  if (s.tea === 'steeping' && !s.teaTime) s.tea = 'ready';
  if (s.tea !== 'steeping') s.teaTime = 0;
  if (Number.isInteger(r.coffeeCup) && ['extracting','ready'].includes(s.coffee)) {
    const cup = s.vessels[r.coffeeCup!];
    if (cup?.state === 'reserved' || (cup?.state === 'filled' && cup.drink === 'coffee')) s.coffeeCup = r.coffeeCup;
  }
  if (['extracting','ready'].includes(s.coffee)) {
    if (s.coffeeCup === undefined) s.coffee = 'empty';
    else if (s.coffee === 'ready' || !s.coffeeTime || s.vessels[s.coffeeCup].state === 'filled') {
      s.coffee = 'ready'; s.vessels[s.coffeeCup] = { id: s.coffeeCup, state: 'filled', drink: 'coffee', perfect: s.vessels[s.coffeeCup].perfect === true };
    }
  }
  if (s.coffee !== 'extracting') s.coffeeTime = 0;
  if (Number.isInteger(r.activeCup) && r.activeCup !== s.coffeeCup && s.vessels[r.activeCup!]?.state === 'reserved') s.activeCup = r.activeCup;
  for (const cup of s.vessels) {
    if ((cup.state === 'tray' || cup.state === 'filled') && !cup.drink) cup.state = 'dirty';
    if (cup.state === 'reserved' && cup.id !== s.activeCup && cup.id !== s.coffeeCup) cup.state = 'clean';
    if (['clean','reserved','dirty'].includes(cup.state)) { delete cup.drink; delete cup.perfect; }
  }
  s.vessels.filter(cup => cup.state === 'tray').slice(2).forEach(cup => { cup.state = 'dirty'; });
  if (r.manual && ['tea','water','sink','wipe'].includes(r.manual.station)) {
    const m = r.manual;
    const cupExists = Number.isInteger(m.cup) && s.vessels[m.cup!];
    if ((m.station === 'wipe' && s.counterDirty) || (m.station === 'sink' && cupExists && s.vessels[m.cup!].state === 'dirty') || (['tea','water'].includes(m.station) && cupExists && m.cup === s.activeCup && (m.station !== 'tea' || s.tea === 'ready'))) s.manual = { station: m.station, elapsed: number(m.elapsed, m.station === 'sink' ? 3 : m.station === 'wipe' ? 2 : 1.6), cup: m.cup, batch: m.station === 'sink' && m.batch === true };
  }
  return s;
}
export function completeVisit(s: CafeService, day: number): CafeService {
  return { ...s, vessels: s.vessels.map(cup => cup.state === 'served' || (day === 1 && cup.state === 'dirty') ? { id: cup.id, state: day === 1 ? 'clean' : 'dirty' } : cup), counterDirty: day === 1 ? false : s.counterDirty };
}
export function transferTray(s: CafeService, accepted: boolean, day = 2): CafeService {
  return { ...s, vessels: s.vessels.map(cup => cup.state !== 'tray' ? cup : accepted ? { ...cup, state: 'served' } : { id: cup.id, state: day === 1 ? 'clean' : 'dirty' }) };
}
export function closingStep(s: CafeService): ServiceStep | null {
  if (s.vessels.some(cup => !['clean','dirty'].includes(cup.state)) || s.tea !== 'empty' || s.coffee !== 'empty' || s.kettle !== 'empty') return { station: 'return', label: 'Return cups and empty the equipment', japanese: '片付け', word: 'ready' };
  if (s.vessels.some(cup => cup.state === 'dirty')) return { station: 'sink', label: 'Wash the remaining cups', japanese: '洗う', word: 'wash', hold: true };
  if (s.counterDirty) return { station: 'wipe', label: 'Wipe the counter', japanese: '片付け', hold: true };
  return null;
}
export function nextServiceStep(s: CafeService, drink: Drink, day = 1): ServiceStep {
  if (s.manual) return { station: s.manual.station, label: s.manual.station === 'sink' ? 'Wash the cup' : s.manual.station === 'wipe' ? 'Wipe the counter' : 'Pour into the cup', japanese: s.manual.station === 'sink' ? '洗う' : s.manual.station === 'wipe' ? '片付け' : '注ぐ', word: s.manual.station === 'sink' ? 'wash' : s.manual.station === 'wipe' ? undefined : 'pour', hold: true };
  if (s.vessels.some(cup => cup.state === 'filled')) return { station: 'tray', label: 'Place the finished cup on your tray', japanese: 'できました', word: 'ready' };
  const cup = (): ServiceStep => s.vessels.some(c => c.state === 'clean') ? { station: 'cups', label: 'Take a clean cup or glass', japanese: 'カップ', word: 'cup' } : { station: 'sink', label: 'Wash a cup to use again', japanese: '洗う', word: 'wash', hold: true };
  if (drink === 'coffee') {
    if (s.coffee === 'empty') return day >= 3 && s.stock.coffee === 0 ? { station: 'pantry', label: 'Refill the coffee beans', japanese: 'コーヒー' } : { station: 'grinder', label: 'Grind one dose of coffee beans', japanese: 'コーヒー', word: 'coffee' };
    if (s.coffee === 'ground') return { station: 'coffee', label: 'Dose and tamp the portafilter', japanese: 'コーヒー' };
    if (s.coffee === 'tamped') return { station: 'coffee', label: 'Attach the portafilter', japanese: 'コーヒー' };
    if (s.coffee === 'locked' && s.activeCup === undefined) return cup();
    if (s.coffee === 'locked') return { station: 'coffee', label: 'Place the cup and start extraction', japanese: 'コーヒー' };
    return { station: 'coffee', label: 'Coffee is extracting · tidy while you wait', japanese: 'コーヒー', waiting: s.coffeeTime };
  }
  if (drink === 'tea') {
    if (s.tea === 'ready') return s.activeCup === undefined ? cup() : { station: 'tea', label: 'Pour the brewed tea into your cup', japanese: '注ぐ', word: 'pour', hold: true };
    if (s.tea === 'steeping') return { station: 'tea', label: 'Tea is steeping · tidy while you wait', japanese: 'お茶', waiting: s.teaTime };
    if (s.kettle === 'empty') return { station: 'kettle', label: 'Fill the kettle with fresh water', japanese: 'お湯', word: 'hot-water' };
    if (s.kettle === 'filled') return { station: 'kettle', label: 'Switch on the kettle', japanese: 'お湯', word: 'hot-water' };
    if (s.tea === 'empty') return day >= 3 && s.stock.tea < s.portions ? { station: 'pantry', label: 'Refill the tea leaves', japanese: '茶葉', word: 'leaves' } : { station: 'tea', label: `Measure leaves for ${s.portions} ${s.portions === 1 ? 'cup' : 'cups'} · 1 / 2 to change`, japanese: '茶葉', word: 'leaves' };
    if (s.kettle === 'heating') return { station: 'kettle', label: 'Water is heating · tidy while you wait', japanese: 'お湯', waiting: s.kettleTime };
    if (s.hotWater < s.teaLeft) return { station: 'kettle', label: 'Refill the kettle for this batch', japanese: 'お湯', word: 'hot-water' };
    return { station: 'tea', label: 'Add hot water to the teapot', japanese: 'お湯', word: 'hot-water' };
  }
  return s.activeCup === undefined ? cup() : { station: 'water', label: 'Fill the glass from the pitcher', japanese: '注ぐ', word: 'pour', hold: true };
}
const duration = (s: CafeService) => s.manual?.station === 'sink' ? 3 : s.manual?.station === 'wipe' ? 2 : 1.6;
export function workStatus(s: CafeService) {
  if (s.manual) return { fraction: s.manual.elapsed / duration(s), station: s.manual.station, label: s.manual.station === 'sink' ? 'Washing' : s.manual.station === 'wipe' ? 'Wiping' : 'Pouring', pouring: ['tea','water'].includes(s.manual.station) };
  if (s.tea === 'steeping') return { fraction: 1 - s.teaTime / 6, station: 'tea' as Station, label: 'Steeping tea', pouring: false };
  if (s.coffee === 'extracting') return { fraction: 1 - s.coffeeTime / 6, station: 'coffee' as Station, label: 'Extracting coffee', pouring: true };
  if (s.kettle === 'heating') return { fraction: 1 - s.kettleTime / 8, station: 'kettle' as Station, label: 'Heating water', pouring: false };
  return null;
}

/** The next visible gesture. Its key rejects clicks left over from an older step. */
export function guidedStep(s: CafeService, drink: Drink, count: number, day = 1, mode: WorkMode = 'recipe'): GuidedStep | null {
  const dirty = s.vessels.filter(c => c.state === 'dirty');
  const wash = (): GuidedStep | null => dirty.length ? { key: 'wash-' + dirty.map(c => c.id).join('-'), station: 'sink', label: 'Wash returned cups', japanese: '洗う', word: 'wash', hold: true } : null;
  if (s.manual) {
    const m = s.manual;
    return { key: m.station === 'sink' ? 'wash-' + dirty.map(c => c.id).join('-') : `${m.station}-${m.cup ?? 'counter'}`, station: m.station, label: m.station === 'sink' ? 'Wash returned cups' : m.station === 'wipe' ? 'Wipe the counter' : 'Pour into the cup', japanese: m.station === 'sink' ? '洗う' : m.station === 'wipe' ? '片付け' : '注ぐ', word: m.station === 'sink' ? 'wash' : m.station === 'wipe' ? undefined : 'pour', hold: true };
  }
  if (mode === 'restock') return s.stock.coffee === 4 && s.stock.tea === 4 ? null : { key: `restock-${s.stock.coffee}-${s.stock.tea}`, station: 'pantry', label: 'Refill beans and tea leaves', japanese: '茶葉', word: 'leaves' };
  if (mode === 'wash') return wash();
  if (mode === 'cleanup') {
    const step = closingStep(s);
    if (!step) return null;
    return step.station === 'sink' ? wash() : { ...step, key: 'tidy-' + step.station };
  }
  if (trayVessels(s).length >= count) return null;
  if (s.vessels.some(c => c.state === 'filled')) return { key: 'collect-ready', station: 'tray', label: 'Collect the finished drink', japanese: 'できました', word: 'ready' };
  const available = s.activeCup !== undefined || s.vessels.some(c => c.state === 'clean');
  const remaining = Math.max(1, count - trayVessels(s).length) as 1 | 2;
  const step = nextServiceStep(s.tea === 'empty' ? { ...s, portions: remaining } : s, drink, day);
  if (step.station === 'cups' || (drink === 'water' && !available)) {
    if (!available) return wash();
    return { key: drink === 'coffee' ? 'start-coffee' : `${drink}-${s.activeCup ?? s.vessels.find(c => c.state === 'clean')!.id}`, station: drink, label: drink === 'coffee' ? 'Place cup and brew coffee' : drink === 'tea' ? 'Pour the tea' : 'Fill a glass of water', japanese: drink === 'coffee' ? 'コーヒー' : '注ぐ', word: drink === 'coffee' ? 'coffee' : 'pour', hold: drink !== 'coffee' };
  }
  if (step.station === 'coffee' && ['ground', 'tamped'].includes(s.coffee)) return { ...step, key: 'prepare-' + s.coffee, label: 'Tamp and attach the portafilter' };
  if (step.station === 'coffee' && s.coffee === 'locked') return { ...step, key: 'start-coffee', label: 'Place cup and brew coffee' };
  if (step.station === 'kettle' && !step.waiting) return { ...step, key: 'heat-' + s.kettle, label: 'Fill and heat the kettle' };
  if (step.station === 'tea' && step.hold) return { ...step, key: `tea-${s.activeCup}`, label: 'Pour the tea' };
  if (step.station === 'water') return { ...step, key: `water-${s.activeCup}`, label: 'Fill a glass of water' };
  return { ...step, key: `${step.station}-${drink === 'coffee' ? s.coffee : s.tea}-${s.stock.coffee}-${s.stock.tea}`, label: step.station === 'tea' && s.tea === 'empty' ? `Measure leaves for ${remaining} ${remaining === 1 ? 'cup' : 'cups'}` : step.label };
}

function actGuided(before: CafeService, action: Extract<ServiceAction, { type: 'guided' }>, day: number) {
  const step = guidedStep(before, action.drink, action.count, day, action.mode);
  if (!step || step.key !== action.step || step.waiting) return { state: before, message: '' };
  let state: CafeService = { ...before, guided: true };
  if (action.drink === 'tea' && state.tea === 'empty' && !state.manual) state.portions = Math.max(1, action.count - trayVessels(state).length) as 1 | 2;
  let result = { state, message: '', word: step.word };
  const at = (station: Station) => { const r = actService(state, { type: 'station', station }, day); state = r.state; result = { ...r, word: r.word ?? step.word }; };
  if ((step.station === 'coffee' && state.coffee === 'locked') || (['tea', 'water'].includes(step.station) && step.hold)) {
    if (state.activeCup === undefined) at('cups');
    if (state.activeCup === undefined) return { state: before, message: 'Wash returned cups before preparing this drink.' };
  }
  at(step.station);
  if (step.station === 'coffee' && state.coffee === 'tamped') at('coffee');
  if (step.station === 'kettle' && state.kettle === 'filled') at('kettle');
  if (step.station === 'sink' && state.manual) state = { ...state, manual: { ...state.manual, batch: true } };
  return { ...result, state };
}

export function actService(before: CafeService, action: ServiceAction, day = 1): { state: CafeService; message: string; word?: string } {
  const unchanged = (message = '') => ({ state: before, message });
  if (action.type === 'guided') return actGuided(before, action, day);
  if (action.type === 'portions') return before.tea === 'empty' && !before.manual ? { state: { ...before, portions: action.count }, message: `Tea batch set to ${action.count} cups.` } : unchanged('Finish the current teapot before changing its recipe.');
  const s: CafeService = { ...before, vessels: before.vessels.map(c => ({ ...c })), stock: { ...before.stock }, manual: before.manual && { ...before.manual } };
  const done = (message: string, word?: string) => {
    if (s.guided) for (const cup of s.vessels) {
      if (cup.state !== 'filled' || trayVessels(s).length >= 2) continue;
      cup.state = 'tray';
      if (cup.id === s.coffeeCup) { s.coffee = 'empty'; s.coffeeCup = undefined; s.coffeeTime = 0; }
    }
    return { state: s, message, word };
  };
  const finishManual = (perfect = false) => {
    const m = s.manual!;
    if (m.station === 'sink') {
      for (const cup of s.vessels) if (cup.state === 'dirty' && (m.batch || cup.id === m.cup)) { s.vessels[cup.id] = { id: cup.id, state: 'clean' }; s.washed++; }
    }
    else if (m.station === 'wipe') s.counterDirty = false;
    else {
      const drink: Drink = m.station === 'tea' ? 'tea' : 'water';
      s.vessels[m.cup!] = { id: m.cup!, state: 'filled', drink, perfect };
      s.activeCup = undefined; s.counterDirty = true;
      if (drink === 'tea') { s.teaLeft--; if (s.teaLeft === 0) s.tea = 'empty'; }
    }
    s.manual = undefined;
    return done(m.station === 'sink' ? 'Cup washed and returned to the clean stack.' : m.station === 'wipe' ? 'The counter is clean.' : `${perfect ? 'Perfect pour! ' : ''}Drink poured. Place the cup on your tray.`, m.station === 'sink' ? 'wash' : m.station === 'wipe' ? undefined : 'pour');
  };
  if (action.type === 'release') {
    if (!s.manual && s.coffee === 'extracting' && 1-s.coffeeTime/6 >= .65) {
      const perfect = 1-s.coffeeTime/6 <= .9; s.coffee = 'ready'; s.coffeeTime = 0;
      s.vessels[s.coffeeCup!] = { id: s.coffeeCup!, state: 'filled', drink: 'coffee', perfect };
      return done(perfect ? 'Perfect extraction! Move the coffee onto your tray.' : 'Coffee ready. Move the cup onto your tray.', 'coffee');
    }
    if (s.manual && ['tea','water'].includes(s.manual.station) && s.manual.elapsed / 1.6 >= .65) return finishManual(s.manual.elapsed / 1.6 <= .9);
    return unchanged();
  }
  if (action.type === 'tick') {
    if (!Number.isFinite(action.seconds) || action.seconds <= 0) return unchanged();
    const dt = Math.min(action.seconds, .25); let changed = false;
    if (s.kettle === 'heating') { s.kettleTime = Math.max(0, s.kettleTime - dt); if (!s.kettleTime) s.kettle = 'hot'; changed = true; }
    if (s.tea === 'steeping') { s.teaTime = Math.max(0, s.teaTime - dt); if (!s.teaTime) s.tea = 'ready'; changed = true; }
    if (s.coffee === 'extracting') {
      s.coffeeTime = Math.max(0, s.coffeeTime - dt); changed = true;
      if (!s.coffeeTime) { s.coffee = 'ready'; s.vessels[s.coffeeCup!] = { id: s.coffeeCup!, state: 'filled', drink: 'coffee' }; }
    }
    if (s.manual && action.held === s.manual.station) {
      s.manual.elapsed += dt; changed = true;
      if (s.manual.elapsed >= duration(s)) return finishManual();
    }
    return changed ? done('') : unchanged();
  }
  const station = action.station;
  if (s.manual && station !== s.manual.station && station !== 'return') return unchanged('Finish or return the current cup first. Your progress is kept.');
  if (station === 'cups') {
    if (s.activeCup !== undefined) return unchanged('A clean cup is already on the workbench.');
    const cup = s.vessels.find(c => c.state === 'clean');
    if (!cup) return unchanged('Wash a cup at the sink first.');
    cup.state = 'reserved'; s.activeCup = cup.id; return done('A clean cup is on the workbench.', 'cup');
  }
  if (station === 'kettle') {
    if (s.kettle === 'empty' || (s.kettle === 'hot' && s.hotWater < (s.teaLeft || s.portions))) { s.kettle = 'filled'; s.hotWater = 2; return done('Kettle filled. Switch it on to heat the water.', 'hot-water'); }
    if (s.kettle === 'filled') { s.kettle = 'heating'; s.kettleTime = 8; return done('Water is heating. You can measure leaves or wash cups meanwhile.', 'hot-water'); }
    return unchanged(s.kettle === 'hot' ? 'The hot water is ready for the teapot.' : 'The kettle is heating. There is no need to rush.');
  }
  if (station === 'tea') {
    if (s.tea === 'empty') {
      if (day >= 3 && s.stock.tea < s.portions) return unchanged('Refill the tea leaves at the pantry.');
      s.stock.tea = Math.max(0, s.stock.tea - s.portions); s.tea = 'leaves'; s.teaLeft = s.portions; return done(`Leaves measured for ${s.portions} cups. Add hot water when the kettle is ready.`, 'leaves');
    }
    if (s.tea === 'leaves' && s.kettle === 'hot' && s.hotWater >= s.teaLeft) {
      s.hotWater -= s.teaLeft; if (s.hotWater <= 0) { s.kettle = 'empty'; s.hotWater = 0; }
      s.tea = 'steeping'; s.teaTime = 6; s.counterDirty = true; return done('Tea is steeping. Its color deepens as the leaves open.', 'hot-water');
    }
    if (s.tea === 'ready' && s.activeCup !== undefined) { s.manual ??= { station: 'tea', elapsed: 0, cup: s.activeCup }; return done('Hold E to pour the brewed tea.', 'pour'); }
    return unchanged(s.tea === 'leaves' ? 'Heat water in the kettle before brewing.' : s.tea === 'ready' ? 'Take a clean cup first.' : 'Let the tea steep. It stays ready until you pour.');
  }
  if (station === 'grinder') {
    if (s.coffee !== 'empty') return unchanged('The portafilter already has a dose.');
    if (day >= 3 && !s.stock.coffee) return unchanged('Refill coffee beans at the pantry.');
    s.stock.coffee = Math.max(0, s.stock.coffee - 1); s.coffee = 'ground'; s.counterDirty = true; return done('Beans ground. Dose and tamp the portafilter at the machine.', 'coffee');
  }
  if (station === 'coffee') {
    if (s.coffee === 'ground') { s.coffee = 'tamped'; return done('Ground coffee dosed and tamped. Attach the portafilter.'); }
    if (s.coffee === 'tamped') { s.coffee = 'locked'; return done('Portafilter attached. Place a clean cup beneath the spout.'); }
    if (s.coffee === 'locked' && s.activeCup !== undefined) { s.coffeeCup = s.activeCup; s.activeCup = undefined; s.coffee = 'extracting'; s.coffeeTime = 6; return done('Coffee is extracting into the cup.', 'coffee'); }
    return unchanged(s.coffee === 'empty' ? 'Grind beans before using the machine.' : s.coffee === 'locked' ? 'Take a clean cup first.' : 'Let the machine finish extracting, then move the cup to your tray.');
  }
  if (station === 'water') {
    if (s.activeCup === undefined) return unchanged('Take a clean glass first.');
    s.manual ??= { station: 'water', elapsed: 0, cup: s.activeCup }; return done('Hold E to fill the glass from the pitcher.', 'pour');
  }
  if (station === 'tray') {
    if (trayVessels(s).length >= 2) return unchanged('Your tray holds two cups. Serve it or return the cups.');
    const cup = s.vessels.find(c => c.state === 'filled'); if (!cup) return unchanged('Finish brewing and pouring a drink first.');
    cup.state = 'tray'; if (cup.id === s.coffeeCup) { s.coffee = 'empty'; s.coffeeCup = undefined; }
    return done('Cup and saucer placed on your serving tray.', 'ready');
  }
  if (station === 'sink') {
    const cup = s.vessels.find(c => c.state === 'dirty'); if (!cup) return unchanged('All returned cups are clean.');
    s.manual ??= { station: 'sink', elapsed: 0, cup: cup.id }; return done('Hold E to wash the returned cup.', 'wash');
  }
  if (station === 'pantry') { s.stock = { coffee: 4, tea: 4 }; return done('Tea leaves and beans refilled from the pantry.'); }
  if (station === 'wipe') { if (!s.counterDirty) return unchanged('The counter is already clean.'); s.manual ??= { station: 'wipe', elapsed: 0 }; return done('Hold E to wipe the counter.'); }
  s.vessels = s.vessels.map(c => ['reserved','filled','tray'].includes(c.state) || (day === 1 && c.state === 'dirty') ? { id: c.id, state: day === 1 ? 'clean' : 'dirty' } : c);
  s.activeCup = undefined; s.coffeeCup = undefined; s.coffee = 'empty'; s.coffeeTime = 0; s.tea = 'empty'; s.teaLeft = 0; s.teaTime = 0; s.kettle = 'empty'; s.kettleTime = 0; s.hotWater = 0; s.manual = undefined;
  return done(day === 1 ? 'Equipment emptied. Haru washes the returned cups and puts them in the clean stack.' : 'Cups returned and equipment emptied. Wash returned cups at the sink.');
}
