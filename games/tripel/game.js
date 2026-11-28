// Tripel: eine Karte, eine fehlende Zahl, Antwort antippen.

import { allgemein, einstellungen, wendeSchriftAn } from '../../shared/settings.js';
import { erzeugeKuh } from '../../shared/cow.js';
import { el, richteElternbereichEin, richteVollbildEin } from '../../shared/ui.js';
import { FARBEN, FARB_IDS, antwortenFuer, kartenFuer } from './karten.js';
import { zeigeHinweisBeimErstenBesuch } from '../../shared/hinweis.js';
import { verlauf } from '../../shared/verlauf.js';
import { richteVerlaufsAnsichtEin } from '../../shared/verlauf-ansicht.js';

const POSITIONEN = ['boss', 'links', 'rechts'];
const WARTEN_NACH_RICHTIG = 1600; // ms bis zur nächsten Karte
const WIEDERHOLEN_NACH = 3; // falsche Karte kommt nach so vielen Karten noch einmal

const einst = einstellungen('tripel', {
  farben: ['rosa'],
  fehlt: 'gemischt',
  antworten: '3',
});
const allg = allgemein();

// Jede Antwort: t Zeit, f Farbe, b/l/r Karte, p fehlende Stelle, e Eingabe des Kindes
const VERLAUF_MAX = 500;
const log = verlauf('tripel', {
  max: VERLAUF_MAX,
  gueltig: (e) =>
    POSITIONEN.includes(e.p) && [e.b, e.l, e.r, e.e].every(Number.isFinite) && typeof e.f === 'string',
});

const zustand = {
  stapel: [],
  rundeGroesse: 0,
  karte: null,
  position: null,
  beantwortet: false,
  richtig: 0,
  falsch: 0,
  zeitgeber: 0,
};

const $ = (id) => document.getElementById(id);
const dom = {
  karte: $('karte'),
  felder: Object.fromEntries(POSITIONEN.map((p) => [p, document.querySelector(`[data-position="${p}"]`)])),
  antworten: $('antworten'),
  weiter: $('weiter'),
  kuh: $('kuh-gucken'),
  anzahlRichtig: $('anzahl-richtig'),
  anzahlFalsch: $('anzahl-falsch'),
  farbwahl: $('farbwahl'),
  kartenAnzahl: $('karten-anzahl'),
  rundeInfo: $('runde-info'),
};

const bewegungAus = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const zufallsZahl = (n) => Math.floor(Math.random() * n);

function mische(liste) {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = zufallsZahl(i + 1);
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

const gleich = (a, b) => a && b && a.boss === b.boss && a.links === b.links && a.rechts === b.rechts;

// ---------- Stapel ----------

function neuerStapel() {
  const karten = kartenFuer(einst.get('farben'));
  let stapel = mische(karten);
  // nicht dieselbe Karte zweimal hintereinander (Rundenwechsel)
  if (stapel.length > 1 && gleich(stapel[0], zustand.karte)) stapel.push(stapel.shift());
  zustand.stapel = stapel;
  zustand.rundeGroesse = karten.length;
}

function waehlePosition() {
  const wahl = einst.get('fehlt');
  if (wahl === 'boss') return 'boss';
  if (wahl === 'unten') return Math.random() < 0.5 ? 'links' : 'rechts';
  return POSITIONEN[zufallsZahl(3)];
}

// ---------- Anzeige ----------

function zeigeKarte() {
  const { karte, position } = zustand;
  dom.karte.dataset.farbe = karte.farbe;
  for (const p of POSITIONEN) {
    const feld = dom.felder[p];
    const fehlt = p === position;
    feld.dataset.fehlt = fehlt ? 'ja' : 'nein';
    delete feld.dataset.ergebnis;
    feld.querySelector('span').textContent = fehlt ? '' : String(karte[p]);
  }
  const beschreibung = POSITIONEN.map((p) => (p === position ? 'fehlt' : karte[p]));
  dom.karte.setAttribute('aria-label', `Boss ${beschreibung[0]}, links ${beschreibung[1]}, rechts ${beschreibung[2]}`);

  const anzahl = Number(einst.get('antworten')) || 3;
  dom.antworten.dataset.anzahl = String(anzahl);
  dom.antworten.replaceChildren(
    ...antwortenFuer(karte, position, anzahl).map((zahl) =>
      el('button', { type: 'button', class: 'antwort', dataset: { zahl: String(zahl) }, text: String(zahl) }),
    ),
  );
  dom.weiter.dataset.sichtbar = 'nein';
  dom.kuh.replaceChildren();
  dom.kuh.classList.remove('guckt');
  zeigeRundeInfo();
}

function zeigeStatistik() {
  dom.anzahlRichtig.textContent = String(zustand.richtig);
  dom.anzahlFalsch.textContent = String(zustand.falsch);
}

function zeigeRundeInfo() {
  const uebrig = zustand.stapel.length;
  dom.rundeInfo.textContent =
    `${zustand.rundeGroesse} Karten im Stapel, noch ${uebrig} bis zum Mischen. ` +
    `Bisher ${zustand.richtig} richtig, ${zustand.falsch} falsch.`;
}

function kuhGuckt() {
  dom.kuh.innerHTML = erzeugeKuh();
  if (!bewegungAus()) {
    dom.kuh.classList.remove('guckt');
    void dom.kuh.offsetWidth;
    dom.kuh.classList.add('guckt');
  }
}

// ---------- Ablauf ----------

function naechsteKarte() {
  clearTimeout(zustand.zeitgeber);
  if (zustand.stapel.length === 0) neuerStapel();
  zustand.karte = zustand.stapel.shift();
  zustand.position = zustand.karte.position ?? waehlePosition();
  zustand.beantwortet = false;
  zeigeKarte();
}

function antworte(knopf) {
  if (zustand.beantwortet) return;
  zustand.beantwortet = true;
  const { karte, position } = zustand;
  const loesung = karte[position];
  const gewaehlt = Number(knopf.dataset.zahl);
  log.hinzu({ f: karte.farbe, b: karte.boss, l: karte.links, r: karte.rechts, p: position, e: gewaehlt });
  const feld = dom.felder[position];
  feld.querySelector('span').textContent = String(loesung);

  for (const k of dom.antworten.querySelectorAll('.antwort')) k.disabled = true;

  if (gewaehlt === loesung) {
    zustand.richtig += 1;
    knopf.dataset.ergebnis = 'richtig';
    feld.dataset.ergebnis = 'richtig';
    kuhGuckt();
    zustand.zeitgeber = setTimeout(naechsteKarte, WARTEN_NACH_RICHTIG);
  } else {
    zustand.falsch += 1;
    knopf.dataset.ergebnis = 'falsch';
    feld.dataset.ergebnis = 'falsch';
    dom.antworten.querySelector(`[data-zahl="${loesung}"]`)?.setAttribute('data-ergebnis', 'loesung');
    // dieselbe Karte (mit derselben Lücke) kommt bald noch einmal
    zustand.stapel.splice(Math.min(WIEDERHOLEN_NACH, zustand.stapel.length), 0, { ...karte, position });
  }
  dom.weiter.dataset.sichtbar = 'ja';
  zeigeStatistik();
  zeigeRundeInfo();
  verlaufsAnsicht?.aktualisiere();
}

dom.antworten.addEventListener('click', (ereignis) => {
  const knopf = ereignis.target.closest('.antwort');
  if (knopf && !knopf.disabled) antworte(knopf);
});
dom.weiter.addEventListener('click', () => {
  if (zustand.beantwortet) naechsteKarte();
});

// ---------- Elternbereich ----------

function baueFarbwahl() {
  const knoepfe = FARBEN.map((farbe) => {
    const anzahl = kartenFuer([farbe.id]).length;
    return el(
      'button',
      { type: 'button', class: 'farbe-knopf', dataset: { farbe: farbe.id } },
      el('span', { class: 'farbe-knopf__muster', style: `background: var(--karte-${farbe.id})` }),
      el(
        'span',
        { class: 'farbe-knopf__text' },
        `${farbe.titel}: ${farbe.name}`,
        el('small', { text: `${farbe.hilfe} · ${anzahl} Karten` }),
      ),
    );
  });

  const aktualisiere = () => {
    const aktiv = einst.get('farben');
    for (const knopf of knoepfe) {
      const an = aktiv.includes(knopf.dataset.farbe);
      knopf.setAttribute('aria-pressed', String(an));
      knopf.disabled = an && aktiv.length === 1; // eine Farbe bleibt immer an
    }
    dom.kartenAnzahl.textContent = `Zusammen ${kartenFuer(aktiv).length} Karten (mit Tauschkarten).`;
  };

  dom.farbwahl.replaceChildren(...knoepfe);
  dom.farbwahl.addEventListener('click', (ereignis) => {
    const knopf = ereignis.target.closest('.farbe-knopf');
    if (!knopf || knopf.disabled) return;
    const aktiv = new Set(einst.get('farben'));
    if (aktiv.has(knopf.dataset.farbe)) aktiv.delete(knopf.dataset.farbe);
    else aktiv.add(knopf.dataset.farbe);
    einst.set('farben', FARB_IDS.filter((id) => aktiv.has(id)));
    aktualisiere();
    neuerStapel();
    naechsteKarte();
  });
  aktualisiere();

  $('farb-liste').replaceChildren(
    ...FARBEN.map((farbe) => el('li', {}, el('strong', { text: `${farbe.titel} – ${farbe.name}:` }), ` ${farbe.hilfe}`)),
  );
}

function verbindeAuswahl(name, beiAenderung) {
  const knoepfe = document.querySelectorAll(`input[name="${name}"]`);
  for (const knopf of knoepfe) {
    knopf.addEventListener('change', () => {
      if (knopf.checked) beiAenderung(knopf.value);
    });
  }
  return (wert) => {
    for (const knopf of knoepfe) knopf.checked = knopf.value === wert;
  };
}

function richteElternEin() {
  // gespeicherte Farben bereinigen
  const farben = einst.get('farben').filter((id) => FARB_IDS.includes(id));
  einst.set('farben', farben.length ? farben : ['rosa']);
  if (!['gemischt', 'unten', 'boss'].includes(einst.get('fehlt'))) einst.set('fehlt', 'gemischt');
  if (!['3', '4', '10'].includes(einst.get('antworten'))) einst.set('antworten', '3');

  baueFarbwahl();

  verbindeAuswahl('fehlt', (wert) => {
    einst.set('fehlt', wert);
    neuerStapel();
    naechsteKarte();
  })(einst.get('fehlt'));

  verbindeAuswahl('antworten', (wert) => {
    einst.set('antworten', wert);
    if (!zustand.beantwortet) zeigeKarte();
  })(einst.get('antworten'));

  $('neue-runde').addEventListener('click', () => {
    zustand.richtig = 0;
    zustand.falsch = 0;
    zeigeStatistik();
    neuerStapel();
    naechsteKarte();
  });
}

// ---------- Verlauf ----------

const werteVon = (e) => ({ boss: e.b, links: e.l, rechts: e.r });
const istRichtig = (e) => e.e === werteVon(e)[e.p];

function miniKarte(e) {
  const werte = werteVon(e);
  const beschreibung = POSITIONEN.map((p) => (p === e.p ? 'fehlt' : werte[p]));
  return el(
    'span',
    {
      class: 'mini-karte',
      dataset: { farbe: e.f },
      role: 'img',
      'aria-label': `Aufgabe: Boss ${beschreibung[0]}, links ${beschreibung[1]}, rechts ${beschreibung[2]}`,
    },
    ...POSITIONEN.map((p) =>
      el('span', { class: `mini-karte__feld mini-karte__feld--${p}`, dataset: { fehlt: p === e.p ? 'ja' : 'nein' } },
        p === e.p ? '?' : String(werte[p])),
    ),
  );
}

let verlaufsAnsicht = null;

function richteVerlaufEin() {
  verlaufsAnsicht = richteVerlaufsAnsichtEin({
    oeffner: $('statistik'),
    log,
    max: VERLAUF_MAX,
    istRichtig,
    spalten: (e) => ({ aufgabe: miniKarte(e), eingabe: String(e.e), loesung: `richtig: ${werteVon(e)[e.p]}` }),
    andere: [{ leiste: $('eltern'), oeffner: $('eltern-auf') }],
  });
}

// ---------- Start ----------

wendeSchriftAn(allg.get('schrift'));
zeigeHinweisBeimErstenBesuch();
richteVollbildEin($('vollbild'));
richteElternbereichEin({ oeffner: $('eltern-auf'), leiste: $('eltern'), schliesser: $('eltern-zu') });
richteElternEin();
richteVerlaufEin();
neuerStapel();
naechsteKarte();
zeigeStatistik();
