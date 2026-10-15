import type { Team } from "@/lib/teams";
import type { Difficulty, State } from "@/lib/engine";

export type Club = { name: string; short: string; primary: string; secondary: string; player: string; position: string; goals: number; assists: number; matches: number; wins: number; cups: number; round: number; difficulty: Difficulty };
export const KEY = "phemo-club";
export const POSITIONS = ["GK", "CB", "CM", "LW", "RW", "ST"] as const;
const ORDER = ["GK", "LB", "CB", "CB", "RB", "LW", "CM", "CM", "CM", "ST", "RW"];
export const ROUNDS = ["Round of 16", "Quarter-final", "Semi-final", "Final"];
export const ovrOf = (c: Pick<Club, "goals" | "assists" | "wins" | "matches">) => Math.min(99, c.goals * 4 + c.assists * 3 + c.wins * 2 + c.matches);

export function clubTeam(c: Club): Team {
  const ovr = ovrOf(c), eff = Math.max(45, ovr);
  const slot = ORDER.indexOf(c.position);
  const lineup = ORDER.map((position, i) => i === slot ? { name: c.player, position, rating: eff } : { name: `${c.short} ${position}${i}`, position, rating: 70 });
  return { id: "myclub", name: c.name, short: c.short, primary: c.primary, secondary: c.secondary, rating: 70, league: "My Club", players: [c.player], lineup, captain: c.player };
}


export const loadClub = (): Club | null => { try { const r = localStorage.getItem(KEY); return r ? (JSON.parse(r) as Club) : null; } catch { return null; } };
export const saveClub = (c: Club) => localStorage.setItem(KEY, JSON.stringify(c));
/** Credit the user's player with goals/assists from a finished match played on `side`. */
export function creditMatch(c: Club, s: State, side: 0 | 1): Club {
  const mine = (s.goals ?? []).filter((g) => g.team === side);
  const won = s.score[side] > s.score[side === 0 ? 1 : 0];
  return { ...c, goals: c.goals + mine.filter((g) => g.scorer === c.player).length, assists: c.assists + mine.filter((g) => g.assist === c.player).length, matches: c.matches + 1, wins: c.wins + (won ? 1 : 0) };
}
