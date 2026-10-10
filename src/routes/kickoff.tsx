import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { TEAMS, LEAGUES } from "@/lib/teams";
import { Match } from "@/components/Match";
import { Button } from "@/components/ui/button";
import { DIFFICULTIES, type Difficulty } from "@/lib/engine";

export const Route = createFileRoute("/kickoff")({
  head: () => ({
    meta: [
      { title: "Kick-Off — Phemo Soccer" },
      { name: "description", content: "Pick two clubs and play a quick match, 2 players locally or against the CPU." },
      { property: "og:title", content: "Kick-Off — Phemo Soccer" },
      { property: "og:description", content: "Pick two clubs and play a quick match." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KickOff,
});

function KickOff() {
  const [home, setHome] = useState(0);
  const [away, setAway] = useState(1);
  const [twoPlayer, setTwoPlayer] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("Pro");

  const homeTeam = TEAMS[home], awayTeam = TEAMS[away];
  if (playing && homeTeam && awayTeam)
    return <Match home={homeTeam} away={awayTeam} twoPlayer={twoPlayer} difficulty={difficulty} onExit={() => setPlaying(false)} />;

  return (
    <main className="menu-bg min-h-screen px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="eyebrow">← Phemo Soccer</Link>
        <h1 className="display text-6xl md:text-8xl">Kick-Off</h1>
        <div className="mt-6 flex gap-2">
          <Button variant="ghost" aria-pressed={twoPlayer} className={twoPlayer ? "chip chip-on" : "chip"} onClick={() => setTwoPlayer(true)}>2 Players</Button>
          <Button variant="ghost" aria-pressed={!twoPlayer} className={!twoPlayer ? "chip chip-on" : "chip"} onClick={() => setTwoPlayer(false)}>vs CPU</Button>
        </div>
        {!twoPlayer && <fieldset className="mt-5"><legend className="eyebrow mb-2">Difficulty</legend><div className="flex flex-wrap gap-2">{DIFFICULTIES.map((level) => <Button key={level} variant="ghost" aria-pressed={difficulty === level} className={difficulty === level ? "chip chip-on" : "chip"} onClick={() => setDifficulty(level)}>{level}</Button>)}</div></fieldset>}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Picker label="Home · P1" value={home} onChange={setHome} other={away} />
          <Picker label={twoPlayer ? "Away · P2" : "Away · CPU"} value={away} onChange={setAway} other={home} />
        </div>
        <Button variant="ghost" className="btn-primary mt-8 w-full md:w-auto" onClick={() => setPlaying(true)}>Start match</Button>
      </div>
    </main>
  );
}

function Picker({ label, value, onChange, other }: { label: string; value: number; onChange: (n: number) => void; other: number }) {
  return (
    <section>
      <p className="eyebrow mb-2">{label}</p>
      {LEAGUES.map((lg) => (
        <div key={lg} className="mb-4">
          <p className="eyebrow mb-1.5 opacity-60">{lg}</p>
          <div className="grid grid-cols-2 gap-2">
            {TEAMS.map((t, i) => t.league !== lg ? null : (
              <Button variant="ghost" key={t.id} disabled={i === other} onClick={() => onChange(i)} className={i === value ? "team-btn team-on h-auto whitespace-normal" : "team-btn h-auto whitespace-normal"}>
                <i className="crest" style={{ background: t.primary, borderColor: t.secondary }} />
                <span className="flex-1 text-left">{t.name}</span>
                <span className="display text-xl">{t.rating}</span>
              </Button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
