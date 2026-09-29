import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { createState, step, W, H, GOAL_HALF, type Pad, type State } from "@/lib/engine";
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
      const kp = (u: string, d: string, l: string, r: string, pa: string, sh: string, touch: Pad): Pad => {
        let dx = (keys.has(r) ? 1 : 0) - (keys.has(l) ? 1 : 0) + touch.dx;
        let dy = (keys.has(d) ? 1 : 0) - (keys.has(u) ? 1 : 0) + touch.dy;
        dx = Math.max(-1, Math.min(1, dx)); dy = Math.max(-1, Math.min(1, dy));
        const pad = { dx, dy, pass: edge.has(pa) || touch.pass, shoot: edge.has(sh) || touch.shoot };
        touch.pass = touch.shoot = false;
        return pad;
      };
      const p1 = kp("w", "s", "a", "d", "f", "g", pads.current[0]);
      const p2 = twoPlayer ? kp("arrowup", "arrowdown", "arrowleft", "arrowright", "k", "l", pads.current[1]) : null;
      // single player: arrows also drive P1
      if (!twoPlayer) {
        p1.dx = Math.max(-1, Math.min(1, p1.dx + (keys.has("arrowright") ? 1 : 0) - (keys.has("arrowleft") ? 1 : 0)));
        p1.dy = Math.max(-1, Math.min(1, p1.dy + (keys.has("arrowdown") ? 1 : 0) - (keys.has("arrowup") ? 1 : 0)));
        p1.pass ||= edge.has("k") || edge.has(" "); p1.shoot ||= edge.has("l");
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
        <canvas ref={canvasRef} width={W + 60} height={H + 40} className="pitch-canvas" />
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
          </div>
        )}
      </div>
      <div className="touch-row">
        <TouchPad pad={pads.current[0]} label="P1" />
        {twoPlayer && <TouchPad pad={pads.current[1]} label="P2" />}
      </div>
      <p className="keys-hint">
        P1: WASD move · F pass · G shoot{twoPlayer ? " — P2: Arrows move · K pass · L shoot" : " (arrows / Space / L also work)"} · P pause
      </p>
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
      <button className="tbtn" onPointerDown={() => (pad.pass = true)}>Pass</button>
      <button className="tbtn tbtn-shoot" onPointerDown={() => (pad.shoot = true)}>Shoot</button>
    </div>
  );
}

function draw(c: HTMLCanvasElement | null, s: State, home: Team, away: Team, twoPlayer: boolean) {
  if (!c) return;
  const g = c.getContext("2d")!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = "#1d5a2c"; g.fillRect(0, 0, c.width, c.height);
  g.translate(30, 20);
  for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? "#2a7a3d" : "#2f8544"; g.fillRect((i * W) / 10, 0, W / 10, H); }
  g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = 2.5;
  g.strokeRect(0, 0, W, H);
  g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
  g.beginPath(); g.arc(W / 2, H / 2, 70, 0, Math.PI * 2); g.stroke();
  g.strokeRect(0, H / 2 - 150, 140, 300); g.strokeRect(W - 140, H / 2 - 150, 140, 300);
  g.strokeRect(0, H / 2 - 80, 50, 160); g.strokeRect(W - 50, H / 2 - 80, 50, 160);
  g.fillStyle = "rgba(255,255,255,0.25)";
  g.fillRect(-22, H / 2 - GOAL_HALF, 22, GOAL_HALF * 2); g.fillRect(W, H / 2 - GOAL_HALF, 22, GOAL_HALF * 2);
  g.strokeRect(-22, H / 2 - GOAL_HALF, 22, GOAL_HALF * 2); g.strokeRect(W, H / 2 - GOAL_HALF, 22, GOAL_HALF * 2);

  s.players.forEach((p, i) => {
    const t = p.team === 0 ? home : away;
    const human = p.team === 0 || twoPlayer;
    g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.ellipse(p.x + 3, p.y + 5, 11, 6, 0, 0, Math.PI * 2); g.fill();
    if (human && s.controlled[p.team] === i) {
      g.strokeStyle = p.team === 0 ? "#ffe14a" : "#4ae3ff"; g.lineWidth = 3;
      g.beginPath(); g.arc(p.x, p.y, 17, 0, Math.PI * 2); g.stroke();
      g.fillStyle = g.strokeStyle; g.font = "bold 11px Barlow, sans-serif"; g.textAlign = "center";
      g.fillText(p.team === 0 ? "P1" : "P2", p.x, p.y - 22);
    }
    g.fillStyle = p.gk ? "#8a8a8a" : t.primary; g.beginPath(); g.arc(p.x, p.y, 11, 0, Math.PI * 2); g.fill();
    g.strokeStyle = t.secondary; g.lineWidth = 2.5; g.stroke();
    g.fillStyle = t.secondary; g.font = "bold 10px Barlow, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(String(p.num), p.x, p.y + 1); g.textBaseline = "alphabetic";
  });
  const b = s.ball;
  g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.arc(b.x + 2, b.y + 3, 5, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(b.x, b.y, 5.5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#111"; g.lineWidth = 1; g.stroke();
}
