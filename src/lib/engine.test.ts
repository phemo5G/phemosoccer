import { describe, expect, test } from "bun:test";
import { createState, step, W, H, GOAL_HALF, CROSSBAR, SKILLS } from "./engine";
import { TEAMS } from "./teams";

function fixture() {
  const home = TEAMS.find((t) => t.id === "phemo"), away = TEAMS.find((t) => t.id === "liv");
  if (!home || !away) throw new Error("Missing test teams");
  const s = createState(home, away);
  s.players.forEach((p, i) => { p.x = 50 + i * 50; p.y = 80; p.cd = 10; });
  return s;
}
describe("Phemo match updates", () => {
  test("larger pitch, goals and custom rated XI", () => {
    const s = fixture();
    expect(W).toBeGreaterThan(1300); expect(H).toBeGreaterThan(820);
    expect(GOAL_HALF).toBeGreaterThan(80); expect(CROSSBAR).toBeGreaterThan(44);
    expect(s.players).toHaveLength(22);
    expect(s.players.find((p) => p.name === "Phemo")?.rating).toBe(99);
    expect(s.players.find((p) => p.name === "Shane")?.rating).toBe(51);
    expect(s.players.find((p) => p.name === "Tashata")?.gk).toBe(true);
  });
  test("ball-first slide does not become a foul", () => {
    const s = fixture(), tackler = s.players[6], owner = s.players[17];
    if (!tackler || !owner) throw new Error("Missing players");
    Object.assign(tackler, { x: 780, y: 500, fx: 1, fy: 0, anim: 1, at: .4, dvx: 0, dvy: 0 });
    Object.assign(owner, { x: 810, y: 500, fx: 1, fy: 0 });
    Object.assign(s.ball, { x: 795, y: 500, owner: 17 });
    step(s, .01, [null, null]);
    expect(s.spKind).toBe(""); expect(tackler.cleanTackle).toBe(true); expect(s.lastTouch).toBe(0);
  });
  test("late body contact still awards a free kick", () => {
    const s = fixture(), tackler = s.players[6], victim = s.players[17];
    if (!tackler || !victim) throw new Error("Missing players");
    Object.assign(tackler, { x: 780, y: 500, fx: 1, fy: 0, anim: 1, at: .4, dvx: 0, dvy: 0 });
    Object.assign(victim, { x: 790, y: 500 });
    Object.assign(s.ball, { x: 850, y: 500, owner: -1 }); s.lastTouch = 1;
    step(s, .01, [null, null]); expect(s.spKind).toBe("freekick");
  });
  test("skill input selects a real move and animates it", () => {
    const seen = new Set<string>();
    for (let n = 0; n < 100; n++) {
      const s = fixture(), p = s.players[6]; if (!p) throw new Error("Missing player");
      Object.assign(p, { x: W / 2, y: H / 2, cd: 0 });
      Object.assign(s.ball, { x: p.x + 15, y: p.y, owner: 6 });
      step(s, .01, [{ dx: 0, dy: 0, pass: false, shoot: false, skill: true }, null]);
      expect(p.anim).toBe(5); expect(SKILLS).toContain(p.skill); seen.add(p.skill);
    }
    expect(seen.size).toBe(SKILLS.length);
  });
  test("expanded goal mouth registers a goal", () => {
    const s = fixture(); Object.assign(s.ball, { owner: -1, x: W + 8, y: H / 2 + 100, z: 50 });
    step(s, .01, [null, null]); expect(s.score[0]).toBe(1);
  });
});