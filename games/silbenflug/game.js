// Silbenflug: Ein Flugzeug bringt eine Silbe, das Kind liest sie vor,
// die Begleitperson tippt „gelesen“ oder „nochmal“. Nach allen Flügen landet es.
// Die Silben kommen aus den gemeinsamen Leseblatt-Sets (Feld "flugsilben").
// Alle Einstellungen dafür liegen im eigenen Elternbereich.

import { ladeSet, ladeSetListe } from '../../shared/content.js';
import { allgemein, einstellungen, grundschriftVorhanden, wendeSchriftAn } from '../../shared/settings.js';
import { erzeugeKuh } from '../../shared/cow.js';
import { baueAuswahlChips, el, richteElternbereichEin, richteVollbildEin } from '../../shared/ui.js';
import { baueSetEditor } from '../../shared/set-editor.js';
import { zeigeHinweisBeimErstenBesuch } from '../../shared/hinweis.js';
import { ANLAUT_AUSWAHL, SPIEL_ID as SET_SPIEL, VOKALE, felder, pruefeDaten } from '../kuhmaschine/schema.js';

const ZUFALL = 'zufall';
const NEUESTE = 'auto';
const WIEDERHOLEN_NACH = 3; // „nochmal“: Silbe kommt nach so vielen Flügen wieder
const HERDE = 4; // so viele Kühe kommen nach der Landung
const LANDUNG_DAUER = 2200; // ms, passend zur Animation „landen“ in game.css

const einst = einstellungen('silbenflug', {
  woche: NEUESTE,
  zuletztNeuestes: '',
  fluege: '20',
  anlaute: ['M', 'L', 'T', 'S'],
  vokale: ['a', 'e', 'i', 'o', 'u'],
});
const allg = allgemein();

const zustand = {
  sets: [],
  set: null,
  vorschau: null,
  vorrat: [],
  stapel: [],
  silbe: '',
  geschafft: 0,
  ziel: 20,
  unterwegs: false,
  gelandet: false,
  landeZeitgeber: 0,
};

const $ = (id) => document.getElementById(id);
const dom = {
  flug: $('flug'),
  silbe: $('silbe'),
  wolken: $('wolken'),
  landung: $('landung'),
  herde: $('herde'),
  gelesen: $('gelesen'),
  nochmal: $('nochmal'),
  neueRunde: $('neue-runde'),
  woche: $('woche'),
  wocheInfo: $('woche-info'),
  wocheFehler: $('woche-fehler'),
  buchstaben: $('buchstaben-abschnitt'),
  vorschauHinweis: $('vorschau-hinweis'),
  vorschauTitel: $('vorschau-titel'),
  schriftHinweis: $('schrift-hinweis'),
};

const bewegungAus = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const zufallsZahl = (n) => Math.floor(Math.random() * n);
const gross = (text) => text.charAt(0).toUpperCase() + text.slice(1);

function mische(liste) {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = zufallsZahl(i + 1);
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

// ---------- Silben ----------

/** Zufall: Silben wie auf dem Blatt – „Ma“ und „ma“, dazu „am“ und „Am“. */
function zufallsSilben() {
  const anlaute = einst.get('anlaute');
  const vokale = einst.get('vokale');
  const silben = [];
  for (const anlaut of anlaute) {
    for (const vokal of vokale) {
      const offen = (anlaut + vokal).toLowerCase();
      silben.push(gross(offen), offen);
      if (anlaut.length === 1) {
        const geschlossen = (vokal + anlaut).toLowerCase();
        silben.push(gross(geschlossen), geschlossen);
      }
    }
  }
  return silben.length ? silben : ['Ma', 'ma', 'am', 'Lo', 'lo', 'ol'];
}

function silbenAusSet(set) {
  const daten = set.daten;
  if (daten.flugsilben?.length) return { silben: daten.flugsilben, quelle: 'flug' };
  if (daten.silben?.length) return { silben: daten.silben, quelle: 'silben' };
  const kreuz = (daten.anlaute ?? []).flatMap((a) => (daten.vokale ?? []).map((v) => a + v));
  return { silben: kreuz, quelle: 'buchstaben' };
}

function ziehe() {
  if (zustand.stapel.length === 0) zustand.stapel = mische(zustand.vorrat);
  // nicht zweimal dieselbe Silbe hintereinander
  if (zustand.stapel[0] === zustand.silbe && zustand.stapel.length > 1) {
    const i = 1 + zufallsZahl(zustand.stapel.length - 1);
    [zustand.stapel[0], zustand.stapel[i]] = [zustand.stapel[i], zustand.stapel[0]];
  }
  return zustand.stapel.shift();
}

// ---------- Anzeige ----------

const WOLKE = 'M8,22 C3,22 2,16 6,14 C5,8 12,5 16,8 C18,3 27,3 29,9 C35,8 39,13 36,18 C38,21 35,23 32,22 Z';

function zeichneWolken() {
  const svgNs = 'http://www.w3.org/2000/svg';
  const wolken = [];
  for (let i = 0; i < zustand.ziel; i++) {
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('viewBox', '0 0 40 26');
    svg.setAttribute('class', 'wolke');
    svg.setAttribute('aria-hidden', 'true');
    const pfad = document.createElementNS(svgNs, 'path');
    pfad.setAttribute('d', WOLKE);
    svg.append(pfad);
    wolken.push(svg);
  }
  dom.wolken.replaceChildren(...wolken);
  aktualisiereWolken();
}

function aktualisiereWolken() {
  [...dom.wolken.children].forEach((wolke, i) => {
    wolke.dataset.geschafft = i < zustand.geschafft ? 'ja' : 'nein';
  });
  dom.wolken.setAttribute('aria-label', `${zustand.geschafft} von ${zustand.ziel} Flügen`);
}

function animiere(element, klasse) {
  return new Promise((fertig) => {
    if (bewegungAus()) {
      fertig();
      return;
    }
    element.classList.remove('kommt', 'geht');
    void element.offsetWidth;
    element.classList.add(klasse);
    element.addEventListener(
      'animationend',
      () => {
        element.classList.remove(klasse);
        fertig();
      },
      { once: true },
    );
  });
}

function setzeKnoepfe() {
  dom.gelesen.hidden = zustand.gelandet;
  dom.nochmal.hidden = zustand.gelandet;
  dom.neueRunde.hidden = !zustand.gelandet || zustand.unterwegs;
  dom.gelesen.disabled = zustand.unterwegs;
  dom.nochmal.disabled = zustand.unterwegs;
}

// ---------- Ablauf ----------

async function fliegeHerein() {
  zustand.silbe = ziehe();
  dom.silbe.textContent = zustand.silbe;
  zustand.unterwegs = true;
  setzeKnoepfe();
  await animiere(dom.flug, 'kommt');
  zustand.unterwegs = false;
  setzeKnoepfe();
}

async function fliegeWeiter({ zaehlt }) {
  if (zustand.unterwegs || zustand.gelandet) return;
  zustand.unterwegs = true;
  setzeKnoepfe();

  if (zaehlt) {
    zustand.geschafft += 1;
    aktualisiereWolken();
  } else {
    zustand.stapel.splice(Math.min(WIEDERHOLEN_NACH - 1, zustand.stapel.length), 0, zustand.silbe);
  }

  await animiere(dom.flug, 'geht');
  dom.silbe.textContent = '';

  if (zustand.geschafft >= zustand.ziel) {
    lande();
  } else {
    await fliegeHerein();
  }
}

function baueHerde() {
  const kuehe = Array.from({ length: HERDE }, (_, i) => {
    const kuh = el('div', { class: 'herden-kuh' });
    // jede Kuh bewegt sich in ihrem eigenen Takt
    kuh.style.setProperty('--i', String(i));
    kuh.style.setProperty('--grasen', `${(4 + Math.random() * 3).toFixed(1)}s`);
    kuh.style.setProperty('--wedeln', `${(1.4 + Math.random() * 1.2).toFixed(1)}s`);
    kuh.style.setProperty('--versatz', `${(-Math.random() * 4).toFixed(1)}s`);
    kuh.innerHTML = erzeugeKuh();
    return kuh;
  });
  dom.herde.replaceChildren(...kuehe);
}

function lande() {
  zustand.gelandet = true;
  zustand.unterwegs = true; // bis das Flugzeug steht, gibt es keinen Knopf
  dom.flug.hidden = true;
  baueHerde();
  dom.landung.hidden = false;
  dom.gelesen.hidden = true;
  dom.nochmal.hidden = true;
  dom.neueRunde.hidden = true;

  if (bewegungAus()) {
    zustand.unterwegs = false;
    setzeKnoepfe();
    return;
  }
  // „kommt“ bleibt stehen, damit die Herde danach weiter grast
  dom.landung.classList.remove('kommt');
  void dom.landung.offsetWidth;
  dom.landung.classList.add('kommt');
  zustand.landeZeitgeber = setTimeout(() => {
    zustand.unterwegs = false;
    setzeKnoepfe();
  }, LANDUNG_DAUER);
}

function starteRunde() {
  clearTimeout(zustand.landeZeitgeber);
  dom.landung.classList.remove('kommt');
  dom.herde.replaceChildren();
  zustand.ziel = Number(einst.get('fluege')) || 20;
  zustand.geschafft = 0;
  zustand.gelandet = false;
  zustand.unterwegs = false;
  zustand.stapel = [];
  zustand.silbe = '';
  dom.landung.hidden = true;
  dom.flug.hidden = false;
  zeichneWolken();
  fliegeHerein();
}

dom.gelesen.addEventListener('click', () => fliegeWeiter({ zaehlt: true }));
dom.nochmal.addEventListener('click', () => fliegeWeiter({ zaehlt: false }));
dom.neueRunde.addEventListener('click', starteRunde);

// ---------- Woche ----------

function wochenText(eintrag) {
  return `KW ${eintrag.kw}/${eintrag.jahr} – ${eintrag.titel}`;
}

function fuelleWochenauswahl() {
  const optionen = zustand.sets.map((eintrag, i) =>
    el('option', { value: i === 0 ? NEUESTE : eintrag.datei, text: i === 0 ? `${wochenText(eintrag)} (neu)` : wochenText(eintrag) }),
  );
  optionen.push(el('option', { value: ZUFALL, text: 'Zufall (Buchstaben wählen)' }));
  dom.woche.replaceChildren(...optionen);

  let wert = einst.get('woche');
  if (wert !== ZUFALL && wert !== NEUESTE && !zustand.sets.some((s) => s.datei === wert)) wert = NEUESTE;
  if (wert === NEUESTE && zustand.sets.length === 0) wert = ZUFALL;
  if (wert === zustand.sets[0]?.datei) wert = NEUESTE;
  dom.woche.value = wert;
  return wert;
}

async function waehleWoche(wert) {
  dom.wocheFehler.hidden = true;
  zustand.set = null;
  const datei = wert === NEUESTE ? zustand.sets[0]?.datei : wert === ZUFALL ? null : wert;
  const eintrag = zustand.sets.find((s) => s.datei === datei);

  if (eintrag) {
    const { set, fehler } = await ladeSet(SET_SPIEL, eintrag.datei, pruefeDaten);
    if (fehler.length === 0) {
      zustand.set = set;
    } else {
      dom.wocheFehler.textContent = `Das Set ${eintrag.datei} hat Fehler, darum läuft „Zufall“: ${fehler.join(' ')}`;
      dom.wocheFehler.hidden = false;
    }
  }

  aktualisiereVorrat();
}

/** Silbenvorrat aus Vorschau, gewähltem Set oder den Buchstaben für Zufall. */
function aktualisiereVorrat() {
  const set = zustand.vorschau ?? zustand.set;
  dom.buchstaben.hidden = Boolean(set);
  dom.woche.disabled = Boolean(zustand.vorschau);
  dom.vorschauHinweis.hidden = !zustand.vorschau;
  if (zustand.vorschau) dom.vorschauTitel.textContent = `KW ${zustand.vorschau.kw} – ${zustand.vorschau.titel}`;

  if (set) {
    const { silben, quelle } = silbenAusSet(set);
    zustand.vorrat = silben.length ? silben : zufallsSilben();
    const herkunft = {
      flug: 'Silben aus der Flugzeug-Tabelle',
      silben: 'Dieses Set hat keine Flugsilben, es werden die Silben des Sets verwendet',
      buchstaben: 'Dieses Set hat keine Flugsilben, es werden Anlaute und Vokale kombiniert',
    }[quelle];
    dom.wocheInfo.textContent = `${herkunft} (${silben.length}).`;
  } else {
    zustand.vorrat = zufallsSilben();
    dom.wocheInfo.textContent = 'Silben aus den Buchstaben unten.';
  }
}

dom.woche.addEventListener('change', async () => {
  einst.set('woche', dom.woche.value);
  await waehleWoche(dom.woche.value);
  starteRunde();
});

// ---------- Elternbereich ----------

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

async function setzeSchrift(schrift) {
  allg.set('schrift', schrift);
  wendeSchriftAn(schrift);
  dom.schriftHinweis.hidden = true;
  if (schrift === 'grund' && !(await grundschriftVorhanden())) dom.schriftHinweis.hidden = false;
}

function richteBuchstabenEin() {
  const gueltig = (liste, erlaubt, standard) => {
    const sauber = liste.filter((x) => erlaubt.includes(x));
    return sauber.length ? sauber : standard;
  };
  einst.set('anlaute', gueltig(einst.get('anlaute'), ANLAUT_AUSWAHL, ['M', 'L']));
  einst.set('vokale', gueltig(einst.get('vokale'), VOKALE, ['a']));

  const beiAenderung = () => {
    if (zustand.vorschau || zustand.set) return;
    aktualisiereVorrat();
    starteRunde();
  };
  baueAuswahlChips($('anlaute'), {
    alle: ANLAUT_AUSWAHL,
    holen: () => einst.get('anlaute'),
    setzen: (werte) => einst.set('anlaute', werte),
    beschriftung: (a) => (a === '' ? 'ohne' : a),
    beiAenderung,
  });
  baueAuswahlChips($('vokale'), {
    alle: VOKALE,
    holen: () => einst.get('vokale'),
    setzen: (werte) => einst.set('vokale', werte),
    beiAenderung,
  });
}

function richteEditorEin() {
  baueSetEditor($('editor'), {
    spielId: SET_SPIEL,
    felder,
    pruefeDaten,
    vorhandeneSets: () => zustand.sets,
    aktuellesSet: () =>
      zustand.vorschau ??
      zustand.set ?? {
        titel: '',
        notiz: '',
        daten: { anlaute: einst.get('anlaute').filter(Boolean), vokale: einst.get('vokale'), silben: [], woerter: [], flugsilben: [] },
      },
    beiVorschau: (set) => {
      zustand.vorschau = set;
      aktualisiereVorrat();
      starteRunde();
    },
  });

  $('vorschau-ende').addEventListener('click', () => {
    zustand.vorschau = null;
    aktualisiereVorrat();
    starteRunde();
  });
}

function richteElternEin() {
  if (!['10', '20', '30'].includes(einst.get('fluege'))) einst.set('fluege', '20');
  richteBuchstabenEin();
  verbindeAuswahl('fluege', (wert) => {
    einst.set('fluege', wert);
    starteRunde();
  })(einst.get('fluege'));
  verbindeAuswahl('schrift', setzeSchrift)(allg.get('schrift'));
  $('runde-neu').addEventListener('click', starteRunde);
}

// ---------- Start ----------

async function start() {
  wendeSchriftAn(allg.get('schrift'));
  zeigeHinweisBeimErstenBesuch();
  richteVollbildEin($('vollbild'));
  richteElternbereichEin({ oeffner: $('eltern-auf'), leiste: $('eltern'), schliesser: $('eltern-zu') });
  richteElternEin();

  zustand.sets = await ladeSetListe(SET_SPIEL);
  // Ist ein neues Leseblatt dazugekommen, gilt automatisch wieder das neueste.
  const neueste = zustand.sets[0]?.datei ?? '';
  if (neueste && neueste !== einst.get('zuletztNeuestes')) {
    einst.set('zuletztNeuestes', neueste);
    einst.set('woche', NEUESTE);
  }

  await waehleWoche(fuelleWochenauswahl());
  richteEditorEin();
  starteRunde();
  if (allg.get('schrift') === 'grund') setzeSchrift('grund');
}

start();
