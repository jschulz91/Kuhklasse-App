// Warteseite: Countdown bis zum Türchen am 16. Dezember (deutsche Zeit).
// Hinweis: Die Uhrzeit kommt vom Gerät des Besuchers.

const TUERCHEN = { jahr: 2026, monat: 12, tag: 16 };

const $ = (id) => document.getElementById(id);

/** Heutiges Datum in deutscher Zeit, unabhängig von der Zeitzone des Geräts. */
function heuteInDeutschland() {
  const teile = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date());
  const wert = (typ) => Number(teile.find((t) => t.type === typ).value);
  return Date.UTC(wert('year'), wert('month') - 1, wert('day'));
}

/** Anzahl Nächte bis zum Türchen: am 15. Dezember ist es noch 1 Nacht. */
function naechteBisZumTuerchen() {
  const ziel = Date.UTC(TUERCHEN.jahr, TUERCHEN.monat - 1, TUERCHEN.tag);
  return Math.round((ziel - heuteInDeutschland()) / 86400000);
}

function aktualisiere() {
  const naechte = naechteBisZumTuerchen();
  if (naechte <= 0) {
    $('countdown').hidden = true;
    $('offen').hidden = false;
    $('hinweis').textContent = 'Schön, dass du da bist. Viel Freude!';
    return false;
  }
  $('naechte').textContent = String(naechte);
  $('naechte-name').textContent = naechte === 1 ? 'NACHT' : 'NÄCHTE';
  $('countdown').setAttribute('aria-label', `Noch ${naechte} ${naechte === 1 ? 'Nacht' : 'Nächte'}`);
  return true;
}

// Einmal pro Minute prüfen, damit um Mitternacht die Zahl umspringt.
if (aktualisiere()) {
  const takt = setInterval(() => {
    if (!aktualisiere()) clearInterval(takt);
  }, 60000);
}

// ---------- Sterne und leiser Schneefall ----------

const himmel = $('himmel');
const STERN = 'M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z';
const sterne = [
  [8, 6, 16], [86, 4, 20], [70, 15, 12], [14, 30, 11], [92, 34, 14], [4, 52, 10], [95, 60, 12],
];
for (const [x, y, groesse] of sterne) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'stern');
  svg.style.cssText = `left:${x}%;top:${y}%;--g:${groesse}px;--v:${(-Math.random() * 4).toFixed(1)}s`;
  const pfad = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pfad.setAttribute('d', STERN);
  svg.append(pfad);
  himmel.append(svg);
}

for (let i = 0; i < 18; i++) {
  const flocke = document.createElement('span');
  flocke.className = 'flocke';
  flocke.style.cssText =
    `left:${(Math.random() * 100).toFixed(1)}%;` +
    `--g:${(3 + Math.random() * 5).toFixed(1)}px;` +
    `--d:${(12 + Math.random() * 12).toFixed(1)}s;` +
    `--v:${(-Math.random() * 24).toFixed(1)}s`;
  himmel.append(flocke);
}
