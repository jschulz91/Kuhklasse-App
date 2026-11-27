// Hochzeitstorte: gemeinsam starten, abwechselnd Etagen stapeln, am Ende ein Gruß.

// ---------- Anpassen ----------

const NAMEN = { h: 'Hendrik', j: 'Julia' };
// Jeder Gruß kommt von einem der Paare – ab und zu von allen zusammen.
const PAARE = ['Andre & Neele', 'Stefan & Sandra', 'Joshua & Antje'];
function absender() {
  if (Math.random() < 0.25) return `Von ${PAARE[0]}, ${PAARE[1]} und ${PAARE[2]}`;
  return `Von ${PAARE[Math.floor(Math.random() * PAARE.length)]}`;
}

// Jede Runde eine andere Torte – ab der Schokotorte mit Taube, die goldene Torte ist schmaler.
const TORTEN = [
  { id: 'klassisch', name: 'Klassische Torte' },
  { id: 'erdbeer', name: 'Erdbeertorte' },
  { id: 'bluete', name: 'Blütentorte' },
  { id: 'schoko', name: 'Schokotorte', taube: true },
  { id: 'gold', name: 'Goldene Torte', taube: true, schmal: true },
];
// Schwierigkeit: Jede geschaffte Torte bekommt in der nächsten Runde mehr Etagen
// und die Etagen werden schneller.
const START_ETAGEN = 8;
const PLUS_ETAGEN = 2;
const MAX_ETAGEN = 16;
const TEMPO_START = 0.48; // Breiten der Spielfläche pro Sekunde
const TEMPO_PRO_ETAGE = 0.06;
const TEMPO_PRO_RUNDE = 0.1; // +10 % je Runde
const TOLERANZ = 0.02; // so knapp neben der Mitte wird noch verziehen (Anteil der Breite)

// Grüße nach jedem Spiel – je besser die Torte, desto freundlicher.
const GRUESSE = {
  frech: {
    titel: 'HOPPLA',
    texte: [
      'Gut, dass ihr euch heiratet und keine Konditorei eröffnet.',
      'Die Torte liegt am Boden – eure Liebe zum Glück nicht.',
      'Backen üben wir noch. Das mit der Liebe könnt ihr schon.',
      'Keine Sorge: Ihr müsst ja nur zusammenhalten, nicht die Torte.',
    ],
  },
  zwinkernd: {
    titel: 'FAST GESCHAFFT',
    texte: [
      'Fast! Wie bei jeder guten Ehe gilt: Dranbleiben lohnt sich.',
      'Ein bisschen schief, aber mit Liebe gebacken – genau wie das echte Leben.',
      'Nicht perfekt, aber gemeinsam. Und darum geht es ja.',
      'Noch eine Runde Teamwork, dann steht die Torte – und ihr sowieso.',
    ],
  },
  freundlich: {
    titel: 'EURE TORTE STEHT',
    texte: [
      'Ein bisschen wacklig, aber mit ganz viel Liebe gebaut. Auf viele gemeinsame Jahre!',
      'Ihr seid ein tolles Team: Zusammen bringt ihr sogar schiefe Torten zum Stehen.',
      'Geschafft! Möge euer gemeinsames Leben genauso süß werden wie diese Torte.',
    ],
  },
  herzlich: {
    titel: 'PERFEKT',
    texte: [
      'Wenn ihr alles so gemeinsam meistert wie diese Torte, kann nichts schiefgehen. Wir freuen uns so für euch!',
      'Was für eine Torte – und was für ein Paar! Von Herzen alles Liebe für euren gemeinsamen Weg.',
      'Makellos gestapelt, perfekt zusammen. Wir wünschen euch ein Leben voller solcher Momente.',
    ],
  },
};

// ---------- Spielfläche ----------

const $ = (id) => document.getElementById(id);
const buehne = $('buehne');
const teller = $('teller');
const statusZeile = $('status');
const bewegungAus = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const zustand = {
  laeuft: false,
  stapel: [], // { x, w, el, wer }
  aktuell: null, // { x, w, el, wer, richtung }
  tempo: 0,
  zuletzt: 0,
  frame: 0,
  wer: 'h',
  runde: 1,
  behalten: 0, // Summe der Anteile, die beim Stapeln stehen geblieben sind (für die Bewertung)
};

let masse = {};

const etagen = () => Math.min(START_ETAGEN + (zustand.runde - 1) * PLUS_ETAGEN, MAX_ETAGEN);
const torte = () => TORTEN[Math.min(zustand.runde - 1, TORTEN.length - 1)];

function messe() {
  const breite = buehne.clientWidth;
  const hoehe = buehne.clientHeight;
  const tellerOben = hoehe - teller.offsetTop;
  const platz = hoehe - tellerOben - 100; // oben Platz für das Brautpaar
  masse = {
    breite,
    etagenHoehe: Math.floor(Math.min(platz / etagen(), 48)),
    boden: tellerOben, // Abstand der untersten Etage vom unteren Rand
    // Goldene Torte: schmaler und spitzer zulaufend
    startBreite: breite * (torte().schmal ? 0.6 : 0.74),
    // so schrumpft jede Etage, damit die oberste etwa 40 % (bzw. 30 %) der untersten breit ist
    schrumpf: Math.pow(torte().schmal ? 0.3 : 0.4, 1 / (etagen() - 1)),
  };
}

function setzeEtage(el, x, w, ebene) {
  el.style.left = `${x}px`;
  el.style.width = `${w}px`;
  el.style.height = `${masse.etagenHoehe}px`;
  el.style.bottom = `${masse.boden + ebene * masse.etagenHoehe}px`;
}

function neueEtage(wer, x, w, ebene) {
  const el = document.createElement('div');
  el.className = 'etage';
  el.dataset.wer = wer;
  setzeEtage(el, x, w, ebene);
  buehne.append(el);
  return el;
}

function zeigeStatus() {
  const name = NAMEN[zustand.wer];
  statusZeile.dataset.wer = zustand.wer;
  statusZeile.innerHTML = `<strong>${name}</strong> ist dran – Etage ${zustand.stapel.length + 1} von ${etagen()}.`;
}

// ---------- Ablauf ----------

function raeumeAuf() {
  cancelAnimationFrame(zustand.frame);
  clearTimeout(zustand.taubenZeit);
  buehne.querySelectorAll('.etage, .stueck, .brautpaar, .taube').forEach((el) => el.remove());
  zustand.stapel = [];
  zustand.aktuell = null;
  zustand.behalten = 0;
}

function starte() {
  raeumeAuf();
  messe();
  zustand.wer = 'h';
  zustand.laeuft = true;
  buehne.dataset.torte = torte().id;
  $('start').hidden = true;
  zustand.ersteTaube = false;
  if (torte().taube) planeTaube();
  naechsteEtage();
}

function naechsteEtage() {
  const ebene = zustand.stapel.length;
  const unten = zustand.stapel[ebene - 1];
  // Jede Etage ist etwas schmaler als die darunter – wie eine echte Hochzeitstorte.
  const w = unten ? Math.max(unten.w * masse.schrumpf, 18) : masse.startBreite;
  const vonLinks = ebene % 2 === 0;
  const x = vonLinks ? 0 : masse.breite - w;
  const el = neueEtage(zustand.wer, x, w, ebene);
  zustand.aktuell = { x, w, el, wer: zustand.wer, richtung: vonLinks ? 1 : -1, ebene };
  // mit jeder Etage und jeder Runde schneller
  zustand.tempo = masse.breite * (TEMPO_START + ebene * TEMPO_PRO_ETAGE) * (1 + (zustand.runde - 1) * TEMPO_PRO_RUNDE);
  buehne.dataset.tempo = zustand.tempo.toFixed(1);
  zustand.zuletzt = performance.now();
  zeigeStatus();
  zustand.frame = requestAnimationFrame(bewege);
}

function bewege(jetzt) {
  const a = zustand.aktuell;
  if (!a || !zustand.laeuft) return;
  const dt = Math.min((jetzt - zustand.zuletzt) / 1000, 0.05);
  zustand.zuletzt = jetzt;
  // gleichmäßiges Tempo innerhalb einer Etage
  a.x += a.richtung * zustand.tempo * dt;
  if (a.x <= 0) { a.x = 0; a.richtung = 1; }
  if (a.x + a.w >= masse.breite) { a.x = masse.breite - a.w; a.richtung = -1; }
  a.el.style.left = `${a.x}px`;
  zustand.frame = requestAnimationFrame(bewege);
}

function lasseFallen(x, w, ebene, wer) {
  if (bewegungAus() || w < 1) return;
  const el = document.createElement('div');
  el.className = 'stueck';
  el.dataset.wer = wer;
  setzeEtage(el, x, w, ebene);
  buehne.append(el);
  requestAnimationFrame(() => {
    const seite = x < masse.breite / 2 ? -1 : 1;
    el.style.transform = `translate(${seite * 30}px, ${buehne.clientHeight}px) rotate(${seite * 25}deg)`;
    el.style.opacity = '0';
  });
  setTimeout(() => el.remove(), 1000);
}

function setzeAb() {
  const a = zustand.aktuell;
  if (!zustand.laeuft || !a) return;
  cancelAnimationFrame(zustand.frame);
  const unten = zustand.stapel[a.ebene - 1];

  let x = a.x;
  let w = a.w;
  if (unten) {
    // Kleine Ungenauigkeiten verzeihen: wenn fast mittig, genau mittig setzen.
    const mitte = unten.x + (unten.w - a.w) / 2;
    // Toleranz wächst mit dem Tempo: etwa so weit, wie die Etage in einem Bild (1/60 s) fährt
    if (Math.abs(a.x - mitte) < Math.max(masse.breite * TOLERANZ, zustand.tempo / 60)) {
      x = mitte;
    } else {
      const links = Math.max(a.x, unten.x);
      const rechts = Math.min(a.x + a.w, unten.x + unten.w);
      if (rechts - links <= 2) {
        lasseFallen(a.x, a.w, a.ebene, a.wer);
        a.el.remove();
        return umgekippt();
      }
      if (a.x < links) lasseFallen(a.x, links - a.x, a.ebene, a.wer);
      if (a.x + a.w > rechts) lasseFallen(rechts, a.x + a.w - rechts, a.ebene, a.wer);
      x = links;
      w = rechts - links;
    }
  }

  setzeEtage(a.el, x, w, a.ebene);
  zustand.behalten += w / a.w;
  zustand.stapel.push({ x, w, el: a.el, wer: a.wer });
  zustand.aktuell = null;

  if (zustand.stapel.length >= etagen()) return fertig();
  zustand.wer = zustand.wer === 'h' ? 'j' : 'h';
  naechsteEtage();
}

// ---------- Taube (Deko ab der Schokotorte) ----------

const TAUBE = `<svg viewBox="0 0 40 28" aria-hidden="true">
  <path fill="#ffffff" stroke="#d9cfc4" stroke-width="1" d="M6 18 C10 12 18 11 24 13 L32 9 C34 8 37 9 37 11 L33 14 C33 20 26 24 18 23 C12 23 8 21 6 18 Z"/>
  <path fill="#f2ded8" stroke="#d9cfc4" stroke-width="1" d="M14 14 C14 6 20 2 26 3 C24 8 22 12 18 15 Z"/>
  <circle cx="33" cy="11" r="0.9" fill="#3e4a3d"/>
  <path fill="#c2a26b" d="M37 11 L40 12 L37 12.6 Z"/>
</svg>`;

function planeTaube() {
  zustand.taubenZeit = setTimeout(() => {
    if (!zustand.laeuft || bewegungAus()) return;
    const taube = document.createElement('div');
    taube.className = 'taube';
    taube.innerHTML = TAUBE;
    taube.style.top = `${8 + Math.random() * 30}%`;
    taube.style.setProperty('--b', `${masse.breite}px`);
    buehne.append(taube);
    taube.addEventListener('animationend', () => taube.remove());
    planeTaube();
  }, zustand.ersteTaube ? 3500 + Math.random() * 4000 : 1500 + Math.random() * 1500);
  zustand.ersteTaube = true;
}

function umgekippt() {
  zustand.laeuft = false;
  clearTimeout(zustand.taubenZeit);
  statusZeile.removeAttribute('data-wer');
  statusZeile.textContent = 'Nicht schlimm – Hochzeitstorten sind schwer.';
  const stufe = zustand.stapel.length <= etagen() / 3 ? 'frech' : 'zwinkernd';
  setTimeout(() => zeigeGruss(stufe, false), bewegungAus() ? 300 : 1100);
}

// ---------- Ende: Brautpaar auf die Torte, dann der Gruß ----------

const BRAUTPAAR = `<svg viewBox="0 0 74 84" aria-hidden="true">
  <path d="M37 6 C33 1 26 3 27 9 C28 13 37 18 37 18 C37 18 46 13 47 9 C48 3 41 1 37 6 Z" fill="#d9a39b"/>
  <circle cx="25" cy="34" r="7" fill="#f1d3bf"/>
  <path d="M16 84 L18 46 C18 42 21 41 25 41 C29 41 32 42 32 46 L34 84 Z" fill="#3e4a3d"/>
  <path d="M25 43 L23 52 L25 55 L27 52 Z" fill="#ffffff"/>
  <circle cx="49" cy="34" r="7" fill="#f1d3bf"/>
  <path d="M42 30 C42 24 56 24 56 30 C57 38 59 46 61 52 L54 44 L44 44 Z" fill="#f2ded8"/>
  <path d="M36 84 L44 44 L54 44 L64 84 Z" fill="#ffffff" stroke="#e9ded6" stroke-width="1"/>
  <circle cx="44" cy="56" r="4.5" fill="#d9a39b"/><circle cx="41" cy="60" r="3" fill="#8fa08a"/>
</svg>`;

function fertig() {
  zustand.laeuft = false;
  clearTimeout(zustand.taubenZeit);
  statusZeile.removeAttribute('data-wer');
  statusZeile.textContent = 'Wunderschön – ihr habt sie zusammen gebacken!';
  const oben = zustand.stapel[zustand.stapel.length - 1];
  const paar = document.createElement('div');
  paar.className = 'brautpaar';
  paar.innerHTML = BRAUTPAAR;
  paar.style.left = `${oben.x + oben.w / 2 - 37}px`;
  paar.style.bottom = `${masse.boden + etagen() * masse.etagenHoehe}px`;
  if (!bewegungAus()) paar.style.transform = `translateY(-${buehne.clientHeight}px)`;
  buehne.append(paar);
  requestAnimationFrame(() => requestAnimationFrame(() => { paar.style.transform = 'none'; }));
  // Wie gerade ist die Torte? 1 = nichts abgeschnitten
  const guete = zustand.behalten / etagen();
  const stufe = guete >= 0.97 ? 'herzlich' : 'freundlich';
  zustand.runde += 1; // nächste Torte wird höher und schneller
  setTimeout(() => zeigeGruss(stufe, true), bewegungAus() ? 300 : 1500);
}

const zuletzt = {};
function waehleGruss(stufe) {
  const texte = GRUESSE[stufe].texte;
  let text;
  do {
    text = texte[Math.floor(Math.random() * texte.length)];
  } while (texte.length > 1 && text === zuletzt[stufe]);
  zuletzt[stufe] = text;
  return text;
}

function zeigeGruss(stufe, geschafft) {
  $('gruss').dataset.stufe = stufe;
  $('gruss-titel').textContent = GRUESSE[stufe].titel;
  $('gruss-text').textContent = `„${waehleGruss(stufe)}“`;
  $('gruss-von').textContent = absender();
  $('neu-backen').textContent = geschafft ? `Nächste Torte: ${torte().name}` : 'Nochmal versuchen';
  $('gruss').hidden = false;
  $('neu-backen').focus();
}

$('neu-backen').addEventListener('click', () => {
  $('gruss').hidden = true;
  raeumeAuf();
  statusZeile.textContent = 'Backt gemeinsam eure Hochzeitstorte.';
  zeigeRunde();
  $('start').hidden = false;
});

// ---------- Tippen zum Absetzen ----------

buehne.addEventListener('pointerdown', (ereignis) => {
  if (!zustand.laeuft) return;
  if (ereignis.target.closest('button')) return;
  ereignis.preventDefault();
  setzeAb();
});

document.addEventListener('keydown', (ereignis) => {
  if ((ereignis.key === ' ' || ereignis.key === 'Enter') && zustand.laeuft) {
    ereignis.preventDefault();
    setzeAb();
  }
});

// ---------- Gemeinsamer Start: beide Herzen gleichzeitig ----------

const gedrueckt = { h: false, j: false };
const herzen = { h: $('herz-h'), j: $('herz-j') };

function pruefeStart() {
  for (const wer of ['h', 'j']) herzen[wer].dataset.gedrueckt = gedrueckt[wer] ? 'ja' : 'nein';
  if (gedrueckt.h && gedrueckt.j) {
    gedrueckt.h = gedrueckt.j = false;
    setTimeout(() => {
      pruefeStart();
      starte();
    }, 350);
    return;
  }
  const fehlt = gedrueckt.h ? 'j' : gedrueckt.j ? 'h' : null;
  statusZeile.removeAttribute('data-wer');
  if (fehlt) statusZeile.innerHTML = `Und jetzt noch <strong>${NAMEN[fehlt]}</strong>!`;
  else statusZeile.textContent = 'Backt gemeinsam eure Hochzeitstorte.';
}

// Jedes Herz einzeln antippen: Es bleibt gedrückt, bis auch das andere gedrückt ist.
// So klappt es zu zweit gleichzeitig, aber auch allein zum Ausprobieren.
for (const wer of ['h', 'j']) {
  herzen[wer].addEventListener('pointerdown', (ereignis) => {
    ereignis.preventDefault();
    gedrueckt[wer] = !gedrueckt[wer];
    pruefeStart();
  });
  herzen[wer].addEventListener('keydown', (ereignis) => {
    if (ereignis.key === 'Enter' || ereignis.key === ' ') {
      ereignis.preventDefault();
      gedrueckt[wer] = !gedrueckt[wer];
      pruefeStart();
    }
  });
  herzen[wer].addEventListener('contextmenu', (ereignis) => ereignis.preventDefault());
}

function zeigeRunde() {
  $('runde-info').textContent = `Runde ${zustand.runde} · ${torte().name} · ${etagen()} Etagen`;
  buehne.dataset.torte = torte().id;
}
zeigeRunde();

window.addEventListener('resize', () => {
  if (!zustand.laeuft && zustand.stapel.length === 0) messe();
});
messe();
