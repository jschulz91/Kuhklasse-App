#!/usr/bin/env node
// Prüft alle Inhalte und erzeugt pro Spiel content/sets/<spiel-id>/index.json.
// Ohne Abhängigkeiten. Aufruf:  node scripts/build-index.mjs
// Bei Fehlern: verständliche Meldung und Exit-Code 1 (der Workflow bricht ab).

import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { pruefeSet, istObjekt } from '../shared/content.js';

const WURZEL = new URL('../', import.meta.url);
const pfad = (relativ) => new URL(relativ, WURZEL);

const fehler = [];
const meldung = (datei, text) => fehler.push({ datei, text });

async function existiert(relativ) {
  try {
    await access(pfad(relativ));
    return true;
  } catch {
    return false;
  }
}

async function ladeJsonDatei(relativ) {
  let text;
  try {
    text = await readFile(pfad(relativ), 'utf8');
  } catch {
    meldung(relativ, 'Datei fehlt.');
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    meldung(relativ, `Kein gültiges JSON: ${e.message}. Häufige Ursachen: Komma nach dem letzten Eintrag, fehlende Anführungszeichen.`);
    return undefined;
  }
}

function pruefeTextliste(daten, schluessel, datei) {
  const liste = daten?.[schluessel];
  if (!Array.isArray(liste) || liste.some((x) => typeof x !== 'string')) {
    meldung(datei, `"${schluessel}" muss eine Liste von Texten sein.`);
  }
}

// ---------- Fächer und Spiele ----------

const faecherDaten = await ladeJsonDatei('content/faecher.json');
const fachIds = new Set();
if (faecherDaten !== undefined) {
  if (!Array.isArray(faecherDaten?.faecher)) {
    meldung('content/faecher.json', 'Es fehlt die Liste "faecher": [ … ].');
  } else {
    const farben = ['creme', 'wiese', 'scheune', 'fleck', 'himmel'];
    for (const fach of faecherDaten.faecher) {
      if (typeof fach?.id !== 'string' || typeof fach?.titel !== 'string' || typeof fach?.reihenfolge !== 'number') {
        meldung('content/faecher.json', `Fach ${JSON.stringify(fach)} braucht "id", "titel" und "reihenfolge" (Zahl).`);
        continue;
      }
      if (!farben.includes(fach.farbe)) {
        meldung('content/faecher.json', `Fach "${fach.id}": "farbe" muss eine der Palettenfarben sein: ${farben.join(', ')}.`);
      }
      fachIds.add(fach.id);
    }
  }
}

const spieleDaten = await ladeJsonDatei('content/games.json');
const spiele = Array.isArray(spieleDaten?.spiele) ? spieleDaten.spiele : [];
if (spieleDaten !== undefined && !Array.isArray(spieleDaten?.spiele)) {
  meldung('content/games.json', 'Es fehlt die Liste "spiele": [ … ].');
}

const spielIds = new Set();
for (const spiel of spiele) {
  const name = spiel?.id ?? JSON.stringify(spiel);
  for (const feld of ['id', 'titel', 'fach', 'pfad', 'bild']) {
    if (typeof spiel?.[feld] !== 'string' || spiel[feld].trim() === '') {
      meldung('content/games.json', `Spiel "${name}": Feld "${feld}" fehlt.`);
    }
  }
  if (typeof spiel?.id !== 'string') continue;
  if (spielIds.has(spiel.id)) meldung('content/games.json', `Spiel "${spiel.id}" steht doppelt in der Liste.`);
  spielIds.add(spiel.id);
  if (!fachIds.has(spiel.fach)) {
    meldung('content/games.json', `Spiel "${spiel.id}": Fach "${spiel.fach}" gibt es nicht in content/faecher.json.`);
  }
  if (typeof spiel.pfad === 'string') {
    if (spiel.pfad.startsWith('/')) {
      meldung('content/games.json', `Spiel "${spiel.id}": "pfad" muss relativ sein (ohne / am Anfang), sonst klappt GitHub Pages nicht.`);
    } else if (!(await existiert(`${spiel.pfad.replace(/\/?$/, '/')}index.html`))) {
      meldung('content/games.json', `Spiel "${spiel.id}": ${spiel.pfad}index.html fehlt.`);
    }
  }
  if (typeof spiel.bild === 'string' && !(await existiert(spiel.bild))) {
    meldung('content/games.json', `Spiel "${spiel.id}": Bild ${spiel.bild} fehlt.`);
  }
}

// ---------- Sperrliste ----------

const sperrliste = await ladeJsonDatei('content/sperrliste.json');
if (sperrliste !== undefined) {
  pruefeTextliste(sperrliste, 'woerter', 'content/sperrliste.json');
  pruefeTextliste(sperrliste, 'teile', 'content/sperrliste.json');
}

// ---------- Wochen-Sets ----------

const indizes = [];
const spieleMitSets = spiele.filter((spiel) => spiel?.sets === true && typeof spiel.id === 'string');

for (const spiel of spieleMitSets) {
  const ordner = `content/sets/${spiel.id}/`;
  const schemaPfad = `games/${spiel.id}/schema.js`;
  let pruefeDaten;
  if (await existiert(schemaPfad)) {
    ({ pruefeDaten } = await import(pfad(schemaPfad).href));
  }
  if (typeof pruefeDaten !== 'function') {
    meldung(schemaPfad, 'Fehlt oder exportiert keine Funktion pruefeDaten(daten).');
    continue;
  }

  let dateien = [];
  try {
    dateien = (await readdir(pfad(ordner), { withFileTypes: true }))
      .filter((eintrag) => eintrag.isFile() && eintrag.name.endsWith('.json') && eintrag.name !== 'index.json')
      .map((eintrag) => eintrag.name);
  } catch {
    // Noch kein Ordner – dann eben ein leerer Index.
  }

  const sets = [];
  for (const datei of dateien) {
    const relativ = ordner + datei;
    if (!/^\d{4}-kw\d{2}\.json$/.test(datei)) {
      meldung(relativ, 'Dateiname muss so aussehen: 2026-kw47.json (Jahr, "-kw", zweistellige Woche).');
      continue;
    }
    const set = await ladeJsonDatei(relativ);
    if (set === undefined) continue;
    const setFehler = pruefeSet(set, { spielId: spiel.id, datei, pruefeDaten });
    for (const text of setFehler) meldung(relativ, text);
    if (setFehler.length === 0) {
      const eintrag = { datei, jahr: set.jahr, kw: set.kw, titel: set.titel.trim() };
      if (set.notiz) eintrag.notiz = set.notiz;
      sets.push(eintrag);
    }
  }

  sets.sort((a, b) => b.jahr - a.jahr || b.kw - a.kw);
  indizes.push({ ordner, spiel: spiel.id, sets });
}

// Ordner unter content/sets/, zu denen es kein Spiel gibt
try {
  for (const eintrag of await readdir(pfad('content/sets/'), { withFileTypes: true })) {
    if (eintrag.isDirectory() && !spieleMitSets.some((spiel) => spiel.id === eintrag.name)) {
      meldung(`content/sets/${eintrag.name}/`, `Kein Spiel mit id "${eintrag.name}" und "sets": true in content/games.json.`);
    }
  }
} catch {
  // kein content/sets/ – nichts zu prüfen
}

// ---------- Ergebnis ----------

if (fehler.length > 0) {
  console.error(`\n✗ ${fehler.length} Problem${fehler.length === 1 ? '' : 'e'} gefunden – es wurde nichts geschrieben.\n`);
  let letzte = '';
  for (const { datei, text } of fehler) {
    if (datei !== letzte) console.error(`  ${datei}`);
    console.error(`    – ${text}`);
    letzte = datei;
  }
  console.error('\nBitte die Datei(en) korrigieren und das Skript erneut starten.\n');
  process.exit(1);
}

for (const { ordner, spiel, sets } of indizes) {
  await mkdir(pfad(ordner), { recursive: true });
  const inhalt = { spiel, erzeugt: 'automatisch von scripts/build-index.mjs – nicht von Hand bearbeiten', sets };
  await writeFile(pfad(`${ordner}index.json`), `${JSON.stringify(inhalt, null, 2)}\n`);
  const liste = sets.map((set) => `KW ${set.kw}/${set.jahr}`).join(', ') || 'keine Sets';
  console.log(`✓ ${ordner}index.json – ${sets.length} Set${sets.length === 1 ? '' : 's'} (${liste})`);
}

if (!istObjekt(spieleDaten) || spiele.length === 0) {
  console.log('Hinweis: content/games.json enthält noch kein Spiel.');
}
