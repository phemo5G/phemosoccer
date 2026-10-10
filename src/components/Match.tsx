import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { createState, step, setFormation, substitute, FORMATIONS, W, H, GOAL_HALF, CROSSBAR, BOX_D, BOX_HALF, BALL_RADIUS, type ChargedAction, type Difficulty, type Pad, type P, type State } from "@/lib/engine";
import { ChargeTracker, CHARGED_ACTIONS, CHARGE_SECONDS } from "@/lib/charge";
import { benchFor, ratingFor } from "@/lib/teams";
import type { Team } from "@/lib/teams";

/** Online link: host simulates and streams state; guest streams its controller. */
export type Net = {
  role: "host" | "guest";
  send: (event: "pad" | "state", payload: unknown) => void;
  remotePad: { current: Pad | null };
  remoteState: { current: unknown };
  peerLeft: boolean;
};

type Props = { home: Team; away: Team; twoPlayer: boolean; onExit: () => void; net?: Net; difficulty?: Difficulty };

const emptyPad = (): Pad => ({ dx: 0, dy: 0, pass: false, shoot: false });
const ACTIONS = ["pass", "shoot", "finesse", "chip", "tackle", "lob", "through", "skill"] as const;
type Action = (typeof ACTIONS)[number];
// keyboard: [up, down, left, right, ...ACTIONS]
const KEYS1 = ["w", "s", "a", "d", "f", "g", "h", "r", "e", "t", "y", "q"];
const KEYS2 = ["arrowup", "arrowdown", "arrowleft", "arrowright", "k", "l", "o", "i", "j", "u", "m", "n"];

let CAM: "broadcast" | "top" = "broadcast";

export function Match({ home, away, twoPlayer, onExit, net, difficulty = "Pro" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<State | null>(null);
  const pads = useRef<[Pad, Pad]>([emptyPad(), emptyPad()]);
  const [hud, setHud] = useState({ score: [0, 0], min: 0, flash: "", over: false, left: false });
  const [paused, setPaused] = useState(false);
  const [cam, setCam] = useState<"broadcast" | "top">("broadcast");
  CAM = cam;
  const pausedRef = useRef(false);
  pausedRef.current = paused && !net;
  const guest = net?.role === "guest";

  useEffect(() => {
    stateRef.current = createState(home, away, 180, difficulty, !twoPlayer && !net ? 1 : null);
    window.scrollTo(0, 0);
    const css = getComputedStyle(document.documentElement);
    (Object.keys(PALETTE) as (keyof typeof PALETTE)[]).forEach((key) => { PALETTE[key] = css.getPropertyValue(`--game-${key}`).trim(); });
    const keys = new Set<string>();
    const edge = new Set<string>();
    const keyStarts = new Map<string, number>();
    const keyReleases = new Map<string, number>();
    const trackers: [ChargeTracker, ChargeTracker] = [new ChargeTracker(), new ChargeTracker()];
    const clearInput = () => {
      keys.clear(); edge.clear(); keyStarts.clear(); keyReleases.clear(); trackers.forEach((tracker) => tracker.reset());
      pads.current.forEach((pad) => { pad.dx = pad.dy = 0; pad.held = {}; pad.charges = {}; pad.chargeLevel = 0; pad.cancelCharge = true; ACTIONS.forEach((a) => { pad[a] = false; }); });
    };
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
      if (!keys.has(k)) { edge.add(k); keyStarts.set(k, performance.now()); }
      keys.add(k);
      if ((k === "escape" || k === "p") && !e.repeat) { clearInput(); setPaused((v) => !v); }
      if (k === "c") setCam((c) => (c === "broadcast" ? "top" : "broadcast"));
    };
    const up = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase(), start = keyStarts.get(key);
      if (start !== undefined) keyReleases.set(key, Math.max(0.06, Math.min(1, (performance.now() - start) / (CHARGE_SECONDS * 1000))));
      keyStarts.delete(key); keys.delete(key);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clearInput);

    const read = (map: string[], touch: Pad, dt: number, tracker: ChargeTracker, extra?: string[]): Pad => {
      const has = (i: number) => keys.has(map[i] ?? "") || (!!extra && keys.has(extra[i] ?? ""));
      const ed = (i: number) => edge.has(map[i] ?? "") || (!!extra && edge.has(extra[i] ?? ""));
      const dx = Math.max(-1, Math.min(1, (has(3) ? 1 : 0) - (has(2) ? 1 : 0) + touch.dx));
      const dy = Math.max(-1, Math.min(1, (has(1) ? 1 : 0) - (has(0) ? 1 : 0) + touch.dy));
      const pad: Pad = { dx, dy, pass: false, shoot: false, charges: {}, chargeLevel: 0 };
      if (touch.cancelCharge || pausedRef.current) { tracker.reset(); touch.cancelCharge = false; }
      ACTIONS.forEach((a, j) => {
        if (CHARGED_ACTIONS.includes(a as ChargedAction)) {
          const charged = a as ChargedAction;
          const held = !pausedRef.current && (has(4 + j) || !!touch.held?.[charged] || (a === "pass" && !!extra && keys.has(" ")));
          const result = tracker.update(charged, held, dt);
          const primary = map[4 + j] ?? "", alternate = extra?.[4 + j] ?? "";
          const keyboardRelease = keyReleases.get(primary) ?? keyReleases.get(alternate) ?? (a === "pass" && extra ? keyReleases.get(" ") : undefined);
          keyReleases.delete(primary); keyReleases.delete(alternate);
          if (a === "pass" && extra) keyReleases.delete(" ");
          const released = pausedRef.current ? undefined : touch.charges?.[charged] ?? keyboardRelease ?? result.released;
          if (released !== undefined) { pad[a] = true; if (pad.charges) pad.charges[charged] = released; }
          if (result.level > (pad.chargeLevel ?? 0)) { pad.chargeLevel = result.level; pad.chargeKind = charged; }
        } else pad[a] = ed(4 + j) || !!touch[a];
        touch[a] = false;
      });
      touch.charges = {};
      return pad;
    };

    let raf = 0, last = performance.now(), hudT = 0, netT = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      let s = stateRef.current;
      if (!s) return;
      if (net) {
        const mine = read(KEYS1, pads.current[guest ? 1 : 0], dt, trackers[0], KEYS2);
        netT += dt;
        if (guest) {
          // accumulate presses between sends so taps aren't lost
          const acc = pads.current[0];
          acc.dx = mine.dx; acc.dy = mine.dy;
          acc.chargeLevel = mine.chargeLevel ?? 0;
          if (mine.chargeKind) acc.chargeKind = mine.chargeKind; else delete acc.chargeKind;
          acc.charges = { ...acc.charges, ...mine.charges };
          ACTIONS.forEach((a) => { if (mine[a]) (acc as Record<Action, boolean>)[a] = true; });
          if (netT > 0.05) { netT = 0; net.send("pad", { ...acc }); ACTIONS.forEach((a) => ((acc as Record<Action, boolean>)[a] = false)); acc.charges = {}; }
          if (net.remoteState.current) { s = net.remoteState.current as State; stateRef.current = s; }
        } else {
          const rp = net.remotePad.current;
          const p2: Pad = rp ? { ...rp } : emptyPad();
          if (rp) { ACTIONS.forEach((a) => ((rp as Record<Action, boolean>)[a] = false)); rp.charges = {}; }
          step(s, dt, [mine, p2]);
          if (netT > 0.08) { netT = 0; net.send("state", s); }
        }
      } else {
        const p1 = read(KEYS1, pads.current[0], dt, trackers[0], twoPlayer ? undefined : KEYS2);
        const p2 = twoPlayer ? read(KEYS2, pads.current[1], dt, trackers[1]) : null;
        if (!pausedRef.current) step(s, dt, [p1, p2]);
      }
      edge.clear();
      draw(canvasRef.current, s, home, away, twoPlayer);
      hudT += dt;
      if (hudT > 0.2) {
        hudT = 0;
        setHud({ score: [...s.score], min: Math.min(90, Math.floor((s.time / s.duration) * 90)), flash: s.flash, over: s.over, left: !!net?.peerLeft });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", clearInput); };
  }, [home, away, twoPlayer, net, guest, difficulty]);

  const showMenu = paused || hud.over || hud.left;
  return (
    <div className="match-shell">
      <div className="scoreboard">
        <span className="sb-team"><i style={{ background: home.primary }} />{home.short}</span>
        <span className="sb-score">{hud.score[0]} – {hud.score[1]}</span>
        <span className="sb-team">{away.short}<i style={{ background: away.primary }} /></span>
        <span className="sb-clock">{hud.min}'</span>
        {!twoPlayer && !net && <span className="text-sm text-primary">{difficulty}</span>}
        <Button variant="ghost" className="sb-btn" onClick={() => setCam((c) => (c === "broadcast" ? "top" : "broadcast"))}>{cam === "broadcast" ? "Top-down cam" : "Broadcast cam"}</Button>
        <Button variant="ghost" className="sb-btn" onClick={() => setPaused((v) => !v)}>{paused ? "Resume" : net ? "Menu" : "Pause"}</Button>
      </div>
      {(!net || !guest) && <div className="touch-row"><TouchPad pad={pads.current[0]} label="P1" /></div>}
      <div className="pitch-wrap">
        <div className="pitch-viewport"><canvas aria-label="Football pitch" ref={canvasRef} width={CW} height={CH} className="pitch-canvas" /></div>
        {hud.flash && !hud.over && <div className="flash">{hud.flash}</div>}
        {showMenu && (
          <div className="overlay">
            <h2 className="display text-6xl">{hud.left ? "Opponent left" : hud.over ? "Full time" : net ? "Menu" : "Paused"}</h2>
            <p className="display text-4xl">{home.short} {hud.score[0]} – {hud.score[1]} {away.short}</p>
            {net && <p className="opacity-80">You are {guest ? `P2 · ${away.name}` : `P1 · ${home.name}`}</p>}
            <div className="flex gap-3">
              {!hud.over && !hud.left && <Button variant="ghost" className="btn-primary" onClick={() => setPaused(false)}>Resume</Button>}
              <Button variant="ghost" className="btn-primary" onClick={onExit}>{net ? "Leave match" : "New match"}</Button>
              <Link to="/" className="btn-ghost">Main menu</Link>
            </div>
            {!hud.over && !guest && stateRef.current && <Tactics s={stateRef.current} team={0} club={home} />}
            {!hud.over && twoPlayer && !net && stateRef.current && <Tactics s={stateRef.current} team={1} club={away} />}
          </div>
        )}
      </div>
      {((twoPlayer && !net) || guest) && <div className="touch-row"><TouchPad pad={pads.current[1]} label="P2" /></div>}
      <p className="keys-hint">
        {net
          ? "WASD/Arrows move · F pass · T lob · Y through · G power · H finesse · R chip · Q skill · E slide · C camera"
          : <>P1: WASD · F pass · T lob · Y through · G power · H finesse · R chip · Q skill · E slide{twoPlayer ? " — P2: Arrows · K pass · U lob · M through · L power · O finesse · I chip · N skill · J slide" : " (arrows + Space also work)"} · C camera · P pause</>}
      </p>
    </div>
  );
}

function Tactics({ s, team, club }: { s: State; team: 0 | 1; club: Team }) {
  const [, force] = useState(0);
  const [form, setForm] = useState("4-4-2");
  const [slot, setSlot] = useState<number | null>(null);
  const squad = s.players.filter((p) => p.team === team);
  const bench = benchFor(club).slice(0, 4).filter((n) => !squad.some((p) => p.name === n));
  return (
    <div className="w-full max-w-xl rounded-lg bg-background/80 p-3 text-left text-sm">
      <div className="mb-2 font-bold">{club.name} tactics</div>
      <div className="mb-2 flex flex-wrap gap-1">
        {Object.keys(FORMATIONS).map((f) => (
          <Button variant="ghost" key={f} className={f === form ? "chip chip-on" : "chip"} onClick={() => { setFormation(s, team, f); setForm(f); }}>{f}</Button>
        ))}
      </div>
      <div className="mb-1 opacity-70">Tap a player, then a sub:</div>
      <div className="flex flex-wrap gap-1">
        {squad.map((p, i) => (
          <Button variant="ghost" key={i} className={slot === i ? "chip chip-on" : "chip"} onClick={() => setSlot(i)}>{p.position} · {p.name} · {p.rating} OVR</Button>
        ))}
      </div>
      {slot !== null && (
        <div className="mt-2 flex flex-wrap gap-1">
          {bench.map((n) => (
            <Button variant="ghost" key={n} className="chip" onClick={() => { substitute(s, team, slot, n, ratingFor(club, n)); setSlot(null); force((x) => x + 1); }}>↑ {n}</Button>
          ))}
        </div>
      )}
    </div>
  );
}

function TouchPad({ pad, label }: { pad: Pad; label: string }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const move = (e: React.PointerEvent) => {
    const base = baseRef.current;
    if (!base) return;
    const r = base.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
    let y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    pad.dx = x; pad.dy = y; setKnob({ x, y });
  };
  const end = () => { pad.dx = pad.dy = 0; setKnob({ x: 0, y: 0 }); };
  const b = (a: Action) => () => { (pad as Record<Action, boolean>)[a] = true; };
  const starts = useRef<Partial<Record<ChargedAction, number>>>({});
  const charge = (action: ChargedAction) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
      starts.current[action] = performance.now(); pad.held = { ...pad.held, [action]: true };
    },
    onPointerUp: () => {
      const start = starts.current[action];
      if (start !== undefined && pad.held?.[action]) pad.charges = { ...pad.charges, [action]: Math.max(0.06, Math.min(1, (performance.now() - start) / (CHARGE_SECONDS * 1000))) };
      if (pad.held) pad.held[action] = false;
      delete starts.current[action];
      pad.cancelCharge = true;
    },
    onPointerCancel: () => { pad.held = {}; pad.charges = {}; starts.current = {}; pad.cancelCharge = true; },
    onLostPointerCapture: () => { if (pad.held?.[action]) { pad.held[action] = false; delete starts.current[action]; pad.cancelCharge = true; } },
  });
  return (
    <div className="touchpad" aria-label={`${label} controls`}>
      <div ref={baseRef} className="stick" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e); }} onPointerMove={(e) => e.buttons && move(e)} onPointerUp={end} onPointerCancel={end}>
        <div className="knob" style={{ transform: `translate(${knob.x * 28}px, ${knob.y * 28}px)` }}>{label}</div>
      </div>
      <div className="cluster">
        <Button variant="ghost" className="mini cluster-up" {...charge("lob")}>Lob</Button>
        <Button variant="ghost" className="tbtn cluster-main" {...charge("pass")}>Pass</Button>
        <Button variant="ghost" className="mini cluster-side" aria-label={`${label} through pass`} {...charge("through")}>Thru</Button>
      </div>
      <div className="cluster">
        <Button variant="ghost" className="mini cluster-up" aria-label={`${label} finesse shot`} {...charge("finesse")}>Fin</Button>
        <Button variant="ghost" className="tbtn tbtn-shoot cluster-main" {...charge("shoot")}>Shoot</Button>
        <Button variant="ghost" className="mini cluster-side" {...charge("chip")}>Chip</Button>
      </div>
      <div className="skill-controls">
        <Button variant="ghost" className="mini" aria-label={`${label} random skill move`} onPointerDown={b("skill")}>Skill</Button>
        <Button variant="ghost" className="mini" onPointerDown={b("tackle")}>Slide</Button>
      </div>
    </div>
  );
}

const CW = 1700, CH = 900, CX = CW / 2, FOC = 1100;
const TS = Math.min(CW / (W + 140), CH / (H + 100));
const PALETTE = { shadow: "", p1: "", p2: "", sky: "", surround: "", grass: "", stripe: "", line: "", net: "", netLine: "", chalk: "", ink: "", keeperHome: "", keeperAway: "", skin0: "", skin1: "", skin2: "", skin3: "", skin4: "", hair0: "", hair1: "", hair2: "", hair3: "" };
function identity(name: string) { return Array.from(name).reduce((hash, c) => (hash * 31 + c.charCodeAt(0)) >>> 0, 7); }
function proj(x: number, y: number, z = 0) {
  if (CAM === "top") return { x: CX + (x - W / 2) * TS, y: CH / 2 + (y - H / 2) * TS - z * TS * 0.7, s: TS * 1.1 };
  const sc = FOC / (FOC + (H - y));
  const far = FOC / (FOC + H), scale = (CW - 180) / W;
  return { x: CX + (x - W / 2) * sc * scale, y: 95 + ((sc - far) / (1 - far)) * (CH - 180) - z * sc * scale, s: sc * scale };
}
function quad(g: CanvasRenderingContext2D, pts: [number, number, number][]) {
  g.beginPath(); pts.forEach(([x, y, z], i) => { const p = proj(x, y, z); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }); g.closePath();
}
function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) { quad(g, [[x, y, 0], [x + w, y, 0], [x + w, y + h, 0], [x, y + h, 0]]); }

function drawGoal(g: CanvasRenderingContext2D, gx: number, back: number) {
  const y0 = H / 2 - GOAL_HALF, y1 = H / 2 + GOAL_HALF, cb = CROSSBAR;
  g.fillStyle = PALETTE.net; g.strokeStyle = PALETTE.netLine; g.lineWidth = 1;
  quad(g, [[back, y0, 0], [back, y1, 0], [back, y1, cb], [back, y0, cb]]); g.fill(); g.stroke();
  quad(g, [[gx, y0, cb], [back, y0, cb], [back, y1, cb], [gx, y1, cb]]); g.fill(); g.stroke();
  for (let i = 1; i < 8; i++) { const yy = y0 + ((y1 - y0) * i) / 8; quad(g, [[back, yy, 0], [back, yy, cb]]); g.stroke(); }
  g.strokeStyle = PALETTE.chalk; g.lineWidth = 4;
  quad(g, [[gx, y0, 0], [gx, y0, cb], [gx, y1, cb], [gx, y1, 0]]); g.stroke();
}

function figure(g: CanvasRenderingContext2D, p: P, kit: string, trim: string, human: boolean, tag: string, ctl: boolean) {
  const base = proj(p.x, p.y, 0), s = base.s * 1.5;
  g.fillStyle = PALETTE.shadow; g.beginPath(); g.ellipse(base.x, base.y, 13 * s, 4.5 * s, 0, 0, Math.PI * 2); g.fill();
  if (ctl) { g.strokeStyle = tag === "P1" ? PALETTE.p1 : PALETTE.p2; g.lineWidth = 3; g.beginPath(); g.ellipse(base.x, base.y, 17 * s, 6 * s, 0, 0, Math.PI * 2); g.stroke(); }
  const face = p.fx >= 0 ? 1 : -1;
  g.save(); g.translate(base.x, base.y); g.scale(s, s);
  let rot = 0, lift = 0;
  if (p.anim === 1) { rot = face * 1.35; lift = 4; }
  if (p.anim === 2) { const t = 1 - Math.max(0, p.at) / 0.65; rot = (p.dvy >= 0 ? 1 : -1) * Math.min(1.45, t * 4) * (p.team === 0 ? 1 : -1); lift = Math.sin(Math.min(1, t * 1.6) * Math.PI) * 18 + 4; }
  if (p.anim === 4) lift = Math.sin((1 - Math.max(0, p.at) / 0.4) * Math.PI) * 20;
  if (p.anim === 5 && p.skill === "ROULETTE") rot = Math.sin((1 - p.at / 0.65) * Math.PI * 2) * 0.5;
  g.translate(0, -lift); g.rotate(rot);
  const sw = p.anim === 0 ? Math.sin(p.ph * 2.2) * 0.6 : p.anim === 5 ? Math.sin((1 - p.at / 0.65) * Math.PI * (p.skill === "STEPOVERS" ? 6 : 2)) * 1.15 : 0;
  const id = identity(p.name);
  const skin = [PALETTE.skin0, PALETTE.skin1, PALETTE.skin2, PALETTE.skin3, PALETTE.skin4][id % 5] ?? PALETTE.skin0;
  const hair = [PALETTE.hair0, PALETTE.hair1, PALETTE.hair2, PALETTE.hair3][Math.floor(id / 5) % 4] ?? PALETTE.hair0;
  const haircut = Math.floor(id / 20) % 6;
  g.lineCap = "round";
  // legs
  const leg = (ang: number, col: string) => { g.strokeStyle = col; g.lineWidth = 4.2; g.beginPath(); g.moveTo(0, -16); g.lineTo(Math.sin(ang) * 15, -16 + Math.cos(ang) * 15); g.stroke(); };
  if (p.anim === 3) { leg(face * 1.25, skin); leg(-face * 0.2, skin); }
  else if (p.anim === 1) { leg(face * 0.3, skin); leg(face * -0.1, skin); }
  else { leg(sw, skin); leg(-sw, skin); }
  // shorts & torso
  g.fillStyle = trim; g.fillRect(-5.5, -21, 11, 7);
  g.fillStyle = kit; g.strokeStyle = trim; g.lineWidth = 1.2;
  g.beginPath(); g.roundRect(-6.5, -36, 13, 16, 3); g.fill(); g.stroke();
  // arms
  g.strokeStyle = kit; g.lineWidth = 3.4;
  const arm = p.anim === 2 ? -2.6 : p.anim === 1 ? 1.2 : sw * 0.8;
  g.beginPath(); g.moveTo(-6, -33); g.lineTo(-6 - Math.sin(arm) * 10, -33 + Math.cos(arm) * 10); g.stroke();
  g.beginPath(); g.moveTo(6, -33); g.lineTo(6 + Math.sin(-arm) * -10, -33 + Math.cos(arm) * 10); g.stroke();
  g.fillStyle = skin; g.beginPath(); g.arc(0, -41, 5, 0, Math.PI * 2); g.fill();
  g.fillStyle = hair;
  if (haircut === 0) { g.beginPath(); g.arc(0, -43, 5, Math.PI, 0); g.fill(); } // cropped
  else if (haircut === 1) { g.fillRect(-2, -50, 4, 9); } // mohawk
  else if (haircut === 2) { for (let j = -2; j <= 2; j++) { g.beginPath(); g.arc(j * 2.2, -46 + Math.abs(j), 2.7, 0, Math.PI * 2); g.fill(); } } // curls
  else if (haircut === 3) { g.beginPath(); g.ellipse(0, -44, 6.5, 5, 0, Math.PI, Math.PI * 2); g.fill(); g.fillRect(-6, -45, 2, 9); g.fillRect(4, -45, 2, 9); } // long
  else if (haircut === 4) { g.beginPath(); g.arc(0, -44, 5, Math.PI, 0); g.fill(); g.beginPath(); g.arc(-face * 5, -47, 3, 0, Math.PI * 2); g.fill(); } // bun
  // sixth style: shaved head

  g.fillStyle = trim; g.font = "bold 8px Barlow, sans-serif"; g.textAlign = "center"; g.fillText(String(p.num), 0, -25);
  g.restore();
  if (human && ctl) {
    g.fillStyle = tag === "P1" ? PALETTE.p1 : PALETTE.p2; g.font = "bold 12px Barlow, sans-serif"; g.textAlign = "center";
    g.fillText(`${tag} · ${p.name}`, base.x, base.y - 58 * s);
    if (p.chargeLevel && p.chargeKind) {
      const width = 48 * s, y = base.y - 85 * s;
      g.fillStyle = PALETTE.ink; g.fillRect(base.x - width / 2, y, width, 6 * s);
      g.fillStyle = tag === "P1" ? PALETTE.p1 : PALETTE.p2; g.fillRect(base.x - width / 2, y, width * p.chargeLevel, 6 * s);
      g.font = "bold 11px Barlow, sans-serif"; g.fillText(p.chargeKind.toUpperCase(), base.x, y - 4 * s);
    }
    if (p.anim === 5) { g.font = "bold 11px Barlow, sans-serif"; g.fillText(p.skill, base.x, base.y - 73 * s); }
  }
}

function draw(c: HTMLCanvasElement | null, s: State, home: Team, away: Team, twoPlayer: boolean) {
  if (!c) return;
  const g = c.getContext("2d");
  if (!g) return;
  g.setTransform(1, 0, 0, 1, 0, 0);
  const sky = g.createLinearGradient(0, 0, 0, CH); sky.addColorStop(0, PALETTE.sky); sky.addColorStop(1, PALETTE.surround);
  g.fillStyle = sky; g.fillRect(0, 0, CW, CH);
  g.fillStyle = PALETTE.surround; quad(g, [[-80, -40, 0], [W + 80, -40, 0], [W + 80, H + 30, 0], [-80, H + 30, 0]]); g.fill();
  for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? PALETTE.grass : PALETTE.stripe; rect(g, (i * W) / 10, 0, W / 10, H); g.fill(); }
  g.strokeStyle = PALETTE.line; g.lineWidth = 2;
  rect(g, 0, 0, W, H); g.stroke();
  quad(g, [[W / 2, 0, 0], [W / 2, H, 0]]); g.stroke();
  g.beginPath(); for (let a = 0; a <= 40; a++) { const t = (a / 40) * Math.PI * 2, p = proj(W / 2 + Math.cos(t) * 70, H / 2 + Math.sin(t) * 70); a ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); } g.stroke();
  rect(g, 0, H / 2 - BOX_HALF, BOX_D, BOX_HALF * 2); g.stroke(); rect(g, W - BOX_D, H / 2 - BOX_HALF, BOX_D, BOX_HALF * 2); g.stroke();
  rect(g, 0, H / 2 - GOAL_HALF - 20, 65, (GOAL_HALF + 20) * 2); g.stroke(); rect(g, W - 65, H / 2 - GOAL_HALF - 20, 65, (GOAL_HALF + 20) * 2); g.stroke();
  drawGoal(g, 0, -40); drawGoal(g, W, W + 40);

  const items: { y: number; f: () => void }[] = s.players.map((p, i) => {
    const t = p.team === 0 ? home : away;
    const human = p.team === 0 || twoPlayer;
    return { y: p.y, f: () => figure(g, p, p.gk ? (p.team === 0 ? PALETTE.keeperHome : PALETTE.keeperAway) : t.primary, p.gk ? PALETTE.ink : t.secondary, human, p.team === 0 ? "P1" : "P2", human && s.controlled[p.team] === i) };
  });
  const b = s.ball;
  const viewport = c.parentElement;
  if (viewport && c.clientWidth > viewport.clientWidth) {
    const target = proj(b.x, b.y).x * c.clientWidth / CW - viewport.clientWidth / 2;
    viewport.scrollLeft = Math.max(0, Math.min(c.clientWidth - viewport.clientWidth, target));
  }
  items.push({ y: b.y, f: () => {
    const sh = proj(b.x, b.y, 0), bp = proj(b.x, b.y, b.z + 5);
    g.fillStyle = PALETTE.shadow; g.beginPath(); g.ellipse(sh.x, sh.y, BALL_RADIUS * sh.s * Math.max(0.4, 1 - b.z / 200), 3 * sh.s, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = PALETTE.chalk; g.beginPath(); g.arc(bp.x, bp.y, BALL_RADIUS * bp.s, 0, Math.PI * 2); g.fill();
    g.strokeStyle = PALETTE.ink; g.lineWidth = 1; g.stroke();
    g.fillStyle = PALETTE.ink; g.beginPath(); g.arc(bp.x + Math.sin(b.x / 8) * 2 * bp.s, bp.y, 2 * bp.s, 0, Math.PI * 2); g.fill();
  } });
  items.sort((a, b2) => a.y - b2.y).forEach((it) => it.f());
}
