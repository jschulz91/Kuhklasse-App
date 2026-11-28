// Mischmasch: Farben aus dem Tuschkasten mischen.
// „Farbe treffen“: Tupfer in die Schale geben, bis die Zielfarbe passt.
// „Was kommt raus?“: Mischung ansehen, Ergebnis antippen.

import { allgemein, einstellungen, wendeSchriftAn } from '../../shared/settings.js';
import { erzeugeKuh, klecks } from '../../shared/cow.js';
import { el, richteElternbereichEin, richteVollbildEin } from '../../shared/ui.js';
import { zeigeHinweisBeimErstenBesuch } from '../../shared/hinweis.js';
import { verlauf } from '../../shared/verlauf.js';
import { richteVerlaufsAnsichtEin } from '../../shared/verlauf-ansicht.js';
import { NAEPFE, NAPF_IDS, STUFEN, gleichesVerhaeltnis, mische, napf } from './farben.js';

const WARTEN_NACH_RICHTIG = 3000; // ms bis zur nächsten Farbe – so lange läuft die Kuh durchs Bild
const WIEDERHOLEN_NACH = 3; // „Was kommt raus?“: falsche Aufgabe kommt nach so vielen noch einmal
const MAX_TUPFER = 12; // so viel passt in die Schale
const REZEPT_NACH_FEHLERN = 3; // ohne Hilfe: Rezept erscheint nach so vielen Fehlversuchen
const VERLAUF_MAX = 500;

const STUFEN_IDS = STUFEN.map((s) => s.id);
const ZIELE = new Map(STUFEN.flatMap((s) => s.ziele.map((z) => [z.id, { ...z, farbe: mische(z.rezept) }])));

const einst = einstellungen('mischmasch', {
  modus: 'treffen',
  stufen: ['grund'],
  hilfe: 'nein',
});
const allg = allgemein();

// Einträge: m Spielart ("t" treffen, "r" raten), z Ziel-ID,
// bei "t" k = Tupfer des Kindes, bei "r" e = gewählte Farbe (Ziel-ID oder Napf-ID)
const log = verlauf('mischmasch', {
  max: VERLAUF_MAX,
  gueltig: (e) =>
    ZIELE.has(e.z) &&
    ((e.m === 't' && e.k && typeof e.k === 'object') || (e.m === 'r' && typeof e.e === 'string')),
});

const zustand = {
  stapel: [],
  rundeGroesse: 0,
  ziel: null,
  tupfer: leereSchale(),
  fehlversuche: 0,
  beantwortet: false,
  richtig: 0,
  falsch: 0,
  zeitgeber: 0,
};

const $ = (id) => document.getElementById(id);
const dom = {
  treffen: $('treffen'),
  raten: $('raten'),
  zielKlecks: $('ziel-klecks'),
  zielName: $('ziel-name'),
  rezept: $('rezept'),
  schale: $('schale'),
  tupfer: $('tupfer'),
  tipp: $('tipp'),
  tuschkasten: $('tuschkasten'),
  wasser: $('wasser'),
  fertig: $('fertig'),
  rechnung: $('rechnung'),
  auswahl: $('auswahl'),
  weiter: $('weiter'),
  kuhLauf: $('kuh-lauf'),
  buehne: document.querySelector('.misch-buehne'),
  anzahlRichtig: $('anzahl-richtig'),
  anzahlFalsch: $('anzahl-falsch'),
  stufenwahl: $('stufenwahl'),
  zielAnzahl: $('ziel-anzahl'),
  rundeInfo: $('runde-info'),
};

const bewegungAus = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const zufallsZahl = (n) => Math.floor(Math.random() * n);
const modus = () => einst.get('modus');

function mischeListe(liste) {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = zufallsZahl(i + 1);
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

function leereSchale() {
  return Object.fromEntries(NAPF_IDS.map((id) => [id, 0]));
}

const summe = (tupfer) => NAPF_IDS.reduce((s, id) => s + (tupfer[id] ?? 0), 0);

/** Nur die benutzten Näpfe, z. B. { y: 2, b: 1 } – kompakt für den Verlauf. */
const kompakt = (tupfer) => Object.fromEntries(NAPF_IDS.filter((id) => tupfer[id] > 0).map((id) => [id, tupfer[id]]));

/** Farbe und Name einer Auswahl: Zielfarbe oder reine Napffarbe. */
function farbeVon(id) {
  if (ZIELE.has(id)) return { farbe: ZIELE.get(id).farbe, name: ZIELE.get(id).name };
  const n = napf(id);
  return n ? { farbe: n.farbe, name: n.name } : { farbe: '#cccccc', name: '?' };
}

// ---------- Kleckse ----------

/** Unregelmäßiger Farbklecks als SVG-Text. */
function klecksSvg(farbe, { unruhe = 0.16, punkte = 8, leer = false } = {}) {
  const d = klecks(Math.random, 50, 50, 42, 40, unruhe, punkte);
  const fuellung = leer ? 'class="f-keine klecks--leer"' : `fill="${farbe}"`;
  return `<svg class="strich" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path ${fuellung} d="${d}"/></svg>`;
}

function klecksEl(farbe, klasse = 'klecks', optionen) {
  const span = el('span', { class: klasse });
  span.innerHTML = klecksSvg(farbe, optionen);
  return span;
}

/** Tupfer als Reihe kleiner Punkte, gruppiert nach Farbe: ●● + ● */
function tupferPunkte(tupfer, { plus = true } = {}) {
  const gruppen = NAPF_IDS.filter((id) => tupfer[id] > 0).map((id) =>
    el(
      'span',
      { class: 'punkte__gruppe' },
      ...Array.from({ length: tupfer[id] }, () => el('span', { class: 'punkt', style: `background: ${napf(id).farbe}` })),
    ),
  );
  const kinder = [];
  gruppen.forEach((g, i) => {
    if (i > 0 && plus) kinder.push(el('span', { class: 'punkte__plus', text: '+' }));
    kinder.push(g);
  });
  return el('span', { class: 'punkte' }, ...kinder);
}

/** „2 Gelb, 1 Blau“ – für Vorleseprogramme. */
function tupferText(tupfer) {
  const teile = NAPF_IDS.filter((id) => tupfer[id] > 0).map((id) => `${tupfer[id]} ${napf(id).name}`);
  return teile.length ? teile.join(', ') : 'nichts';
}

/** Große Kuh mit Flecken in der geschafften Farbe läuft hinten von links nach rechts. */
function kuhLaeuft(farbe) {
  const figur = el('div', { class: 'kuh-lauf__figur' });
  figur.innerHTML = erzeugeKuh('', Math.random, { fleckenFarbe: farbe });
  figur.style.setProperty('--dauer-lauf', `${WARTEN_NACH_RICHTIG}ms`);
  dom.kuhLauf.replaceChildren(figur);
  dom.kuhLauf.dataset.ruhig = bewegungAus() ? 'ja' : 'nein';
  dom.buehne.dataset.kuh = 'laeuft';
}

function kuhWeg() {
  dom.kuhLauf.replaceChildren();
  delete dom.buehne.dataset.kuh;
}

function wackle(knoten) {
  if (bewegungAus() || !knoten) return;
  knoten.classList.remove('wackelt');
  void knoten.offsetWidth;
  knoten.classList.add('wackelt');
}

// ---------- Stapel ----------

function aktiveZiele() {
  return STUFEN.filter((s) => einst.get('stufen').includes(s.id)).flatMap((s) => s.ziele.map((z) => z.id));
}

function neuerStapel() {
  const ziele = aktiveZiele();
  const stapel = mischeListe(ziele);
  if (stapel.length > 1 && stapel[0] === zustand.ziel?.id) stapel.push(stapel.shift());
  zustand.stapel = stapel;
  zustand.rundeGroesse = ziele.length;
}

function naechstesZiel() {
  clearTimeout(zustand.zeitgeber);
  if (zustand.stapel.length === 0) neuerStapel();
  zustand.ziel = ZIELE.get(zustand.stapel.shift());
  zustand.tupfer = leereSchale();
  zustand.fehlversuche = 0;
  zustand.beantwortet = false;
  kuhWeg();
  zeigeSpielart();
  if (modus() === 'raten') zeigeRaten();
  else zeigeTreffen();
  zeigeRundeInfo();
}

function zeigeSpielart() {
  dom.treffen.hidden = modus() !== 'treffen';
  dom.raten.hidden = modus() !== 'raten';
}

// ---------- Farbe treffen ----------

let schalenKlecks = '';

function zeigeTreffen() {
  const { ziel } = zustand;
  dom.zielKlecks.innerHTML = klecksSvg(ziel.farbe);
  dom.zielKlecks.setAttribute('aria-label', `Diese Farbe mischen: ${ziel.name}`);
  dom.zielKlecks.dataset.ergebnis = '';
  dom.zielName.textContent = ziel.name;
  schalenKlecks = klecks(Math.random, 100, 100, 60, 56, 0.2, 8);
  dom.tipp.hidden = true;
  zeigeRezept();
  zeigeSchale();
}

function zeigeRezept() {
  const zeigen = einst.get('hilfe') === 'ja' || zustand.fehlversuche >= REZEPT_NACH_FEHLERN;
  dom.rezept.hidden = !zeigen;
  if (zeigen) {
    dom.rezept.replaceChildren(
      el('span', { class: 'nur-vorlesen', text: `Rezept: ${tupferText(zustand.ziel.rezept)}` }),
      tupferPunkte(zustand.ziel.rezept),
    );
  }
}

function zeigeSchale({ plopp = false } = {}) {
  const farbe = mische(zustand.tupfer);
  const teller = 'M100,8 C152,8 192,44 192,100 C192,156 152,192 100,192 C48,192 8,156 8,100 C8,44 48,8 100,8 Z';
  const mulde = 'M100,34 C140,34 166,62 166,100 C166,138 140,166 100,166 C60,166 34,138 34,100 C34,62 60,34 100,34 Z';
  const inhalt = farbe
    ? `<path class="schale__farbe" fill="${farbe}" d="${schalenKlecks}"/>`
    : '';
  dom.schale.innerHTML =
    `<svg class="strich" viewBox="0 0 200 200" aria-hidden="true" focusable="false">` +
    `<path fill="#fffdf8" d="${teller}"/><path class="f-keine" style="stroke: var(--fleck-hell); stroke-width: 2" d="${mulde}"/>` +
    `${inhalt}</svg>`;
  dom.schale.setAttribute('aria-label', `In der Schale: ${tupferText(zustand.tupfer)}`);
  if (plopp) wackle(dom.schale.querySelector('.schale__farbe'));

  dom.tupfer.replaceChildren(tupferPunkte(zustand.tupfer, { plus: false }));
  dom.fertig.disabled = summe(zustand.tupfer) === 0 || zustand.beantwortet;
  dom.tuschkasten.dataset.voll = summe(zustand.tupfer) >= MAX_TUPFER ? 'ja' : 'nein';
}

function tupfe(id) {
  if (zustand.beantwortet) return;
  if (summe(zustand.tupfer) >= MAX_TUPFER) {
    wackle(dom.wasser);
    return;
  }
  zustand.tupfer[id] += 1;
  dom.tipp.hidden = true;
  zeigeSchale({ plopp: true });
}

function ausspuelen() {
  if (zustand.beantwortet) return;
  zustand.tupfer = leereSchale();
  dom.tipp.hidden = true;
  zeigeSchale();
}

/**
 * Was fehlt oder stört? Gibt { art: 'zuviel' | 'mehr', napf } zurück.
 * 'zuviel': eine Farbe ist drin, die nicht ins Rezept gehört.
 * 'mehr': von dieser Farbe fehlt am meisten.
 */
function tippFuer(tupfer, rezept) {
  const fremd = NAPF_IDS.find((id) => tupfer[id] > 0 && !(rezept[id] > 0));
  if (fremd) return { art: 'zuviel', napf: fremd };
  const imRezept = NAPF_IDS.filter((id) => rezept[id] > 0);
  // kleinstes Vielfaches des Rezepts, das alle Tupfer schon enthält
  const faktor = Math.max(1, ...imRezept.map((id) => Math.ceil(tupfer[id] / rezept[id])));
  let bester = null;
  for (const id of imRezept) {
    const fehlt = faktor * rezept[id] - tupfer[id];
    const anteil = tupfer[id] / rezept[id];
    if (fehlt <= 0) continue;
    if (!bester || fehlt > bester.fehlt || (fehlt === bester.fehlt && anteil < bester.anteil)) {
      bester = { napf: id, fehlt, anteil };
    }
  }
  return { art: 'mehr', napf: bester?.napf ?? imRezept[0] };
}

function zeigeTipp({ art, napf: id }) {
  const n = napf(id);
  const text = art === 'zuviel' ? `Da ist ${n.name} drin. Ausspülen und neu mischen?` : `Noch etwas ${n.name} dazu?`;
  dom.tipp.replaceChildren(
    el('span', { class: `tipp__zeichen tipp__zeichen--${art}`, 'aria-hidden': 'true' },
      el('span', { class: 'punkt punkt--gross', style: `background: ${n.farbe}` })),
    el('span', { text }),
  );
  dom.tipp.hidden = false;
  wackle(art === 'zuviel' ? dom.wasser : dom.tuschkasten.querySelector(`[data-napf="${id}"]`));
}

function vergleiche() {
  if (zustand.beantwortet || summe(zustand.tupfer) === 0) return;
  const { ziel, tupfer } = zustand;
  const richtig = gleichesVerhaeltnis(tupfer, ziel.rezept);
  log.hinzu({ m: 't', z: ziel.id, k: kompakt(tupfer) });

  if (richtig) {
    zustand.richtig += 1;
    zustand.beantwortet = true;
    dom.zielKlecks.dataset.ergebnis = 'richtig';
    dom.tipp.hidden = true;
    kuhLaeuft(ziel.farbe);
    zeigeSchale();
    zustand.zeitgeber = setTimeout(naechstesZiel, WARTEN_NACH_RICHTIG);
  } else {
    zustand.falsch += 1;
    zustand.fehlversuche += 1;
    zeigeTipp(tippFuer(tupfer, ziel.rezept));
    zeigeRezept();
  }
  zeigeStatistik();
  zeigeRundeInfo();
  verlaufsAnsicht?.aktualisiere();
}

function baueTuschkasten() {
  dom.tuschkasten.replaceChildren(
    ...NAEPFE.map((n) =>
      el(
        'button',
        { type: 'button', class: 'napf', dataset: { napf: n.id }, 'aria-label': n.name },
        el('span', { class: 'napf__farbe', style: `background: ${n.farbe}` }),
      ),
    ),
  );
  dom.tuschkasten.addEventListener('click', (ereignis) => {
    const knopf = ereignis.target.closest('.napf');
    if (knopf) tupfe(knopf.dataset.napf);
  });
  dom.wasser.addEventListener('click', ausspuelen);
  dom.fertig.addEventListener('click', vergleiche);
}

// ---------- Was kommt raus? ----------

const abstand = (a, b) => {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [rgb(a), rgb(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};

/** Zwei falsche Antworten: Farben, die mit denselben Näpfen gemischt werden, oder die Näpfe selbst. */
function falscheAntworten(ziel) {
  const zutaten = NAPF_IDS.filter((id) => ziel.rezept[id] > 0);
  const kandidaten = [
    ...[...ZIELE.values()].filter((z) => z.id !== ziel.id).map((z) => ({ id: z.id, farbe: z.farbe, rezept: z.rezept })),
    ...zutaten.filter((id) => id !== 'w').map((id) => ({ id, farbe: napf(id).farbe, rezept: { [id]: 1 } })),
  ];
  const passend = mischeListe(kandidaten)
    .map((k) => ({ ...k, gemeinsam: zutaten.filter((id) => k.rezept[id] > 0).length }))
    .sort((a, b) => b.gemeinsam - a.gemeinsam);

  const gewaehlt = [];
  for (const k of passend) {
    if (gewaehlt.length === 2) break;
    if ([ziel, ...gewaehlt].every((g) => abstand(g.farbe, k.farbe) > 70)) gewaehlt.push(k);
  }
  return gewaehlt.map((k) => k.id);
}

function zeigeRaten() {
  const { ziel } = zustand;
  const zutaten = NAPF_IDS.filter((id) => ziel.rezept[id] > 0);
  const teile = [];
  zutaten.forEach((id, i) => {
    if (i > 0) teile.push(el('span', { class: 'rechnung__zeichen', text: '+' }));
    teile.push(
      el(
        'span',
        { class: 'rechnung__gruppe' },
        ...Array.from({ length: ziel.rezept[id] }, () => klecksEl(napf(id).farbe, 'klecks klecks--napf')),
      ),
    );
  });
  teile.push(el('span', { class: 'rechnung__zeichen', text: '=' }));
  const frage = klecksEl(null, 'klecks klecks--frage', { leer: true });
  frage.append(el('span', { class: 'klecks__frage', text: '?' }));
  teile.push(frage);
  dom.rechnung.replaceChildren(...teile);
  dom.rechnung.setAttribute('aria-label', `${tupferText(ziel.rezept)} gemischt ergibt?`);

  const antworten = mischeListe([ziel.id, ...falscheAntworten(ziel)]);
  dom.auswahl.replaceChildren(
    ...antworten.map((id) => {
      const { farbe, name } = farbeVon(id);
      const knopf = el('button', { type: 'button', class: 'antwort-klecks', dataset: { wahl: id }, 'aria-label': name });
      knopf.innerHTML = klecksSvg(farbe);
      return knopf;
    }),
  );
  dom.weiter.dataset.sichtbar = 'nein';
}

function rate(knopf) {
  if (zustand.beantwortet) return;
  zustand.beantwortet = true;
  const { ziel } = zustand;
  const wahl = knopf.dataset.wahl;
  log.hinzu({ m: 'r', z: ziel.id, e: wahl });
  for (const k of dom.auswahl.querySelectorAll('.antwort-klecks')) k.disabled = true;

  // Fragezeichen wird zur richtigen Farbe
  const frage = dom.rechnung.querySelector('.klecks--frage');
  frage.querySelector('path').setAttribute('fill', ziel.farbe);
  frage.querySelector('path').removeAttribute('class');
  frage.querySelector('.klecks__frage').remove();

  if (wahl === ziel.id) {
    zustand.richtig += 1;
    knopf.dataset.ergebnis = 'richtig';
    kuhLaeuft(ziel.farbe);
    zustand.zeitgeber = setTimeout(naechstesZiel, WARTEN_NACH_RICHTIG);
  } else {
    zustand.falsch += 1;
    knopf.dataset.ergebnis = 'falsch';
    dom.auswahl.querySelector(`[data-wahl="${ziel.id}"]`)?.setAttribute('data-ergebnis', 'loesung');
    zustand.stapel.splice(Math.min(WIEDERHOLEN_NACH, zustand.stapel.length), 0, ziel.id);
  }
  dom.weiter.dataset.sichtbar = 'ja';
  zeigeStatistik();
  zeigeRundeInfo();
  verlaufsAnsicht?.aktualisiere();
}

dom.auswahl.addEventListener('click', (ereignis) => {
  const knopf = ereignis.target.closest('.antwort-klecks');
  if (knopf && !knopf.disabled) rate(knopf);
});
dom.weiter.addEventListener('click', () => {
  if (zustand.beantwortet) naechstesZiel();
});

// ---------- Anzeige ----------

function zeigeStatistik() {
  dom.anzahlRichtig.textContent = String(zustand.richtig);
  dom.anzahlFalsch.textContent = String(zustand.falsch);
}

function zeigeRundeInfo() {
  dom.rundeInfo.textContent =
    `${zustand.rundeGroesse} Farben im Stapel, noch ${zustand.stapel.length} bis zum Mischen. ` +
    `Bisher ${zustand.richtig} richtig, ${zustand.falsch} falsch.`;
}

// ---------- Verlauf ----------

const istRichtig = (e) =>
  e.m === 't' ? gleichesVerhaeltnis(e.k, ZIELE.get(e.z).rezept) : e.e === e.z;

function farbFeld(farbe, name) {
  const beschreibung = name ? { role: 'img', 'aria-label': name } : { 'aria-hidden': 'true' };
  return el('span', { class: 'farbfeld', style: `background: ${farbe}`, ...beschreibung });
}

function verlaufSpalten(e) {
  const ziel = ZIELE.get(e.z);
  if (e.m === 't') {
    return {
      aufgabe: el('span', { class: 'verlauf-aufgabe' }, farbFeld(ziel.farbe, `Ziel ${ziel.name}`), el('small', { text: ziel.name })),
      eingabe: el(
        'span',
        { class: 'verlauf-mischung' },
        farbFeld(mische(e.k), `gemischt: ${tupferText(e.k)}`),
        tupferPunkte(e.k, { plus: false }),
      ),
      loesung: el('span', { class: 'verlauf-mischung' }, 'richtig: ', tupferPunkte(ziel.rezept)),
    };
  }
  const gewaehlt = farbeVon(e.e);
  return {
    aufgabe: el(
      'span',
      { class: 'verlauf-aufgabe', 'aria-label': `${tupferText(ziel.rezept)} gemischt` },
      tupferPunkte(ziel.rezept),
      el('small', { text: '= ?' }),
    ),
    eingabe: farbFeld(gewaehlt.farbe, `gewählt: ${gewaehlt.name}`),
    loesung: el('span', { class: 'verlauf-mischung' }, 'richtig: ', farbFeld(ziel.farbe, ziel.name)),
  };
}

let verlaufsAnsicht = null;

// ---------- Elternbereich ----------

function baueStufenwahl() {
  const knoepfe = STUFEN.map((stufe) =>
    el(
      'button',
      { type: 'button', class: 'stufe-knopf', dataset: { stufe: stufe.id } },
      el('span', { class: 'stufe-knopf__muster' }, ...stufe.ziele.slice(0, 4).map((z) => farbFeld(ZIELE.get(z.id).farbe))),
      el(
        'span',
        { class: 'stufe-knopf__text' },
        stufe.titel,
        el('small', { text: `${stufe.hilfe} · ${stufe.ziele.map((z) => z.name).join(', ')}` }),
      ),
    ),
  );

  const aktualisiere = () => {
    const aktiv = einst.get('stufen');
    for (const knopf of knoepfe) {
      const an = aktiv.includes(knopf.dataset.stufe);
      knopf.setAttribute('aria-pressed', String(an));
      knopf.disabled = an && aktiv.length === 1; // eine Stufe bleibt immer an
    }
    dom.zielAnzahl.textContent = `Zusammen ${aktiveZiele().length} Farben.`;
  };

  dom.stufenwahl.replaceChildren(...knoepfe);
  dom.stufenwahl.addEventListener('click', (ereignis) => {
    const knopf = ereignis.target.closest('.stufe-knopf');
    if (!knopf || knopf.disabled) return;
    const aktiv = new Set(einst.get('stufen'));
    if (aktiv.has(knopf.dataset.stufe)) aktiv.delete(knopf.dataset.stufe);
    else aktiv.add(knopf.dataset.stufe);
    einst.set('stufen', STUFEN_IDS.filter((id) => aktiv.has(id)));
    aktualisiere();
    neuerStapel();
    naechstesZiel();
  });
  aktualisiere();
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
  const stufen = einst.get('stufen').filter((id) => STUFEN_IDS.includes(id));
  einst.set('stufen', stufen.length ? stufen : ['grund']);
  if (!['treffen', 'raten'].includes(einst.get('modus'))) einst.set('modus', 'treffen');
  if (!['ja', 'nein'].includes(einst.get('hilfe'))) einst.set('hilfe', 'nein');

  baueStufenwahl();

  verbindeAuswahl('modus', (wert) => {
    einst.set('modus', wert);
    neuerStapel();
    naechstesZiel();
  })(einst.get('modus'));

  verbindeAuswahl('hilfe', (wert) => {
    einst.set('hilfe', wert);
    if (modus() === 'treffen' && zustand.ziel) zeigeRezept();
  })(einst.get('hilfe'));

  $('neue-runde').addEventListener('click', () => {
    zustand.richtig = 0;
    zustand.falsch = 0;
    zeigeStatistik();
    neuerStapel();
    naechstesZiel();
  });
}

// ---------- Start ----------

wendeSchriftAn(allg.get('schrift'));
zeigeHinweisBeimErstenBesuch();
richteVollbildEin($('vollbild'));
richteElternbereichEin({ oeffner: $('eltern-auf'), leiste: $('eltern'), schliesser: $('eltern-zu') });
richteElternEin();
verlaufsAnsicht = richteVerlaufsAnsichtEin({
  oeffner: $('statistik'),
  log,
  max: VERLAUF_MAX,
  istRichtig,
  spalten: verlaufSpalten,
  andere: [{ leiste: $('eltern'), oeffner: $('eltern-auf') }],
});
baueTuschkasten();
neuerStapel();
naechstesZiel();
zeigeStatistik();
