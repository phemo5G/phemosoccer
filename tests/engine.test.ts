import { describe, expect, test } from "bun:test";
import { createState, step, W, H, GOAL_HALF, CROSSBAR, SKILLS, BALL_RADIUS, tackleChance, type Difficulty } from "../src/lib/engine";
import { TEAMS, ratingFor } from "../src/lib/teams";
import { ChargeTracker } from "../src/lib/charge";

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

describe("quick match ratings, charge and difficulty", () => {
  function release(rating: number, charge: number, pass = false, rng = 0.5) {
    const s = fixture(), p = s.players[6];
    if (!p) throw new Error("Missing player");
    Object.assign(p, { x: W / 2, y: H / 2, cd: 0, rating, fx: 1, fy: 0 });
    Object.assign(s.ball, { owner: 6, x: p.x + 15, y: p.y });
    const random = Math.random;
    Math.random = () => rng;
    try { step(s, 0.001, [{ dx: 0, dy: 0, pass, shoot: !pass, charges: pass ? { pass: charge } : { shoot: charge } }, null]); }
    finally { Math.random = random; }
    return s;
  }
  test("Messi uses his individual 99 OVR without changing Argentina's team rating", () => {
    const argentina = TEAMS.find((t) => t.id === "arg"), opponent = TEAMS[0];
    if (!argentina || !opponent) throw new Error("Missing teams");
    const s = createState(argentina, opponent);
    expect(ratingFor(argentina, "Messi")).toBe(99);
    expect(s.players.find((p) => p.name === "Messi")?.rating).toBe(99);
    expect(argentina.rating).toBe(91); expect(BALL_RADIUS).toBe(8);
  });
  test("hold fills to maximum and only fires once on release", () => {
    const tracker = new ChargeTracker();
    expect(tracker.update("shoot", true, .12).level).toBeCloseTo(.1);
    expect(tracker.update("shoot", true, 2).level).toBe(1);
    expect(tracker.update("shoot", true, .3).released).toBeUndefined();
    expect(tracker.update("shoot", false, .01).released).toBe(1);
    expect(tracker.update("shoot", false, .01).released).toBeUndefined();
    tracker.update("pass", true, .4); tracker.reset();
    expect(tracker.update("pass", false, .01).released).toBeUndefined();
  });
  test("longer holds produce faster and higher shots and passes", () => {
    for (const pass of [false, true]) {
      const tap = release(99, .1, pass), held = release(99, .9, pass);
      expect(Math.hypot(held.ball.vx, held.ball.vy)).toBeGreaterThan(Math.hypot(tap.ball.vx, tap.ball.vy));
      expect(held.ball.vz).toBeGreaterThan(tap.ball.vz);
      expect(held.ball.owner).toBe(-1);
    }
  });
  test("higher OVR boosts kick power and reduces shot error", () => {
    const low = release(51, .45, false, .9), high = release(99, .45, false, .9);
    expect(Math.hypot(high.ball.vx, high.ball.vy)).toBeGreaterThan(Math.hypot(low.ball.vx, low.ball.vy));
    expect(Math.abs(high.ball.vy / high.ball.vx)).toBeLessThan(Math.abs(low.ball.vy / low.ball.vx));
    const lowPass = release(51, .45, true), highPass = release(99, .45, true);
    expect(Math.hypot(highPass.ball.vx, highPass.ball.vy)).toBeGreaterThan(Math.hypot(lowPass.ball.vx, lowPass.ball.vy));
  });
  test("ratings affect tackle odds and skill protection", () => {
    expect(tackleChance(99, 51)).toBeGreaterThan(tackleChance(51, 99));
    expect(tackleChance(80, 99, true)).toBeLessThan(tackleChance(80, 51, true));
    expect(tackleChance(80, 99, true)).toBeLessThan(tackleChance(80, 99));
  });
  test("Master CPU presses faster without changing human speed", () => {
    const run = (difficulty: Difficulty, cpuTeam: 0 | 1 | null) => {
      const s = fixture(); s.difficulty = difficulty; s.cpuTeam = cpuTeam;
      const p = s.players[17]; if (!p) throw new Error("Missing player");
      Object.assign(p, { x: 1100, y: 500, cd: 0 });
      Object.assign(s.ball, { owner: -1, x: 1000, y: 500 });
      step(s, .05, [null, null]);
      return Math.abs(p.vx);
    };
    expect(run("Master", 1)).toBeGreaterThan(run("Pro", 1));
    expect(run("Pro", 1)).toBeGreaterThan(run("Beginner", 1));
    expect(run("Master", null)).toBeCloseTo(run("Beginner", null));
  });
});