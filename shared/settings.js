// Einstellungen im localStorage – robust gegen gesperrten Speicher
// (privates Fenster, Datenschutz-Einstellungen). Ohne Speicher gelten
// einfach die Standardwerte.

const PRAEFIX = 'kuhklasse:';

function lies(name) {
  try {
    const roh = window.localStorage.getItem(PRAEFIX + name);
    return roh ? JSON.parse(roh) : null;
  } catch {
    return null;
  }
}

function schreib(name, wert) {
  try {
    window.localStorage.setItem(PRAEFIX + name, JSON.stringify(wert));
  } catch {
    /* Speicher nicht verfügbar – dann eben nur für diese Sitzung */
  }
}

function gleicherTyp(a, b) {
  if (Array.isArray(a)) return Array.isArray(b);
  if (a === null) return b === null;
  return typeof a === typeof b && b !== null && !Array.isArray(b);
}

/**
 * Einstellungen eines Bereichs (z. B. "kuhmaschine" oder "allgemein").
 * Nur Schlüssel aus `standard` werden übernommen, mit passendem Typ.
 */
export function einstellungen(name, standard) {
  const gespeichert = lies(name);
  const werte = structuredClone(standard);
  if (gespeichert && typeof gespeichert === 'object') {
    for (const schluessel of Object.keys(standard)) {
      if (schluessel in gespeichert && gleicherTyp(standard[schluessel], gespeichert[schluessel])) {
        werte[schluessel] = gespeichert[schluessel];
      }
    }
  }

  return {
    get(schluessel) {
      return werte[schluessel];
    },
    set(schluessel, wert) {
      werte[schluessel] = wert;
      schreib(name, werte);
    },
    alle() {
      return structuredClone(werte);
    },
  };
}

/** Gemeinsame Einstellungen für alle Spiele. */
export const allgemein = () => einstellungen('allgemein', { schrift: 'druck' });

/** Schriftart auf die Seite anwenden ("druck" oder "grund"). */
export function wendeSchriftAn(schrift) {
  document.documentElement.dataset.schrift = schrift === 'grund' ? 'grund' : 'druck';
}

/** Prüft, ob die Grundschrift-Datei geladen werden kann. */
export async function grundschriftVorhanden() {
  try {
    const geladen = await document.fonts.load('1em "Grundschrift"', 'Ma');
    return geladen.length > 0;
  } catch {
    return false;
  }
}
