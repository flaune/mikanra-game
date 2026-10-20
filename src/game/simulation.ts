export const FIXED_STEP = 1 / 60;
const MAX_CATCH_UP = .25;

/** Keep ordinary slow frames in real time without replaying long tab/OS stalls. */
export class SimulationClock {
  private accumulated = 0;
  get alpha() { return this.accumulated / FIXED_STEP; }
  reset() { this.accumulated = 0; }
  advance(seconds: number, step: (dt: number) => void) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    this.accumulated += Math.min(seconds, MAX_CATCH_UP);
    while (this.accumulated + 1e-10 >= FIXED_STEP) {
      step(FIXED_STEP);
      this.accumulated = Math.max(0, this.accumulated - FIXED_STEP);
    }
  }
}
