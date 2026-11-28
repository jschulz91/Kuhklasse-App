// Antwortverlauf im localStorage: die letzten Einträge eines Spiels, ältester zuerst.
// Robust wie settings.js: ohne Speicher (privates Fenster) bleibt der Verlauf
// einfach leer bzw. gilt nur für diese Sitzung.

const PRAEFIX = 'kuhklasse:';

/**
 * @param {string} name  Spiel-ID, z. B. "tripel" → Schlüssel "kuhklasse:tripel-verlauf"
 * @param {{ max?: number, gueltig?: (eintrag: object) => boolean }} optionen
 */
export function verlauf(name, { max = 500, gueltig = () => true } = {}) {
  const schluessel = `${PRAEFIX}${name}-verlauf`;
  let eintraege = [];

  try {
    const roh = JSON.parse(window.localStorage.getItem(schluessel) ?? '[]');
    if (Array.isArray(roh)) {
      eintraege = roh
        .filter((e) => e && typeof e === 'object' && Number.isFinite(e.t) && gueltig(e))
        .slice(-max);
    }
  } catch {
    /* kaputt oder gesperrt – leer anfangen */
  }

  const speichere = () => {
    try {
      window.localStorage.setItem(schluessel, JSON.stringify(eintraege));
    } catch {
      /* Speicher nicht verfügbar */
    }
  };

  return {
    /** Eintrag mit Zeitstempel anhängen; über `max` fallen die ältesten heraus. */
    hinzu(eintrag) {
      eintraege.push({ t: Date.now(), ...eintrag });
      if (eintraege.length > max) eintraege.splice(0, eintraege.length - max);
      speichere();
    },
    /** Kopie aller Einträge, ältester zuerst. */
    alle() {
      return eintraege.map((e) => ({ ...e }));
    },
    loeschen() {
      eintraege = [];
      try {
        window.localStorage.removeItem(schluessel);
      } catch {
        /* egal */
      }
    },
  };
}
