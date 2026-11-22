// Inhalte laden und Wochen-Sets prüfen.
// Diese Datei läuft im Browser UND in Node (scripts/build-index.mjs).
// Darum: kein Zugriff auf document/window auf oberster Ebene.

/** Wurzel der Seite – funktioniert auch unter /repo-name/. */
export const WURZEL = new URL('../', import.meta.url);

export const RAHMEN_FELDER = ['spiel', 'jahr', 'kw', 'titel', 'notiz', 'daten'];

// ---------- Kalenderwochen (ISO 8601) ----------

export function isoWoche(datum = new Date()) {
  const d = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()));
  const wochentag = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - wochentag);
  const jahr = d.getUTCFullYear();
  const jahresanfang = Date.UTC(jahr, 0, 1);
  const kw = Math.ceil(((d.getTime() - jahresanfang) / 86400000 + 1) / 7);
  return { jahr, kw };
}

export function wochenImJahr(jahr) {
  // Der 28. Dezember liegt immer in der letzten ISO-Woche des Jahres.
  return isoWoche(new Date(jahr, 11, 28)).kw;
}

export function setDateiname(jahr, kw) {
  return `${jahr}-kw${String(kw).padStart(2, '0')}.json`;
}

export function setPfad(spielId, jahr, kw) {
  return `content/sets/${spielId}/${setDateiname(jahr, kw)}`;
}

// ---------- Prüfung ----------

export function istObjekt(wert) {
  return wert !== null && typeof wert === 'object' && !Array.isArray(wert);
}

/**
 * Prüft den gemeinsamen Rahmen eines Sets.
 * Gibt eine Liste verständlicher Fehlermeldungen zurück (leer = alles gut).
 */
export function pruefeRahmen(set, { spielId, datei } = {}) {
  if (!istObjekt(set)) return ['Die Datei muss ein JSON-Objekt sein: { "spiel": …, "jahr": …, … }'];

  const fehler = [];
  for (const schluessel of Object.keys(set)) {
    if (!RAHMEN_FELDER.includes(schluessel)) {
      fehler.push(`Unbekanntes Feld "${schluessel}". Erlaubt sind: ${RAHMEN_FELDER.join(', ')}.`);
    }
  }

  if (spielId !== undefined && set.spiel !== spielId) {
    fehler.push(`"spiel" muss "${spielId}" sein (so heißt der Ordner), gefunden: ${JSON.stringify(set.spiel)}.`);
  }

  let wocheOk = false;
  if (!Number.isInteger(set.jahr) || set.jahr < 2020 || set.jahr > 2100) {
    fehler.push(`"jahr" muss eine Jahreszahl wie 2026 sein (ohne Anführungszeichen), gefunden: ${JSON.stringify(set.jahr)}.`);
  } else {
    const max = wochenImJahr(set.jahr);
    if (!Number.isInteger(set.kw) || set.kw < 1 || set.kw > max) {
      fehler.push(`"kw" muss eine Zahl von 1 bis ${max} sein (ohne Anführungszeichen), gefunden: ${JSON.stringify(set.kw)}.`);
    } else {
      wocheOk = true;
    }
  }

  if (typeof set.titel !== 'string' || set.titel.trim() === '') {
    fehler.push('"titel" fehlt oder ist leer.');
  } else if (set.titel.length > 80) {
    fehler.push('"titel" ist zu lang (höchstens 80 Zeichen).');
  }

  if (set.notiz !== undefined && typeof set.notiz !== 'string') {
    fehler.push('"notiz" muss Text sein, z. B. "Arbeitsblatt Seite 12".');
  } else if (typeof set.notiz === 'string' && set.notiz.length > 200) {
    fehler.push('"notiz" ist zu lang (höchstens 200 Zeichen).');
  }

  if (!istObjekt(set.daten)) {
    fehler.push('"daten" fehlt oder ist kein Objekt { … }.');
  }

  if (datei !== undefined && wocheOk) {
    const erwartet = setDateiname(set.jahr, set.kw);
    if (datei !== erwartet) {
      fehler.push(`Dateiname passt nicht zu jahr/kw: erwartet "${erwartet}", heißt aber "${datei}".`);
    }
  }

  return fehler;
}

/** Rahmen + spielspezifische Daten prüfen. */
export function pruefeSet(set, { spielId, datei, pruefeDaten }) {
  const fehler = pruefeRahmen(set, { spielId, datei });
  if (istObjekt(set) && istObjekt(set.daten) && typeof pruefeDaten === 'function') {
    fehler.push(...pruefeDaten(set.daten));
  }
  return fehler;
}

// ---------- Laden (nur Browser) ----------

export async function ladeJson(pfad) {
  const antwort = await fetch(new URL(pfad, WURZEL), { cache: 'no-cache' });
  if (!antwort.ok) throw new Error(`${pfad} konnte nicht geladen werden (HTTP ${antwort.status}).`);
  return antwort.json();
}

export async function ladeFaecher() {
  const daten = await ladeJson('content/faecher.json');
  return [...(daten.faecher ?? [])].sort((a, b) => a.reihenfolge - b.reihenfolge);
}

export async function ladeSpiele() {
  const daten = await ladeJson('content/games.json');
  return daten.spiele ?? [];
}

/** Liste der Sets eines Spiels, neueste zuerst. Fehlt der Index: leere Liste. */
export async function ladeSetListe(spielId) {
  try {
    const index = await ladeJson(`content/sets/${spielId}/index.json`);
    return Array.isArray(index.sets) ? index.sets : [];
  } catch {
    return [];
  }
}

/** Ein Set laden und prüfen. Liefert { set, fehler }. */
export async function ladeSet(spielId, datei, pruefeDaten) {
  try {
    const set = await ladeJson(`content/sets/${spielId}/${datei}`);
    return { set, fehler: pruefeSet(set, { spielId, datei, pruefeDaten }) };
  } catch (fehler) {
    return { set: null, fehler: [fehler.message] };
  }
}
