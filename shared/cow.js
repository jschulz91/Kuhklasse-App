// Kühe aus SVG-Teilen: Fell, Flecken, Hörner, Glocke, Hut, Augen.
// Flecken werden jedes Mal neu „gemalt“, darum sieht jede Kuh anders aus.
// Alle Farben kommen aus der Palette (Klassen .f-* in base.css).

let zaehler = 0;

const FELLE = [
  { fell: 'f-creme', flecken: 'f-fleck', huf: 'f-fleck', auge: 'f-fleck', quaste: 'f-fleck' },
  { fell: 'f-creme', flecken: 'f-fleck-hell', huf: 'f-fleck', auge: 'f-fleck', quaste: 'f-fleck' },
  { fell: 'f-fleck', flecken: 'f-creme', huf: 'f-fleck-hell', auge: 'f-creme', quaste: 'f-fleck-hell' },
  { fell: 'f-fleck-hell', flecken: 'f-creme', huf: 'f-fleck', auge: 'f-fleck', quaste: 'f-fleck' },
];

const HALSBAND = ['f-wiese', 'f-himmel', 'f-creme'];

const r = (zahl) => Math.round(zahl * 10) / 10;

function waehle(zufall, liste) {
  return liste[Math.floor(zufall() * liste.length)];
}

/** Geschlossene, weiche Kurve durch die Punkte (Catmull-Rom → Bézier). */
function weich(punkte) {
  const n = punkte.length;
  let d = `M${r(punkte[0][0])},${r(punkte[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = punkte[(i - 1 + n) % n];
    const p1 = punkte[i];
    const p2 = punkte[(i + 1) % n];
    const p3 = punkte[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${r(c1[0])},${r(c1[1])} ${r(c2[0])},${r(c2[1])} ${r(p2[0])},${r(p2[1])}`;
  }
  return `${d}Z`;
}

/** Unregelmäßiger Klecks – nie ein perfekter Kreis. */
export function klecks(zufall, cx, cy, rx, ry, unruhe = 0.25, anzahl = 7) {
  const start = zufall() * Math.PI * 2;
  const punkte = [];
  for (let i = 0; i < anzahl; i++) {
    const winkel = start + (i / anzahl) * Math.PI * 2;
    const faktor = 1 - unruhe + zufall() * unruhe * 2;
    punkte.push([cx + Math.cos(winkel) * rx * faktor, cy + Math.sin(winkel) * ry * faktor]);
  }
  return weich(punkte);
}

// ---------- feste Teile (Blick nach rechts, Kopf von vorn) ----------

const KOERPER = 'M50,80 C66,66 124,70 152,70 C176,70 198,80 197,104 C198,128 190,150 166,152 C128,156 82,153 60,151 C40,149 34,130 36,110 C37,96 40,88 50,80 Z';
const KOPF = 'M190,64 C188,46 236,44 236,64 C238,78 236,90 234,100 L190,100 C188,90 188,78 190,64 Z';
const SCHNAUZE = 'M186,98 C183,115 194,128 212,128 C230,128 241,115 238,98 C228,89 196,89 186,98 Z';
const OHR_L = 'M192,68 C180,58 166,60 160,68 C166,78 182,80 194,78 Z';
const OHR_R = 'M232,68 C244,58 258,60 264,68 C258,78 242,80 230,78 Z';
const EUTER = 'M110,148 C108,164 138,165 136,148 Z';

function bein(x, unten, breite = 16) {
  const rechts = x + breite;
  return {
    bein: `M${x + 1},138 L${x},${unten - 6} Q${x},${unten} ${x + 6},${unten} L${rechts - 5},${unten} Q${rechts},${unten} ${rechts},${unten - 6} L${rechts - 1},138 Z`,
    huf: `M${x},${unten - 9} L${rechts},${unten - 9} L${rechts},${unten - 6} Q${rechts},${unten} ${rechts - 5},${unten} L${x + 6},${unten} Q${x},${unten} ${x},${unten - 6} Z`,
  };
}

const HOERNER = {
  keine: '',
  kurz: '<path class="f-creme" d="M197,58 C192,50 192,43 196,38 C201,42 204,49 205,55 Z"/><path class="f-creme" d="M227,58 C232,50 232,43 228,38 C223,42 220,49 219,55 Z"/>',
  lang: '<path class="f-creme" d="M199,56 C188,52 179,44 178,31 C187,37 197,43 207,49 Z"/><path class="f-creme" d="M225,56 C236,52 245,44 246,31 C237,37 227,43 217,49 Z"/>',
};

function hut(art, zufall) {
  switch (art) {
    case 'stroh':
      return `<path class="f-creme" d="M195,58 C192,40 233,39 230,58 Z"/>
        <path class="f-wiese" d="M194,51 C206,54 220,54 231,51 L231,57 C220,60 206,60 194,57 Z"/>
        <path class="f-creme" d="M176,60 C190,51 236,51 250,59 C238,67 190,68 176,60 Z"/>`;
    case 'muetze':
      return `<path class="f-himmel" d="M192,62 C188,37 236,35 233,62 Z"/>
        <path class="f-creme" d="M189,58 C204,64 221,64 236,57 L236,66 C221,72 204,72 189,66 Z"/>
        <path class="f-creme" d="${klecks(zufall, 213, 36, 8, 7.5, 0.18)}"/>`;
    case 'blume': {
      let blaetter = '';
      for (let i = 0; i < 5; i++) {
        const w = (i / 5) * Math.PI * 2 - Math.PI / 2;
        blaetter += `<path class="f-himmel" d="${klecks(zufall, 176 + Math.cos(w) * 7, 56 + Math.sin(w) * 7, 5.5, 5, 0.2, 6)}"/>`;
      }
      return `${blaetter}<path class="f-creme" d="${klecks(zufall, 176, 56, 4.5, 4.5, 0.15, 6)}"/>`;
    }
    default:
      return '';
  }
}

function augen(offen, farbe) {
  if (offen) {
    return `<path class="${farbe} ohne-strich" d="M196,74 C196,70 204,70 204,74 C204,79 196,79 196,74 Z"/>
      <path class="${farbe} ohne-strich" d="M220,74 C220,70 228,70 228,74 C228,79 220,79 220,74 Z"/>`;
  }
  const strich = farbe === 'f-creme' ? 'style="stroke:var(--creme)"' : '';
  return `<path class="f-keine" ${strich} d="M195,76 Q200,70 205,76"/><path class="f-keine" ${strich} d="M219,76 Q224,70 229,76"/>`;
}

function schuetze(text) {
  return String(text).replace(/[&<>"]/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[z]);
}

/**
 * Namensschild auf einem Pfosten, steht hinter der Kuh auf der Wiese.
 * Gleiches Koordinatensystem wie die Kuh (270 × 220), damit es genau darüber passt.
 */
export function erzeugeNamensschild(name, zufall = Math.random) {
  // Platz auf dem Brett: etwa 124 Einheiten. Lange Namen bekommen kleinere Schrift.
  const groesse = Math.min(28, 124 / (name.length * 0.62)).toFixed(1);
  const neigung = ((zufall() - 0.5) * 4).toFixed(1);
  return `<svg class="namensschild strich" viewBox="0 0 270 220" aria-hidden="true" focusable="false">
  <path class="f-creme" d="M93,50 L92,205 L103,205 L102,50 Z"/>
  <g transform="rotate(${neigung} 97 28)">
    <path class="f-creme" d="M28,8 C70,3 124,4 166,8 C168,22 168,36 166,50 C124,53 70,52 28,50 C26,36 26,22 28,8 Z"/>
    <path class="f-fleck ohne-strich" d="M45,15 C45,12 49,12 49,15 C49,18 45,18 45,15 Z"/>
    <path class="f-fleck ohne-strich" d="M145,15 C145,12 149,12 149,15 C149,18 145,18 145,15 Z"/>
    <text x="97" y="31" font-size="${groesse}" text-anchor="middle" dominant-baseline="middle">${schuetze(name)}</text>
  </g>
</svg>`;
}

/**
 * Erzeugt eine zufällige Kuh als SVG-Text.
 * @param {string} name – für Vorleseprogramme (das Wort steht auf dem Namensschild)
 * @param {() => number} zufall – Zufallsquelle (Standard: Math.random)
 */
export function erzeugeKuh(name = '', zufall = Math.random) {
  const id = `kuh-${++zaehler}`;
  const farbe = waehle(zufall, FELLE);
  const hoerner = waehle(zufall, ['keine', 'kurz', 'kurz', 'lang']);
  const hutArt = waehle(zufall, ['', '', 'stroh', 'muetze', 'blume']);
  const glocke = zufall() < 0.6;
  const halsband = waehle(zufall, HALSBAND);
  const offen = zufall() < 0.7;

  let flecken = '';
  const anzahl = 2 + Math.floor(zufall() * 4);
  for (let i = 0; i < anzahl; i++) {
    const cx = 45 + zufall() * 145;
    const cy = 72 + zufall() * 76;
    flecken += `<path class="${farbe.flecken} ohne-strich" d="${klecks(zufall, cx, cy, 14 + zufall() * 18, 10 + zufall() * 13)}"/>`;
  }

  let kopfFleck = '';
  if (zufall() < 0.5) {
    const links = zufall() < 0.5;
    kopfFleck = `<path class="${farbe.flecken} ohne-strich" clip-path="url(#${id}-kopf)" d="${klecks(zufall, links ? 198 : 226, 70, 15, 13)}"/>`;
  }

  const beineHinten = [bein(76, 203), bein(172, 203)];
  const beineVorn = [bein(54, 207), bein(150, 207)];
  const zeichneBeine = (liste) =>
    liste.map((b) => `<path class="${farbe.fell}" d="${b.bein}"/><path class="${farbe.huf}" d="${b.huf}"/>`).join('');

  const glockeSvg = glocke
    ? `<path class="${halsband}" d="M191,121 Q212,134 233,121 L233,128 Q212,141 191,128 Z"/>
       <path class="f-creme" d="M204,132 C204,141 201,147 197,151 L227,151 C223,147 220,141 220,132 C216,128 208,128 204,132 Z"/>
       <path class="f-fleck ohne-strich" d="${klecks(zufall, 212, 154, 3.5, 3, 0.1, 6)}"/>`
    : '';

  return `<svg class="kuh strich" viewBox="0 0 270 220" role="img" aria-label="${schuetze(name ? `Kuh ${name}` : 'Kuh')}" focusable="false">
  <defs>
    <clipPath id="${id}-koerper"><path d="${KOERPER}"/></clipPath>
    <clipPath id="${id}-kopf"><path d="${KOPF}"/></clipPath>
  </defs>
  <g class="kuh__schwanz">
    <path class="f-keine" d="M40,96 C27,104 23,122 27,140"/>
    <path class="${farbe.quaste}" d="${klecks(zufall, 27, 146, 6, 8, 0.2, 6)}"/>
  </g>
  ${zeichneBeine(beineHinten)}
  <path class="${farbe.fell}" d="${KOERPER}"/>
  <g clip-path="url(#${id}-koerper)">${flecken}</g>
  <path class="f-keine" d="${KOERPER}"/>
  <path class="f-schnauze" d="${EUTER}"/>
  ${zeichneBeine(beineVorn)}
  <g class="kuh__kopf">
  ${HOERNER[hoerner]}
  <path class="${farbe.fell}" d="${OHR_L}"/>
  <path class="${farbe.fell}" d="${OHR_R}"/>
  <path class="${farbe.fell}" d="${KOPF}"/>
  ${kopfFleck}
  <path class="f-keine" d="${KOPF}"/>
  ${augen(offen, farbe.auge)}
  <path class="f-schnauze" d="${SCHNAUZE}"/>
  <path class="f-fleck ohne-strich" d="M201,108 C201,104 206,104 206,108 C206,113 201,113 201,108 Z"/>
  <path class="f-fleck ohne-strich" d="M218,108 C218,104 223,104 223,108 C223,113 218,113 218,108 Z"/>
  <path class="f-keine" d="M205,119 Q212,123 219,119"/>
  ${glockeSvg}
  ${hut(hutArt, zufall)}
  </g>
</svg>`;
}
