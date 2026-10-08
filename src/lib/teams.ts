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
  { id: "liv", name: "Liverpool", short: "LIV", primary: "#c8102e", secondary: "#ffffff", rating: 89, league: "Premier League", players: ["Alisson", "Van Dijk", "Szoboszlai", "Wirtz", "Isak"], bench: ["Barcola", "Salah", "Mac Allister", "Gakpo"] },
  { id: "mci", name: "Manchester City", short: "MCI", primary: "#6cabdd", secondary: "#ffffff", rating: 90, league: "Premier League", players: ["Ederson", "Haaland", "De Bruyne", "Rodri", "Foden"] },
  { id: "ars", name: "Arsenal", short: "ARS", primary: "#ef0107", secondary: "#ffffff", rating: 88, league: "Premier League", players: ["Raya", "Saka", "Ødegaard", "Rice", "Saliba"] },
  { id: "che", name: "Chelsea", short: "CHE", primary: "#034694", secondary: "#ffffff", rating: 85, league: "Premier League", players: ["Sánchez", "Palmer", "Caicedo", "Jackson", "Cucurella"] },
  { id: "mun", name: "Manchester United", short: "MUN", primary: "#da291c", secondary: "#fbe122", rating: 84, league: "Premier League", players: ["Onana", "Bruno Fernandes", "Mainoo", "Martínez", "Garnacho"] },
  { id: "tot", name: "Tottenham", short: "TOT", primary: "#ffffff", secondary: "#132257", rating: 84, league: "Premier League", players: ["Vicario", "Son", "Maddison", "Romero", "Kulusevski"] },
  { id: "new", name: "Newcastle", short: "NEW", primary: "#241f20", secondary: "#ffffff", rating: 83, league: "Premier League", players: ["Pope", "Isak", "Bruno G.", "Gordon", "Tonali"] },

  // ===== La Liga (Spain) =====
  { id: "rma", name: "Real Madrid", short: "RMA", primary: "#ffffff", secondary: "#00529f", rating: 91, league: "La Liga", players: ["Courtois", "Mbappé", "Bellingham", "Vinícius Jr", "Valverde"] },
  { id: "bar", name: "Barcelona", short: "BAR", primary: "#004d98", secondary: "#a50044", rating: 89, league: "La Liga", players: ["Ter Stegen", "Yamal", "Lewandowski", "Pedri", "Raphinha"] },
  { id: "atm", name: "Atlético Madrid", short: "ATM", primary: "#cb3524", secondary: "#ffffff", rating: 86, league: "La Liga", players: ["Oblak", "Griezmann", "Julián Álvarez", "Koke", "Llorente"] },
  { id: "ath", name: "Athletic Club", short: "ATH", primary: "#ee2523", secondary: "#ffffff", rating: 83, league: "La Liga", players: ["Simón", "Nico Williams", "Sancet", "Berenguer", "Vivian"] },
  { id: "rso", name: "Real Sociedad", short: "RSO", primary: "#0067b1", secondary: "#ffffff", rating: 82, league: "La Liga", players: ["Remiro", "Oyarzabal", "Zubimendi", "Kubo", "Merino"] },
  { id: "sev", name: "Sevilla", short: "SEV", primary: "#ffffff", secondary: "#d40f2a", rating: 80, league: "La Liga", players: ["Nyland", "Lukébakio", "Rakitić", "Sow", "Badé"] },

  // ===== Bundesliga (Germany) =====
  { id: "bay", name: "Bayern München", short: "BAY", primary: "#dc052d", secondary: "#ffffff", rating: 89, league: "Bundesliga", players: ["Neuer", "Kane", "Musiala", "Kimmich", "Sané"] },
  { id: "bvb", name: "Borussia Dortmund", short: "BVB", primary: "#fde100", secondary: "#000000", rating: 85, league: "Bundesliga", players: ["Kobel", "Guirassy", "Brandt", "Schlotterbeck", "Adeyemi"] },
  { id: "lev", name: "Bayer Leverkusen", short: "LEV", primary: "#e32221", secondary: "#000000", rating: 86, league: "Bundesliga", players: ["Hrádecký", "Wirtz", "Grimaldo", "Tah", "Xhaka"] },
  { id: "rbl", name: "RB Leipzig", short: "RBL", primary: "#ffffff", secondary: "#dd0741", rating: 83, league: "Bundesliga", players: ["Gulácsi", "Šeško", "Simons", "Orban", "Openda"] },
  { id: "sge", name: "Eintracht Frankfurt", short: "SGE", primary: "#e1000f", secondary: "#000000", rating: 81, league: "Bundesliga", players: ["Trapp", "Marmoush", "Koch", "Larsson", "Ekitiké"] },
  { id: "vfb", name: "VfB Stuttgart", short: "VFB", primary: "#ffffff", secondary: "#e32219", rating: 81, league: "Bundesliga", players: ["Nübel", "Undav", "Stiller", "Karazor", "Führich"] },

  // ===== Serie A (Italy) =====
  { id: "int", name: "Inter", short: "INT", primary: "#0068a8", secondary: "#000000", rating: 88, league: "Serie A", players: ["Sommer", "Lautaro", "Barella", "Bastoni", "Çalhanoğlu"] },
  { id: "mil", name: "AC Milan", short: "MIL", primary: "#fb090b", secondary: "#000000", rating: 85, league: "Serie A", players: ["Maignan", "Leão", "Pulisic", "Hernández", "Reijnders"] },
  { id: "juv", name: "Juventus", short: "JUV", primary: "#ffffff", secondary: "#000000", rating: 85, league: "Serie A", players: ["Di Gregorio", "Vlahović", "Yıldız", "Bremer", "Locatelli"] },
  { id: "nap", name: "Napoli", short: "NAP", primary: "#12a0d7", secondary: "#ffffff", rating: 86, league: "Serie A", players: ["Meret", "Kvaratskhelia", "Lukaku", "Di Lorenzo", "Anguissa"] },
  { id: "rom", name: "Roma", short: "ROM", primary: "#8e1f2f", secondary: "#f0bc42", rating: 83, league: "Serie A", players: ["Svilar", "Dybala", "Dovbyk", "Pellegrini", "Mancini"] },
  { id: "ata", name: "Atalanta", short: "ATA", primary: "#1e71b8", secondary: "#000000", rating: 84, league: "Serie A", players: ["Carnesecchi", "Lookman", "Retegui", "Éderson", "De Roon"] },

  // ===== Ligue 1 (France) =====
  { id: "psg", name: "Paris Saint-Germain", short: "PSG", primary: "#004170", secondary: "#da291c", rating: 88, league: "Ligue 1", players: ["Donnarumma", "Dembélé", "Vitinha", "Hakimi", "Barcola"] },
  { id: "om", name: "Marseille", short: "OM", primary: "#2faee0", secondary: "#ffffff", rating: 82, league: "Ligue 1", players: ["Rulli", "Greenwood", "Balerdi", "Rabiot", "Harit"] },
  { id: "mon", name: "Monaco", short: "MON", primary: "#e63312", secondary: "#ffffff", rating: 83, league: "Ligue 1", players: ["Köhn", "Minamino", "Ben Seghir", "Singho", "Zakaria"] },
  { id: "lil", name: "Lille", short: "LIL", primary: "#e01e13", secondary: "#ffffff", rating: 82, league: "Ligue 1", players: ["Chevalier", "David", "André", "Gudmundsson", "Diakité"] },
  { id: "oly", name: "Lyon", short: "OLY", primary: "#ffffff", secondary: "#da001a", rating: 81, league: "Ligue 1", players: ["Perri", "Cherki", "Lacazette", "Tolisso", "Tagliafico"] },
  { id: "nic", name: "Nice", short: "NIC", primary: "#000000", secondary: "#e30613", rating: 80, league: "Ligue 1", players: ["Bułka", "Laborde", "Dante", "Boudaoui", "Guessand"] },

  // ===== International =====
  { id: "arg", name: "Argentina", short: "ARG", primary: "#75aadb", secondary: "#ffffff", rating: 91, league: "International", players: ["E. Martínez", "Julián Álvarez", "Messi", "Mac Allister", "Enzo Fernández"] },
  { id: "por", name: "Portugal", short: "POR", primary: "#046a38", secondary: "#da291c", rating: 89, league: "International", players: ["Diogo Costa", "Ronaldo", "Bruno Fernandes", "Bernardo Silva", "Rúben Dias"] },
  { id: "bra", name: "Brazil", short: "BRA", primary: "#ffdf00", secondary: "#009c3b", rating: 89, league: "International", players: ["Alisson", "Neymar", "Vinícius Jr", "Rodrygo", "Casemiro"] },
  { id: "fra", name: "France", short: "FRA", primary: "#0055a4", secondary: "#ffffff", rating: 90, league: "International", players: ["Maignan", "Mbappé", "Griezmann", "Saliba", "Tchouaméni"] },
  { id: "eng", name: "England", short: "ENG", primary: "#ffffff", secondary: "#cf081f", rating: 89, league: "International", players: ["Pickford", "Kane", "Bellingham", "Saka", "Rice"] },
  { id: "esp", name: "Spain", short: "ESP", primary: "#aa151b", secondary: "#f1bf00", rating: 90, league: "International", players: ["Unai Simón", "Yamal", "Pedri", "Rodri", "Olmo"] },
  { id: "ger", name: "Germany", short: "GER", primary: "#ffffff", secondary: "#000000", rating: 87, league: "International", players: ["Ter Stegen", "Musiala", "Wirtz", "Kimmich", "Havertz"] },
  { id: "ned", name: "Netherlands", short: "NED", primary: "#ff6600", secondary: "#ffffff", rating: 86, league: "International", players: ["Verbruggen", "Van Dijk", "Simons", "De Jong", "Gakpo"] },
];

export const LEAGUES = [...new Set(TEAMS.map((t) => t.league))];

// Real benches: 4 subs, then 3 defenders + 3 midfielders who complete the starting XI.
const BENCHES: Record<string, string[]> = {
  liv: ["Barcola", "Salah", "Mac Allister", "Gakpo", "Konaté", "Robertson", "Frimpong", "Gravenberch", "Jones", "Endo"],
  mci: ["Ortega", "Marmoush", "Bernardo Silva", "Doku", "Dias", "Gvardiol", "Akanji", "Kovačić", "Gündoğan", "Reijnders"],
  ars: ["Kepa", "Martinelli", "Trossard", "Havertz", "Gabriel", "White", "Timber", "Partey", "Merino", "Zubimendi"],
  che: ["Jörgensen", "Neto", "Nkunku", "Pedro Neto", "Colwill", "James", "Fofana", "Enzo Fernández", "Lavia", "Dewsbury-Hall"],
  mun: ["Bayındır", "Højlund", "Mount", "Amad", "Maguire", "De Ligt", "Dalot", "Casemiro", "Ugarte", "Eriksen"],
  tot: ["Forster", "Richarlison", "Johnson", "Solanke", "Van de Ven", "Udogie", "Porro", "Bentancur", "Bissouma", "Sarr"],
  new: ["Dúbravka", "Wilson", "Barnes", "Murphy", "Botman", "Schär", "Trippier", "Joelinton", "Longstaff", "Willock"],
  rma: ["Lunin", "Rodrygo", "Güler", "Brahim", "Rüdiger", "Militão", "Carvajal", "Tchouaméni", "Camavinga", "Modrić"],
  bar: ["Szczęsny", "Ferran Torres", "Olmo", "Fermín", "Araújo", "Cubarsí", "Koundé", "De Jong", "Gavi", "Casadó"],
  atm: ["Musso", "Sørloth", "Correa", "Lino", "Giménez", "Le Normand", "Hancko", "De Paul", "Barrios", "Gallagher"],
  ath: ["Agirrezabala", "Iñaki Williams", "Guruzeta", "Muniain", "Yeray", "Laporte", "De Marcos", "Vesga", "Jauregizar", "Ruiz de Galarreta"],
  rso: ["Marrero", "Barrenetxea", "Sadiq", "Becker", "Le Normand", "Aramburu", "Muñoz", "Brais Méndez", "Turrientes", "Sucic"],
  sev: ["Dmitrović", "En-Nesyri", "Isaac Romero", "Ocampos", "Gudelj", "Navas", "Kike Salas", "Agoumé", "Saúl", "Juanlu"],
  bay: ["Ulreich", "Müller", "Olise", "Coman", "Upamecano", "Kim Min-jae", "Davies", "Goretzka", "Pavlović", "Laimer"],
  bvb: ["Meyer", "Beier", "Gittens", "Füllkrug", "Hummels", "Süle", "Ryerson", "Can", "Sabitzer", "Nmecha"],
  lev: ["Lomb", "Schick", "Boniface", "Adli", "Hincapié", "Kossounou", "Frimpong", "Andrich", "Palacios", "Terrier"],
  rbl: ["Vandevoordt", "Poulsen", "Baumgartner", "Nusa", "Lukeba", "Raum", "Henrichs", "Haidara", "Seiwald", "Kampl"],
  sge: ["Santos", "Knauff", "Götze", "Chaibi", "Tuta", "Theate", "Kristensen", "Skhiri", "Tuta", "Bahoya"],
  vfb: ["Bredlow", "Demirović", "Millot", "Woltemade", "Rouault", "Mittelstädt", "Vagnoman", "Karazor", "Leweling", "Chabot"],
  int: ["Martínez", "Thuram", "Frattesi", "Taremi", "Acerbi", "Pavard", "Dimarco", "Mkhitaryan", "Dumfries", "Zieliński"],
  mil: ["Sportiello", "Morata", "Abraham", "Chukwueze", "Tomori", "Gabbia", "Calabria", "Fofana", "Musah", "Loftus-Cheek"],
  juv: ["Perin", "Conceição", "Koopmeiners", "Weah", "Gatti", "Danilo", "Cambiaso", "Thuram", "McKennie", "Douglas Luiz"],
  nap: ["Caprile", "Politano", "Raspadori", "Neres", "Rrahmani", "Buongiorno", "Olivera", "Lobotka", "McTominay", "Gilmour"],
  rom: ["Ryan", "El Shaarawy", "Soulé", "Baldanzi", "Hummels", "N'Dicka", "Angeliño", "Cristante", "Koné", "Paredes"],
  ata: ["Rui Patrício", "De Ketelaere", "Zaniolo", "Samardžić", "Djimsiti", "Hien", "Bellanova", "Pašalić", "Zappacosta", "Kolašinac"],
  psg: ["Safonov", "Kvaratskhelia", "Doué", "Ramos", "Marquinhos", "Pacho", "Nuno Mendes", "João Neves", "Fabián Ruiz", "Zaïre-Emery"],
  om: ["De Lange", "Wahi", "Rongier", "Luis Henrique", "Cornelius", "Mbemba", "Merlin", "Højbjerg", "Kondogbia", "Koné"],
  mon: ["Majecki", "Embolo", "Akliouche", "Golovin", "Kehrer", "Mawissa", "Vanderson", "Camara", "Magassa", "Zakaria"],
  lil: ["Mannone", "Zhegrova", "Haraldsson", "Cabella", "Alexsandro", "Ismaily", "Meunier", "Bouaddi", "Mukau", "Bentaleb"],
  oly: ["Descamps", "Mikautadze", "Fofana", "Nuamah", "Niakhaté", "Mata", "Maitland-Niles", "Matić", "Veretout", "Tessmann"],
  nic: ["Dupé", "Moffi", "Boga", "Cho", "Bombito", "Bard", "Clauss", "Rosario", "Ndayishimiye", "Sanson"],
  arg: ["Rulli", "Lautaro", "Di María", "Garnacho", "Romero", "Otamendi", "Molina", "De Paul", "Paredes", "Lo Celso"],
  por: ["Rui Patrício", "Leão", "Félix", "Jota", "Pepe", "Nuno Mendes", "Cancelo", "Vitinha", "Palhinha", "João Neves"],
  bra: ["Ederson", "Raphinha", "Endrick", "Martinelli", "Marquinhos", "Militão", "Danilo", "Bruno Guimarães", "Paquetá", "Gerson"],
  fra: ["Areola", "Dembélé", "Thuram", "Kolo Muani", "Upamecano", "Koundé", "T. Hernández", "Kanté", "Rabiot", "Camavinga"],
  eng: ["Ramsdale", "Foden", "Palmer", "Watkins", "Stones", "Guéhi", "Walker", "Mainoo", "Alexander-Arnold", "Gallagher"],
  esp: ["Raya", "Nico Williams", "Morata", "Ferran Torres", "Laporte", "Le Normand", "Carvajal", "Fabián Ruiz", "Zubimendi", "Merino"],
  ger: ["Baumann", "Füllkrug", "Sané", "Gnabry", "Rüdiger", "Tah", "Raum", "Kroos", "Andrich", "Gündoğan"],
  ned: ["Flekken", "Depay", "Malen", "Weghorst", "De Vrij", "Aké", "Dumfries", "Reijnders", "Koopmeiners", "Schouten"],
};
TEAMS.forEach((t) => { if (BENCHES[t.id]) t.bench = BENCHES[t.id]; });
