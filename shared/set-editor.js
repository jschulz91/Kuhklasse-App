// Set-Editor für den Elternbereich – für jedes Spiel nutzbar.
// Das Spiel liefert seine Felder (Schema) und eine Prüffunktion für "daten".

import { isoWoche, pruefeSet, setDateiname, setPfad } from './content.js';
import { einstellungen } from './settings.js';
import { el } from './ui.js';

/** Text → Liste: getrennt durch Komma, Semikolon, Leerzeichen oder Zeilenumbruch. */
export function textZuListe(text) {
  return String(text ?? '')
    .split(/[\s,;]+/)
    .map((teil) => teil.trim())
    .filter(Boolean);
}

/**
 * @param {HTMLElement} wurzel – hier wird das Formular eingesetzt
 * @param {object} optionen
 * @param {string} optionen.spielId
 * @param {Array<{name:string,titel:string,hilfe?:string,beispiel?:string}>} optionen.felder
 * @param {(daten:object)=>string[]} optionen.pruefeDaten
 * @param {()=>Array<{jahr:number,kw:number,titel:string}>} optionen.vorhandeneSets
 * @param {()=>object|null} optionen.aktuellesSet – zum Übernehmen der gewählten Woche
 * @param {(set:object)=>void} optionen.beiVorschau
 */
export function baueSetEditor(wurzel, { spielId, felder, pruefeDaten, vorhandeneSets, aktuellesSet, beiVorschau }) {
  const jetzt = isoWoche();
  const leererEntwurf = { jahr: jetzt.jahr, kw: jetzt.kw, titel: '', notiz: '', daten: {} };
  const entwurf = einstellungen(`entwurf-${spielId}`, leererEntwurf);

  const eingabe = {
    jahr: el('input', { type: 'number', name: 'jahr', min: 2020, max: 2100, inputmode: 'numeric' }),
    kw: el('input', { type: 'number', name: 'kw', min: 1, max: 53, inputmode: 'numeric' }),
    titel: el('input', { type: 'text', name: 'titel', maxlength: 80, placeholder: 'z. B. Silben mit M, L, T' }),
    notiz: el('input', { type: 'text', name: 'notiz', maxlength: 200, placeholder: 'z. B. Arbeitsblatt Seite 12' }),
  };
  const datenEingabe = {};
  for (const feld of felder) {
    datenEingabe[feld.name] = el('textarea', {
      name: `daten.${feld.name}`,
      rows: 2,
      placeholder: feld.beispiel ? `z. B. ${feld.beispiel}` : undefined,
      spellcheck: 'false',
      autocapitalize: 'off',
    });
  }

  const fehlerListe = el('ul', { class: 'editor__fehler', role: 'status', hidden: true });
  const pfadAnzeige = el('code', { class: 'editor__pfad' });
  const doppelt = el('p', { class: 'warnung', hidden: true });
  const ergebnis = el('p', { class: 'warnung', role: 'status', hidden: true });

  const knopfVorschau = el('button', { type: 'button', class: 'knopf-text knopf-text--voll', text: 'Im Spiel ausprobieren' });
  const knopfLaden = el('button', { type: 'button', class: 'knopf-text', text: 'Herunterladen' });
  const knopfUebernehmen = el('button', { type: 'button', class: 'knopf-text', text: 'Aktuelle Auswahl übernehmen' });
  const knopfLeeren = el('button', { type: 'button', class: 'knopf-text', text: 'Leeren' });

  const formular = el(
    'form',
    { class: 'editor', novalidate: true },
    el('p', { class: 'hinweis', text: 'Set für ein Arbeitsblatt anlegen. Es wird nur heruntergeladen – auf der Seite erscheint es, sobald die Datei im Repo liegt.' }),
    el(
      'div',
      { class: 'editor__woche' },
      el('label', { class: 'feld' }, el('span', { text: 'Jahr' }), eingabe.jahr),
      el('label', { class: 'feld' }, el('span', { text: 'Kalenderwoche' }), eingabe.kw),
    ),
    el('label', { class: 'feld' }, el('span', { text: 'Titel' }), eingabe.titel),
    el('label', { class: 'feld' }, el('span', { text: 'Notiz (freiwillig)' }), eingabe.notiz),
    felder.map((feld) =>
      el(
        'label',
        { class: 'feld' },
        el('span', { text: feld.titel }),
        datenEingabe[feld.name],
        feld.hilfe ? el('small', { class: 'hinweis', text: feld.hilfe }) : null,
      ),
    ),
    fehlerListe,
    el('p', { class: 'editor__ok' }, 'Ablage im Repo:', pfadAnzeige),
    doppelt,
    el('div', { class: 'knopf-reihe' }, knopfVorschau, knopfLaden),
    el('div', { class: 'knopf-reihe' }, knopfUebernehmen, knopfLeeren),
    ergebnis,
  );
  formular.addEventListener('submit', (ereignis) => ereignis.preventDefault());

  // ---------- Werte ----------

  function fuelle(werte) {
    eingabe.jahr.value = werte.jahr ?? '';
    eingabe.kw.value = werte.kw ?? '';
    eingabe.titel.value = werte.titel ?? '';
    eingabe.notiz.value = werte.notiz ?? '';
    for (const feld of felder) {
      const wert = werte.daten?.[feld.name];
      datenEingabe[feld.name].value = Array.isArray(wert) ? wert.join(', ') : (wert ?? '');
    }
  }

  function zahl(text) {
    return /^\s*\d+\s*$/.test(text) ? Number(text) : text.trim() === '' ? undefined : text;
  }

  function baueSet() {
    const set = {
      spiel: spielId,
      jahr: zahl(eingabe.jahr.value),
      kw: zahl(eingabe.kw.value),
      titel: eingabe.titel.value.trim(),
    };
    const notiz = eingabe.notiz.value.trim();
    if (notiz) set.notiz = notiz;
    set.daten = {};
    for (const feld of felder) set.daten[feld.name] = textZuListe(datenEingabe[feld.name].value);
    return set;
  }

  function merke() {
    const daten = {};
    for (const feld of felder) daten[feld.name] = datenEingabe[feld.name].value;
    entwurf.set('jahr', Number(eingabe.jahr.value) || leererEntwurf.jahr);
    entwurf.set('kw', Number(eingabe.kw.value) || leererEntwurf.kw);
    entwurf.set('titel', eingabe.titel.value);
    entwurf.set('notiz', eingabe.notiz.value);
    entwurf.set('daten', daten);
  }

  // ---------- Prüfen ----------

  let letztesSet = null;

  function pruefe() {
    const set = baueSet();
    const fehler = pruefeSet(set, { spielId, pruefeDaten });
    fehlerListe.replaceChildren(...fehler.map((text) => el('li', { text })));
    fehlerListe.hidden = fehler.length === 0;
    knopfVorschau.disabled = fehler.length > 0;
    knopfLaden.disabled = fehler.length > 0;

    const wocheOk = Number.isInteger(set.jahr) && Number.isInteger(set.kw);
    pfadAnzeige.textContent = wocheOk ? setPfad(spielId, set.jahr, set.kw) : `content/sets/${spielId}/<jahr>-kw<nn>.json`;

    const vorhanden = wocheOk && vorhandeneSets().find((s) => s.jahr === set.jahr && s.kw === set.kw);
    doppelt.hidden = !vorhanden;
    if (vorhanden) {
      doppelt.textContent = `Für KW ${set.kw}/${set.jahr} gibt es schon ein Set („${vorhanden.titel}“). Die neue Datei würde es ersetzen.`;
    }

    letztesSet = fehler.length === 0 ? set : null;
    return letztesSet;
  }

  formular.addEventListener('input', () => {
    ergebnis.hidden = true;
    merke();
    pruefe();
  });

  // ---------- Knöpfe ----------

  knopfVorschau.addEventListener('click', () => {
    const set = pruefe();
    if (set) beiVorschau(structuredClone(set));
  });

  knopfLaden.addEventListener('click', () => {
    const set = pruefe();
    if (!set) return;
    const datei = setDateiname(set.jahr, set.kw);
    const blob = new Blob([`${JSON.stringify(set, null, 2)}\n`], { type: 'application/json' });
    const adresse = URL.createObjectURL(blob);
    const link = el('a', { href: adresse, download: datei });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(adresse), 2000);
    ergebnis.replaceChildren(
      `„${datei}“ wurde heruntergeladen. Datei in den Ordner legen und pushen:`,
      el('code', { class: 'editor__pfad', text: setPfad(spielId, set.jahr, set.kw) }),
    );
    ergebnis.hidden = false;
  });

  knopfUebernehmen.addEventListener('click', () => {
    const aktuell = aktuellesSet();
    if (!aktuell) return;
    fuelle({
      jahr: eingabe.jahr.value,
      kw: eingabe.kw.value,
      titel: aktuell.titel,
      notiz: aktuell.notiz,
      daten: aktuell.daten,
    });
    merke();
    pruefe();
  });

  knopfLeeren.addEventListener('click', () => {
    fuelle(leererEntwurf);
    merke();
    pruefe();
    ergebnis.hidden = true;
  });

  fuelle(entwurf.alle());
  wurzel.replaceChildren(formular);
  pruefe();

  return { pruefe };
}
