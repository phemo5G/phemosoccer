import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { createState, step, setFormation, substitute, FORMATIONS, W, H, GOAL_HALF, CROSSBAR, type Pad, type P, type State } from "@/lib/engine";
import { benchFor } from "@/lib/teams";
import type { Team } from "@/lib/teams";

type Props = { home: Team; away: Team; twoPlayer: boolean; onExit: () => void };

const emptyPad = (): Pad => ({ dx: 0, dy: 0, pass: false, shoot: false });

export function Match({ home, away, twoPlayer, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<State | null>(null);
  const pads = useRef<[Pad, Pad]>([emptyPad(), emptyPad()]);
  const [hud, setHud] = useState({ score: [0, 0], min: 0, flash: "", over: false });
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useEffect(() => {
    stateRef.current = createState(home, away);
    const keys = new Set<string>();
    const edge = new Set<string>();
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
      if (!keys.has(k)) edge.add(k);
      keys.add(k);
      if (k === "escape" || k === "p") setPaused((v) => !v);
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    let raf = 0, last = performance.now(), hudT = 0;
    const loop = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      const s = stateRef.current!;
      const kp = (u: string, d: string, l: string, r: string, pa: string, sh: string, fi: string, ch: string, tk: string, touch: Pad): Pad => {
        let dx = (keys.has(r) ? 1 : 0) - (keys.has(l) ? 1 : 0) + touch.dx;
        let dy = (keys.has(d) ? 1 : 0) - (keys.has(u) ? 1 : 0) + touch.dy;
        dx = Math.max(-1, Math.min(1, dx)); dy = Math.max(-1, Math.min(1, dy));
        const pad: Pad = { dx, dy, pass: edge.has(pa) || touch.pass, shoot: edge.has(sh) || touch.shoot, finesse: edge.has(fi) || !!touch.finesse, chip: edge.has(ch) || !!touch.chip, tackle: edge.has(tk) || !!touch.tackle };
        touch.pass = touch.shoot = touch.finesse = touch.chip = touch.tackle = false;
        return pad;
      };
      const p1 = kp("w", "s", "a", "d", "f", "g", "h", "r", "e", pads.current[0]);
      const p2 = twoPlayer ? kp("arrowup", "arrowdown", "arrowleft", "arrowright", "k", "l", "o", "i", "j", pads.current[1]) : null;
      // single player: arrows also drive P1
      if (!twoPlayer) {
        p1.dx = Math.max(-1, Math.min(1, p1.dx + (keys.has("arrowright") ? 1 : 0) - (keys.has("arrowleft") ? 1 : 0)));
        p1.dy = Math.max(-1, Math.min(1, p1.dy + (keys.has("arrowdown") ? 1 : 0) - (keys.has("arrowup") ? 1 : 0)));
        p1.pass ||= edge.has("k") || edge.has(" "); p1.shoot ||= edge.has("l"); p1.finesse ||= edge.has("o"); p1.chip ||= edge.has("i"); p1.tackle ||= edge.has("j");
      }
      edge.clear();
      if (!pausedRef.current) step(s, dt, [p1, p2]);
      draw(canvasRef.current, s, home, away, twoPlayer);
      hudT += dt;
      if (hudT > 0.2) {
        hudT = 0;
        setHud({ score: [...s.score], min: Math.min(90, Math.floor((s.time / s.duration) * 90)), flash: s.flash, over: s.over });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [home, away, twoPlayer]);

  return (
    <div className="match-shell">
      <div className="scoreboard">
        <span className="sb-team"><i style={{ background: home.primary }} />{home.short}</span>
        <span className="sb-score">{hud.score[0]} – {hud.score[1]}</span>
        <span className="sb-team">{away.short}<i style={{ background: away.primary }} /></span>
        <span className="sb-clock">{hud.min}'</span>
        <button className="sb-btn" onClick={() => setPaused((v) => !v)}>{paused ? "Resume" : "Pause"}</button>
      </div>
      <div className="pitch-wrap">
        <canvas ref={canvasRef} width={CW} height={CH} className="pitch-canvas" />
        {hud.flash && !hud.over && <div className="flash">{hud.flash}</div>}
        {(paused || hud.over) && (
          <div className="overlay">
            <h2 className="display text-6xl">{hud.over ? "Full time" : "Paused"}</h2>
            <p className="display text-4xl">{home.short} {hud.score[0]} – {hud.score[1]} {away.short}</p>
            <div className="flex gap-3">
              {!hud.over && <button className="btn-primary" onClick={() => setPaused(false)}>Resume</button>}
              <button className="btn-primary" onClick={onExit}>New match</button>
              <Link to="/" className="btn-ghost">Main menu</Link>
            </div>
            {!hud.over && stateRef.current && <Tactics s={stateRef.current} team={0} club={home} />}
            {!hud.over && twoPlayer && stateRef.current && <Tactics s={stateRef.current} team={1} club={away} />}
          </div>
        )}
      </div>
      <div className="touch-row">
        <TouchPad pad={pads.current[0]} label="P1" />
        {twoPlayer && <TouchPad pad={pads.current[1]} label="P2" />}
      </div>
      <p className="keys-hint">
        P1: WASD · F pass · G power · H finesse · R chip · E slide{twoPlayer ? " — P2: Arrows · K pass · L power · O finesse · I chip · J slide" : " (arrows, Space, L/O/I/J also work)"} · P pause / tactics
      </p>
    </div>
  );
}

function Tactics({ s, team, club }: { s: State; team: 0 | 1; club: Team }) {
  const [, force] = useState(0);
  const [form, setForm] = useState("Diamond 1-2-1");
  const [slot, setSlot] = useState<number | null>(null);
  const squad = s.players.filter((p) => p.team === team);
  const bench = benchFor(club).filter((n) => !squad.some((p) => p.name === n));
  return (
    <div className="w-full max-w-xl rounded-lg bg-background/80 p-3 text-left text-sm">
      <div className="mb-2 font-bold">{club.name} tactics</div>
      <div className="mb-2 flex flex-wrap gap-1">
        {Object.keys(FORMATIONS).map((f) => (
          <button key={f} className={f === form ? "chip chip-on" : "chip"} onClick={() => { setFormation(s, team, f); setForm(f); }}>{f}</button>
        ))}
      </div>
      <div className="mb-1 opacity-70">Tap a player, then a sub:</div>
      <div className="flex flex-wrap gap-1">
        {squad.map((p, i) => (
          <button key={i} className={slot === i ? "chip chip-on" : "chip"} onClick={() => setSlot(i)}>{p.gk ? "GK " : ""}{p.name}</button>
        ))}
      </div>
      {slot !== null && (
        <div className="mt-2 flex flex-wrap gap-1">
          {bench.map((n) => (
            <button key={n} className="chip" onClick={() => { substitute(s, team, slot, n); setSlot(null); force((x) => x + 1); }}>↑ {n}</button>
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
    const r = baseRef.current!.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
    let y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    pad.dx = x; pad.dy = y; setKnob({ x, y });
  };
  const end = () => { pad.dx = pad.dy = 0; setKnob({ x: 0, y: 0 }); };
  return (
    <div className="touchpad">
      <div ref={baseRef} className="stick" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e); }} onPointerMove={(e) => e.buttons && move(e)} onPointerUp={end} onPointerCancel={end}>
        <div className="knob" style={{ transform: `translate(${knob.x * 28}px, ${knob.y * 28}px)` }}>{label}</div>
      </div>
      <div className="grid grid-cols-3 gap-1">
        <button className="tbtn" onPointerDown={() => (pad.pass = true)}>Pass</button>
        <button className="tbtn tbtn-shoot" onPointerDown={() => (pad.shoot = true)}>Power</button>
        <button className="tbtn" onPointerDown={() => (pad.finesse = true)}>Finesse</button>
        <button className="tbtn" onPointerDown={() => (pad.chip = true)}>Chip</button>
        <button className="tbtn" onPointerDown={() => (pad.tackle = true)}>Slide</button>
      </div>
    </div>
  );
}

const CW = 1100, CH = 560, CX = CW / 2, HY = -420, CAMH = 900, FOC = 700;
function proj(x: number, y: number, z = 0) {
  const sc = FOC / (FOC + (H - y));
  return { x: CX + (x - W / 2) * sc, y: HY + (CAMH - z) * sc, s: sc };
}
function quad(g: CanvasRenderingContext2D, pts: [number, number, number][]) {
  g.beginPath(); pts.forEach(([x, y, z], i) => { const p = proj(x, y, z); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }); g.closePath();
}
function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) { quad(g, [[x, y, 0], [x + w, y, 0], [x + w, y + h, 0], [x, y + h, 0]]); }

function drawGoal(g: CanvasRenderingContext2D, gx: number, back: number) {
  const y0 = H / 2 - GOAL_HALF, y1 = H / 2 + GOAL_HALF, cb = CROSSBAR;
  g.fillStyle = "rgba(255,255,255,0.12)"; g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 1;
  quad(g, [[back, y0, 0], [back, y1, 0], [back, y1, cb], [back, y0, cb]]); g.fill(); g.stroke();
  quad(g, [[gx, y0, cb], [back, y0, cb], [back, y1, cb], [gx, y1, cb]]); g.fill(); g.stroke();
  for (let i = 1; i < 8; i++) { const yy = y0 + ((y1 - y0) * i) / 8; quad(g, [[back, yy, 0], [back, yy, cb]]); g.stroke(); }
  g.strokeStyle = "#ffffff"; g.lineWidth = 4;
  quad(g, [[gx, y0, 0], [gx, y0, cb], [gx, y1, cb], [gx, y1, 0]]); g.stroke();
}

function figure(g: CanvasRenderingContext2D, p: P, kit: string, trim: string, human: boolean, tag: string, ctl: boolean) {
  const base = proj(p.x, p.y, 0), s = base.s * 1.5;
  g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.ellipse(base.x, base.y, 13 * s, 4.5 * s, 0, 0, Math.PI * 2); g.fill();
  if (ctl) { g.strokeStyle = tag === "P1" ? "#ffe14a" : "#4ae3ff"; g.lineWidth = 3; g.beginPath(); g.ellipse(base.x, base.y, 17 * s, 6 * s, 0, 0, Math.PI * 2); g.stroke(); }
  const face = p.fx >= 0 ? 1 : -1;
  g.save(); g.translate(base.x, base.y); g.scale(s, s);
  let rot = 0, lift = 0;
  if (p.anim === 1) { rot = face * 1.35; lift = 4; }
  if (p.anim === 2) { const t = 1 - Math.max(0, p.at) / 0.65; rot = (p.dvy >= 0 ? 1 : -1) * Math.min(1.45, t * 4) * (p.team === 0 ? 1 : -1); lift = Math.sin(Math.min(1, t * 1.6) * Math.PI) * 18 + 4; }
  g.translate(0, -lift); g.rotate(rot);
  const sw = p.anim === 0 ? Math.sin(p.ph * 2.2) * 0.6 : 0;
  const skin = "#c98e62";
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
  g.fillStyle = "#2a1a10"; g.beginPath(); g.arc(0, -43, 5, Math.PI, 0); g.fill();
  g.fillStyle = trim; g.font = "bold 8px Barlow, sans-serif"; g.textAlign = "center"; g.fillText(String(p.num), 0, -25);
  g.restore();
  if (human && ctl) {
    g.fillStyle = tag === "P1" ? "#ffe14a" : "#4ae3ff"; g.font = "bold 12px Barlow, sans-serif"; g.textAlign = "center";
    g.fillText(`${tag} · ${p.name}`, base.x, base.y - 58 * s);
  }
}

function draw(c: HTMLCanvasElement | null, s: State, home: Team, away: Team, twoPlayer: boolean) {
  if (!c) return;
  const g = c.getContext("2d")!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  const sky = g.createLinearGradient(0, 0, 0, CH); sky.addColorStop(0, "#0d1b14"); sky.addColorStop(1, "#1d5a2c");
  g.fillStyle = sky; g.fillRect(0, 0, CW, CH);
  g.fillStyle = "#1d5a2c"; quad(g, [[-80, -40, 0], [W + 80, -40, 0], [W + 80, H + 30, 0], [-80, H + 30, 0]]); g.fill();
  for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? "#2a7a3d" : "#2f8544"; rect(g, (i * W) / 10, 0, W / 10, H); g.fill(); }
  g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = 2;
  rect(g, 0, 0, W, H); g.stroke();
  quad(g, [[W / 2, 0, 0], [W / 2, H, 0]]); g.stroke();
  g.beginPath(); for (let a = 0; a <= 40; a++) { const t = (a / 40) * Math.PI * 2, p = proj(W / 2 + Math.cos(t) * 70, H / 2 + Math.sin(t) * 70); a ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); } g.stroke();
  rect(g, 0, H / 2 - 150, 140, 300); g.stroke(); rect(g, W - 140, H / 2 - 150, 140, 300); g.stroke();
  rect(g, 0, H / 2 - 80, 50, 160); g.stroke(); rect(g, W - 50, H / 2 - 80, 50, 160); g.stroke();
  drawGoal(g, 0, -24); drawGoal(g, W, W + 24);

  const items: { y: number; f: () => void }[] = s.players.map((p, i) => {
    const t = p.team === 0 ? home : away;
    const human = p.team === 0 || twoPlayer;
    return { y: p.y, f: () => figure(g, p, p.gk ? (p.team === 0 ? "#2ecc71" : "#f39c12") : t.primary, p.gk ? "#111111" : t.secondary, human, p.team === 0 ? "P1" : "P2", human && s.controlled[p.team] === i) };
  });
  const b = s.ball;
  items.push({ y: b.y, f: () => {
    const sh = proj(b.x, b.y, 0), bp = proj(b.x, b.y, b.z + 5);
    g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.ellipse(sh.x, sh.y, 6 * sh.s * Math.max(0.4, 1 - b.z / 200), 2.5 * sh.s, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(bp.x, bp.y, 6 * bp.s, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#111"; g.lineWidth = 1; g.stroke();
    g.fillStyle = "#111"; g.beginPath(); g.arc(bp.x + Math.sin(b.x / 8) * 2 * bp.s, bp.y, 2 * bp.s, 0, Math.PI * 2); g.fill();
  } });
  items.sort((a, b2) => a.y - b2.y).forEach((it) => it.f());
}
