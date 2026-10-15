import { ratingFor, type Team } from "./teams";

export const W = 1700;
export const H = 1050;
export const GOAL_HALF = 115;
const PR = 11; // player radius
export const CROSSBAR = 58;
export const BALL_RADIUS = 8;
export const DIFFICULTIES = ["Beginner", "Pro", "Master"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const CPU_LEVELS = {
  Beginner: { speed: 0.8, pressure: 0.55, error: 1.7, anticipation: 0.08, shotRange: 220 },
  Pro: { speed: 1, pressure: 1, error: 1, anticipation: 0.2, shotRange: 290 },
  Master: { speed: 1.12, pressure: 1.5, error: 0.65, anticipation: 0.4, shotRange: 370 },
} as const;
export type ChargedAction = "pass" | "shoot" | "finesse" | "chip" | "lob" | "through";
export const ability = (rating: number) => Math.max(0, Math.min(99, rating)) / 99;
export const tackleChance = (defender: number, attacker: number, skill = false) => Math.max(0.08, Math.min(0.92, 0.48 + (ability(defender) - ability(attacker)) * 0.55 - (skill ? 0.1 + ability(attacker) * 0.28 : 0)));

function slide(p: P) { p.anim = 1; p.at = 0.5; p.cleanTackle = false; p.dvx = p.fx * 420; p.dvy = p.fy * 420; }

export type Pad = { dx: number; dy: number; pass: boolean; shoot: boolean; finesse?: boolean; chip?: boolean; tackle?: boolean; lob?: boolean; through?: boolean; skill?: boolean; held?: Partial<Record<ChargedAction, boolean>>; charges?: Partial<Record<ChargedAction, number>>; chargeLevel?: number; chargeKind?: ChargedAction; cancelCharge?: boolean };
export type Kick = "pass" | "power" | "finesse" | "chip" | "lob" | "through";
/** anim: 0 run, 1 slide tackle, 2 keeper dive, 3 kick, 4 header, 5 skill move, 6 fallen */
export const SKILLS = ["RAINBOW FLICK", "STEPOVERS", "ROULETTE", "ELASTICO", "HEEL FLICK"];
export type P = { x: number; y: number; vx: number; vy: number; fx: number; fy: number; team: 0 | 1; gk: boolean; hx: number; hy: number; num: number; cd: number; name: string; anim: number; at: number; dvx: number; dvy: number; ph: number; skill: string; rating: number; position: string; cleanTackle: boolean; chargeLevel?: number; chargeKind?: ChargedAction; yellow?: number; red?: boolean; captain?: boolean; card?: number };
export type State = {
  players: P[];
  ball: { x: number; y: number; vx: number; vy: number; owner: number; z: number; vz: number; spin: number };
  lastShot: string;
  lastTouch: 0 | 1;
  setPiece: number;
  spKind: "" | "corner" | "goalkick" | "freekick" | "penalty";
  score: [number, number];
  time: number; // seconds elapsed
  duration: number;
  controlled: [number, number];
  pause: number; // after-goal pause
  flash: string;
  over: boolean;
  difficulty: Difficulty;
  cpuTeam: 0 | 1 | null;
  /** Highlights raised this step (GOAL / SAVE / TACKLE); the UI drains them. */
  events?: string[];
  kickers?: { name: string; team: 0 | 1 }[];
  goals?: { scorer: string; assist?: string | undefined; team: 0 | 1 }[];
  celebration?: string;
  /** Pro-clubs lock: player index each human controls for the whole match (-1 = auto switch). */
  locked?: [number, number];
  /** Per-player match stats keyed by name: goals, assists, tackles, saves. */
  stats?: Record<string, { g: number; a: number; t: number; sv: number }>;
  celebrant?: number;
  celebT?: number;
  pendingKick?: 0 | 1;
};
export const CELEBRATIONS = ["KNEE SLIDE", "TEAM HUG", "BLOWS A KISS", "CORNER FLAG RUN"];

// 4-4-2: GK, 4 DEF, 4 MID, 2 FWD (x as fraction of pitch from own goal)
const FORM: [number, number, boolean][] = [
  [0.04, 0.5, true],
  [0.18, 0.15, false], [0.16, 0.38, false], [0.16, 0.62, false], [0.18, 0.85, false],
  [0.32, 0.15, false], [0.3, 0.38, false], [0.3, 0.62, false], [0.32, 0.85, false],
  [0.45, 0.4, false], [0.45, 0.6, false],
];
// star slots: players[0]=GK, [1]=CB, [2]=CM, [3],[4]=strikers; bench fills the rest
const STAR_SLOT = [0, 2, 6, 9, 10];
const FILL_SLOT = [1, 3, 4, 5, 7, 8];
export const BOX_D = 180, BOX_HALF = 220, PEN_SPOT = 120;

export function createState(a: Team, b: Team, duration = 180, difficulty: Difficulty = "Pro", cpuTeam: 0 | 1 | null = null): State {
  const players: P[] = [];
  [a, b].forEach((t, ti) => {
    const extra = (t.bench ?? []).slice(4);
    FORM.forEach(([fx, fy, gk], i) => {
      const si = STAR_SLOT.indexOf(i), fi = FILL_SLOT.indexOf(i);
      const member = t.lineup?.[i];
      const name = member?.name ?? (si >= 0 ? t.players[si] ?? `${t.short} ${i + 1}` : extra[fi] ?? `${t.short} #${i + 1}`);
      const hx = ti === 0 ? fx * W : W - fx * W;
      players.push({ x: hx, y: fy * H, vx: 0, vy: 0, fx: ti === 0 ? 1 : -1, fy: 0, team: ti as 0 | 1, gk, hx, hy: fy * H, num: i + 1, cd: 0, name, anim: 0, at: 0, dvx: 0, dvy: 0, ph: Math.random() * 6, skill: "", rating: ratingFor(t, name), position: member?.position ?? (gk ? "GK" : i < 5 ? "DEF" : i < 9 ? "MID" : "FWD"), cleanTackle: false });
    });
  });
  const s: State = { players, ball: { x: W / 2, y: H / 2, vx: 0, vy: 0, owner: -1, z: 0, vz: 0, spin: 0 }, lastShot: "", lastTouch: 0, setPiece: -1, spKind: "", score: [0, 0], time: 0, duration, controlled: [9, 20], pause: 0, flash: "", over: false, difficulty, cpuTeam };
  [a, b].forEach((t, ti) => {
    const mine = players.filter((p) => p.team === ti);
    const named = t.captain ? mine.find((p) => p.name === t.captain) : undefined;
    const cap = named ?? mine.filter((p) => !p.gk).reduce((x, y) => (y.rating > x.rating ? y : x), mine[1]!);
    cap.captain = true;
  });
  kickoff(s, 0);
  return s;
}

function kickoff(s: State, team: 0 | 1) {
  s.players.forEach((p) => { if (p.red) return; p.x = p.hx; p.y = p.hy; p.vx = p.vy = 0; p.cd = 0.3; p.anim = 0; p.at = 0; });
  s.setPiece = -1; s.spKind = "";
  s.ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, owner: -1, z: 0, vz: 0, spin: 0 };
  const k = s.players[team === 0 ? 9 : 20]!;
  k.x = W / 2 + (team === 0 ? -16 : 16); k.y = H / 2;
}

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

function kick(s: State, i: number, type: Kick, aimY: number, charge = 0.45) {
  const p = s.players[i];
  if (!p) return;
  const quality = ability(p.rating);
  const power = Math.max(0, Math.min(1, charge));
  const strength = (0.68 + quality * 0.32) * (0.45 + power * 1.05);
  const error = (1.1 - quality) * (s.cpuTeam === p.team ? CPU_LEVELS[s.difficulty].error : 1);
  const b = s.ball;
  b.spin = 0; b.vz = 0;
  if (type === "power" || type === "finesse" || type === "chip") {
    const gx = p.team === 0 ? W + 20 : -20;
    const d0 = dist(b.x, b.y, gx, H / 2);
    if (type === "power") {
      const gy = H / 2 + aimY * GOAL_HALF * 0.8 + (Math.random() - 0.5) * 220 * error;
      const d = dist(b.x, b.y, gx, gy);
      b.vx = ((gx - b.x) / d) * 960 * strength; b.vy = ((gy - b.y) / d) * 960 * strength; b.vz = 15 + power * power * 360;
      s.lastShot = "POWER SHOT";
    } else if (type === "finesse") {
      const side = aimY !== 0 ? Math.sign(aimY) : (b.y < H / 2 ? 1 : -1);
      const gy = H / 2 + side * GOAL_HALF * 0.82 + (Math.random() - 0.5) * 100 * error;
      const sp = 700 * strength, d = dist(b.x, b.y, gx, gy);
      const ang = Math.atan2(gy - b.y, gx - b.x);
      const T = d / sp + 0.15, dir = (p.team === 0 ? -1 : 1) * side;
      const a0 = ang + dir * 0.28;
      b.vx = Math.cos(a0) * sp; b.vy = Math.sin(a0) * sp; b.spin = (-dir * 0.56) / T; b.vz = 12 + power * power * 200;
      s.lastShot = "FINESSE";
    } else {
      const gy = H / 2 + aimY * GOAL_HALF * 0.5 + (Math.random() - 0.5) * 140 * error;
      const d = dist(b.x, b.y, gx, gy);
      const sp = Math.min(560, 260 + d0 * 0.7) * strength;
      b.vx = ((gx - b.x) / d) * sp; b.vy = ((gy - b.y) / d) * sp;
      const T = Math.min(1.6, d / sp);
      b.vz = Math.min(620, (900 * T) / 2) * (0.4 + power * 0.85);
      s.lastShot = "CHIP";
    }
  } else {
    const dir = p.team === 0 ? 1 : -1;
    let best = -1, bestScore = -Infinity;
    s.players.forEach((q, j) => {
      if (j === i || q.team !== p.team || q.gk || q.red) return;
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
      const align = (dx * p.fx + dy * p.fy) / (d || 1);
      const fwd = ((q.x - p.x) * dir) / 300;
      const sc = type === "pass" ? align * 2 - d / 400 : type === "lob" ? align * 1.5 + fwd - Math.abs(d - 380) / 300 : align + fwd * 1.5 - d / 700;
      if (sc > bestScore) { bestScore = sc; best = j; }
    });
    if (best < 0) return;
    const q = s.players[best]!;
    let tx = q.x + q.vx * 0.3, ty = q.y + q.vy * 0.3;
    if (type === "through") { tx = Math.max(20, Math.min(W - 20, q.x + dir * 130)); ty = q.y + (H / 2 - q.y) * 0.15; }
    tx += (Math.random() - 0.5) * 120 * error;
    ty += (Math.random() - 0.5) * 120 * error;
    const d = dist(b.x, b.y, tx, ty) || 1;
    const sp = (type === "lob" ? Math.min(560, 240 + d * 0.8) : type === "through" ? Math.min(760, 360 + d * 1.1) : Math.min(650, 260 + d * 1.3)) * strength;
    b.vx = ((tx - b.x) / d) * sp; b.vy = ((ty - b.y) / d) * sp;
    b.vz = type === "lob" ? Math.min(560, (900 * Math.min(1.4, (d / sp) * 1.15)) / 2) * (0.4 + power * 0.85) : power * power * 240;
  }
  b.owner = -1;
  p.cd = 0.35;
  p.anim = 3; p.at = 0.3; p.skill = "";
  s.lastTouch = p.team; s.setPiece = -1; s.spKind = "";
  if (s.kickers?.[0]?.name !== p.name) s.kickers = [{ name: p.name, team: p.team }, ...(s.kickers ?? [])].slice(0, 2);
}

function header(s: State, j: number) {
  const q = s.players[j]!, b = s.ball;
  const gx = q.team === 0 ? W + 20 : -20;
  q.anim = 4; q.at = 0.4; q.cd = 0.35; s.lastTouch = q.team;
  b.owner = -1; b.spin = 0;
  if (Math.abs(gx - q.x) < 400) {
    const gy = H / 2 + (Math.random() - 0.5) * GOAL_HALF * 1.7;
    const d = dist(b.x, b.y, gx, gy);
    b.vx = ((gx - b.x) / d) * 640; b.vy = ((gy - b.y) / d) * 640; b.vz = -40;
    s.lastShot = "HEADER";
  } else {
    let best = -1, bd = Infinity;
    s.players.forEach((m, k) => { if (k === j || m.team !== q.team || m.gk || m.red) return; const d = dist(m.x, m.y, q.x, q.y); const f = (m.x - q.x) * (q.team === 0 ? 1 : -1); if (f > 0 && d < bd) { bd = d; best = k; } });
    const m = s.players[best >= 0 ? best : j]!;
    const d = dist(b.x, b.y, m.x, m.y) || 1;
    b.vx = ((m.x - b.x) / d) * 460; b.vy = ((m.y - b.y) / d) * 460; b.vz = 140;
  }
}

function resetShape(s: State) {
  s.players.forEach((p) => { if (p.red) return; p.x = p.hx; p.y = p.hy; p.vx = p.vy = 0; p.anim = 0; p.at = 0; p.skill = ""; });
  const b = s.ball; b.vx = b.vy = b.vz = b.z = b.spin = 0;
}

function giveSetPiece(s: State, idx: number, x: number, y: number, kind: State["spKind"], flash: string) {
  const t = s.players[idx]!, b = s.ball;
  t.x = x; t.y = y; t.cd = 0.9; t.anim = 0;
  const gx = t.team === 0 ? W : 0;
  const d = dist(x, y, gx, H / 2) || 1; t.fx = (gx - x) / d; t.fy = (H / 2 - y) / d;
  b.x = x + t.fx * 15; b.y = y + t.fy * 15; b.owner = idx; s.setPiece = idx; s.spKind = kind;
  s.controlled[t.team] = idx;
  // keep opponents 70 away
  s.players.forEach((p) => { if (p.team === t.team || p.gk) return; const dd = dist(p.x, p.y, x, y); if (dd < 70) { p.x = x + ((p.x - x) / (dd || 1)) * 70; p.y = y + ((p.y - y) / (dd || 1)) * 70; } });
  s.flash = flash; s.pause = 1.2;
}

function restart(s: State, side: 0 | 1) {
  // side = team defending that goal line (team 0 defends x=0)
  const top = s.ball.y < H / 2;
  resetShape(s);
  if (s.lastTouch === side) {
    const att = (1 - side) as 0 | 1;
    const cx = side === 0 ? 6 : W - 6, cy = top ? 6 : H - 6;
    const boxX = side === 0 ? 40 : W - 220;
    let taker = -1, n = 0;
    s.players.forEach((p, i) => {
      if (p.gk) return;
      if (p.team === att && taker < 0 && i % 11 >= 5) { taker = i; return; }
      if (n++ % 2 === 0 || p.team !== att) { p.x = boxX + Math.random() * 180; p.y = H / 2 + (Math.random() - 0.5) * 360; }
    });
    giveSetPiece(s, taker, cx, cy, "corner", "CORNER");
  } else {
    const gk = s.players.findIndex((p) => p.team === side && p.gk);
    const g = s.players[gk]!;
    giveSetPiece(s, gk, g.x, g.y, "goalkick", "GOAL KICK");
  }
}

const stat = (s: State, name: string) => ((s.stats ??= {})[name] ??= { g: 0, a: 0, t: 0, sv: 0 });

/** Book the fouler: reckless from-behind or chance-denying fouls earn cards; two yellows or both at once is a red. */
export function bookFoul(s: State, fouler: number, victim: number) {
  const f = s.players[fouler], v = s.players[victim];
  if (!f || !v) return "";
  const fromBehind = f.fx * v.fx + f.fy * v.fy > 0.4;
  const goalX = f.team === 0 ? 0 : W;
  const denying = Math.abs(v.x - goalX) < 420 && Math.abs(v.y - H / 2) < 300;
  let card: "" | "YELLOW" | "RED" = "";
  if (fromBehind && denying) card = "RED";
  else if (fromBehind || denying || Math.random() < 0.25) card = "YELLOW";
  if (card === "YELLOW") { f.yellow = (f.yellow ?? 0) + 1; if (f.yellow >= 2) card = "RED"; }
  if (!card) return "";
  f.card = 2.5;
  if (card === "RED") {
    f.red = true; f.anim = 0; f.at = 0; f.x = f.hx; f.y = -80; f.vx = f.vy = 0;
    if (s.locked && s.locked[f.team] === fouler) s.locked[f.team] = -1;
    if (s.controlled[f.team] === fouler) { const next = s.players.findIndex((p) => p.team === f.team && !p.gk && !p.red); if (next >= 0) s.controlled[f.team] = next; }
  }
  (s.events ??= []).push("CARD");
  return card === "RED" ? ` · RED CARD ${f.name}` : ` · YELLOW ${f.name}`;
}

function foul(s: State, victim: number, x: number, y: number, fouler = -1) {
  const v = s.players[victim]!;
  const booking = fouler >= 0 ? bookFoul(s, fouler, victim) : "";
  const defGoalX = v.team === 0 ? W : 0; // fouling team's goal
  const inBox = Math.abs(x - defGoalX) < BOX_D && Math.abs(y - H / 2) < BOX_HALF;
  resetShape(s);
  if (inBox) {
    const px = v.team === 0 ? W - PEN_SPOT : PEN_SPOT;
    s.players.forEach((p) => { if (!p.gk && Math.abs(p.x - defGoalX) < BOX_D + 20) p.x = defGoalX + (v.team === 0 ? -1 : 1) * (BOX_D + 30); });
    giveSetPiece(s, victim, px - (v.team === 0 ? 16 : -16), H / 2, "penalty", "FOUL! PENALTY" + booking);
  } else {
    giveSetPiece(s, victim, Math.max(20, Math.min(W - 20, x)), Math.max(20, Math.min(H - 20, y)), "freekick", "FOUL! FREE KICK" + booking);
  }
}

export function step(s: State, rawDt: number, pads: [Pad | null, Pad | null]) {
  const dt = Math.min(rawDt, 0.05);
  if (s.over) return;
  s.players.forEach((p) => { if (p.card) p.card = Math.max(0, p.card - dt); });
  if (s.pause > 0) {
    s.pause -= dt;
    if (s.celebration) celebrate(s, dt);
    if (s.pause <= 0) { s.flash = ""; s.celebration = ""; if (s.pendingKick !== undefined) { kickoff(s, s.pendingKick); s.pendingKick = undefined; } s.celebrant = -1; }
    return;
  }
  s.time += dt;
  if (s.time >= s.duration) { s.over = true; s.flash = "FULL TIME"; return; }
  const b = s.ball;

  // choose controlled players
  for (const t of [0, 1] as const) {
    const lock = s.locked?.[t] ?? -1;
    if (lock >= 0) { s.controlled[t] = lock; continue; }
    const owner = b.owner >= 0 && s.players[b.owner]!.team === t ? b.owner : -1;
    if (owner >= 0) { s.controlled[t] = owner; continue; }
    const cur = s.players[s.controlled[t]] as P;
    let best = s.controlled[t], bd = dist(cur.x, cur.y, b.x, b.y) - 40;
    s.players.forEach((p, i) => {
      if (p.team !== t || p.gk || p.red) return;
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
      if (p.team !== t || p.gk || p.red || i === s.controlled[t] && pads[t]) return;
      const d = dist(p.x, p.y, b.x, b.y);
      if (d < bd) { bd = d; chaser[t] = i; }
    });
  }

  s.players.forEach((p, i) => {
    if (p.red) { p.vx = p.vy = 0; return; }
    p.cd = Math.max(0, p.cd - dt);
    const t = p.team;
    const pad = pads[t];
    const cpu = s.cpuTeam === t ? CPU_LEVELS[s.difficulty] : CPU_LEVELS.Pro;
    const quality = ability(p.rating);
    p.chargeLevel = pad && i === s.controlled[t] && b.owner === i ? pad.chargeLevel ?? 0 : 0;
    if (p.chargeLevel && pad?.chargeKind) p.chargeKind = pad.chargeKind;
    else delete p.chargeKind;
    let tx = p.x, ty = p.y, speed = 190;
    if (pad && i === s.controlled[t]) {
      const m = Math.hypot(pad.dx, pad.dy);
      const has = b.owner === i;
      speed = has ? 175 : 205;
      if (m > 0.15) { tx = p.x + (pad.dx / m) * 50; ty = p.y + (pad.dy / m) * 50; }
      const aim = m > 0.15 ? pad.dy / m : 0;
      if (has && p.cd <= 0) {
        if (pad.skill && p.anim !== 5 && s.setPiece < 0) { p.anim = 5; p.at = 0.65; p.skill = SKILLS[Math.floor(Math.random() * SKILLS.length)] ?? "STEPOVERS"; }
        else if (pad.shoot) kick(s, i, "power", aim, pad.charges?.shoot);
        else if (pad.lob) kick(s, i, "lob", 0, pad.charges?.lob);
        else if (pad.through) kick(s, i, "through", 0, pad.charges?.through);
        else if (pad.finesse) kick(s, i, "finesse", aim, pad.charges?.finesse);
        else if (pad.chip) kick(s, i, "chip", aim, pad.charges?.chip);
        else if (pad.pass) kick(s, i, "pass", 0, pad.charges?.pass);
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
      if (b.owner === i && p.cd <= 0) kick(s, i, s.setPiece === i ? "lob" : "pass", 0);
    } else if (b.owner === i && s.setPiece === i) {
      tx = p.x; ty = p.y;
      const dg = dist(p.x, p.y, t === 0 ? W : 0, H / 2);
      if (p.cd <= 0) kick(s, i, s.spKind === "penalty" ? (Math.random() < 0.5 ? "power" : "finesse") : s.spKind === "freekick" && dg < 380 ? "finesse" : "lob", (Math.random() - 0.5) * 1.6);
    } else if (b.owner === i && pad && (s.locked?.[t] ?? -1) >= 0 && p.cd <= 0 && (pad.pass || pad.shoot)) {
      // pro-clubs: the human calls for the ball (pass) or tells the AI carrier to shoot
      const me = s.players[s.locked![t]]!;
      if (pad.shoot) kick(s, i, "power", (Math.random() - 0.5) * 1.2);
      else { const d = dist(p.x, p.y, me.x, me.y) || 1; p.fx = (me.x - p.x) / d; p.fy = (me.y - p.y) / d; kick(s, i, d > 450 ? "lob" : "pass", 0); }
    } else if (b.owner === i) {
      // AI dribbler
      const gx = t === 0 ? W : 0;
      tx = gx; ty = H / 2 + (p.hy - H / 2) * 0.3; speed = 165;
      const dg = dist(p.x, p.y, gx, H / 2);
      const pressed = s.players.some((q) => q.team !== t && dist(q.x, q.y, p.x, p.y) < 40);
      if (p.cd <= 0 && dg < cpu.shotRange) {
        const r = Math.random();
        kick(s, i, r < 0.5 ? "power" : r < 0.82 ? "finesse" : "chip", (Math.random() - 0.5) * 1.6);
      } else if (p.cd <= 0 && pressed && p.anim === 0 && Math.random() < dt * 1.2 * cpu.pressure) { p.anim = 5; p.at = 0.65; p.skill = SKILLS[Math.floor(Math.random() * SKILLS.length)] ?? "STEPOVERS"; }
      else if (p.cd <= 0 && pressed && Math.random() < dt * 3 * cpu.pressure) kick(s, i, Math.random() < 0.25 ? "through" : "pass", 0);
      else if (p.cd <= 0 && dg > 500 && Math.random() < dt * 0.25) kick(s, i, "lob", 0);
    } else if (i === chaser[t] && ownerTeam !== t) {
      tx = b.x + b.vx * cpu.anticipation; ty = b.y + b.vy * cpu.anticipation; speed = 185;
      if (ownerTeam >= 0 && p.at <= 0 && p.cd <= 0 && dist(p.x, p.y, b.x, b.y) < 55 && Math.random() < dt * 0.9 * cpu.pressure) {
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
      if (p.anim === 6) { p.vx = p.vy = 0; if (p.at <= 0) p.anim = 0; return; }
      if (p.at <= 0) { p.anim = 0; p.skill = ""; }
    }
    speed *= 0.8 + quality * 0.2;
    if (s.cpuTeam === t) speed *= cpu.speed;
    if (p.anim === 5) speed *= 1.02 + quality * 0.28;
    if (s.setPiece >= 0 && s.setPiece !== i && s.ball.owner === s.setPiece && s.spKind === "penalty") { tx = p.x; ty = p.y; }
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
      if (a.red || c.red) continue;
      const d = dist(a.x, a.y, c.x, c.y);
      if (d > 0 && d < PR * 2) { const o = (PR * 2 - d) / 2; const nx = (a.x - c.x) / d, ny = (a.y - c.y) / d; a.x += nx * o; a.y += ny * o; c.x -= nx * o; c.y -= ny * o; }
    }

  // slide tackle contact (late / from-behind slides are fouls)
  let fouled = false;
  s.players.forEach((q, j) => {
    if (fouled) return;
    if (q.anim !== 1 || q.at < 0.08 || b.z > 15) return;
    if (dist(q.x + q.fx * 10, q.y + q.fy * 10, b.x, b.y) > 14 + ability(q.rating) * 10) return;
    if (b.owner === j) return;
    if (b.owner >= 0) {
      const o = s.players[b.owner]!;
      if (o.team === q.team) return;
      // Reaching the ball first is a clean challenge, including from behind.
      o.cd = 0.8;
      (s.events ??= []).push("TACKLE");
      stat(s, q.name).t++;
    }
    b.owner = -1;
    q.cleanTackle = true;
    s.lastTouch = q.team;
    b.vx = q.dvx * 0.9 + (Math.random() - 0.5) * 120; b.vy = q.dvy * 0.9 + (Math.random() - 0.5) * 120;
    q.at = Math.min(q.at, 0.15);
  });

  if (fouled) return;
  // body-check fouls: slide hits player who already released the ball (late tackle)
  for (const q of s.players) {
    if (q.anim !== 1 || q.at < 0.2 || q.cleanTackle) continue;
    const vi = s.players.findIndex((o) => o.team !== q.team && !o.gk && o.anim !== 6 && o.cd > 0.15 && dist(o.x, o.y, q.x + q.fx * 10, q.y + q.fy * 10) < 18 && s.ball.owner !== s.players.indexOf(o));
    if (vi >= 0 && s.lastTouch !== q.team && dist(s.ball.x, s.ball.y, s.players[vi]!.x, s.players[vi]!.y) > 30 && dist(s.ball.x, s.ball.y, s.players[vi]!.x, s.players[vi]!.y) < 120) {
      const o = s.players[vi]!; o.anim = 6; o.at = 0.6;
      const bx = o.x, by = o.y;
      s.lastTouch = o.team;
      foul(s, vi, bx, by, s.players.indexOf(q)); return;
    }
  }

  // ball
  if (b.owner >= 0) {
    const o = s.players[b.owner]!;
    b.x = o.x + o.fx * 15; b.y = o.y + o.fy * 15; b.vx = o.vx; b.vy = o.vy; b.z = 0; b.vz = 0; b.spin = 0;
    s.lastTouch = o.team;
    if (o.anim === 5) {
      const pr = 1 - Math.max(0, o.at) / 0.65;
      if (o.skill === "RAINBOW FLICK") { const off = -14 + 30 * pr; b.x = o.x + o.fx * off; b.y = o.y + o.fy * off; b.z = Math.sin(pr * Math.PI) * 34; }
      else if (o.skill === "STEPOVERS") { const l = Math.sin(pr * Math.PI * 4) * 8; b.x += -o.fy * l; b.y += o.fx * l; }
      else if (o.skill === "ROULETTE") { const a = pr * Math.PI * 2; b.x = o.x + Math.cos(a) * 15 * o.fx - Math.sin(a) * 15 * o.fy; b.y = o.y + Math.cos(a) * 15 * o.fy + Math.sin(a) * 15 * o.fx; }
      else if (o.skill === "HEEL FLICK") { b.x = o.x + o.fx * (15 + Math.sin(pr * Math.PI) * 22); b.y = o.y + o.fy * (15 + Math.sin(pr * Math.PI) * 22); b.z = Math.sin(pr * Math.PI) * 26; }
      else if (o.skill === "ELASTICO") { const l = Math.sin(pr * Math.PI * 2) * 18; b.x += -o.fy * l; b.y += o.fx * l; }
    }
    // tackles
    s.players.forEach((q, j) => {
      if (q.team !== o.team && q.cd <= 0 && q.anim !== 1 && s.setPiece < 0 && dist(q.x, q.y, b.x, b.y) < 16 && o.cd <= 0) {
        const chance = q.gk ? 1 : tackleChance(q.rating, o.rating, o.anim === 5);
        if (Math.random() < chance) { b.owner = j; q.cd = 0.5; o.cd = 0.6; if (!q.gk) stat(s, q.name).t++; }
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
    if (!inMouth && (b.x < -2 || b.x > W + 2)) { restart(s, b.x < 0 ? 0 : 1); return; }
    if (inMouth && (b.x < -4 || b.x > W + 4)) {
      const scorer = b.x < 0 ? 1 : 0;
      s.score[scorer]++;
      { const k = s.kickers ?? []; if (k[0]?.team === scorer) { (s.goals ??= []).push({ scorer: k[0].name, assist: k[1]?.team === scorer ? k[1].name : undefined, team: scorer }); stat(s, k[0].name).g++; if (k[1]?.team === scorer) stat(s, k[1].name).a++; } s.celebrant = k[0]?.team === scorer ? s.players.findIndex((p) => p.name === k[0]!.name && p.team === scorer) : -1; s.kickers = []; }
      s.flash = s.lastShot ? `GOAL! ${s.lastShot}` : "GOAL!";
      s.pause = 4;
      s.celebration = CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)]!;
      (s.events ??= []).push("GOAL");
      s.celebT = 0; b.vx = b.vy = b.vz = 0; b.owner = -1;
      if ((s.celebrant ?? -1) < 0) s.celebrant = s.players.reduce((bi, p, j) => (p.team === scorer && !p.gk && !p.red && dist(p.x, p.y, b.x, b.y) < dist(s.players[bi]!.x, s.players[bi]!.y, b.x, b.y) ? j : bi), scorer === 0 ? 9 : 20);
      s.pendingKick = scorer === 0 ? 1 : 0;
      return;
    }
    // headers
    if (b.z > 16 && b.z < 58) {
      const hj = s.players.findIndex((q) => !q.gk && q.cd <= 0 && q.anim !== 1 && dist(q.x, q.y, b.x, b.y) < 20);
      if (hj >= 0) { header(s, hj); return; }
    }
    // pickups (gk saves fast shots)
    const bs = Math.hypot(b.vx, b.vy);
    let best = -1, bd = Infinity;
    s.players.forEach((q, j) => {
      const reach = q.gk ? (q.anim === 2 ? 24 : 16) + ability(q.rating) * 12 : 15;
      const d = dist(q.x, q.y, b.x, b.y);
      const zok = q.gk ? b.z < 60 : b.z < 18;
      if ((q.cd <= 0 || q.anim === 2) && q.anim !== 1 && zok && d < reach && d < bd && (bs < 600 || q.gk)) { bd = d; best = j; }
    });
    if (best >= 0) {
      const q = s.players[best]!;
      if (q.gk && bs > 450 && s.lastTouch !== q.team) { (s.events ??= []).push("SAVE"); stat(s, q.name).sv++; }
      s.lastTouch = q.team;
      if (q.gk && bs > 500 && Math.random() < 0.35) { b.vx *= -0.4; b.vy = (Math.random() - 0.5) * 300; q.cd = 0.3; }
      else { b.owner = best; if (q.gk) s.lastShot = ""; }
      if (q.gk) { q.anim = q.anim === 2 ? 2 : 0; }
    }
  }
}

export const FORMATIONS: Record<string, [number, number][]> = {
  "4-4-2": FORM.slice(1).map(([x, y]) => [x, y] as [number, number]),
  "4-3-3": [[0.18, 0.15], [0.16, 0.38], [0.16, 0.62], [0.18, 0.85], [0.3, 0.3], [0.28, 0.5], [0.3, 0.7], [0.44, 0.2], [0.46, 0.5], [0.44, 0.8]],
  "3-5-2": [[0.16, 0.25], [0.15, 0.5], [0.16, 0.75], [0.32, 0.1], [0.28, 0.35], [0.26, 0.5], [0.28, 0.65], [0.32, 0.9], [0.45, 0.4], [0.45, 0.6]],
  "5-3-2": [[0.2, 0.1], [0.15, 0.3], [0.14, 0.5], [0.15, 0.7], [0.2, 0.9], [0.3, 0.3], [0.28, 0.5], [0.3, 0.7], [0.43, 0.4], [0.43, 0.6]],
};

export function setFormation(s: State, team: 0 | 1, key: string) {
  const f = FORMATIONS[key]; if (!f) return;
  s.players.filter((p) => p.team === team && !p.gk).forEach((p, i) => {
    const [fx, fy] = f[i]!;
    p.hx = team === 0 ? fx * W : W - fx * W; p.hy = fy * H;
  });
}

export function substitute(s: State, team: 0 | 1, slot: number, name: string, rating?: number) {
  const p = s.players.filter((q) => q.team === team)[slot];
  if (p) { p.name = name; if (rating !== undefined) p.rating = rating; }
}

/** Goal celebration choreography during the post-goal pause; anim 7 knee slide, 8 fist pump, 9 arms up, 10 kiss. */
function celebrate(s: State, dt: number) {
  const i = s.celebrant ?? -1, p = s.players[i];
  if (!p) return;
  s.celebT = (s.celebT ?? 0) + dt;
  const t = s.celebT, dir = p.team === 0 ? 1 : -1;
  const run = (q: P, tx: number, ty: number, sp: number) => {
    const d = dist(q.x, q.y, tx, ty);
    if (d < 6) { q.vx = q.vy = 0; return true; }
    q.vx = ((tx - q.x) / d) * sp; q.vy = ((ty - q.y) / d) * sp;
    q.x += q.vx * dt; q.y += q.vy * dt; q.fx = (tx - q.x) / d; q.fy = (ty - q.y) / d; q.ph += sp * dt * 0.06;
    return false;
  };
  const kind = s.celebration;
  if (kind === "KNEE SLIDE") {
    if (t < 0.9) { run(p, p.x + dir * 60, p.y, 240); p.anim = 0; }
    else { p.anim = 7; p.at = 1; const k = Math.max(0, 1 - (t - 0.9) / 1.4); p.x = Math.max(PR, Math.min(W - PR, p.x - dir * 260 * k * dt)); }
  } else if (kind === "CORNER FLAG RUN") {
    const cy = p.y < H / 2 ? 30 : H - 30, cx = p.team === 0 ? W - 30 : 30;
    if (run(p, cx, cy, 260)) { p.anim = 8; p.at = 1; } else p.anim = 0;
  } else if (kind === "BLOWS A KISS") {
    if (run(p, p.x - dir * 80, H - 40, 220) || t > 2) { p.anim = 10; p.at = 1; p.fx = 0; p.fy = 1; } else p.anim = 0;
  } else {
    if (t < 0.6) run(p, p.x - dir * 30, p.y, 180);
    p.anim = 9; p.at = 1;
    const mates = s.players.map((q, j) => ({ q, j })).filter(({ q, j }) => j !== i && q.team === p.team && !q.gk && !q.red).sort((x, y) => dist(x.q.x, x.q.y, p.x, p.y) - dist(y.q.x, y.q.y, p.x, p.y)).slice(0, 4);
    mates.forEach(({ q }, k) => { const a = (k / 4) * Math.PI * 2; if (run(q, p.x + Math.cos(a) * 22, p.y + Math.sin(a) * 14, 250)) { q.anim = 9; q.at = 1; } else q.anim = 0; });
  }
}

export type Motm = { name: string; team: 0 | 1; g: number; a: number; t: number; sv: number; rating: number };
/** Man of the match: weighted goals, assists, tackles and saves, with winners and rating as tie-breakers. */
export function manOfTheMatch(s: State): Motm | null {
  const winner = s.score[0] === s.score[1] ? -1 : s.score[0] > s.score[1] ? 0 : 1;
  let best: Motm | null = null, bestScore = -Infinity;
  for (const p of s.players) {
    const st = s.stats?.[p.name] ?? { g: 0, a: 0, t: 0, sv: 0 };
    const sc = st.g * 3 + st.a * 2 + st.t * 0.8 + st.sv * 1.2 + (p.team === winner ? 1 : 0) + p.rating / 100 - (p.red ? 3 : 0) - (p.yellow ?? 0) * 0.5;
    if (sc > bestScore) { bestScore = sc; best = { name: p.name, team: p.team, rating: p.rating, ...st }; }
  }
  return best;
}
