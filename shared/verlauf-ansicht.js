// Seitenleiste „Verlauf“: zeigt die gespeicherten Antworten eines Spiels,
// gruppiert nach Tag (neuester zuerst), mit Filter „Nur Fehler“ und Löschen mit Rückfrage.
// Das Spiel liefert nur, wie eine Zeile aussieht (Aufgabe, Eingabe, Lösung).

import { el, richteElternbereichEin } from './ui.js';

const ICON = {
  richtig:
    '<svg class="strich" viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
    '<path class="f-wiese" d="M20,4 C31,4 36,11 36,20 C36,30 30,36 20,36 C9,36 4,30 4,20 C4,10 10,4 20,4 Z"/>' +
    '<path class="f-keine" style="stroke: var(--creme); stroke-width: 4" d="M12,21 L18,27 L28,14"/></svg>',
  falsch:
    '<svg class="strich" viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
    '<path class="f-creme" d="M20,4 C31,4 36,11 36,20 C36,30 30,36 20,36 C9,36 4,30 4,20 C4,10 10,4 20,4 Z"/>' +
    '<path class="f-keine" d="M14,14 L26,26 M26,14 L14,26"/></svg>',
};

const SCHLIESSEN =
  '<svg class="strich" viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
  '<path class="f-keine" d="M10,10 L30,30 M30,10 L10,30"/></svg>';

export function icon(richtig) {
  const span = el('span', { class: 'verlauf__icon' }, el('span', { class: 'nur-vorlesen', text: richtig ? 'richtig' : 'falsch' }));
  span.insertAdjacentHTML('afterbegin', richtig ? ICON.richtig : ICON.falsch);
  return span;
}

function zaehler(richtig, falsch) {
  return el('span', { class: 'verlauf__zaehler' }, icon(true), String(richtig), icon(false), String(falsch));
}

const tagSchluessel = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function tagName(d) {
  const datum = d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  const gestern = new Date();
  gestern.setDate(gestern.getDate() - 1);
  if (tagSchluessel(d) === tagSchluessel(new Date())) return `Heute, ${datum}`;
  if (tagSchluessel(d) === tagSchluessel(gestern)) return `Gestern, ${datum}`;
  return datum;
}

/**
 * @param {{
 *   oeffner: HTMLElement,                 // Knopf, der den Verlauf öffnet (z. B. die Statistik)
 *   log: ReturnType<import('./verlauf.js').verlauf>,
 *   max: number,                          // nur für den Hinweistext
 *   istRichtig: (eintrag) => boolean,
 *   spalten: (eintrag) => { aufgabe: Node, eingabe: Node|string, loesung?: Node|string },
 *   andere?: { leiste: HTMLElement, oeffner: HTMLElement }[], // andere Seitenleisten, die zugehen
 * }} optionen
 * @returns {{ aktualisiere: () => void }}
 */
export function richteVerlaufsAnsichtEin({ oeffner, log, max, istRichtig, spalten, andere = [] }) {
  const summe = el('p');
  const nurFehler = el('input', { type: 'checkbox' });
  const liste = el('div');
  const loeschen = el('button', { type: 'button', class: 'knopf-text', text: 'Verlauf löschen' });
  const ja = el('button', { type: 'button', class: 'knopf-text', text: 'Ja, löschen' });
  const nein = el('button', { type: 'button', class: 'knopf-text', text: 'Abbrechen' });
  const loeschenReihe = el('div', { class: 'knopf-reihe' }, loeschen);
  const loeschenFrage = el(
    'div',
    { class: 'knopf-reihe', hidden: true },
    el('p', { class: 'verlauf__frage', text: 'Wirklich den ganzen Verlauf löschen?' }),
    ja,
    nein,
  );
  const schliesser = el('button', { type: 'button', class: 'eltern__zu', 'aria-label': 'Verlauf schließen' });
  schliesser.innerHTML = SCHLIESSEN;

  const leiste = el(
    'aside',
    { class: 'eltern verlauf', id: 'verlauf', 'aria-labelledby': 'verlauf-titel', hidden: true },
    el('div', { class: 'eltern__kopf' }, el('h2', { id: 'verlauf-titel', text: 'Verlauf' }), schliesser),
    el(
      'section',
      { class: 'eltern__abschnitt verlauf__oben' },
      summe,
      el('label', { class: 'verlauf__filter' }, nurFehler, el('span', { text: 'Nur Fehler zeigen' })),
    ),
    el('section', { class: 'eltern__abschnitt' }, liste),
    el(
      'section',
      { class: 'eltern__abschnitt' },
      el('p', { class: 'hinweis', text: `Gespeichert werden die letzten ${max} Antworten, nur auf diesem Gerät.` }),
      loeschenReihe,
      loeschenFrage,
    ),
  );
  document.body.append(leiste);
  oeffner.setAttribute('aria-controls', 'verlauf');

  function zeile(e) {
    const richtig = istRichtig(e);
    const { aufgabe, eingabe, loesung } = spalten(e);
    return el(
      'li',
      { class: 'verlauf__zeile', dataset: { ergebnis: richtig ? 'richtig' : 'falsch' } },
      aufgabe,
      el('span', { class: 'verlauf__eingabe' }, el('span', { class: 'nur-vorlesen', text: 'Eingabe ' }), eingabe),
      icon(richtig),
      el('span', { class: 'verlauf__loesung' }, richtig ? '' : loesung ?? ''),
    );
  }

  function aktualisiere() {
    const alle = log.alle().reverse(); // neueste zuerst
    const falschGesamt = alle.filter((e) => !istRichtig(e)).length;

    summe.replaceChildren(
      alle.length
        ? el(
            'span',
            {},
            alle.length === 1 ? 'Letzte Antwort: ' : `Letzte ${alle.length} Antworten: `,
            zaehler(alle.length - falschGesamt, falschGesamt),
          )
        : 'Noch keine Antworten gespeichert.',
    );

    const tage = new Map();
    for (const e of alle) {
      const d = new Date(e.t);
      const k = tagSchluessel(d);
      if (!tage.has(k)) tage.set(k, { datum: d, eintraege: [] });
      tage.get(k).eintraege.push(e);
    }

    liste.replaceChildren(
      ...[...tage.values()].map(({ datum, eintraege }) => {
        const falsch = eintraege.filter((e) => !istRichtig(e));
        const sichtbar = nurFehler.checked ? falsch : eintraege;
        return el(
          'section',
          { class: 'verlauf__tag' },
          el(
            'h3',
            { class: 'verlauf__tag-kopf' },
            el('span', { text: tagName(datum) }),
            zaehler(eintraege.length - falsch.length, falsch.length),
          ),
          sichtbar.length
            ? el('ol', { class: 'verlauf__liste' }, ...sichtbar.map(zeile))
            : el('p', { class: 'hinweis', text: 'Keine Fehler.' }),
        );
      }),
    );
    loeschenReihe.hidden = alle.length === 0;
    loeschenFrage.hidden = true;
  }

  richteElternbereichEin({ oeffner, leiste, schliesser });

  // immer nur eine Seitenleiste offen
  const zu = (andereLeiste, andererOeffner) => {
    andereLeiste.hidden = true;
    andererOeffner.setAttribute('aria-expanded', 'false');
  };
  oeffner.addEventListener('click', () => {
    if (leiste.hidden) return;
    for (const a of andere) zu(a.leiste, a.oeffner);
    aktualisiere();
  });
  for (const a of andere) {
    a.oeffner.addEventListener('click', () => {
      if (!a.leiste.hidden) zu(leiste, oeffner);
    });
  }

  nurFehler.addEventListener('change', aktualisiere);
  loeschen.addEventListener('click', () => {
    loeschenReihe.hidden = true;
    loeschenFrage.hidden = false;
    nein.focus();
  });
  nein.addEventListener('click', () => {
    loeschenFrage.hidden = true;
    loeschenReihe.hidden = false;
    loeschen.focus();
  });
  ja.addEventListener('click', () => {
    log.loeschen();
    aktualisiere();
    schliesser.focus();
  });

  return {
    /** Nach jeder neuen Antwort aufrufen – zeichnet nur neu, wenn der Verlauf offen ist. */
    aktualisiere() {
      if (!leiste.hidden) aktualisiere();
    },
  };
}
