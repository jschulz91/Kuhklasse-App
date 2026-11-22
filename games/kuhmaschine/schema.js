// Schema für den spielspezifischen Teil ("daten") eines Kuhmaschinen-Sets.
// Wird im Browser (Spiel + Set-Editor) und von scripts/build-index.mjs genutzt.

export const SPIEL_ID = 'kuhmaschine';

export const VOKALE = ['a', 'e', 'i', 'o', 'u', 'au', 'ei', 'eu', 'ie', 'ä', 'ö', 'ü', 'äu'];

const ANLAUT = /^[A-ZÄÖÜ][a-zäöüß]{0,2}$/;
const SILBE = /^[A-Za-zÄÖÜäöüß]{1,6}$/;
const MAX_EINTRAEGE = 100;

/** Felder für den Set-Editor. Typ "liste": durch Komma oder Leerzeichen getrennt. */
export const felder = [
  {
    name: 'anlaute',
    titel: 'Anlaute',
    hilfe: 'Großbuchstaben, z. B. M, L, T, Sch',
    beispiel: 'M, L, T',
  },
  {
    name: 'vokale',
    titel: 'Vokale',
    hilfe: `Kleinbuchstaben, erlaubt: ${VOKALE.join(', ')}`,
    beispiel: 'a, e, i, o, u',
  },
  {
    name: 'silben',
    titel: 'Silben',
    hilfe: 'Einzelne Silben vom Blatt, z. B. Ma, Lo, Ti. Leer lassen = Anlaute + Vokale kombinieren.',
    beispiel: 'Ma, Lo, Ti',
  },
  {
    name: 'woerter',
    titel: 'Wörter',
    hilfe: 'Silben mit Bindestrich trennen, 2 bis 4 Silben: Ma-ma, To-ma-te',
    beispiel: 'Ma-ma, To-ma-te',
  },
];

function pruefeListe(daten, name, fehler) {
  const wert = daten[name];
  if (wert === undefined) return [];
  if (!Array.isArray(wert) || wert.some((eintrag) => typeof eintrag !== 'string')) {
    fehler.push(`"${name}" muss eine Liste von Texten sein, z. B. ["Ma", "Lo"].`);
    return [];
  }
  if (wert.length > MAX_EINTRAEGE) {
    fehler.push(`"${name}" hat ${wert.length} Einträge – höchstens ${MAX_EINTRAEGE}.`);
  }
  return wert;
}

/** Prüft "daten". Gibt eine Liste von Fehlermeldungen zurück. */
export function pruefeDaten(daten) {
  const fehler = [];
  const erlaubt = felder.map((feld) => feld.name);

  for (const schluessel of Object.keys(daten)) {
    if (!erlaubt.includes(schluessel)) {
      fehler.push(`Unbekanntes Feld "daten.${schluessel}". Erlaubt sind: ${erlaubt.join(', ')}.`);
    }
  }

  const anlaute = pruefeListe(daten, 'anlaute', fehler);
  const vokale = pruefeListe(daten, 'vokale', fehler);
  const silben = pruefeListe(daten, 'silben', fehler);
  const woerter = pruefeListe(daten, 'woerter', fehler);

  for (const anlaut of anlaute) {
    if (!ANLAUT.test(anlaut)) {
      fehler.push(`Anlaut "${anlaut}": bitte mit Großbuchstaben, 1 bis 3 Buchstaben (z. B. "M" oder "Sch").`);
    }
  }

  for (const vokal of vokale) {
    if (!VOKALE.includes(vokal)) {
      fehler.push(`Vokal "${vokal}" ist nicht erlaubt. Möglich: ${VOKALE.join(', ')}.`);
    }
  }

  for (const silbe of silben) {
    if (!SILBE.test(silbe)) {
      fehler.push(`Silbe "${silbe}": nur Buchstaben, höchstens 6 (z. B. "Ma").`);
    }
  }

  for (const wort of woerter) {
    const teile = wort.split('-');
    if (teile.some((teil) => !SILBE.test(teil))) {
      fehler.push(`Wort "${wort}": nur Buchstaben, Silben mit Bindestrich trennen (z. B. "To-ma-te").`);
    } else if (teile.length < 2) {
      fehler.push(`Wort "${wort}": Silben mit Bindestrich trennen (z. B. "Ma-ma"). Die Maschine braucht 2 bis 4 Silben.`);
    } else if (teile.length > 4) {
      fehler.push(`Wort "${wort}" hat ${teile.length} Silben – die Maschine zeigt höchstens 4.`);
    }
  }

  const kombinierbar = silben.length > 0 || (anlaute.length > 0 && vokale.length > 0);
  if (woerter.length === 0 && !kombinierbar) {
    fehler.push('Das Set braucht Wörter, Silben oder Anlaute zusammen mit Vokalen – sonst hat die Maschine nichts zu zeigen.');
  }

  return fehler;
}
