// Kuhmaschine: Silben lesen, Kuh bekommen.

import { ladeJson, ladeSet, ladeSetListe } from '../../shared/content.js';
import { allgemein, einstellungen, grundschriftVorhanden, wendeSchriftAn } from '../../shared/settings.js';
import { erzeugeKuh, erzeugeNamensschild } from '../../shared/cow.js';
import { baueSetEditor } from '../../shared/set-editor.js';
import { baueAuswahlChips, el, richteElternbereichEin, richteVollbildEin } from '../../shared/ui.js';
import { ANLAUT_AUSWAHL as ANLAUTE, SPIEL_ID, VOKALE, felder, pruefeDaten } from './schema.js';
import { zeigeHinweisBeimErstenBesuch } from '../../shared/hinweis.js';

const ZUFALL = 'zufall';
const NEUESTE = 'auto';
const UHR_MAX = 20; // die Zähluhr zählt gelesene Wörter von 0 bis 20, dann von vorne

const einst = einstellungen(SPIEL_ID, {
  woche: NEUESTE,
  zuletztNeuestes: '',
  inhalt: 'gemischt',
  anlaute: ['M', 'L', 'T', 'S'],
  vokale: ['a', 'e', 'i', 'o', 'u'],
  silbenzahl: '2',
  kuh: 'nachLesen',
  zaehler: 0,
});
const allg = allgemein();

const zustand = {
  sets: [],
  aktivesSet: null,
  vorschau: null,
  sperre: { woerter: [], teile: [] },
  wort: null,
  letztesWort: '',
  kuhDa: false,
  kuhZeitgeber: 0,
};

const $ = (id) => document.getElementById(id);
const dom = {
  maschine: $('maschine'),
  fenster: $('fenster'),
  wort: $('wort'),
  weideplatz: $('weideplatz'),
  uhrZeiger: $('uhr-zeiger'),
  uhrZahl: $('uhr-zahl'),
  neu: $('neu'),
  gelesen: $('gelesen'),
  woche: $('woche'),
  wocheInfo: $('woche-info'),
  wocheFehler: $('woche-fehler'),
  inhaltAuswahl: $('inhalt-auswahl'),
  buchstaben: $('buchstaben-abschnitt'),
  anlaute: $('anlaute'),
  vokale: $('vokale'),
  schriftHinweis: $('schrift-hinweis'),
  vorschauHinweis: $('vorschau-hinweis'),
  vorschauTitel: $('vorschau-titel'),
};

const bewegungAus = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Wörter bauen ----------

const zufallsZahl = (n) => Math.floor(Math.random() * n);
const waehle = (liste) => liste[zufallsZahl(liste.length)];
const gross = (text) => text.charAt(0).toUpperCase() + text.slice(1);

function kreuze(anlaute, vokale) {
  return anlaute.flatMap((anlaut) => vokale.map((vokal) => anlaut + vokal));
}

function gesperrt(wort) {
  const klein = wort.toLowerCase();
  return (
    zustand.sperre.woerter.some((w) => w.toLowerCase() === klein) ||
    zustand.sperre.teile.some((t) => t && klein.includes(t.toLowerCase()))
  );
}

function silbenzahl() {
  const wahl = einst.get('silbenzahl');
  if (wahl === 'gemischt') return 2 + zufallsZahl(2);
  return [2, 3, 4].includes(Number(wahl)) ? Number(wahl) : 2;
}

/** Zufällige Silben zu einem Wort zusammensetzen. Erste Silbe groß, Rest klein. */
function kombiniere(pool) {
  const vorrat = [...new Set(pool)];
  let silben = [];
  for (let versuch = 0; versuch < 60; versuch++) {
    const n = silbenzahl();
    silben = Array.from({ length: n }, (_, i) => {
      const silbe = waehle(vorrat).toLowerCase();
      return i === 0 ? gross(silbe) : silbe;
    });
    const wort = silben.join('');
    if (!gesperrt(wort) && wort !== zustand.letztesWort) break;
  }
  return silben;
}

function wortVomBlatt(woerter) {
  const auswahl = woerter.length > 1 ? woerter.filter((w) => w.replaceAll('-', '') !== zustand.letztesWort) : woerter;
  return waehle(auswahl).split('-');
}

function quelle() {
  return zustand.vorschau ?? zustand.aktivesSet;
}

/** Was die aktuelle Quelle hergibt: Wörter vom Blatt und Silben zum Kombinieren. */
function vorrat() {
  const zufall = () => ({ woerter: [], silben: kreuze(einst.get('anlaute'), einst.get('vokale')) });
  const set = quelle();
  if (!set) return zufall();
  const daten = set.daten;
  const ergebnis = {
    woerter: daten.woerter ?? [],
    silben: daten.silben?.length ? daten.silben : kreuze(daten.anlaute ?? [], daten.vokale ?? []),
  };
  // Set nur mit Flugsilben (für den Silbenflug): dann eigene Buchstaben nehmen
  return ergebnis.woerter.length || ergebnis.silben.length ? ergebnis : zufall();
}

/** Länge der längsten Silbe, die vorkommen kann – bestimmt die Schriftgröße. */
function laengsteSilbe({ woerter, silben }) {
  const alle = [...silben, ...woerter.flatMap((wort) => wort.split('-'))];
  return Math.max(2, ...alle.map((silbe) => silbe.length));
}

function neueSilben() {
  const { woerter, silben } = vorrat();
  if (!quelle() || woerter.length === 0) return kombiniere(silben);
  const inhalt = einst.get('inhalt');

  let nimmWort;
  if (woerter.length === 0) nimmWort = false;
  else if (silben.length === 0) nimmWort = true;
  else if (inhalt === 'woerter') nimmWort = true;
  else if (inhalt === 'silben') nimmWort = false;
  else nimmWort = Math.random() < 0.5;

  return nimmWort ? wortVomBlatt(woerter) : kombiniere(silben);
}

// ---------- Anzeige ----------

function zeigeWort(silben) {
  zustand.wort = silben.join('');
  zustand.letztesWort = zustand.wort;
  dom.maschine.style.setProperty('--n', String(silben.length));
  dom.maschine.style.setProperty('--zeichen', String(laengsteSilbe(vorrat())));
  dom.maschine.style.setProperty('--buchstaben', String(Math.max(6, zustand.wort.length)));
  dom.fenster.replaceChildren(
    ...silben.map((silbe) => el('div', { class: 'fenster' }, el('span', { class: 'silbe', text: silbe }))),
  );
  dom.wort.textContent = zustand.wort;
}

function ruckeln() {
  if (bewegungAus()) return;
  dom.maschine.classList.remove('ruckelt');
  void dom.maschine.offsetWidth; // Animation neu starten
  dom.maschine.classList.add('ruckelt');
}

function entferneKuh() {
  clearTimeout(zustand.kuhZeitgeber);
  dom.weideplatz.replaceChildren();
  zustand.kuhDa = false;
}

// ---------- Zähluhr ----------

function zeigeZaehler() {
  const stand = einst.get('zaehler');
  // Zeiger läuft über 240°: 0 unten links (150°) … 20 unten rechts (390°)
  dom.uhrZeiger.style.transform = `rotate(${150 + (240 * stand) / UHR_MAX}deg)`;
  dom.uhrZahl.textContent = String(stand);
}

function zaehleWort() {
  const stand = einst.get('zaehler');
  einst.set('zaehler', stand >= UHR_MAX ? 0 : stand + 1);
  zeigeZaehler();
}

// ---------- Kuh ----------

function zeigeKuh() {
  if (!zustand.wort || zustand.kuhDa) return;
  const schild = el('div', { class: 'namensschild-platz' });
  schild.innerHTML = erzeugeNamensschild(zustand.wort);
  const figur = el('figure', { class: 'kuh-figur' });
  figur.innerHTML = erzeugeKuh(zustand.wort);

  if (bewegungAus()) {
    dom.weideplatz.replaceChildren(schild, figur);
  } else {
    // Das Schild steht erst, wenn die Kuh angekommen ist.
    figur.classList.add('kommt');
    figur.addEventListener('animationend', (ereignis) => {
      if (ereignis.animationName === 'kuh-kommt' && figur.isConnected) figur.before(schild);
    });
    dom.weideplatz.replaceChildren(figur);
  }
  zustand.kuhDa = true;
  zaehleWort();
  aktualisiereGelesen();
}

function aktualisiereGelesen() {
  const sichtbar = einst.get('kuh') === 'nachLesen' && zustand.wort && !zustand.kuhDa;
  dom.gelesen.dataset.sichtbar = sichtbar ? 'ja' : 'nein';
  dom.gelesen.disabled = !sichtbar;
}

function neuesWort({ mitBewegung = true } = {}) {
  entferneKuh();
  zeigeWort(neueSilben());
  if (mitBewegung) ruckeln();
  if (mitBewegung && einst.get('kuh') === 'automatisch') {
    zustand.kuhZeitgeber = setTimeout(zeigeKuh, bewegungAus() ? 0 : 340);
  }
  aktualisiereGelesen();
}

dom.maschine.addEventListener('animationend', () => dom.maschine.classList.remove('ruckelt'));
dom.neu.addEventListener('click', () => neuesWort());
dom.gelesen.addEventListener('click', zeigeKuh);

// ---------- Wochen-Sets ----------

function wochenText(eintrag) {
  return `KW ${eintrag.kw}/${eintrag.jahr} – ${eintrag.titel}`;
}

async function waehleWoche(wert) {
  dom.wocheFehler.hidden = true;
  zustand.aktivesSet = null;
  const neueste = zustand.sets[0];
  const datei = wert === NEUESTE ? neueste?.datei : wert === ZUFALL ? null : wert;
  const eintrag = zustand.sets.find((s) => s.datei === datei);

  if (eintrag) {
    const { set, fehler } = await ladeSet(SPIEL_ID, eintrag.datei, pruefeDaten);
    if (fehler.length === 0) {
      zustand.aktivesSet = set;
    } else {
      dom.wocheFehler.textContent = `Das Set ${eintrag.datei} hat Fehler, darum läuft „Zufall“: ${fehler.join(' ')}`;
      dom.wocheFehler.hidden = false;
    }
  }
  aktualisiereElternbereich();
}

function fuelleWochenauswahl() {
  const optionen = zustand.sets.map((eintrag, i) =>
    el('option', { value: i === 0 ? NEUESTE : eintrag.datei, text: i === 0 ? `${wochenText(eintrag)} (neu)` : wochenText(eintrag) }),
  );
  optionen.push(el('option', { value: ZUFALL, text: 'Zufall (ohne Set)' }));
  dom.woche.replaceChildren(...optionen);

  let wert = einst.get('woche');
  if (wert !== ZUFALL && wert !== NEUESTE && !zustand.sets.some((s) => s.datei === wert)) wert = NEUESTE;
  if (wert === NEUESTE && zustand.sets.length === 0) wert = ZUFALL;
  if (wert === zustand.sets[0]?.datei) wert = NEUESTE;
  dom.woche.value = wert;
  return wert;
}

dom.woche.addEventListener('change', async () => {
  einst.set('woche', dom.woche.value);
  await waehleWoche(dom.woche.value);
  neuesWort();
});

// ---------- Elternbereich ----------

function aktualisiereElternbereich() {
  const set = quelle();
  dom.buchstaben.hidden = Boolean(set);
  dom.inhaltAuswahl.hidden = !set;

  if (zustand.vorschau) {
    dom.wocheInfo.textContent = 'Gerade läuft die Vorschau aus dem Set-Editor.';
  } else if (set) {
    const teile = [set.notiz, `Anlaute: ${(set.daten.anlaute ?? []).join(', ') || '–'}`, `Vokale: ${(set.daten.vokale ?? []).join(', ') || '–'}`];
    dom.wocheInfo.textContent = teile.filter(Boolean).join(' · ');
  } else if (zustand.sets.length === 0) {
    dom.wocheInfo.textContent = 'Noch keine Wochen-Sets vorhanden. Die Maschine nutzt die Buchstaben unten.';
  } else {
    dom.wocheInfo.textContent = 'Silben aus den Buchstaben unten.';
  }
  dom.woche.disabled = Boolean(zustand.vorschau);

  dom.vorschauHinweis.hidden = !zustand.vorschau;
  if (zustand.vorschau) {
    dom.vorschauTitel.textContent = `KW ${zustand.vorschau.kw} – ${zustand.vorschau.titel}`;
  }
}

function baueChips(behaelter, alle, schluessel, beschriftung) {
  baueAuswahlChips(behaelter, {
    alle,
    holen: () => einst.get(schluessel),
    setzen: (werte) => einst.set(schluessel, werte),
    beschriftung,
    beiAenderung: () => {
      if (!quelle()) neuesWort({ mitBewegung: false });
    },
  });
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

async function setzeSchrift(schrift) {
  allg.set('schrift', schrift);
  wendeSchriftAn(schrift);
  dom.schriftHinweis.hidden = true;
  if (schrift === 'grund' && !(await grundschriftVorhanden())) {
    dom.schriftHinweis.hidden = false;
  }
}

function richteEinstellungenEin() {
  // Anlaute/Vokale: nur bekannte Werte übernehmen, mindestens einer bleibt an
  const gueltig = (liste, erlaubt, standard) => {
    const sauber = liste.filter((x) => erlaubt.includes(x));
    return sauber.length ? sauber : standard;
  };
  einst.set('anlaute', gueltig(einst.get('anlaute'), ANLAUTE, ['M', 'L']));
  einst.set('vokale', gueltig(einst.get('vokale'), VOKALE, ['a']));

  baueChips(dom.anlaute, ANLAUTE, 'anlaute', (a) => (a === '' ? 'ohne' : a));
  baueChips(dom.vokale, VOKALE, 'vokale');

  verbindeAuswahl('inhalt', (wert) => {
    einst.set('inhalt', wert);
    neuesWort({ mitBewegung: false });
  })(einst.get('inhalt'));

  verbindeAuswahl('silbenzahl', (wert) => {
    einst.set('silbenzahl', wert);
    neuesWort({ mitBewegung: false });
  })(einst.get('silbenzahl'));

  verbindeAuswahl('kuh', (wert) => {
    einst.set('kuh', wert);
    if (wert === 'automatisch' && zustand.wort && !zustand.kuhDa) zeigeKuh();
    aktualisiereGelesen();
  })(einst.get('kuh'));

  verbindeAuswahl('schrift', setzeSchrift)(allg.get('schrift'));

  $('zaehler-null').addEventListener('click', () => {
    einst.set('zaehler', 0);
    zeigeZaehler();
  });
  if (!(einst.get('zaehler') >= 0 && einst.get('zaehler') <= UHR_MAX)) einst.set('zaehler', 0);
  zeigeZaehler();
}

function richteEditorEin() {
  baueSetEditor($('editor'), {
    spielId: SPIEL_ID,
    felder,
    pruefeDaten,
    vorhandeneSets: () => zustand.sets,
    aktuellesSet: () =>
      quelle() ?? {
        titel: '',
        notiz: '',
        daten: { anlaute: einst.get('anlaute').filter(Boolean), vokale: einst.get('vokale'), silben: [], woerter: [] },
      },
    beiVorschau: (set) => {
      zustand.vorschau = set;
      aktualisiereElternbereich();
      neuesWort();
    },
  });

  $('vorschau-ende').addEventListener('click', () => {
    zustand.vorschau = null;
    aktualisiereElternbereich();
    neuesWort();
  });
}

// ---------- Start ----------

async function start() {
  wendeSchriftAn(allg.get('schrift'));
  zeigeHinweisBeimErstenBesuch();
  richteVollbildEin($('vollbild'));
  richteElternbereichEin({ oeffner: $('eltern-auf'), leiste: $('eltern'), schliesser: $('eltern-zu') });
  richteEinstellungenEin();

  const [sets, sperre] = await Promise.all([
    ladeSetListe(SPIEL_ID),
    ladeJson('content/sperrliste.json').catch(() => null),
  ]);
  zustand.sets = sets;
  if (sperre) {
    zustand.sperre = {
      woerter: Array.isArray(sperre.woerter) ? sperre.woerter : [],
      teile: Array.isArray(sperre.teile) ? sperre.teile : [],
    };
  }

  // Ist ein neues Wochen-Set dazugekommen, gilt automatisch wieder das neueste.
  const neueste = sets[0]?.datei ?? '';
  if (neueste && neueste !== einst.get('zuletztNeuestes')) {
    einst.set('zuletztNeuestes', neueste);
    einst.set('woche', NEUESTE);
  }

  const wert = fuelleWochenauswahl();
  await waehleWoche(wert);
  richteEditorEin();
  neuesWort({ mitBewegung: false });
  if (allg.get('schrift') === 'grund') setzeSchrift('grund');
}

start();
