import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TEAMS, type Team } from "@/lib/teams";
import { Match } from "@/components/Match";
import { Button } from "@/components/ui/button";
import { DIFFICULTIES, type Difficulty, type State } from "@/lib/engine";

export const Route = createFileRoute("/clubs")({
  head: () => ({
    meta: [
      { title: "Clubs — Phemo Soccer" },
      { name: "description", content: "Create your club and player, grow your rating and win the knockout cup." },
      { property: "og:title", content: "Clubs — Phemo Soccer" },
      { property: "og:description", content: "Create a club, build your player from 0 OVR and win the cup." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Clubs,
});

type Club = { name: string; short: string; primary: string; secondary: string; player: string; position: string; goals: number; assists: number; matches: number; wins: number; cups: number; round: number; difficulty: Difficulty };
const KEY = "phemo-club";
const POSITIONS = ["GK", "CB", "CM", "LW", "RW", "ST"] as const;
const ORDER = ["GK", "LB", "CB", "CB", "RB", "LW", "CM", "CM", "CM", "ST", "RW"];
const ROUNDS = ["Round of 16", "Quarter-final", "Semi-final", "Final"];
export const ovrOf = (c: Pick<Club, "goals" | "assists" | "wins" | "matches">) => Math.min(99, c.goals * 4 + c.assists * 3 + c.wins * 2 + c.matches);

function clubTeam(c: Club): Team {
  const ovr = ovrOf(c), eff = Math.max(45, ovr);
  const slot = ORDER.indexOf(c.position);
  const lineup = ORDER.map((position, i) => i === slot ? { name: c.player, position, rating: eff } : { name: `${c.short} ${position}${i}`, position, rating: 70 });
  return { id: "myclub", name: c.name, short: c.short, primary: c.primary, secondary: c.secondary, rating: 70, league: "My Club", players: [c.player], lineup };
}

function Clubs() {
  const [club, setClub] = useState<Club | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState("");
  useEffect(() => { try { const raw = localStorage.getItem(KEY); if (raw) setClub(JSON.parse(raw)); } catch { /* ignore */ } setLoaded(true); }, []);
  const save = (c: Club | null) => { setClub(c); if (c) localStorage.setItem(KEY, JSON.stringify(c)); else localStorage.removeItem(KEY); };

  const opponents = useMemo(() => [...TEAMS].filter((t) => t.id !== "phemo").sort((a, b) => a.rating - b.rating), []);
  if (!loaded) return <main className="menu-bg min-h-screen" />;
  if (!club) return <Create onDone={save} />;

  const round = club.round;
  const opp = opponents[Math.min(opponents.length - 1, Math.floor((round / 4) * opponents.length * 0.75) + Math.floor(Math.random() * 3))] ?? opponents[0]!;
  const levelIdx = Math.min(DIFFICULTIES.length - 1, DIFFICULTIES.indexOf(club.difficulty) + (round >= 3 ? 1 : 0));
  const level = DIFFICULTIES[levelIdx]!;

  if (playing) {
    const me = clubTeam(club);
    return <Match home={me} away={opp} twoPlayer={false} difficulty={level} onExit={() => setPlaying(false)} exitLabel="Continue"
      onFinish={(s: State) => {
        const mine = (s.goals ?? []).filter((g) => g.team === 0);
        const goals = mine.filter((g) => g.scorer === club.player).length, assists = mine.filter((g) => g.assist === club.player).length;
        let [h, a] = s.score; let pens = "";
        if (h === a) { const win = Math.random() < 0.5; pens = win ? " (won on penalties)" : " (lost on penalties)"; if (win) h++; else a++; }
        const won = h > a;
        const next: Club = { ...club, goals: club.goals + goals, assists: club.assists + assists, matches: club.matches + 1, wins: club.wins + (won ? 1 : 0), round: won ? (round + 1) % 4 : 0, cups: club.cups + (won && round === 3 ? 1 : 0) };
        setResult(`${club.name} ${s.score[0]}–${s.score[1]} ${opp.name}${pens}. You: ${goals} goals, ${assists} assists. ${won ? (round === 3 ? "🏆 CUP WINNERS!" : "Through to the next round!") : "Knocked out — try again."} OVR ${ovrOf(club)} → ${ovrOf(next)}`);
        save(next); setPlaying(false);
      }} />;
  }

  return (
    <main className="menu-bg min-h-screen px-5 py-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="eyebrow">← Phemo Soccer</Link>
        <h1 className="display text-6xl md:text-8xl">{club.name}</h1>
        <div className="mt-4 flex items-center gap-4 rounded-lg bg-background/70 p-5">
          <i className="crest" style={{ background: club.primary, borderColor: club.secondary }} />
          <div className="flex-1">
            <p className="display text-3xl">{club.player} · {club.position}</p>
            <p className="text-muted-foreground">{club.goals} goals · {club.assists} assists · {club.matches} played · {club.wins} wins · {club.cups} cups</p>
          </div>
          <div className="text-center"><p className="display text-5xl text-primary">{ovrOf(club)}</p><p className="eyebrow">OVR</p></div>
        </div>
        {result && <p className="mt-4 rounded-lg bg-background/70 p-4">{result}</p>}
        <fieldset className="mt-6"><legend className="eyebrow mb-2">Captain's difficulty</legend>
          <div className="flex flex-wrap gap-2">{DIFFICULTIES.map((d) => <Button key={d} variant="ghost" aria-pressed={club.difficulty === d} className={club.difficulty === d ? "chip chip-on" : "chip"} onClick={() => save({ ...club, difficulty: d })}>{d}</Button>)}</div>
        </fieldset>
        <div className="mt-6 rounded-lg bg-background/70 p-5">
          <p className="eyebrow">Knockout Cup · {ROUNDS[round]}</p>
          <p className="display text-4xl">vs {opp.name} <span className="text-primary">{opp.rating}</span></p>
          <p className="text-muted-foreground">CPU level: {level}. Each round gets harder.</p>
          <Button variant="ghost" className="btn-primary mt-4" onClick={() => { setResult(""); setPlaying(true); }}>Play {ROUNDS[round]}</Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Online club vs club by code is coming next.</p>
        <Button variant="ghost" className="btn-ghost mt-4" onClick={() => { if (confirm("Delete your club and player?")) save(null); }}>Delete club</Button>
      </div>
    </main>
  );
}

function Create({ onDone }: { onDone: (c: Club) => void }) {
  const [name, setName] = useState(""); const [player, setPlayer] = useState("");
  const [position, setPosition] = useState<string>("ST");
  const [primary, setPrimary] = useState("#7be3d1"); const [secondary, setSecondary] = useState("#172523");
  const ok = name.trim() && player.trim();
  const field = "mt-2 w-full rounded-lg border border-border bg-background/70 px-4 py-3";
  return (
    <main className="menu-bg min-h-screen px-5 py-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="eyebrow">← Phemo Soccer</Link>
        <h1 className="display text-6xl md:text-8xl">Create club</h1>
        <label className="eyebrow mt-6 block">Club name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} className={field} placeholder="e.g. Gaborone Stars" />
        <div className="mt-4 flex gap-6">
          <label className="eyebrow">Home kit <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="ml-2 align-middle" /></label>
          <label className="eyebrow">Trim <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="ml-2 align-middle" /></label>
        </div>
        <label className="eyebrow mt-6 block">Your player's name</label>
        <input value={player} onChange={(e) => setPlayer(e.target.value)} maxLength={16} className={field} placeholder="Your name" />
        <p className="mt-1 text-xs text-muted-foreground">Hair and skin are picked from the name — try different names for different looks.</p>
        <p className="eyebrow mt-6">Position</p>
        <div className="mt-2 flex flex-wrap gap-2">{POSITIONS.map((p) => <Button key={p} variant="ghost" aria-pressed={position === p} className={position === p ? "chip chip-on" : "chip"} onClick={() => setPosition(p)}>{p}</Button>)}</div>
        <p className="mt-4 text-muted-foreground">Your player starts at 0 OVR. Goals, assists and wins raise it.</p>
        <Button variant="ghost" className="btn-primary mt-6" disabled={!ok} onClick={() => onDone({ name: name.trim(), short: name.trim().slice(0, 3).toUpperCase(), primary, secondary, player: player.trim(), position, goals: 0, assists: 0, matches: 0, wins: 0, cups: 0, round: 0, difficulty: "Pro" })}>Create</Button>
      </div>
    </main>
  );
}
