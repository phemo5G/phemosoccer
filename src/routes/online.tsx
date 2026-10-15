import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { TEAMS, type Team } from "@/lib/teams";
import { loadClub, clubTeam, type Club } from "@/lib/club";
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
  validateSearch: (s: Record<string, unknown>): { club?: number } => (s["club"] ? { club: 1 } : {}),
  component: Online,
});

type Seat = { id: string; team: number; at: number; club?: Club | null };

function Online() {
  const [code, setCode] = useState("");
  const [team, setTeam] = useState(0);
  const search = Route.useSearch();
  const [myClub, setMyClub] = useState<Club | null>(null);
  const [useClub, setUseClub] = useState(false);
  useEffect(() => { const c = loadClub(); setMyClub(c); if (c && search.club) setUseClub(true); }, [search.club]);
  const [status, setStatus] = useState<"idle" | "waiting" | "full" | "playing">("idle");
  const [match, setMatch] = useState<{ home: Team; away: Team; role: "host" | "guest"; locks?: [string | undefined, string | undefined] } | null>(null);
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
    n.remotePad.current = null; n.remoteState.current = null; n.peerLeft = false; n.inbox = { emojis: [], skip: false };
    n.send = (event, payload) => { void ch.send({ type: "broadcast", event, payload }); };
    ch.on("broadcast", { event: "pad" }, ({ payload }) => {
      const p = payload as Pad, cur = n.remotePad.current;
      n.remotePad.current = cur ? { ...p, pass: cur.pass || p.pass, shoot: cur.shoot || p.shoot, finesse: cur.finesse || p.finesse, chip: cur.chip || p.chip, tackle: cur.tackle || p.tackle, lob: cur.lob || p.lob, through: cur.through || p.through, skill: cur.skill || p.skill } as Pad : p;
    });
    ch.on("broadcast", { event: "emoji" }, ({ payload }) => { if (typeof payload === "string") n.inbox?.emojis.push(payload); });
    ch.on("broadcast", { event: "skip" }, () => { if (n.inbox) n.inbox.skip = true; });
    ch.on("broadcast", { event: "rtc" }, ({ payload }) => { void n.rtc?.(payload); });
    ch.on("broadcast", { event: "state" }, ({ payload }) => { n.remoteState.current = payload; });
    ch.on("presence", { event: "sync" }, () => {
      const seats = Object.values(ch.presenceState<Seat>()).map((a) => a[0]!).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
      const idx = seats.findIndex((s) => s.id === me);
      if (idx >= 2) { setStatus("full"); supabase.removeChannel(ch); chRef.current = null; return; }
      if (seats.length >= 2) {
        const host = seats[0]!, guest = seats[1]!;
        let away = guest.team; if (away === host.team) away = (host.team + 1) % TEAMS.length;
        n.role = idx === 0 ? "host" : "guest";
        const ht = host.club ? clubTeam(host.club) : TEAMS[host.team]!;
        let at = guest.club ? clubTeam(guest.club) : TEAMS[away]!;
        if (at.id === ht.id) at = { ...at, id: "myclub2" };
        setMatch((m) => m ?? { home: ht, away: at, role: n.role, locks: [host.club?.player, guest.club?.player] });
        setStatus("playing");
      } else if (chRef.current) {
        setMatch((m) => { if (m) n.peerLeft = true; return m; });
        setStatus((s) => (s === "playing" ? s : "waiting"));
      }
    });
    ch.subscribe((st) => { if (st === "SUBSCRIBED") void ch.track({ id: me, team, at: Date.now(), club: useClub ? myClub : null }); });
    chRef.current = ch; setStatus("waiting");
  };

  if (status === "playing" && match)
    return <Match home={match.home} away={match.away} twoPlayer net={net.current} onExit={leave} lockNames={match.locks} />;

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
            {myClub && <label className="mt-6 flex items-center gap-2"><input type="checkbox" checked={useClub} onChange={(e) => setUseClub(e.target.checked)} /> Play as my club ({myClub.name}, you control {myClub.player} only)</label>}
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
