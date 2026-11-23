// Tripel-Karten: Boss oben, zwei Zahlen unten, die zusammen den Boss ergeben.
// Die Farben folgen dem Elternbrief der Klasse. Jede Zerlegung gibt es
// zusätzlich als Tauschkarte (links und rechts vertauscht), außer bei Verdopplungen.

export const FARBEN = [
  {
    id: 'rosa',
    titel: 'Rosa',
    name: 'Nachbarkarten',
    hilfe: '1 mehr, 1 weniger: 10 = 9 + 1',
    paare: [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1]],
  },
  {
    id: 'gelb',
    titel: 'Gelb',
    name: 'Handkarten',
    hilfe: 'mit der 5: 8 = 5 + 3',
    paare: [[5, 1], [5, 2], [5, 3], [5, 4]],
  },
  {
    id: 'rot',
    titel: 'Rot',
    name: 'Verdopplungskarten',
    hilfe: 'doppelt: 8 = 4 + 4',
    paare: [[2, 2], [3, 3], [4, 4], [5, 5]],
  },
  {
    id: 'orange',
    titel: 'Orange',
    name: 'Zehnerkarten',
    hilfe: 'verliebte Zahlen: 10 = 7 + 3',
    paare: [[9, 1], [8, 2], [7, 3], [6, 4], [5, 5]],
  },
  {
    id: 'blau',
    titel: 'Blau',
    name: 'Restliche 5er und 7er',
    hilfe: '5 = 3 + 2 und 7 = 4 + 3',
    paare: [[3, 2], [4, 3]],
  },
  {
    id: 'gruen',
    titel: 'Grün',
    name: 'Restaufgaben',
    hilfe: '6 = 4 + 2, 8 = 6 + 2, 9 = 7 + 2, 9 = 6 + 3',
    paare: [[4, 2], [6, 2], [7, 2], [6, 3]],
  },
];

export const FARB_IDS = FARBEN.map((farbe) => farbe.id);

/** Alle Karten einer Farbe, inklusive Tauschkarten. */
export function kartenDerFarbe(farbId) {
  const farbe = FARBEN.find((f) => f.id === farbId);
  if (!farbe) return [];
  const karten = [];
  for (const [a, b] of farbe.paare) {
    karten.push({ farbe: farbe.id, boss: a + b, links: a, rechts: b });
    if (a !== b) karten.push({ farbe: farbe.id, boss: a + b, links: b, rechts: a });
  }
  return karten;
}

/** Karten mehrerer Farben. Eine Zerlegung, die in zwei Farben vorkommt, gibt es nur einmal. */
export function kartenFuer(farbIds) {
  const gesehen = new Set();
  const karten = [];
  for (const id of FARB_IDS.filter((f) => farbIds.includes(f))) {
    for (const karte of kartenDerFarbe(id)) {
      const schluessel = `${karte.boss}-${karte.links}-${karte.rechts}`;
      if (gesehen.has(schluessel)) continue;
      gesehen.add(schluessel);
      karten.push(karte);
    }
  }
  return karten;
}

/**
 * Antwortmöglichkeiten: die richtige Zahl plus naheliegende falsche
 * (Nachbarzahlen und Zahlen, die schon auf der Karte stehen). Aufsteigend sortiert.
 */
export function antwortenFuer(karte, position, anzahl, zufall = Math.random) {
  const richtig = karte[position];
  const min = position === 'boss' ? 2 : 1;
  const max = position === 'boss' ? 10 : 9;
  if (anzahl >= 10) return Array.from({ length: 10 }, (_, i) => i + 1);

  const imBereich = (z) => z >= min && z <= max && z !== richtig;
  const sichtbar = ['boss', 'links', 'rechts'].filter((p) => p !== position).map((p) => karte[p]);
  const nah = [richtig - 1, richtig + 1, ...sichtbar, richtig - 2, richtig + 2, richtig - 3, richtig + 3];

  const kandidaten = [...new Set(nah.filter(imBereich))];
  const falsche = [];
  // die ersten drei Kandidaten sind die „verwechselbaren“ – daraus zufällig wählen
  const vorne = kandidaten.slice(0, 3).sort(() => zufall() - 0.5);
  for (const z of [...vorne, ...kandidaten.slice(3)]) {
    if (falsche.length >= anzahl - 1) break;
    falsche.push(z);
  }
  for (let z = min; falsche.length < anzahl - 1 && z <= max; z++) {
    if (z !== richtig && !falsche.includes(z)) falsche.push(z);
  }
  return [richtig, ...falsche].sort((x, y) => x - y);
}
