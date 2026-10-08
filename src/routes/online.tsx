import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { TEAMS } from "@/lib/teams";
import { Match, type Net } from "@/components/Match";
import type { Pad } from "@/lib/engine";

export const Route = createFileRoute("/online")({
  head: () => ({
    meta: [
      { title: "Online — Phemo Soccer" },
      { name: "description", content: "Enter the same match code as a friend and play Phemo Soccer against each other online." },
      { property: "og:title", content: "Online — Phemo Soccer" },
      { property: "og:description", content: "Share a code, get matched, play online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Online,
});

type Seat = { id: string; team: number; at: number };

function Online() {
  const [code, setCode] = useState("");
  const [team, setTeam] = useState(0);
  const [status, setStatus] = useState<"idle" | "waiting" | "full" | "playing">("idle");
  const [match, setMatch] = useState<{ home: number; away: number; role: "host" | "guest" } | null>(null);
  const chRef = useRef<RealtimeChannel | null>(null);
  const net = useRef<Net>({ role: "host", send: () => {}, remotePad: { current: null }, remoteState: { current: null }, peerLeft: false });

  const leave = () => {
    if (chRef.current) supabase.removeChannel(chRef.current);
    chRef.current = null; setMatch(null); setStatus("idle");
  };
  useEffect(() => () => { if (chRef.current) supabase.removeChannel(chRef.current); }, []);

  const join = () => {
    const room = code.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!room) return;
    const me = crypto.randomUUID();
    const ch = supabase.channel(`phemo-${room}`, { config: { broadcast: { self: false }, presence: { key: me } } });
    const n = net.current;
    n.remotePad.current = null; n.remoteState.current = null; n.peerLeft = false;
    n.send = (event, payload) => { void ch.send({ type: "broadcast", event, payload }); };
    ch.on("broadcast", { event: "pad" }, ({ payload }) => {
      const p = payload as Pad, cur = n.remotePad.current;
      n.remotePad.current = cur ? { ...p, pass: cur.pass || p.pass, shoot: cur.shoot || p.shoot, finesse: cur.finesse || p.finesse, chip: cur.chip || p.chip, tackle: cur.tackle || p.tackle, lob: cur.lob || p.lob, through: cur.through || p.through, skill: cur.skill || p.skill } : p;
    });
    ch.on("broadcast", { event: "state" }, ({ payload }) => { n.remoteState.current = payload; });
    ch.on("presence", { event: "sync" }, () => {
      const seats = Object.values(ch.presenceState<Seat>()).map((a) => a[0]!).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
      const idx = seats.findIndex((s) => s.id === me);
      if (idx >= 2) { setStatus("full"); supabase.removeChannel(ch); chRef.current = null; return; }
      if (seats.length >= 2) {
        const host = seats[0]!, guest = seats[1]!;
        let away = guest.team; if (away === host.team) away = (host.team + 1) % TEAMS.length;
        n.role = idx === 0 ? "host" : "guest";
        setMatch((m) => m ?? { home: host.team, away, role: n.role });
        setStatus("playing");
      } else if (chRef.current) {
        setMatch((m) => { if (m) n.peerLeft = true; return m; });
        setStatus((s) => (s === "playing" ? s : "waiting"));
      }
    });
    ch.subscribe((st) => { if (st === "SUBSCRIBED") void ch.track({ id: me, team, at: Date.now() }); });
    chRef.current = ch; setStatus("waiting");
  };

  if (status === "playing" && match)
    return <Match home={TEAMS[match.home]!} away={TEAMS[match.away]!} twoPlayer net={net.current} onExit={leave} />;

  return (
    <main className="menu-bg min-h-screen px-5 py-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="eyebrow">← Phemo Soccer</Link>
        <h1 className="display text-6xl md:text-8xl">Online</h1>
        <p className="text-muted-foreground">You and a friend type the same code. Whoever joins first is the home team.</p>
        {status === "idle" || status === "full" ? (
          <>
            {status === "full" && <p className="mt-4 text-destructive">That code already has two players. Try another code.</p>}
            <label className="eyebrow mt-6 block">Match code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} placeholder="e.g. phemo123" className="mt-2 w-full rounded-lg border border-border bg-background/70 px-4 py-3 text-2xl display tracking-widest" />
            <label className="eyebrow mt-6 block">Your team</label>
            <select value={team} onChange={(e) => setTeam(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-border bg-background/70 px-4 py-3">
              {TEAMS.map((t, i) => <option key={t.id} value={i}>{t.name} ({t.league})</option>)}
            </select>
            <button className="btn-primary mt-8 w-full md:w-auto" disabled={!code.trim()} onClick={join}>Find match</button>
          </>
        ) : (
          <div className="mt-8 rounded-lg bg-background/70 p-6 text-center">
            <p className="display text-4xl">Waiting for opponent…</p>
            <p className="mt-2 text-muted-foreground">Code: <b className="text-foreground">{code}</b> — tell your friend to enter it.</p>
            <button className="btn-ghost mt-6" onClick={leave}>Cancel</button>
          </div>
        )}
      </div>
    </main>
  );
}
