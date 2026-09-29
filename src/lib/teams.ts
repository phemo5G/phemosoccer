export type Team = {
  id: string;
  name: string;
  short: string;
  primary: string;
  secondary: string;
  rating: number;
  players: string[];
  bench?: string[];
  league: string;
};

export const benchFor = (t: Team) => t.bench ?? ["Sub GK", "Sub DEF", "Sub MID", "Sub FWD"].map((r) => `${t.short} ${r}`);

// Club and player names are used as fan-made rosters; no official licence.
export const TEAMS: Team[] = [
  // ===== Premier League (England) =====
  { id: "liv", name: "Liverpool", short: "LIV", primary: "#c8102e", secondary: "#ffffff", rating: 89, league: "Premier League", players: ["Salah", "Van Dijk", "Alisson", "Mac Allister", "Szoboszlai"] },
  { id: "mci", name: "Manchester City", short: "MCI", primary: "#6cabdd", secondary: "#ffffff", rating: 90, league: "Premier League", players: ["Haaland", "De Bruyne", "Rodri", "Foden", "Ederson"] },
  { id: "ars", name: "Arsenal", short: "ARS", primary: "#ef0107", secondary: "#ffffff", rating: 88, league: "Premier League", players: ["Saka", "Ødegaard", "Rice", "Saliba", "Raya"] },
  { id: "che", name: "Chelsea", short: "CHE", primary: "#034694", secondary: "#ffffff", rating: 85, league: "Premier League", players: ["Palmer", "Caicedo", "Jackson", "Cucurella", "Sánchez"] },
  { id: "mun", name: "Manchester United", short: "MUN", primary: "#da291c", secondary: "#fbe122", rating: 84, league: "Premier League", players: ["Bruno Fernandes", "Mainoo", "Martínez", "Onana", "Garnacho"] },
  { id: "tot", name: "Tottenham", short: "TOT", primary: "#ffffff", secondary: "#132257", rating: 84, league: "Premier League", players: ["Son", "Maddison", "Romero", "Vicario", "Kulusevski"] },
  { id: "new", name: "Newcastle", short: "NEW", primary: "#241f20", secondary: "#ffffff", rating: 83, league: "Premier League", players: ["Isak", "Bruno G.", "Gordon", "Pope", "Tonali"] },

  // ===== La Liga (Spain) =====
  { id: "rma", name: "Real Madrid", short: "RMA", primary: "#ffffff", secondary: "#00529f", rating: 91, league: "La Liga", players: ["Mbappé", "Bellingham", "Vinícius Jr", "Courtois", "Valverde"] },
  { id: "bar", name: "Barcelona", short: "BAR", primary: "#004d98", secondary: "#a50044", rating: 89, league: "La Liga", players: ["Yamal", "Lewandowski", "Pedri", "Raphinha", "Ter Stegen"] },
  { id: "atm", name: "Atlético Madrid", short: "ATM", primary: "#cb3524", secondary: "#ffffff", rating: 86, league: "La Liga", players: ["Griezmann", "Oblak", "Julián Álvarez", "Koke", "Llorente"] },
  { id: "ath", name: "Athletic Club", short: "ATH", primary: "#ee2523", secondary: "#ffffff", rating: 83, league: "La Liga", players: ["Nico Williams", "Sancet", "Simón", "Berenguer", "Vivian"] },
  { id: "rso", name: "Real Sociedad", short: "RSO", primary: "#0067b1", secondary: "#ffffff", rating: 82, league: "La Liga", players: ["Oyarzabal", "Zubimendi", "Kubo", "Remiro", "Merino"] },
  { id: "sev", name: "Sevilla", short: "SEV", primary: "#ffffff", secondary: "#d40f2a", rating: 80, league: "La Liga", players: ["Lukébakio", "Rakitić", "Nyland", "Sow", "Badé"] },

  // ===== Bundesliga (Germany) =====
  { id: "bay", name: "Bayern München", short: "BAY", primary: "#dc052d", secondary: "#ffffff", rating: 89, league: "Bundesliga", players: ["Kane", "Musiala", "Neuer", "Kimmich", "Sané"] },
  { id: "bvb", name: "Borussia Dortmund", short: "BVB", primary: "#fde100", secondary: "#000000", rating: 85, league: "Bundesliga", players: ["Guirassy", "Brandt", "Kobel", "Schlotterbeck", "Adeyemi"] },
  { id: "lev", name: "Bayer Leverkusen", short: "LEV", primary: "#e32221", secondary: "#000000", rating: 86, league: "Bundesliga", players: ["Wirtz", "Grimaldo", "Hrádecký", "Tah", "Xhaka"] },
  { id: "rbl", name: "RB Leipzig", short: "RBL", primary: "#ffffff", secondary: "#dd0741", rating: 83, league: "Bundesliga", players: ["Šeško", "Simons", "Gulácsi", "Orban", "Openda"] },
  { id: "sge", name: "Eintracht Frankfurt", short: "SGE", primary: "#e1000f", secondary: "#000000", rating: 81, league: "Bundesliga", players: ["Marmoush", "Trapp", "Koch", "Larsson", "Ekitiké"] },
  { id: "vfb", name: "VfB Stuttgart", short: "VFB", primary: "#ffffff", secondary: "#e32219", rating: 81, league: "Bundesliga", players: ["Undav", "Nübel", "Stiller", "Karazor", "Führich"] },

  // ===== Serie A (Italy) =====
  { id: "int", name: "Inter", short: "INT", primary: "#0068a8", secondary: "#000000", rating: 88, league: "Serie A", players: ["Lautaro", "Barella", "Sommer", "Bastoni", "Çalhanoğlu"] },
  { id: "mil", name: "AC Milan", short: "MIL", primary: "#fb090b", secondary: "#000000", rating: 85, league: "Serie A", players: ["Leão", "Pulisic", "Maignan", "Hernández", "Reijnders"] },
  { id: "juv", name: "Juventus", short: "JUV", primary: "#ffffff", secondary: "#000000", rating: 85, league: "Serie A", players: ["Vlahović", "Yıldız", "Di Gregorio", "Bremer", "Locatelli"] },
  { id: "nap", name: "Napoli", short: "NAP", primary: "#12a0d7", secondary: "#ffffff", rating: 86, league: "Serie A", players: ["Kvaratskhelia", "Lukaku", "Meret", "Di Lorenzo", "Anguissa"] },
  { id: "rom", name: "Roma", short: "ROM", primary: "#8e1f2f", secondary: "#f0bc42", rating: 83, league: "Serie A", players: ["Dybala", "Dovbyk", "Svilar", "Pellegrini", "Mancini"] },
  { id: "ata", name: "Atalanta", short: "ATA", primary: "#1e71b8", secondary: "#000000", rating: 84, league: "Serie A", players: ["Lookman", "Retegui", "Carnesecchi", "Éderson", "De Roon"] },

  // ===== Ligue 1 (France) =====
  { id: "psg", name: "Paris Saint-Germain", short: "PSG", primary: "#004170", secondary: "#da291c", rating: 88, league: "Ligue 1", players: ["Dembélé", "Vitinha", "Donnarumma", "Hakimi", "Barcola"] },
  { id: "om", name: "Marseille", short: "OM", primary: "#2faee0", secondary: "#ffffff", rating: 82, league: "Ligue 1", players: ["Greenwood", "Rulli", "Balerdi", "Rabiot", "Harit"] },
  { id: "mon", name: "Monaco", short: "MON", primary: "#e63312", secondary: "#ffffff", rating: 83, league: "Ligue 1", players: ["Ben Seghir", "Minamino", "Köhn", "Singho", "Zakaria"] },
  { id: "lil", name: "Lille", short: "LIL", primary: "#e01e13", secondary: "#ffffff", rating: 82, league: "Ligue 1", players: ["David", "Chevalier", "André", "Gudmundsson", "Diakité"] },
  { id: "oly", name: "Lyon", short: "OLY", primary: "#ffffff", secondary: "#da001a", rating: 81, league: "Ligue 1", players: ["Cherki", "Lacazette", "Perri", "Tolisso", "Tagliafico"] },
  { id: "nic", name: "Nice", short: "NIC", primary: "#000000", secondary: "#e30613", rating: 80, league: "Ligue 1", players: ["Laborde", "Bułka", "Dante", "Boudaoui", "Guessand"] },

  // ===== International =====
  { id: "arg", name: "Argentina", short: "ARG", primary: "#75aadb", secondary: "#ffffff", rating: 91, league: "International", players: ["Messi", "Julián Álvarez", "E. Martínez", "Mac Allister", "Enzo Fernández"] },
  { id: "por", name: "Portugal", short: "POR", primary: "#046a38", secondary: "#da291c", rating: 89, league: "International", players: ["Ronaldo", "Bruno Fernandes", "Bernardo Silva", "Rúben Dias", "Diogo Costa"] },
  { id: "bra", name: "Brazil", short: "BRA", primary: "#ffdf00", secondary: "#009c3b", rating: 89, league: "International", players: ["Neymar", "Vinícius Jr", "Rodrygo", "Alisson", "Casemiro"] },
  { id: "fra", name: "France", short: "FRA", primary: "#0055a4", secondary: "#ffffff", rating: 90, league: "International", players: ["Mbappé", "Griezmann", "Maignan", "Saliba", "Tchouaméni"] },
  { id: "eng", name: "England", short: "ENG", primary: "#ffffff", secondary: "#cf081f", rating: 89, league: "International", players: ["Kane", "Bellingham", "Saka", "Pickford", "Rice"] },
  { id: "esp", name: "Spain", short: "ESP", primary: "#aa151b", secondary: "#f1bf00", rating: 90, league: "International", players: ["Yamal", "Pedri", "Rodri", "Unai Simón", "Olmo"] },
  { id: "ger", name: "Germany", short: "GER", primary: "#ffffff", secondary: "#000000", rating: 87, league: "International", players: ["Musiala", "Wirtz", "Ter Stegen", "Kimmich", "Havertz"] },
  { id: "ned", name: "Netherlands", short: "NED", primary: "#ff6600", secondary: "#ffffff", rating: 86, league: "International", players: ["Van Dijk", "Simons", "Verbruggen", "De Jong", "Gakpo"] },
];

export const LEAGUES = [...new Set(TEAMS.map((t) => t.league))];
