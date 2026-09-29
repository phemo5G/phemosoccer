import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Phemo Soccer — Play football with a friend" },
      { name: "description", content: "Phemo Soccer: quick football matches for two players on one keyboard or phone." },
      { property: "og:title", content: "Phemo Soccer" },
      { property: "og:description", content: "Quick football matches for two players on one device." },
    ],
  }),
  component: Home,
});

const modes = [
  { name: "Career Mode", note: "Coming soon" },
  { name: "Ultimate Team", note: "Coming soon" },
  { name: "Clubs", note: "Coming soon" },
  { name: "Online", note: "Coming soon" },
];

function Home() {
  return (
    <main className="menu-bg min-h-screen px-5 py-10">
      <div className="mx-auto max-w-5xl">
        <p className="eyebrow">Season 27</p>
        <h1 className="display text-7xl md:text-9xl leading-none">Phemo<br />Soccer</h1>
        <Link to="/kickoff" className="mode-hero mt-10">
          <span className="eyebrow">Play now</span>
          <span className="display text-5xl md:text-6xl">Kick-Off</span>
          <span className="text-muted-foreground">Any team. 2 players on one device, or vs CPU.</span>
        </Link>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {modes.map((m) => (
            <div key={m.name} className="mode-card">
              <span className="display text-2xl">{m.name}</span>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">{m.note}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
