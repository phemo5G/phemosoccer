export type Team = {
  id: string;
  name: string;
  short: string;
  primary: string;
  secondary: string;
  rating: number;
  players: string[];
};

// Invented clubs — real club/player licences are not available.
export const TEAMS: Team[] = [
  { id: "gab", name: "Gaborone Lions", short: "GAB", primary: "#1f6fd1", secondary: "#ffffff", rating: 82, players: ["Kgosi", "Mothusi", "Tebogo", "Onalenna", "Kagiso"] },
  { id: "man", name: "Manchester Forge", short: "MFG", primary: "#d42a2a", secondary: "#ffffff", rating: 88, players: ["Hart", "Walsh", "Okafor", "Reyes", "Blake"] },
  { id: "mad", name: "Madrid Real Oro", short: "MRO", primary: "#f2f2f2", secondary: "#c9a227", rating: 89, players: ["Castillo", "Ramos", "Vega", "Ortiz", "Navarro"] },
  { id: "mil", name: "Milano Nero", short: "MLN", primary: "#1a1a1a", secondary: "#c9212a", rating: 85, players: ["Ferri", "Conti", "Rossi", "Galli", "Bruno"] },
  { id: "mun", name: "München Adler", short: "MAD", primary: "#b3142b", secondary: "#1c3f94", rating: 87, players: ["Keller", "Braun", "Vogel", "Hahn", "Wolf"] },
  { id: "par", name: "Paris Étoile", short: "PAE", primary: "#0d1f4a", secondary: "#e63946", rating: 86, players: ["Laurent", "Dubois", "Mbeki", "Petit", "Roux"] },
  { id: "lag", name: "Lagos Eagles", short: "LAG", primary: "#138a3e", secondary: "#ffffff", rating: 80, players: ["Adeyemi", "Okoro", "Balogun", "Eze", "Chukwu"] },
  { id: "rio", name: "Rio Samba FC", short: "RIO", primary: "#f5c518", secondary: "#127a3b", rating: 84, players: ["Silva", "Costa", "Lima", "Souza", "Rocha"] },
];
