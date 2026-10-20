/** Café-local metres. All adapters share these anchors; the room is translated once. */
export type Workbench = 'coffee' | 'tea' | 'cleanup';
export const CAFE_ORIGIN = 100;
export const COUNTER_TOP = 1.14;
export const COUNTER_SHIFT = 1.18;
export const staffSide = (z: number) => z < -1.65;
export const STATIONS = {
  coffee: [-2.12, -1.36], grinder: [-2.95, -1.04], tea: [-.95, -1.05],
  kettle: [-.25, -1.05], water: [.28, -1.05], cups: [.55, -3.05],
  tray: [.72, -1.05], sink: [3.02, -2.35], pantry: [2.6, -4.5],
  wipe: [2.98, -1.8], return: [2.98, -2.85], register: [1.25, -1.05],
} as const;
export const BENCHES = {
  coffee: { position: [-2.15, 1.72, -2.4], look: [-2.15, 1.24, -1.1] },
  tea: { position: [-.35, 1.72, -2.4], look: [-.35, 1.23, -1.05] },
  cleanup: { position: [2.1, 1.72, -2.3], look: [3.02, 1.2, -2.35] },
} as const;
export const SERVING_VIEW = { position: [.8, 1.72, -2.4], look: [.72, 1.22, -1.05] } as const;
export const CUSTOMER = {
  door: [0, 2.95], queue: [-.4, 1.8], service: [1.15, -.08],
  approach: [[.6, 1.1], [1.15, -.08]],
  departure: [[.85, .8], [.8, 2.35], [0, 2.95]],
} as const;
export function benchForStation(station: string): Workbench {
  return ['sink', 'pantry', 'wipe', 'return'].includes(station) ? 'cleanup' : ['coffee', 'grinder'].includes(station) ? 'coffee' : 'tea';
}
