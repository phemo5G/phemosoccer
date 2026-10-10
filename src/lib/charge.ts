import type { ChargedAction } from "./engine";

export const CHARGE_SECONDS = 1.2;
export const CHARGED_ACTIONS: ChargedAction[] = ["pass", "shoot", "finesse", "chip", "lob", "through"];

/** Release once, even at maximum charge; pausing/cancelling drops pending kicks. */
export class ChargeTracker {
  private times: Partial<Record<ChargedAction, number>> = {};

  update(action: ChargedAction, held: boolean, dt: number): { level: number; released?: number } {
    const previous = this.times[action];
    if (held) {
      const seconds = Math.min(CHARGE_SECONDS, (previous ?? 0) + Math.max(0, dt));
      this.times[action] = seconds;
      return { level: seconds / CHARGE_SECONDS };
    }
    delete this.times[action];
    return { level: 0, released: previous === undefined ? undefined : Math.max(0.06, previous / CHARGE_SECONDS) };
  }

  reset() { this.times = {}; }
}