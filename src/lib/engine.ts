import type { Team } from "./teams";

export const W = 1000;
export const H = 620;
export const GOAL_HALF = 70;
const PR = 11; // player radius
export const CROSSBAR = 44;

function slide(p: P) { p.anim = 1; p.at = 0.5; p.dvx = p.fx * 420; p.dvy = p.fy * 420; }

export type Pad = { dx: number; dy: number; pass: boolean; shoot: boolean; finesse?: boolean; chip?: boolean; tackle?: boolean };
export type Kick = "pass" | "power" | "finesse" | "chip";
/** anim: 0 run, 1 slide tackle, 2 keeper dive, 3 kick */
export type P = { x: number; y: number; vx: number; vy: number; fx: number; fy: number; team: 0 | 1; gk: boolean; hx: number; hy: number; num: number; cd: number; name: string; anim: number; at: number; dvx: number; dvy: number; ph: number };
export type State = {
  players: P[];
  ball: { x: number; y: number; vx: number; vy: number; owner: number; z: number; vz: number; spin: number };
  lastShot: string;
  score: [number, number];
  time: number; // seconds elapsed
  duration: number;
  controlled: [number, number];
  pause: number; // after-goal pause
  flash: string;
  over: boolean;
};

const FORM = [
  [0.05, 0.5, true],
  [0.25, 0.3, false],
  [0.25, 0.7, false],
  [0.42, 0.4, false],
  [0.42, 0.62, false],
] as const;

export function createState(a: Team, b: Team, duration = 180): State {
  const players: P[] = [];
  [a, b].forEach((t, ti) => {
    FORM.forEach(([fx, fy, gk], i) => {
      const hx = ti === 0 ? fx * W : W - fx * W;
      players.push({ x: hx, y: fy * H, vx: 0, vy: 0, fx: ti === 0 ? 1 : -1, fy: 0, team: ti as 0 | 1, gk, hx, hy: fy * H, num: gk ? 1 : i + 6, cd: 0, name: t.players[i] ?? "", anim: 0, at: 0, dvx: 0, dvy: 0, ph: Math.random() * 6 });
    });
  });
  const s: State = { players, ball: { x: W / 2, y: H / 2, vx: 0, vy: 0, owner: -1, z: 0, vz: 0, spin: 0 }, lastShot: "", score: [0, 0], time: 0, duration, controlled: [3, 8], pause: 0, flash: "", over: false };
  kickoff(s, 0);
  return s;
}

function kickoff(s: State, team: 0 | 1) {
  s.players.forEach((p) => { p.x = p.hx; p.y = p.hy; p.vx = p.vy = 0; p.cd = 0.3; p.anim = 0; p.at = 0; });
  s.ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, owner: -1, z: 0, vz: 0, spin: 0 };
  const k = s.players[team === 0 ? 3 : 8]!;
  k.x = W / 2 + (team === 0 ? -16 : 16); k.y = H / 2;
}

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

function kick(s: State, i: number, type: Kick, aimY: number) {
  const p = s.players[i]!;
  const b = s.ball;
  b.spin = 0; b.vz = 0;
  if (type !== "pass") {
    const gx = p.team === 0 ? W + 20 : -20;
    const d0 = dist(b.x, b.y, gx, H / 2);
    if (type === "power") {
      const gy = H / 2 + aimY * GOAL_HALF * 0.8 + (Math.random() - 0.5) * 70;
      const d = dist(b.x, b.y, gx, gy);
      b.vx = ((gx - b.x) / d) * 960; b.vy = ((gy - b.y) / d) * 960; b.vz = Math.random() * 90;
      s.lastShot = "POWER SHOT";
    } else if (type === "finesse") {
      const side = aimY !== 0 ? Math.sign(aimY) : (b.y < H / 2 ? 1 : -1);
      const gy = H / 2 + side * GOAL_HALF * 0.82 + (Math.random() - 0.5) * 18;
      const sp = 700, d = dist(b.x, b.y, gx, gy);
      const ang = Math.atan2(gy - b.y, gx - b.x);
      const T = d / sp + 0.15, dir = (p.team === 0 ? -1 : 1) * side;
      const a0 = ang + dir * 0.28;
      b.vx = Math.cos(a0) * sp; b.vy = Math.sin(a0) * sp; b.spin = (-dir * 0.56) / T; b.vz = 25;
      s.lastShot = "FINESSE";
    } else {
      const gy = H / 2 + aimY * GOAL_HALF * 0.5 + (Math.random() - 0.5) * 30;
      const d = dist(b.x, b.y, gx, gy);
      const sp = Math.min(560, 260 + d0 * 0.7);
      b.vx = ((gx - b.x) / d) * sp; b.vy = ((gy - b.y) / d) * sp;
      const T = Math.min(1.6, d / sp);
      b.vz = Math.min(620, (900 * T) / 2);
      s.lastShot = "CHIP";
    }
  } else {
    let best = -1, bestScore = -Infinity;
    s.players.forEach((q, j) => {
      if (j === i || q.team !== p.team || q.gk) return;
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
      const align = (dx * p.fx + dy * p.fy) / (d || 1);
      const sc = align * 2 - d / 400;
      if (sc > bestScore) { bestScore = sc; best = j; }
    });
    if (best < 0) return;
    const q = s.players[best]!;
    const tx = q.x + q.vx * 0.3, ty = q.y + q.vy * 0.3;
    const d = dist(b.x, b.y, tx, ty);
    const sp = Math.min(650, 260 + d * 1.3);
    b.vx = ((tx - b.x) / d) * sp; b.vy = ((ty - b.y) / d) * sp;
  }
  b.owner = -1;
  p.cd = 0.35;
  p.anim = 3; p.at = 0.3;
}

export function step(s: State, rawDt: number, pads: [Pad | null, Pad | null]) {
  const dt = Math.min(rawDt, 0.05);
  if (s.over) return;
  if (s.pause > 0) { s.pause -= dt; if (s.pause <= 0) s.flash = ""; return; }
  s.time += dt;
  if (s.time >= s.duration) { s.over = true; s.flash = "FULL TIME"; return; }
  const b = s.ball;

  // choose controlled players
  for (const t of [0, 1] as const) {
    const owner = b.owner >= 0 && s.players[b.owner]!.team === t ? b.owner : -1;
    if (owner >= 0) { s.controlled[t] = owner; continue; }
    const cur = s.players[s.controlled[t]] as P;
    let best = s.controlled[t], bd = dist(cur.x, cur.y, b.x, b.y) - 40;
    s.players.forEach((p, i) => {
      if (p.team !== t || p.gk) return;
      const d = dist(p.x, p.y, b.x, b.y);
      if (d < bd) { bd = d; best = i; }
    });
    s.controlled[t] = best;
  }

  const ownerTeam = b.owner >= 0 ? s.players[b.owner]!.team : -1;
  // closest AI chaser per team
  const chaser: [number, number] = [-1, -1];
  for (const t of [0, 1] as const) {
    let bd = Infinity;
    s.players.forEach((p, i) => {
      if (p.team !== t || p.gk || i === s.controlled[t] && pads[t]) return;
      const d = dist(p.x, p.y, b.x, b.y);
      if (d < bd) { bd = d; chaser[t] = i; }
    });
  }

  s.players.forEach((p, i) => {
    p.cd = Math.max(0, p.cd - dt);
    const t = p.team;
    const pad = pads[t];
    let tx = p.x, ty = p.y, speed = 190;
    if (pad && i === s.controlled[t]) {
      const m = Math.hypot(pad.dx, pad.dy);
      const has = b.owner === i;
      speed = has ? 175 : 205;
      if (m > 0.15) { tx = p.x + (pad.dx / m) * 50; ty = p.y + (pad.dy / m) * 50; }
      const aim = m > 0.15 ? pad.dy / m : 0;
      if (has && p.cd <= 0) {
        if (pad.shoot) kick(s, i, "power", aim);
        else if (pad.finesse) kick(s, i, "finesse", aim);
        else if (pad.chip) kick(s, i, "chip", aim);
        else if (pad.pass) kick(s, i, "pass", 0);
      } else if (!has && pad.tackle && p.at <= 0 && p.cd <= 0) slide(p);
    } else if (p.gk) {
      const gx = t === 0 ? 24 : W - 24;
      tx = gx + (t === 0 ? 1 : -1) * Math.min(40, Math.max(0, 200 - Math.abs(b.x - gx)) * 0.2);
      ty = Math.max(H / 2 - GOAL_HALF, Math.min(H / 2 + GOAL_HALF, b.y));
      speed = 170;
      const toward = t === 0 ? b.vx < -350 : b.vx > 350;
      if (b.owner < 0 && toward && p.anim === 0 && Math.abs(b.x - gx) < 320 && b.z < 60) {
        const py = b.y + (b.vy * (gx - b.x)) / b.vx;
        if (Math.abs(py - p.y) > 22 && Math.abs(py - H / 2) < GOAL_HALF + 30) {
          p.anim = 2; p.at = 0.65; p.dvx = 0; p.dvy = Math.sign(py - p.y) * Math.min(420, Math.abs(py - p.y) * 3.2);
        }
      }
      if (b.owner === i && p.cd <= 0) kick(s, i, "pass", 0);
    } else if (b.owner === i) {
      // AI dribbler
      const gx = t === 0 ? W : 0;
      tx = gx; ty = H / 2 + (p.hy - H / 2) * 0.3; speed = 165;
      const dg = dist(p.x, p.y, gx, H / 2);
      const pressed = s.players.some((q) => q.team !== t && dist(q.x, q.y, p.x, p.y) < 40);
      if (p.cd <= 0 && dg < 260) {
        const r = Math.random();
        kick(s, i, r < 0.5 ? "power" : r < 0.82 ? "finesse" : "chip", (Math.random() - 0.5) * 1.6);
      } else if (p.cd <= 0 && pressed && Math.random() < dt * 3) kick(s, i, "pass", 0);
    } else if (i === chaser[t] && ownerTeam !== t) {
      tx = b.x; ty = b.y; speed = 185;
      if (ownerTeam >= 0 && p.at <= 0 && p.cd <= 0 && dist(p.x, p.y, b.x, b.y) < 55 && Math.random() < dt * 0.9) {
        const d = dist(p.x, p.y, b.x, b.y) || 1; p.fx = (b.x - p.x) / d; p.fy = (b.y - p.y) / d; slide(p);
      }
    } else {
      const dir = t === 0 ? 1 : -1;
      const push = ownerTeam === t ? 140 : ownerTeam === -1 ? 40 : -60;
      tx = p.hx + (b.x - W / 2) * 0.55 + dir * push;
      ty = p.hy + (b.y - p.hy) * 0.3;
      speed = 160;
    }
    if (p.at > 0) {
      p.at -= dt;
      if (p.anim === 1 || p.anim === 2) {
        const k = Math.exp(-4 * dt);
        p.dvx *= k; p.dvy *= k;
        p.x = Math.max(PR, Math.min(W - PR, p.x + p.dvx * dt));
        p.y = Math.max(PR, Math.min(H - PR, p.y + p.dvy * dt));
        p.vx = p.vy = 0;
        if (p.at <= 0) { p.cd = p.anim === 1 ? 0.45 : 0.2; p.anim = 0; }
        return;
      }
      if (p.at <= 0) p.anim = 0;
    }
    p.ph += Math.hypot(p.vx, p.vy) * dt * 0.06;
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
    const tvx = d > 3 ? (dx / d) * speed * Math.min(1, d / 20) : 0;
    const tvy = d > 3 ? (dy / d) * speed * Math.min(1, d / 20) : 0;
    const k = 1 - Math.exp(-10 * dt);
    p.vx += (tvx - p.vx) * k; p.vy += (tvy - p.vy) * k;
    p.x = Math.max(PR, Math.min(W - PR, p.x + p.vx * dt));
    p.y = Math.max(PR, Math.min(H - PR, p.y + p.vy * dt));
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > 20) { p.fx = p.vx / sp; p.fy = p.vy / sp; }
  });

  // player separation
  for (let i = 0; i < s.players.length; i++)
    for (let j = i + 1; j < s.players.length; j++) {
      const a = s.players[i]!, c = s.players[j]!;
      const d = dist(a.x, a.y, c.x, c.y);
      if (d > 0 && d < PR * 2) { const o = (PR * 2 - d) / 2; const nx = (a.x - c.x) / d, ny = (a.y - c.y) / d; a.x += nx * o; a.y += ny * o; c.x -= nx * o; c.y -= ny * o; }
    }

  // slide tackle contact
  s.players.forEach((q, j) => {
    if (q.anim !== 1 || q.at < 0.08 || b.z > 15) return;
    if (dist(q.x + q.fx * 10, q.y + q.fy * 10, b.x, b.y) > 22) return;
    if (b.owner === j) return;
    if (b.owner >= 0) {
      const o = s.players[b.owner]!;
      if (o.team === q.team) return;
      o.cd = 0.8;
    }
    b.owner = -1;
    b.vx = q.dvx * 0.9 + (Math.random() - 0.5) * 120; b.vy = q.dvy * 0.9 + (Math.random() - 0.5) * 120;
    q.at = Math.min(q.at, 0.15);
  });

  // ball
  if (b.owner >= 0) {
    const o = s.players[b.owner]!;
    b.x = o.x + o.fx * 15; b.y = o.y + o.fy * 15; b.vx = o.vx; b.vy = o.vy; b.z = 0; b.vz = 0; b.spin = 0;
    // tackles
    s.players.forEach((q, j) => {
      if (q.team !== o.team && q.cd <= 0 && q.anim !== 1 && dist(q.x, q.y, b.x, b.y) < 16 && o.cd <= 0) {
        const chance = q.gk ? 1 : 0.5;
        if (Math.random() < chance) { b.owner = j; q.cd = 0.5; o.cd = 0.6; }
        else o.cd = 0.3;
      }
    });
  } else {
    const fr = Math.exp((b.z > 0.5 ? -0.25 : -1.1) * dt);
    b.vx *= fr; b.vy *= fr;
    if (b.spin) {
      const c = Math.cos(b.spin * dt), sn = Math.sin(b.spin * dt);
      const nvx = b.vx * c - b.vy * sn; b.vy = b.vx * sn + b.vy * c; b.vx = nvx;
      b.spin *= Math.exp(-0.3 * dt);
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.z > 0 || b.vz !== 0) {
      b.vz -= 900 * dt; b.z += b.vz * dt;
      if (b.z <= 0) { b.z = 0; b.vz = -b.vz * 0.45; if (b.vz < 50) b.vz = 0; b.spin *= 0.5; }
    }
    const inMouth = Math.abs(b.y - H / 2) < GOAL_HALF && b.z < CROSSBAR;
    if (b.y < 6 || b.y > H - 6) { b.spin = 0; b.vy *= -0.7; b.y = Math.max(6, Math.min(H - 6, b.y)); }
    if (!inMouth && (b.x < 6 || b.x > W - 6)) { b.vx *= -0.7; b.x = Math.max(6, Math.min(W - 6, b.x)); }
    if (inMouth && (b.x < -4 || b.x > W + 4)) {
      const scorer = b.x < 0 ? 1 : 0;
      s.score[scorer]++;
      s.flash = s.lastShot ? `GOAL! ${s.lastShot}` : "GOAL!";
      s.pause = 2;
      kickoff(s, scorer === 0 ? 1 : 0);
      return;
    }
    // pickups (gk saves fast shots)
    const bs = Math.hypot(b.vx, b.vy);
    let best = -1, bd = Infinity;
    s.players.forEach((q, j) => {
      const reach = q.gk ? (q.anim === 2 ? 34 : 22) : 15;
      const d = dist(q.x, q.y, b.x, b.y);
      const zok = q.gk ? b.z < 60 : b.z < 18;
      if ((q.cd <= 0 || q.anim === 2) && q.anim !== 1 && zok && d < reach && d < bd && (bs < 600 || q.gk)) { bd = d; best = j; }
    });
    if (best >= 0) {
      const q = s.players[best]!;
      if (q.gk && bs > 500 && Math.random() < 0.35) { b.vx *= -0.4; b.vy = (Math.random() - 0.5) * 300; q.cd = 0.3; }
      else { b.owner = best; if (q.gk) s.lastShot = ""; }
      if (q.gk) { q.anim = q.anim === 2 ? 2 : 0; }
    }
  }
}
