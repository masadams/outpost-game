import { STEP } from './config';
export class FixedClock {
  private accumulator = 0;
  reset(): void { this.accumulator = 0; }
  advance(elapsed: number, tick: (dt: number) => void): number {
    this.accumulator += Math.min(Math.max(elapsed, 0), 0.25);
    let count = 0;
    while (this.accumulator + 1e-10 >= STEP && count < 15) {
      tick(STEP); this.accumulator = Math.max(0, this.accumulator - STEP); count++;
    }
    return this.accumulator / STEP;
  }
}
