// Mischmasch: Farben mischen wie im Tuschkasten.
// Gerechnet wird im Rot-Gelb-Blau-Modell (Farbkreis nach Itten), damit
// Gelb + Blau Grün ergibt und nicht Grau wie beim Mischen von Bildschirmlicht.

/** Näpfchen im Tuschkasten. Reihenfolge = Reihenfolge im Kasten. */
export const NAEPFE = [
  { id: 'r', name: 'Rot', farbe: '#d8352b' },
  { id: 'y', name: 'Gelb', farbe: '#f6cf1d' },
  { id: 'b', name: 'Blau', farbe: '#2a63b0' },
  { id: 'w', name: 'Weiß', farbe: '#fdfbf6' },
  { id: 's', name: 'Schwarz', farbe: '#2b2522' },
];
export const NAPF_IDS = NAEPFE.map((n) => n.id);
export const napf = (id) => NAEPFE.find((n) => n.id === id);

// Ecken des RYB-Würfels (Rot, Gelb, Blau jeweils 0 oder 1) als RGB 0–1
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const ECKEN = {
  '000': hex('#fdfbf6'), // nichts
  '100': hex('#d8352b'), // Rot
  '010': hex('#f6cf1d'), // Gelb
  '001': hex('#2a63b0'), // Blau
  '110': hex('#ee8420'), // Orange
  '101': hex('#7a3b8f'), // Lila
  '011': hex('#3f9a3c'), // Grün
  '111': hex('#5a3a24'), // Braun (alle drei)
};

const lerp = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);

/** RYB-Anteile (0–1) → RGB (0–1), trilineare Interpolation im Würfel. */
function rybZuRgb(r, y, b) {
  const e = (k) => ECKEN[k];
  const x00 = lerp(e('000'), e('100'), r);
  const x10 = lerp(e('010'), e('110'), r);
  const x01 = lerp(e('001'), e('101'), r);
  const x11 = lerp(e('011'), e('111'), r);
  return lerp(lerp(x00, x10, y), lerp(x01, x11, y), b);
}

const GEWICHT_SCHWARZ = 1.5; // ein Tupfer Schwarz dunkelt kräftig ab

/**
 * Mischfarbe aus Tupfern, z. B. { r: 0, y: 2, b: 1, w: 0, s: 0 }.
 * @returns {string|null} Farbe als #rrggbb, null bei leerer Schale
 */
export function mische(tupfer) {
  const t = Object.fromEntries(NAPF_IDS.map((id) => [id, Math.max(0, tupfer[id] ?? 0)]));
  const bunt = t.r + t.y + t.b;
  const gesamt = bunt + t.w + t.s * GEWICHT_SCHWARZ;
  if (gesamt === 0) return null;

  const hoechst = Math.max(t.r, t.y, t.b);
  const buntRgb = hoechst ? rybZuRgb(t.r / hoechst, t.y / hoechst, t.b / hoechst) : [0, 0, 0];
  const weiss = hex(napf('w').farbe);
  const schwarz = hex(napf('s').farbe);

  // Weiß und Schwarz direkt im sRGB-Raum einmischen: so bleibt Rosa noch rosa
  const rgb = [0, 1, 2].map((i) => (buntRgb[i] * bunt + weiss[i] * t.w + schwarz[i] * t.s * GEWICHT_SCHWARZ) / gesamt);
  return `#${rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** Größter gemeinsamer Teiler – um Rezepte zu vergleichen (2:1 = 4:2). */
const ggt = (a, b) => (b ? ggt(b, a % b) : a);

/** Tupfer auf das kleinste Verhältnis kürzen. */
export function kuerze(tupfer) {
  const werte = NAPF_IDS.map((id) => tupfer[id] ?? 0);
  const teiler = werte.reduce((a, b) => ggt(a, b), 0) || 1;
  return Object.fromEntries(NAPF_IDS.map((id, i) => [id, werte[i] / teiler]));
}

export function gleichesVerhaeltnis(a, b) {
  const ka = kuerze(a);
  const kb = kuerze(b);
  return NAPF_IDS.every((id) => ka[id] === kb[id]);
}

/** Zielfarben, nach Stufen. Rezept = Tupfer im kleinsten Verhältnis. */
export const STUFEN = [
  {
    id: 'grund',
    titel: 'Grundmischungen',
    hilfe: 'zwei Grundfarben zu gleichen Teilen',
    ziele: [
      { id: 'orange', name: 'Orange', rezept: { r: 1, y: 1 } },
      { id: 'gruen', name: 'Grün', rezept: { y: 1, b: 1 } },
      { id: 'lila', name: 'Lila', rezept: { r: 1, b: 1 } },
    ],
  },
  {
    id: 'mengen',
    titel: 'Mengen',
    hilfe: 'von einer Farbe doppelt so viel',
    ziele: [
      { id: 'gelborange', name: 'Gelborange', rezept: { r: 1, y: 2 } },
      { id: 'rotorange', name: 'Rotorange', rezept: { r: 2, y: 1 } },
      { id: 'gelbgruen', name: 'Gelbgrün', rezept: { y: 2, b: 1 } },
      { id: 'blaugruen', name: 'Blaugrün', rezept: { y: 1, b: 2 } },
      { id: 'rotlila', name: 'Rotlila', rezept: { r: 2, b: 1 } },
      { id: 'blaulila', name: 'Blaulila', rezept: { r: 1, b: 2 } },
    ],
  },
  {
    id: 'hell',
    titel: 'Hell und dunkel',
    hilfe: 'mit Weiß, Schwarz und allen drei Grundfarben',
    ziele: [
      { id: 'rosa', name: 'Rosa', rezept: { r: 1, w: 2 } },
      { id: 'hellblau', name: 'Hellblau', rezept: { b: 1, w: 2 } },
      { id: 'hellgruen', name: 'Hellgrün', rezept: { y: 1, b: 1, w: 1 } },
      { id: 'flieder', name: 'Flieder', rezept: { r: 1, b: 1, w: 2 } },
      { id: 'grau', name: 'Grau', rezept: { w: 2, s: 1 } },
      { id: 'dunkelgruen', name: 'Dunkelgrün', rezept: { y: 1, b: 1, s: 1 } },
      { id: 'dunkelblau', name: 'Dunkelblau', rezept: { b: 2, s: 1 } },
      { id: 'braun', name: 'Braun', rezept: { r: 1, y: 1, b: 1 } },
    ],
  },
];
