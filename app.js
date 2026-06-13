/**
 * DotTech WC26 — app.js
 * World Cup 2026 Predictor
 * ES Module · Firebase v10 · Fetch API · Scoring Engine
 */

/* ═══════════════════════════════════════════════════════
   0. FIREBASE CONFIG  ← Replace with your Firebase project
═══════════════════════════════════════════════════════ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInAnonymously, signInWithPopup,
  GoogleAuthProvider, onAuthStateChanged, signOut
}
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, getDocs, onSnapshot,
  collection, query, orderBy, limit, increment,
  serverTimestamp, updateDoc
}
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDaxVb2cLluP_CcNZ7VAP9S1XMZ2psGf7M",
  authDomain: "wc26-6d5ed.firebaseapp.com",
  databaseURL: "https://wc26-6d5ed-default-rtdb.firebaseio.com",
  projectId: "wc26-6d5ed",
  storageBucket: "wc26-6d5ed.firebasestorage.app",
  messagingSenderId: "1053360010506",
  appId: "1:1053360010506:web:82723eb7fa0b9deddc76f3",
  measurementId: "G-QZQ53X7DSY"
};

let app, auth, db, currentUser = null;
let currentUserIsAdmin = false;
try {
  const cachedUser = localStorage.getItem("wc26-user");
  if (cachedUser) {
    const parsed = JSON.parse(cachedUser);
    currentUser = parsed;
    currentUserIsAdmin = parsed.isAdmin === true;
  }
} catch (e) {
  console.warn("[WC26] Failed to load cached user from localStorage:", e);
}
let firebaseReady = false;

function initFirebase() {
  try {
    app = initializeApp(FIREBASE_CONFIG);
    auth = getAuth(app);
    db = getFirestore(app);
    firebaseReady = true;

    onAuthStateChanged(auth, handleAuthChange);
    console.info("[WC26] Firebase initialised ✓");
  } catch (e) {
    console.warn("[WC26] Firebase init skipped (demo mode):", e.message);
  }
}

/* ═══════════════════════════════════════════════════════
   1. WORLD CUP 2026 FIXTURE DATA
   Fallback dataset — replace fetchMatches() endpoint with
   a live API (e.g. api-football.com, football-data.org)
═══════════════════════════════════════════════════════ */
const WC26_TEAMS = [
  { code: "USA", name: "USA", flag: "🇺🇸" },
  { code: "MEX", name: "Mexico", flag: "🇲🇽" },
  { code: "CAN", name: "Canada", flag: "🇨🇦" },
  { code: "ARG", name: "Argentina", flag: "🇦🇷" },
  { code: "BRA", name: "Brazil", flag: "🇧🇷" },
  { code: "COL", name: "Colombia", flag: "🇨🇴" },
  { code: "ECU", name: "Ecuador", flag: "🇪🇨" },
  { code: "PAR", name: "Paraguay", flag: "🇵🇾" },
  { code: "URU", name: "Uruguay", flag: "🇺🇾" },
  { code: "AUT", name: "Austria", flag: "🇦🇹" },
  { code: "BEL", name: "Belgium", flag: "🇧🇪" },
  { code: "BIH", name: "Bosnia & Herzegovina", flag: "🇧🇦" },
  { code: "CRO", name: "Croatia", flag: "🇭🇷" },
  { code: "CZE", name: "Czech Republic", flag: "🇨🇿" },
  { code: "ENG", name: "England", flag: "GB" },
  { code: "FRA", name: "France", flag: "🇫🇷" },
  { code: "GER", name: "Germany", flag: "🇩🇪" },
  { code: "NED", name: "Netherlands", flag: "🇳🇱" },
  { code: "NOR", name: "Norway", flag: "🇳🇴" },
  { code: "POR", name: "Portugal", flag: "🇵🇹" },
  { code: "SCO", name: "Scotland", flag: "SC" },
  { code: "ESP", name: "Spain", flag: "🇪🇸" },
  { code: "SWE", name: "Sweden", flag: "🇸🇪" },
  { code: "SUI", name: "Switzerland", flag: "🇨🇭" },
  { code: "TUR", name: "Turkey", flag: "🇹🇷" },
  { code: "AUS", name: "Australia", flag: "🇦🇺" },
  { code: "IRQ", name: "Iraq", flag: "🇮🇶" },
  { code: "IRN", name: "Iran", flag: "🇮🇷" },
  { code: "JPN", name: "Japan", flag: "🇯🇵" },
  { code: "JOR", name: "Jordan", flag: "🇯🇴" },
  { code: "KOR", name: "South Korea", flag: "🇰🇷" },
  { code: "QAT", name: "Qatar", flag: "🇶🇦" },
  { code: "KSA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "UZB", name: "Uzbekistan", flag: "🇺🇿" },
  { code: "ALG", name: "Algeria", flag: "🇩🇿" },
  { code: "CPV", name: "Cape Verde", flag: "🇨🇻" },
  { code: "COD", name: "DR Congo", flag: "🇨🇩" },
  { code: "CIV", name: "Ivory Coast", flag: "🇨🇮" },
  { code: "EGY", name: "Egypt", flag: "🇪🇬" },
  { code: "GHA", name: "Ghana", flag: "🇬🇭" },
  { code: "MAR", name: "Morocco", flag: "🇲🇦" },
  { code: "SEN", name: "Senegal", flag: "🇸🇳" },
  { code: "RSA", name: "South Africa", flag: "🇿🇦" },
  { code: "TUN", name: "Tunisia", flag: "🇹🇳" },
  { code: "CUW", name: "Curaçao", flag: "🇨🇼" },
  { code: "HTI", name: "Haiti", flag: "🇭🇹" },
  { code: "PAN", name: "Panama", flag: "🇵🇦" },
  { code: "NZL", name: "New Zealand", flag: "🇳🇿" }
];

// Name-based lookup (used for openfootball API which returns full names)
const teamByName = {};
for (const t of WC26_TEAMS) {
  teamByName[t.name.toLowerCase()] = t;
}
function teamFromName(raw) {
  if (!raw) return null;
  return teamByName[raw.trim().toLowerCase()] || null;
}

const FALLBACK_MATCHES = [
  { id: "m001", group: "A", home: "USA", away: "MEX", kickoff: "2026-06-11T20:00:00Z", venue: "SoFi Stadium, LA", status: "upcoming", homeScore: null, awayScore: null },
  { id: "m002", group: "A", home: "CAN", away: "URU", kickoff: "2026-06-11T23:00:00Z", venue: "Empower Field, Denver", status: "upcoming", homeScore: null, awayScore: null },
  { id: "m003", group: "B", home: "ARG", away: "BEL", kickoff: "2026-06-12T18:00:00Z", venue: "AT&T Stadium, Dallas", status: "upcoming", homeScore: null, awayScore: null },
  { id: "m004", group: "B", home: "NED", away: "IRN", kickoff: "2026-06-12T21:00:00Z", venue: "Lumen Field, Seattle", status: "upcoming", homeScore: null, awayScore: null },
  { id: "m005", group: "C", home: "FRA", away: "MAR", kickoff: "2026-06-13T18:00:00Z", venue: "MetLife Stadium, NY", status: "live", homeScore: 1, awayScore: 0 },
  { id: "m006", group: "C", home: "SEN", away: "ECU", kickoff: "2026-06-13T21:00:00Z", venue: "Gillette Stadium, Boston", status: "upcoming", homeScore: null, awayScore: null },
  { id: "m007", group: "D", home: "ENG", away: "JPN", kickoff: "2026-06-14T18:00:00Z", venue: "Rose Bowl, Pasadena", status: "upcoming", homeScore: null, awayScore: null },
  { id: "m008", group: "D", home: "AUS", away: "KOR", kickoff: "2026-06-14T21:00:00Z", venue: "NRG Stadium, Houston", status: "upcoming", homeScore: null, awayScore: null },
  { id: "m009", group: "E", home: "ESP", away: "SWE", kickoff: "2026-06-15T18:00:00Z", venue: "Hard Rock Stadium, Miami", status: "upcoming", homeScore: null, awayScore: null },
  { id: "m010", group: "E", home: "GER", away: "KSA", kickoff: "2026-06-15T21:00:00Z", venue: "Caesars SC, Las Vegas", status: "upcoming", homeScore: null, awayScore: null },
  { id: "m011", group: "F", home: "POR", away: "BRA", kickoff: "2026-06-16T20:00:00Z", venue: "Arrowhead, KC", status: "upcoming", homeScore: null, awayScore: null },
  { id: "m012", group: "F", home: "COL", away: "TUR", kickoff: "2026-06-16T23:00:00Z", venue: "Lincoln FS, San Jose", status: "upcoming", homeScore: null, awayScore: null },
  { id: "m013", group: "A", home: "MEX", away: "CAN", kickoff: "2026-06-17T18:00:00Z", venue: "BC Place, Vancouver", status: "finished", homeScore: 2, awayScore: 1 },
  { id: "m014", group: "A", home: "USA", away: "URU", kickoff: "2026-06-17T21:00:00Z", venue: "BMO Field, Toronto", status: "finished", homeScore: 1, awayScore: 1 },
  { id: "m015", group: "B", home: "ARG", away: "IRN", kickoff: "2026-06-18T18:00:00Z", venue: "SoFi Stadium, LA", status: "finished", homeScore: 3, awayScore: 0 },
  { id: "m016", group: "B", home: "BEL", away: "NED", kickoff: "2026-06-18T21:00:00Z", venue: "AT&T Stadium, Dallas", status: "finished", homeScore: 0, awayScore: 2 },
];

const teamMap = Object.fromEntries(WC26_TEAMS.map(t => [t.code, t]));

const FLAG_MAP = {
  USA: "us", MEX: "mx", CAN: "ca", BRA: "br", ARG: "ar", FRA: "fr",
  ENG: "gb-eng", ESP: "es", GER: "de", POR: "pt", NED: "nl", BEL: "be",
  URU: "uy", COL: "co", ECU: "ec", MAR: "ma", SEN: "sn",
  KSA: "sa", JPN: "jp", KOR: "kr", AUS: "au", IRN: "ir",
  QAT: "qa", SUI: "ch", PAR: "py", GHA: "gh", CRO: "hr", PAN: "pa",
  NOR: "no", AUT: "at", JOR: "jo", ALG: "dz", UZB: "uz", TUN: "tn",
  CIV: "ci", CPV: "cv", CUW: "cw", NZL: "nz", EGY: "eg", SCO: "gb-sct",
  HTI: "ht", RSA: "za", BIH: "ba", CZE: "cz", SWE: "se", TUR: "tr",
  IRQ: "iq", COD: "cd"
};

function getFlagHtml(code, size = "small") {
  const file = FLAG_MAP[code];
  if (file) {
    const w = size === "large" ? 44 : 26;
    const h = size === "large" ? 28 : 17;
    const r = size === "large" ? 4 : 2;
    return `<img src="https://flagcdn.com/w40/${file}.png" 
                 srcset="https://flagcdn.com/w80/${file}.png 2x" 
                 alt="${code}" 
                 class="flag-img flag-${size}" 
                 style="width: ${w}px; height: ${h}px; object-fit: cover; border-radius: ${r}px; border: 1px solid var(--md-outline-var); display: inline-block; vertical-align: middle; box-shadow: var(--shadow-1);" />`;
  }
  const team = teamMap[code];
  return team ? team.flag : "🏳️";
}

const initialRanks = {
  ARG: 1, FRA: 2, BEL: 3, BRA: 4, ENG: 5, POR: 6, NED: 7, ESP: 8, CRO: 9, GER: 16,
  USA: 11, MEX: 15, CAN: 40, URU: 14, COL: 12, ECU: 31, MAR: 13, SEN: 18, KSA: 56,
  JPN: 17, KOR: 22, AUS: 23, IRN: 20, QAT: 35, SUI: 19, PAR: 58, GHA: 64, PAN: 43,
  NOR: 47, AUT: 25, JOR: 71, ALG: 44, UZB: 62, TUN: 41, CIV: 38, CPV: 65, CUW: 88,
  NZL: 104, EGY: 36, SCO: 39, HTI: 90, RSA: 59, BIH: 74, CZE: 37, SWE: 28, TUR: 42,
  IRQ: 55, COD: 61
};

function initializeTeamStats() {
  for (const t of WC26_TEAMS) {
    t.rank = initialRanks[t.code] || 100;
    const forms = [
      ['W', 'W', 'D', 'W', 'W'],
      ['W', 'D', 'W', 'L', 'W'],
      ['D', 'L', 'W', 'D', 'W'],
      ['L', 'L', 'D', 'W', 'L']
    ];
    if (t.rank <= 15) t.form = forms[0];
    else if (t.rank <= 40) t.form = forms[1];
    else if (t.rank <= 70) t.form = forms[2];
    else t.form = forms[3];
  }
}

function getH2HStats(homeCode, awayCode) {
  const home = teamMap[homeCode] || { rank: 100 };
  const away = teamMap[awayCode] || { rank: 100 };
  const totalPower = (1 / home.rank) + (1 / away.rank);
  let homeProb = Math.round(((1 / home.rank) / totalPower) * 100);
  let awayProb = Math.round(((1 / away.rank) / totalPower) * 100);
  const diff = homeProb - awayProb;
  const drawProb = 26;
  const remain = 100 - drawProb;
  const homeWeight = 0.5 + (diff / 200);
  homeProb = Math.round(remain * homeWeight);
  awayProb = remain - homeProb;
  const played = 5 + Math.floor((1 / (home.rank + away.rank)) * 1000) % 15;
  const homeWins = Math.round(played * (homeProb / 100));
  const awayWins = Math.round(played * (awayProb / 100));
  const draws = played - homeWins - awayWins;
  return { played, homeWins, awayWins, draws, homeProb, awayProb, drawProb };
}

function renderStatsPanel(homeCode, awayCode) {
  const home = teamMap[homeCode] || { name: homeCode, rank: 100, form: ['D','D','D','D','D'] };
  const away = teamMap[awayCode] || { name: awayCode, rank: 100, form: ['D','D','D','D','D'] };
  const stats = getH2HStats(homeCode, awayCode);
  const statsPanel = $("modalStats");
  if (!statsPanel) return;
  statsPanel.innerHTML = `
    <div class="stats-panel">
      <div class="stats-header">
        <span>FIFA Rank: #${home.rank}</span>
        <span>FIFA Rank: #${away.rank}</span>
      </div>
      <div style="font-size: 0.72rem; font-weight: 800; text-align: center; color: var(--md-on-surface-var); text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.05em;">H2H Win Probability</div>
      <div class="h2h-chart">
        <div class="h2h-bar h2h-home" style="width: ${stats.homeProb}%;">${stats.homeProb}%</div>
        <div class="h2h-bar h2h-draw" style="width: ${stats.drawProb}%;">${stats.drawProb}%</div>
        <div class="h2h-bar h2h-away" style="width: ${stats.awayProb}%;">${stats.awayProb}%</div>
      </div>
      <div style="text-align: center; font-size: 0.72rem; color: var(--md-on-surface-var); font-weight: 600; margin-bottom: 10px;">
        H2H Record: ${stats.homeWins} Wins · ${stats.draws} Draws · ${stats.awayWins} Wins (out of ${stats.played} matches)
      </div>
      <div class="team-ranks-form">
        <div class="team-stat-box">
          <span class="team-stat-label">Form</span>
          <div class="team-form-dots">
            ${home.form.map(f => `<span class="form-dot dot-${f.toLowerCase()}">${f}</span>`).join("")}
          </div>
        </div>
        <div class="team-stat-box" style="align-items: flex-end;">
          <span class="team-stat-label">Form</span>
          <div class="team-form-dots">
            ${away.form.map(f => `<span class="form-dot dot-${f.toLowerCase()}">${f}</span>`).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

function calculateGroupStandings() {
  const standings = {};
  for (const t of WC26_TEAMS) {
    standings[t.code] = {
      code: t.code,
      name: t.name,
      flag: t.flag,
      group: null,
      gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0
    };
  }
  for (const m of matches) {
    if (standings[m.home]) standings[m.home].group = m.group;
    if (standings[m.away]) standings[m.away].group = m.group;
    const pred = predictions[m.id];
    let homeScore = m.homeScore;
    let awayScore = m.awayScore;
    if (homeScore === null && awayScore === null && pred) {
      homeScore = pred.homeScore;
      awayScore = pred.awayScore;
    }
    if (homeScore !== null && awayScore !== null && homeScore !== undefined && awayScore !== undefined) {
      const h = standings[m.home];
      const a = standings[m.away];
      if (h && a) {
        h.gp++; a.gp++;
        h.gf += homeScore; h.ga += awayScore;
        a.gf += awayScore; a.ga += homeScore;
        h.gd = h.gf - h.ga; a.gd = a.gf - a.ga;
        if (homeScore > awayScore) {
          h.w++; h.pts += 3; a.l++;
        } else if (awayScore > homeScore) {
          a.w++; a.pts += 3; h.l++;
        } else {
          h.d++; h.pts += 1; a.d++; a.pts += 1;
        }
      }
    }
  }
  const groups = {};
  for (const t of WC26_TEAMS) {
    const s = standings[t.code];
    if (!s.group || s.group === "—") continue;
    if (!groups[s.group]) groups[s.group] = [];
    groups[s.group].push(s);
  }
  for (const gCode in groups) {
    groups[gCode].sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.code.localeCompare(b.code);
    });
  }
  return groups;
}

function renderStandingsView() {
  const groups = calculateGroupStandings();
  const container = $("standingsGrid");
  if (!container) return;
  const sortedGroupCodes = Object.keys(groups).sort();
  container.innerHTML = sortedGroupCodes.map(gCode => {
    const teams = groups[gCode];
    return `
      <div class="group-card">
        <div class="group-card-title">Group ${gCode}</div>
        <table class="group-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th class="standing-num">P</th>
              <th class="standing-num">GD</th>
              <th class="standing-num">PTS</th>
            </tr>
          </thead>
          <tbody>
            ${teams.map((t, idx) => {
              const qualClass = idx < 2 ? "qualify-direct" : "";
              return `
                <tr class="${qualClass}">
                  <td class="standing-rank">${idx + 1}</td>
                  <td class="standing-team">${getFlagHtml(t.code)} <span>${t.name}</span></td>
                  <td class="standing-num">${t.gp}</td>
                  <td class="standing-num">${t.gd > 0 ? "+" + t.gd : t.gd}</td>
                  <td class="standing-num" style="font-weight:700;">${t.pts}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }).join("");
}

let bracketPicks = {};

function getBracketTeams() {
  const groups = calculateGroupStandings();
  const getWinner = (g) => groups[g]?.[0]?.code || `Winner ${g}`;
  const getRunner = (g) => groups[g]?.[1]?.code || `Runner ${g}`;
  const r32Teams = [
    [getWinner('A'), getRunner('B')],
    [getWinner('C'), getRunner('D')],
    [getWinner('E'), getRunner('F')],
    [getWinner('G'), getRunner('H')],
    [getWinner('I'), getRunner('J')],
    [getWinner('K'), getRunner('L')],
    [getWinner('B'), getRunner('A')],
    [getWinner('D'), getRunner('C')],
    [getWinner('F'), getRunner('E')],
    [getWinner('H'), getRunner('G')],
    [getWinner('J'), getRunner('I')],
    [getWinner('L'), getRunner('K')],
    [groups['A']?.[2]?.code || '3rd Group A', groups['B']?.[2]?.code || '3rd Group B'],
    [groups['C']?.[2]?.code || '3rd Group C', groups['D']?.[2]?.code || '3rd Group D'],
    [groups['E']?.[2]?.code || '3rd Group E', groups['F']?.[2]?.code || '3rd Group F'],
    [groups['G']?.[2]?.code || '3rd Group G', groups['H']?.[2]?.code || '3rd Group H']
  ];
  return r32Teams;
}

async function saveBracketToFirebase() {
  if (!firebaseReady || !currentUser) return;
  try {
    const ref = doc(db, "predictions", currentUser.uid);
    await setDoc(ref, { bracket: bracketPicks }, { merge: true });
  } catch (e) {
    console.error("Failed to save bracket to Firebase:", e);
  }
}

function renderBracketView() {
  const container = $("bracketContainer");
  if (!container) return;
  const r32Pairings = getBracketTeams();
  const r32Winners = [];
  for (let i = 0; i < 16; i++) {
    const matchId = `r32_${i}`;
    const teams = r32Pairings[i];
    const pick = bracketPicks[matchId];
    if (pick && !teams.includes(pick)) delete bracketPicks[matchId];
    r32Winners.push(bracketPicks[matchId] || null);
  }
  const r16Pairings = [];
  for (let i = 0; i < 8; i++) {
    r16Pairings.push([r32Winners[i*2] || "TBD", r32Winners[i*2 + 1] || "TBD"]);
  }
  const r16Winners = [];
  for (let i = 0; i < 8; i++) {
    const matchId = `r16_${i}`;
    const teams = r16Pairings[i];
    const pick = bracketPicks[matchId];
    if (pick && !teams.includes(pick)) delete bracketPicks[matchId];
    r16Winners.push(bracketPicks[matchId] || null);
  }
  const qfPairings = [];
  for (let i = 0; i < 4; i++) {
    qfPairings.push([r16Winners[i*2] || "TBD", r16Winners[i*2 + 1] || "TBD"]);
  }
  const qfWinners = [];
  for (let i = 0; i < 4; i++) {
    const matchId = `qf_${i}`;
    const teams = qfPairings[i];
    const pick = bracketPicks[matchId];
    if (pick && !teams.includes(pick)) delete bracketPicks[matchId];
    qfWinners.push(bracketPicks[matchId] || null);
  }
  const sfPairings = [];
  for (let i = 0; i < 2; i++) {
    sfPairings.push([qfWinners[i*2] || "TBD", qfWinners[i*2 + 1] || "TBD"]);
  }
  const sfWinners = [];
  for (let i = 0; i < 2; i++) {
    const matchId = `sf_${i}`;
    const teams = sfPairings[i];
    const pick = bracketPicks[matchId];
    if (pick && !teams.includes(pick)) delete bracketPicks[matchId];
    sfWinners.push(bracketPicks[matchId] || null);
  }
  const finalPairing = [sfWinners[0] || "TBD", sfWinners[1] || "TBD"];
  const finalWinner = bracketPicks["final"] && finalPairing.includes(bracketPicks["final"]) ? bracketPicks["final"] : null;
  const rounds = [
    { title: "Round of 32", matches: r32Pairings, key: "r32" },
    { title: "Round of 16", matches: r16Pairings, key: "r16" },
    { title: "Quarterfinals", matches: qfPairings, key: "qf" },
    { title: "Semifinals", matches: sfPairings, key: "sf" },
    { title: "Final", matches: [finalPairing], key: "final" }
  ];
  container.innerHTML = rounds.map(r => {
    return `
      <div class="bracket-round">
        <div class="round-title">${r.title}</div>
        ${r.matches.map((teams, idx) => {
          const matchId = `${r.key}_${idx}`;
          const pick = bracketPicks[matchId] || (r.key === "final" ? bracketPicks["final"] : null);
          const homeCode = teams[0];
          const awayCode = teams[1];
          const homeName = teamMap[homeCode]?.name || homeCode;
          const awayName = teamMap[awayCode]?.name || awayCode;
          return `
            <div class="bracket-match">
              <div class="bracket-team ${pick === homeCode ? "winner" : ""}" data-match="${r.key === "final" ? "final" : matchId}" data-team="${homeCode}">
                <div class="bracket-team-info">
                  ${teamMap[homeCode] ? getFlagHtml(homeCode, "small") : "🏳️"}
                  <span>${homeName}</span>
                </div>
              </div>
              <div class="bracket-team ${pick === awayCode ? "winner" : ""}" data-match="${r.key === "final" ? "final" : matchId}" data-team="${awayCode}">
                <div class="bracket-team-info">
                  ${teamMap[awayCode] ? getFlagHtml(awayCode, "small") : "🏳️"}
                  <span>${awayName}</span>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }).join("") + `
    <div class="bracket-round" style="justify-content: center; align-items: center;">
      <div class="round-title">Champion</div>
      <div class="bracket-match" style="border: 2.5px dashed var(--md-secondary); padding: 18px; text-align: center; border-radius: var(--r-md); background: rgba(255,229,102,0.04);">
        <div style="font-size: 2.25rem; margin-bottom: 6px;">🏆</div>
        <div id="bracketChampion" style="font-family:'Outfit',sans-serif; font-weight: 800; color: var(--md-primary);">
          ${finalWinner ? `${getFlagHtml(finalWinner, "large")}<div style="margin-top:8px; font-size:0.9rem;">${teamMap[finalWinner]?.name}</div>` : "TBD"}
        </div>
      </div>
    </div>
  `;
  container.querySelectorAll(".bracket-team").forEach(el => {
    el.addEventListener("click", () => {
      const matchId = el.dataset.match;
      const teamCode = el.dataset.team;
      if (teamCode === "TBD" || teamCode.startsWith("Winner") || teamCode.startsWith("Runner") || teamCode.startsWith("3rd")) return;
      bracketPicks[matchId] = teamCode;
      localStorage.setItem("wc26-bracket", JSON.stringify(bracketPicks));
      saveBracketToFirebase();
      renderBracketView();
    });
  });
}

let adminAllUsersData = {};

function checkAdminStatus() {
  const navAdminBtn = $("navAdminBtn");
  if (!navAdminBtn) return;
  const isAdmin = currentUser && (currentUserIsAdmin || currentUser.email === "admin@wc26.com" || currentUser.email?.startsWith("admin") || localStorage.getItem("wc26-admin-mode") === "true");
  if (isAdmin) {
    navAdminBtn.classList.remove("hidden");
  } else {
    navAdminBtn.classList.add("hidden");
    const viewAdmin = $("view-admin");
    if (viewAdmin && viewAdmin.classList.contains("active")) {
      switchView("predictions");
    }
  }
}

async function loadAdminUsers() {
  if (!firebaseReady) return;
  try {
    const snap = await getDocs(collection(db, "predictions"));
    const select = $("adminUserSelect");
    select.innerHTML = '<option value="">— Select a Player —</option>';
    adminAllUsersData = {};
    
    snap.forEach(doc => {
      const data = doc.data();
      const uid = doc.id;
      adminAllUsersData[uid] = data;
      const name = data.displayName || `Anonymous (${uid.slice(0, 6)})`;
      select.insertAdjacentHTML("beforeend", `<option value="${uid}">${name} (${data.totalPoints || 0} pts)</option>`);
    });
  } catch (e) {
    console.error("Failed to load admin users:", e);
    showToast("Failed to load players list", "error");
  }
}

function loadAdminUserPredictions(uid) {
  const container = $("adminPredictionsContainer");
  if (!uid || !adminAllUsersData[uid]) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round">people</span>
        <p>Select a player above to load and edit their predictions.</p>
      </div>`;
    return;
  }
  
  const userData = adminAllUsersData[uid];
  const userPreds = userData.matches || {};
  const isTargetAdmin = userData.isAdmin === true;
  
  container.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 16px; flex-wrap:wrap; gap:12px;">
      <h3 style="font-family:'Outfit'; color:var(--md-primary); font-size:1.1rem; margin:0;">Editing: ${userData.displayName || "Anonymous User"}</h3>
      <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; font-weight:600; cursor:pointer; background:var(--md-surface-variant); padding:6px 12px; border-radius:16px;">
        <input type="checkbox" id="adminUserIsAdminCheck" ${isTargetAdmin ? "checked" : ""} style="width:14px; height:14px; margin:0;" />
        <span>Is Admin</span>
      </label>
    </div>
    <div style="display:flex; flex-direction:column; gap:12px; max-height: 400px; overflow-y: auto; padding-right: 4px; margin-bottom: 16px;">
      ${matches.map(m => {
        const home = teamMap[m.home] || { name: m.home, flag: "🏳️" };
        const away = teamMap[m.away] || { name: m.away, flag: "🏳️" };
        const pred = userPreds[m.id] || {};
        return `
          <div class="pred-card" style="border: 1px dashed var(--md-outline); padding:12px;">
            <div style="font-weight:700; font-size:0.85rem; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
              <span>Group ${m.group} · Match ${m.id}</span>
              <span class="status-badge status-${m.status}" style="font-size:0.6rem;">${m.status.toUpperCase()}</span>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
              <div style="flex:1; display:flex; align-items:center; gap:8px;">
                ${getFlagHtml(m.home, "small")}
                <span style="font-size:0.8rem; font-weight:600;">${home.name}</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <input class="pred-score-input admin-score-input" type="number" min="0" max="20"
                  value="${pred.homeScore ?? ""}" placeholder="-" style="width:50px; padding:4px;"
                  data-match="${m.id}" data-side="home" />
                <span style="font-weight:800;">:</span>
                <input class="pred-score-input admin-score-input" type="number" min="0" max="20"
                  value="${pred.awayScore ?? ""}" placeholder="-" style="width:50px; padding:4px;"
                  data-match="${m.id}" data-side="away" />
              </div>
              <div style="flex:1; display:flex; align-items:center; justify-content:flex-end; gap:8px;">
                <span style="font-size:0.8rem; font-weight:600;">${away.name}</span>
                ${getFlagHtml(m.away, "small")}
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
    <button class="btn-primary" id="adminSaveBtn" style="width:100%; justify-content:center;">
      <span class="material-icons-round">save</span> Save Predictions for ${userData.displayName || "User"}
    </button>
  `;

  $("adminSaveBtn").addEventListener("click", async () => {
    const updatedPreds = { ...userPreds };
    
    // 1. Gather all inputs into updatedPreds
    container.querySelectorAll(".admin-score-input").forEach(inp => {
      const matchId = inp.dataset.match;
      const side = inp.dataset.side;
      const val = inp.value.trim();
      
      if (val === "") {
        if (updatedPreds[matchId]) {
          delete updatedPreds[matchId][side === "home" ? "homeScore" : "awayScore"];
        }
      } else {
        if (!updatedPreds[matchId]) updatedPreds[matchId] = {};
        updatedPreds[matchId][side === "home" ? "homeScore" : "awayScore"] = parseInt(val);
      }
    });

    // 2. Clean up incomplete predictions and derive winners
    for (const matchId of Object.keys(updatedPreds)) {
      const p = updatedPreds[matchId];
      if (p && p.homeScore !== undefined && p.homeScore !== null && p.awayScore !== undefined && p.awayScore !== null) {
        p.winner = deriveWinner(p.homeScore, p.awayScore);
      } else {
        delete updatedPreds[matchId];
      }
    }

    try {
      const ref = doc(db, "predictions", uid);
      let total = 0;
      for (const [id, pred] of Object.entries(updatedPreds)) {
        const match = matches.find(m => m.id === id);
        if (!match || match.status !== "finished") continue;
        const actual = { homeScore: match.homeScore, awayScore: match.awayScore };
        total += calculatePoints(pred, actual);
      }

      const targetIsAdmin = $("adminUserIsAdminCheck") ? $("adminUserIsAdminCheck").checked : false;

      await setDoc(ref, {
        matches: updatedPreds,
        totalPoints: total,
        predCount: Object.keys(updatedPreds).length,
        isAdmin: targetIsAdmin,
      }, { merge: true });

      showToast("Player predictions updated successfully!", "success");
      await loadAdminUsers();
      $("adminUserSelect").value = uid;
      loadAdminUserPredictions(uid);
    } catch (e) {
      console.error(e);
      showToast("Failed to save changes", "error");
    }
  });
}

/* ═══════════════════════════════════════════════════════
   2. DATA FETCHING
═══════════════════════════════════════════════════════ */
/**
 * fetchMatches()
 * Tries a live API endpoint first; falls back to FALLBACK_MATCHES.
 * Replace LIVE_API_URL with your actual endpoint.
 * Expected response shape: { matches: [...] } | Array
 */
async function fetchMatches() {
  const LIVE_API_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
  // ↑ Replace or extend this URL with a real WC2026 live feed

  try {
    const res = await fetch(LIVE_API_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // Normalise to our schema
    const raw = Array.isArray(data) ? data : (data.matches || data.rounds || []);
    if (!raw.length) throw new Error("Empty response");
    const parsed = normaliseFetched(raw);
    return parsed.sort((a, b) => new Date(a.kickoff || 0) - new Date(b.kickoff || 0));
  } catch (err) {
    console.warn("[WC26] Live fetch failed, using fallback:", err.message);
    return FALLBACK_MATCHES.slice().sort((a, b) => new Date(a.kickoff || 0) - new Date(b.kickoff || 0));
  }
}

function normaliseFetched(raw) {
  return raw.map((m, i) => {
    // openfootball uses full names in team1/team2 and "Group A" in group field
    const homeTeam = teamFromName(m.team1) || teamFromName(m.homeTeam?.name);
    const awayTeam = teamFromName(m.team2) || teamFromName(m.awayTeam?.name);
    const homeName = homeTeam?.name || m.team1 || m.home || "TBD";
    const awayName = awayTeam?.name || m.team2 || m.away || "TBD";
    const homeCode = homeTeam?.code || homeName.slice(0, 3).toUpperCase();
    const awayCode = awayTeam?.code || awayName.slice(0, 3).toUpperCase();

    // openfootball uses "2026-06-11" + "13:00 UTC-6" separately
    const kickoff = parseKickoff(m.date, m.time) || m.utcDate || m.kickoff;

    // group: strip "Group " prefix → "A"
    const group = (m.group || m.stage || "—").replace(/^Group\s*/i, "");

    return {
      id: m.id || m.matchId || m.num || `m${String(i + 1).padStart(3, "0")}`,
      group,
      home: homeCode,
      away: awayCode,
      homeName,
      awayName,
      homeFlag: homeTeam?.flag || "🏳️",
      awayFlag: awayTeam?.flag || "🏳️",
      kickoff,
      venue: m.ground || m.venue?.name || m.stadium || "TBD",
      status: deriveStatus({ ...m, kickoff }),
      homeScore: m.score?.ft?.[0] ?? m.score?.fullTime?.home ?? m.homeScore ?? null,
      awayScore: m.score?.ft?.[1] ?? m.score?.fullTime?.away ?? m.awayScore ?? null,
    };
  });
}

/**
 * Parse openfootball's date + time format into an ISO string.
 * e.g. date="2026-06-11", time="13:00 UTC-6"  →  "2026-06-11T19:00:00Z"
 */
function parseKickoff(date, time) {
  if (!date) return null;
  if (!time) return `${date}T00:00:00Z`;
  // Extract HH:MM and UTC offset, e.g. "13:00 UTC-6"
  const m = time.match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d+)/);
  if (!m) return `${date}T00:00:00Z`;
  const [, hh, mm, offset] = m;
  const offsetNum = parseInt(offset);
  const sign = offsetNum >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetNum);
  const formattedOffset = `${sign}${String(absOffset).padStart(2, "0")}:00`;
  const isoStr = `${date}T${hh.padStart(2, "0")}:${mm}:00${formattedOffset}`;
  try {
    const d = new Date(isoStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch (e) {
    console.error(e);
  }
  return `${date}T00:00:00Z`;
}

function deriveStatus(m) {
  if (m.status === "FINISHED" || m.status === "finished") return "finished";
  if (m.status === "IN_PLAY" || m.status === "live") return "live";
  const ko = new Date(m.utcDate || m.kickoff || m.date);
  if (!isNaN(ko)) {
    if (Date.now() > ko.getTime() + 2 * 60 * 60 * 1000) return "finished";
    if (Date.now() > ko.getTime()) return "live";
  }
  return "upcoming";
}

/* ═══════════════════════════════════════════════════════
   3. SCORING ENGINE
═══════════════════════════════════════════════════════ */
/**
 * calculatePoints(prediction, actualResult)
 * @param {object} prediction  - { homeScore, awayScore, winner, champion, runnerUp, topScorer, groupBest }
 * @param {object} actualResult - { homeScore, awayScore, champion, runnerUp, topScorer, groupBest:{A:'BRA',...} }
 * @returns {number} points earned
 */
function calculatePoints(prediction, actualResult) {
  let pts = 0;

  /* ── Match prediction ─────────────────────────────── */
  if (actualResult.homeScore !== null && actualResult.awayScore !== null) {
    const exactScore = prediction.homeScore === actualResult.homeScore &&
      prediction.awayScore === actualResult.awayScore;
    const predWinner = deriveWinner(prediction.homeScore, prediction.awayScore);
    const realWinner = deriveWinner(actualResult.homeScore, actualResult.awayScore);
    const correctWinner = predWinner === realWinner;

    if (exactScore && correctWinner) pts += 4;  // exact score + correct winner
    else if (correctWinner) pts += 2;  // correct winner only
  }

  /* ── Tournament specials ──────────────────────────── */
  if (actualResult.champion && prediction.champion === actualResult.champion) pts += 10;
  if (actualResult.runnerUp && prediction.runnerUp === actualResult.runnerUp) pts += 7;
  if (actualResult.topScorer && prediction.topScorer &&
    prediction.topScorer.trim().toLowerCase() === actualResult.topScorer.trim().toLowerCase()) pts += 10;

  /* ── Group best team ──────────────────────────────── */
  if (actualResult.groupBest && prediction.groupBest) {
    for (const [group, team] of Object.entries(actualResult.groupBest)) {
      if (prediction.groupBest[group] === team) pts += 3;
    }
  }

  return pts;
}

function deriveWinner(home, away) {
  if (home === null || away === null) return null;
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

/* ═══════════════════════════════════════════════════════
   4. APPLICATION STATE
═══════════════════════════════════════════════════════ */
let matches = [];
let predictions = {};   // { matchId: { homeScore, awayScore, winner } }
let specials = { champion: "", runnerUp: "", topScorer: "" };
let currentFilter = "all";
let modalMatchId = null;
let scoreHome = 0;
let scoreAway = 0;
let pickedWinner = null;
let leaderboardUnsub = null;

/* ═══════════════════════════════════════════════════════
   5. AUTH
═══════════════════════════════════════════════════════ */
async function handleAuthChange(user) {
  currentUser = user;
  if (user) {
    try {
      const cached = localStorage.getItem("wc26-user");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.uid === user.uid) {
          currentUserIsAdmin = parsed.isAdmin === true;
        }
      }
    } catch (e) {}

    try {
      localStorage.setItem("wc26-user", JSON.stringify({
        displayName: user.displayName,
        email: user.email,
        uid: user.uid,
        photoURL: user.photoURL,
        isAdmin: currentUserIsAdmin
      }));
    } catch (e) {
      console.warn("[WC26] Failed to cache user info:", e);
    }
    updateAuthUI();
    checkAdminStatus();
    await loadUserPredictions();
    subscribeLeaderboard();
    updateHeroUsers();
  } else {
    localStorage.removeItem("wc26-user");
    currentUserIsAdmin = false;
    updateAuthUI();
    checkAdminStatus();
  }
}

function updateAuthUI() {
  const u = currentUser;
  const authBtn = $("authBtn");
  const authLabel = $("authLabel");
  const authIcon = authBtn.querySelector(".material-icons-round");
  let existingImg = authBtn.querySelector(".user-avatar-tiny");

  if (u) {
    authLabel.textContent = u.displayName ? u.displayName.split(" ")[0] : "Signed In";
    authBtn.title = "Sign Out";
    $("profileName").textContent = u.displayName || "Anonymous User";
    $("profileUid").textContent = u.email || u.uid?.slice(0, 16) + "...";

    // User profile avatar image
    if (u.photoURL) {
      $("profileAvatar").innerHTML = `<img src="${u.photoURL}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%; display:block;" referrerPolicy="no-referrer" />`;

      // Top bar avatar image
      if (authIcon) authIcon.classList.add("hidden");
      if (existingImg) {
        existingImg.src = u.photoURL;
        existingImg.classList.remove("hidden");
      } else {
        authBtn.insertAdjacentHTML("afterbegin", `<img src="${u.photoURL}" alt="Avatar" class="user-avatar-tiny" style="width:20px; height:20px; object-fit:cover; border-radius:50%; margin-right:6px; display:inline-block; vertical-align:middle;" referrerPolicy="no-referrer" />`);
      }
    } else {
      $("profileAvatar").textContent = (u.displayName || "A")[0].toUpperCase();
      if (authIcon) authIcon.classList.remove("hidden");
      if (existingImg) existingImg.classList.add("hidden");
    }

    $("profileSignInBtn").classList.add("hidden");
    $("profileSignOutBtn").classList.remove("hidden");
    $("predAuthPrompt").classList.add("hidden");
  } else {
    authLabel.textContent = "Sign In";
    $("profileName").textContent = "Guest User";
    $("profileUid").textContent = "Not signed in";
    $("profileAvatar").textContent = "?";

    if (authIcon) authIcon.classList.remove("hidden");
    if (existingImg) existingImg.classList.add("hidden");

    $("profileSignInBtn").classList.remove("hidden");
    $("profileSignOutBtn").classList.add("hidden");
    $("predAuthPrompt").classList.remove("hidden");
  }
  checkAdminStatus();
}

async function signInGoogle() {
  if (!firebaseReady) return showToast("Firebase not configured", "error");
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    showToast("Signed in successfully!", "success");
  } catch (e) {
    console.error(e);
    showToast("Sign-in failed: " + e.message, "error");
  }
}

async function signInAnon() {
  if (!firebaseReady) return;
  try { await signInAnonymously(auth); } catch (e) { /* silent */ }
}

async function handleSignOut() {
  if (!firebaseReady) return;
  await signOut(auth);
  predictions = {}; specials = { champion: "", runnerUp: "", topScorer: "" };
  renderPredictions(); updatePointsBadge();
  showToast("Signed out", "info");
}

/* ═══════════════════════════════════════════════════════
   6. FIRESTORE — PREDICTIONS
═══════════════════════════════════════════════════════ */
async function loadUserPredictions() {
  if (!firebaseReady || !currentUser) return;
  try {
    const ref = doc(db, "predictions", currentUser.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      predictions = data.matches || {};
      specials = data.specials || { champion: "", runnerUp: "", topScorer: "" };
      bracketPicks = data.bracket || JSON.parse(localStorage.getItem("wc26-bracket")) || {};
      
      currentUserIsAdmin = data.isAdmin === true;
      try {
        const cached = localStorage.getItem("wc26-user");
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.isAdmin = currentUserIsAdmin;
          localStorage.setItem("wc26-user", JSON.stringify(parsed));
        }
      } catch (err) {}
      checkAdminStatus();

      applySpecialsToUI();
      renderPredictions();
      updatePointsBadge();
      renderStandingsView();
      renderBracketView();
    } else {
      currentUserIsAdmin = false;
      try {
        const cached = localStorage.getItem("wc26-user");
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.isAdmin = false;
          localStorage.setItem("wc26-user", JSON.stringify(parsed));
        }
      } catch (err) {}
      checkAdminStatus();
    }
  } catch (e) { 
    console.error("[WC26] Load predictions:", e); 
  }
}

async function savePrediction(matchId, data) {
  if (!firebaseReady || !currentUser) { showToast("Please sign in first", "warn"); return; }
  try {
    predictions[matchId] = data;
    const ref = doc(db, "predictions", currentUser.uid);
    await setDoc(ref, {
      matches: predictions,
      specials,
      totalPoints: computeTotalPoints(),
      predCount: Object.keys(predictions).length,
      updatedAt: serverTimestamp(),
      displayName: currentUser.displayName || "Anonymous",
      uid: currentUser.uid,
    }, { merge: true });
    showToast("Prediction saved! ⚽", "success");
    renderPredictions();
    updatePointsBadge();
    renderStandingsView();
    renderBracketView();
  } catch (e) { console.error(e); showToast("Save failed", "error"); }
}

async function saveSpecials() {
  if (!firebaseReady || !currentUser) { showToast("Please sign in first", "warn"); return; }
  specials.champion = $("pickChampion").value;
  specials.runnerUp = $("pickRunnerUp").value;
  specials.topScorer = $("pickTopScorer").value.trim();
  try {
    const ref = doc(db, "predictions", currentUser.uid);
    await setDoc(ref, {
      specials,
      totalPoints: computeTotalPoints(),
      updatedAt: serverTimestamp(),
      displayName: currentUser.displayName || "Anonymous",
      uid: currentUser.uid,
    }, { merge: true });
    showToast("Tournament picks saved! 🏆", "success");
    updatePointsBadge();
  } catch (e) { showToast("Save failed", "error"); }
}

function computeTotalPoints() {
  // Points from match predictions vs known results
  let total = 0;
  for (const [id, pred] of Object.entries(predictions)) {
    const match = matches.find(m => m.id === id);
    if (!match || match.status !== "finished") continue;
    const actual = { homeScore: match.homeScore, awayScore: match.awayScore };
    total += calculatePoints(pred, actual);
  }
  // Points from specials (no official result yet in fallback — extend when live)
  return total;
}

/* ═══════════════════════════════════════════════════════
   7. FIRESTORE — LEADERBOARD
═══════════════════════════════════════════════════════ */
function subscribeLeaderboard() {
  if (!firebaseReady) { renderDemoLeaderboard(); return; }
  if (leaderboardUnsub) leaderboardUnsub();
  const q = query(collection(db, "predictions"), orderBy("totalPoints", "desc"), limit(50));
  leaderboardUnsub = onSnapshot(q, snap => {
    const rows = snap.docs.map((d, i) => ({ rank: i + 1, ...d.data() }));
    renderLeaderboard(rows);
    updateHeroUsers(snap.size);
  }, err => {
    console.error(err);
    renderDemoLeaderboard();
  });
}

function renderDemoLeaderboard() {
  const demo = [
    { rank: 1, displayName: "Ronaldo7", totalPoints: 48, predCount: 16 },
    { rank: 2, displayName: "Messi10", totalPoints: 44, predCount: 16 },
    { rank: 3, displayName: "KanteFan", totalPoints: 38, predCount: 14 },
    { rank: 4, displayName: "WC26Fan", totalPoints: 31, predCount: 12 },
    { rank: 5, displayName: "GoalKing", totalPoints: 27, predCount: 10 },
  ];
  renderLeaderboard(demo);
}

function renderLeaderboard(rows) {
  // Podium top 3
  const slots = [rows[0], rows[1], rows[2]];
  [1, 2, 3].forEach(n => {
    const s = rows[n - 1];
    const el = $(`podium${n}`);
    el.querySelector(".podium-name").textContent = s?.displayName?.slice(0, 10) || "—";
    el.querySelector(".podium-pts").textContent = s ? `${s.totalPoints} pts` : "—";
  });

  // Full table
  const list = $("leaderboardList");
  if (!rows.length) { list.innerHTML = `<div class="lb-loading">No entries yet</div>`; return; }

  list.innerHTML = rows.map((r, i) => {
    const isMe = currentUser && r.uid === currentUser.uid;
    const initial = (r.displayName || "?")[0].toUpperCase();
    return `
    <div class="lb-row ${isMe ? "highlight" : ""}">
      <span class="lb-rank ${i < 3 ? "top" : ""}">${medal(i)}</span>
      <div class="lb-player">
        <div class="lb-player-icon">${initial}</div>
        <span class="lb-player-name">${esc(r.displayName || "Anonymous")}${isMe ? " (you)" : ""}</span>
      </div>
      <span class="lb-preds">${r.predCount || 0}</span>
      <span class="lb-pts">${r.totalPoints || 0}</span>
    </div>`;
  }).join("");

  // Update my rank in profile
  const myRank = rows.findIndex(r => currentUser && r.uid === currentUser.uid);
  $("statRank").textContent = myRank >= 0 ? `#${myRank + 1}` : "#—";
}

function medal(i) { return ["🥇", "🥈", "🥉"][i] || i + 1; }

/* ═══════════════════════════════════════════════════════
   8. UI RENDERING
═══════════════════════════════════════════════════════ */
function renderMatches(filter = "all") {
  currentFilter = filter;
  const grid = $("matchesGrid");
  const empty = $("matchEmpty");
  $("matchSkeleton").classList.add("hidden");

  const filtered = filter === "all" ? matches : matches.filter(m => m.status === filter);
  if (!filtered.length) { grid.innerHTML = ""; empty.classList.remove("hidden"); return; }
  empty.classList.add("hidden");

  grid.innerHTML = filtered.map(m => matchCard(m)).join("");

  // Attach predict button listeners
  grid.querySelectorAll(".predict-btn[data-id]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      openModal(btn.dataset.id);
    });
  });
  grid.querySelectorAll(".match-card").forEach(card => {
    card.addEventListener("click", () => openModal(card.dataset.id));
  });
}

function matchCard(m) {
  const home = teamMap[m.home] || { name: m.home, flag: "🏳️" };
  const away = teamMap[m.away] || { name: m.away, flag: "🏳️" };
  const dt = localTime(m.kickoff);
  const pred = predictions[m.id];
  const isLocked = m.status !== "upcoming";
  const hasPred = !!pred;
  const scoreDisplay = m.status === "upcoming"
    ? `<span class="score-sep-dot">vs</span>`
    : `<span>${m.homeScore ?? "?"}</span><span class="score-sep-dot">:</span><span>${m.awayScore ?? "?"}</span>`;

  return `
  <div class="match-card" data-id="${m.id}">
    <div class="match-card-header">
      <span class="match-group">Group ${m.group}</span>
      <span class="status-badge status-${m.status}">${m.status.toUpperCase()}</span>
    </div>
    <div class="match-card-body">
      <div class="match-teams">
        <div class="team-side">
          <div class="team-flag">${getFlagHtml(m.home)}</div>
          <div class="team-name">${home.name}</div>
        </div>
        <div class="match-score">${scoreDisplay}</div>
        <div class="team-side">
          <div class="team-flag">${getFlagHtml(m.away)}</div>
          <div class="team-name">${away.name}</div>
        </div>
      </div>
    </div>
    <div class="match-card-footer">
      <span class="match-datetime">
        <span class="material-icons-round">schedule</span>${dt}
      </span>
      <button class="predict-btn ${hasPred ? "predicted" : ""}"
              data-id="${m.id}"
              ${isLocked ? "disabled" : ""}>
        <span class="material-icons-round">${hasPred ? "check" : "add"}</span>
        ${hasPred ? "Predicted" : isLocked ? "Locked" : "Predict"}
      </button>
    </div>
  </div>`;
}

function renderPredictions() {
  if (!currentUser) return;
  const list = $("predictionsList");
  const upcomingMatches = matches.filter(m => m.status === "upcoming" || predictions[m.id]);

  if (!upcomingMatches.length) {
    list.innerHTML = `<div class="empty-state"><span class="material-icons-round">sports_soccer</span><p>No matches to predict yet.</p></div>`;
    return;
  }

  list.innerHTML = upcomingMatches.map(m => {
    const home = teamMap[m.home] || { name: m.home, flag: "🏳️" };
    const away = teamMap[m.away] || { name: m.away, flag: "🏳️" };
    const pred = predictions[m.id] || {};
    const locked = m.status !== "upcoming";
    const pts = pred.homeScore !== undefined && m.status === "finished"
      ? calculatePoints(pred, { homeScore: m.homeScore, awayScore: m.awayScore })
      : null;

    return `
    <div class="pred-card">
      <div class="pred-card-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <span class="pred-match-name" style="display: inline-flex; align-items: center; gap: 8px;">
          ${getFlagHtml(m.home)} ${home.name} vs ${getFlagHtml(m.away)} ${away.name}
        </span>
        ${pts !== null ? `<span class="pred-pts">+${pts} pts</span>` : ""}
      </div>
      <div class="pred-inputs">
        <div class="pred-input-field">
          <label class="pred-label">${home.name} Score</label>
          <input class="pred-score-input" type="number" min="0" max="20"
            value="${pred.homeScore ?? ""}" placeholder="0"
            data-match="${m.id}" data-side="home"
            ${locked ? "disabled" : ""} />
        </div>
        <div class="pred-input-field">
          <label class="pred-label">${away.name} Score</label>
          <input class="pred-score-input" type="number" min="0" max="20"
            value="${pred.awayScore ?? ""}" placeholder="0"
            data-match="${m.id}" data-side="away"
            ${locked ? "disabled" : ""} />
        </div>
      </div>
    </div>`;
  }).join("");

  // Auto-save on blur
  list.querySelectorAll(".pred-score-input:not([disabled])").forEach(inp => {
    inp.addEventListener("change", handleScoreInputChange);
  });
}

function handleScoreInputChange(e) {
  const inp = e.target;
  const matchId = inp.dataset.match;
  const side = inp.dataset.side;
  if (!predictions[matchId]) predictions[matchId] = {};
  predictions[matchId][side === "home" ? "homeScore" : "awayScore"] = parseInt(inp.value) || 0;
  const p = predictions[matchId];
  if (p.homeScore !== undefined && p.awayScore !== undefined) {
    p.winner = deriveWinner(p.homeScore, p.awayScore);
    savePrediction(matchId, p);
  }
}

function updatePointsBadge() {
  const pts = computeTotalPoints();
  $("myPoints").textContent = `${pts} pts`;
  $("statTotal").textContent = pts;
  $("statPredictions").textContent = Object.keys(predictions).length;
  $("statCorrect").textContent = Object.entries(predictions).filter(([id, pred]) => {
    const m = matches.find(x => x.id === id);
    if (!m || m.status !== "finished") return false;
    return calculatePoints(pred, { homeScore: m.homeScore, awayScore: m.awayScore }) > 0;
  }).length;
}

function applySpecialsToUI() {
  $("pickChampion").value = specials.champion || "";
  $("pickRunnerUp").value = specials.runnerUp || "";
  $("pickTopScorer").value = specials.topScorer || "";
}

function populateTeamSelects() {
  const opts = WC26_TEAMS.map(t =>
    `<option value="${t.code}">${t.flag} ${t.name}</option>`).join("");
  $("pickChampion").innerHTML = `<option value="">— Select Team —</option>${opts}`;
  $("pickRunnerUp").innerHTML = `<option value="">— Select Team —</option>${opts}`;
}

function updateHeroUsers(n) {
  if (n !== undefined) $("heroUsers").textContent = n.toLocaleString();
}

/* ═══════════════════════════════════════════════════════
   9. MODAL
═══════════════════════════════════════════════════════ */
function openModal(matchId) {
  if (!currentUser) { showToast("Sign in to make predictions", "warn"); return; }
  const m = matches.find(x => x.id === matchId);
  if (!m) return;

  modalMatchId = matchId;
  const home = teamMap[m.home] || { name: m.home, flag: "🏳️" };
  const away = teamMap[m.away] || { name: m.away, flag: "🏳️" };
  const pred = predictions[matchId] || {};
  const locked = m.status !== "upcoming";

  $("modalTitle").textContent = `Group ${m.group} · ${localTime(m.kickoff)}`;
  $("modalTeams").innerHTML = `
    <div class="modal-team"><div class="modal-team-flag">${getFlagHtml(m.home, "large")}</div><div class="modal-team-name">${home.name}</div></div>
    <div class="modal-vs">VS</div>
    <div class="modal-team"><div class="modal-team-flag">${getFlagHtml(m.away, "large")}</div><div class="modal-team-name">${away.name}</div></div>`;

  scoreHome = pred.homeScore ?? 0;
  scoreAway = pred.awayScore ?? 0;
  pickedWinner = pred.winner || null;
  renderStatsPanel(m.home, m.away);
  updateScoreDisplay();

  $("scoreLabel1").textContent = home.name;
  $("scoreLabel2").textContent = away.name;

  $("winnerOptions").innerHTML = [
    { val: "home", label: `${getFlagHtml(m.home, "small")} <span style="margin-left:4px; vertical-align:middle;">${home.name}</span>` },
    { val: "draw", label: `<span style="font-size:1.1rem; vertical-align:middle;">🤝</span> <span style="margin-left:4px; vertical-align:middle;">Draw</span>` },
    { val: "away", label: `${getFlagHtml(m.away, "small")} <span style="margin-left:4px; vertical-align:middle;">${away.name}</span>` },
  ].map(o => `
    <button class="winner-opt ${pickedWinner === o.val ? "active" : ""}" data-val="${o.val}"
      ${locked ? "disabled" : ""} style="display:inline-flex; align-items:center; justify-content:center;">
      ${o.label}
    </button>`).join("");

  $("winnerOptions").querySelectorAll(".winner-opt").forEach(btn => {
    btn.addEventListener("click", () => {
      pickedWinner = btn.dataset.val;
      $("winnerOptions").querySelectorAll(".winner-opt").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  $("modalSave").disabled = locked;
  document.querySelectorAll(".stepper-btn").forEach(btn => { btn.disabled = locked; });
  $("modalBackdrop").classList.remove("hidden");
}

function closeModal() { $("modalBackdrop").classList.add("hidden"); modalMatchId = null; }

function updateScoreDisplay() {
  $("scoreHome").textContent = scoreHome;
  $("scoreAway").textContent = scoreAway;
}

/* ═══════════════════════════════════════════════════════
   10. TOAST
═══════════════════════════════════════════════════════ */
let toastTimer;
function showToast(msg, type = "success") {
  const icons = { success: "check_circle", error: "error", warn: "warning", info: "info" };
  $("toastMsg").textContent = msg;
  $("toastIcon").textContent = icons[type] || "info";
  const t = $("toast");
  t.style.background = { success: "var(--md-primary)", error: "var(--md-accent)", warn: "#c8a800", info: "#333" }[type];
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}

/* ═══════════════════════════════════════════════════════
   11. NAVIGATION
═══════════════════════════════════════════════════════ */
function switchView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  $(`view-${name}`).classList.add("active");
  document.querySelector(`[data-view="${name}"]`).classList.add("active");

  if (name === "leaderboard" && !firebaseReady) renderDemoLeaderboard();
  if (name === "predictions") renderPredictions();
  if (name === "standings") renderStandingsView();
  if (name === "bracket") renderBracketView();
  if (name === "admin") loadAdminUsers();
}

/* ═══════════════════════════════════════════════════════
   12. UTILITIES
═══════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const esc = s => s.replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

function localTime(iso) {
  if (!iso) return "TBD";
  try {
    return new Intl.DateTimeFormat(navigator.language, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short",
    }).format(new Date(iso));
  } catch { return iso; }
}

function toggleTheme() {
  const html = document.documentElement;
  const next = html.dataset.theme === "dark" ? "light" : "dark";
  html.dataset.theme = next;
  $("themeToggle").querySelector(".material-icons-round").textContent =
    next === "dark" ? "dark_mode" : "light_mode";
  localStorage.setItem("wc26-theme", next);
}

function applySavedTheme() {
  const saved = localStorage.getItem("wc26-theme");
  if (saved) {
    document.documentElement.dataset.theme = saved;
    $("themeToggle").querySelector(".material-icons-round").textContent =
      saved === "dark" ? "dark_mode" : "light_mode";
  }
}

/* ═══════════════════════════════════════════════════════
   13. EVENT LISTENERS
═══════════════════════════════════════════════════════ */
function bindEvents() {
  // Navigation
  document.querySelectorAll(".nav-item").forEach(btn =>
    btn.addEventListener("click", () => switchView(btn.dataset.view)));

  // Hero CTA
  $("heroCta").addEventListener("click", () => {
    switchView("predictions");
    window.scrollTo({ top: $("mainContent").offsetTop - 80, behavior: "smooth" });
  });

  // Auth
  $("authBtn").addEventListener("click", () => currentUser ? handleSignOut() : signInGoogle());
  $("profileSignInBtn").addEventListener("click", signInGoogle);
  $("profileSignOutBtn").addEventListener("click", handleSignOut);
  $("predSignInBtn").addEventListener("click", signInGoogle);

  // Theme
  $("themeToggle").addEventListener("click", toggleTheme);

  // Refresh
  $("refreshBtn").addEventListener("click", async () => {
    $("matchSkeleton").classList.remove("hidden");
    $("matchesGrid").innerHTML = "";
    matches = await fetchMatches();
    renderMatches(currentFilter);
    showToast("Matches refreshed ✓", "success");
  });

  // Filter chips
  $("filterChips").addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    renderMatches(chip.dataset.filter);
  });

  // Modal steppers
  document.querySelectorAll(".stepper-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const side = btn.dataset.side;
      const action = btn.dataset.action;
      if (side === "home") scoreHome = Math.max(0, scoreHome + (action === "inc" ? 1 : -1));
      if (side === "away") scoreAway = Math.max(0, scoreAway + (action === "inc" ? 1 : -1));
      updateScoreDisplay();
    });
  });

  // Modal save
  $("modalSave").addEventListener("click", () => {
    if (!modalMatchId) return;
    savePrediction(modalMatchId, {
      homeScore: scoreHome,
      awayScore: scoreAway,
      winner: pickedWinner || deriveWinner(scoreHome, scoreAway),
    });
    closeModal();
  });
  $("modalClose").addEventListener("click", closeModal);
  $("modalCancel").addEventListener("click", closeModal);
  $("modalBackdrop").addEventListener("click", e => { if (e.target === $("modalBackdrop")) closeModal(); });

  // Specials
  $("saveSpecialsBtn").addEventListener("click", saveSpecials);

  // Admin User Select
  $("adminUserSelect").addEventListener("change", e => {
    loadAdminUserPredictions(e.target.value);
  });
}

/* ═══════════════════════════════════════════════════════
   14. BOOT
═══════════════════════════════════════════════════════ */
async function boot() {
  applySavedTheme();
  initializeTeamStats();
  bracketPicks = JSON.parse(localStorage.getItem("wc26-bracket")) || {};
  bindEvents();
  updateAuthUI();
  initFirebase();
  populateTeamSelects();

  // Load matches
  matches = await fetchMatches();
  renderMatches("all");
  renderStandingsView();
  renderBracketView();

  // Anonymous sign-in as fallback so predictions still work
  if (firebaseReady) await signInAnon();

  console.info(`[WC26] App ready · ${matches.length} matches loaded`);
}

document.addEventListener("DOMContentLoaded", boot);