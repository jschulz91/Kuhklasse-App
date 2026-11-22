# Kuhklasse

Lern-Webapp für die 1. Klasse. Erstes Spiel: die **Kuhmaschine** zum Silbenlesen.
Die Maschine zeigt Silben, das Kind liest, und danach kommt eine Kuh heraus, die
das gelesene Wort als Namen trägt.

Rein statisch (HTML, CSS, JavaScript-Module), ohne Build-Schritt, ohne Framework und
ohne externe Anfragen. Einstellungen liegen nur im `localStorage` des Geräts.

---

## Lokal ausprobieren

Benötigt: Node.js (ab Version 20) und Python 3 (oder ein anderer statischer Server).

```bash
node scripts/build-index.mjs      # Sets prüfen, Index erzeugen – vor jedem Test
python3 -m http.server 8000       # dann http://localhost:8000/ öffnen
```

**Unter einem Unterpfad testen** (so wie später auf GitHub Pages):

```bash
mkdir -p /tmp/pages && ln -sfn "$PWD" /tmp/pages/kuhklasse-app
cd /tmp/pages && python3 -m http.server 8000
# → http://localhost:8000/kuhklasse-app/
```

Die Seite direkt als Datei (`file://…`) zu öffnen funktioniert nicht, weil Browser
dort keine JavaScript-Module laden.

---

## Neues Wochen-Set hinzufügen

Ein Set gehört zu einem Arbeitsblatt und einer Kalenderwoche. Die Kuhmaschine nimmt
automatisch das neueste Set. Ältere Sets bleiben im Elternbereich unter „Woche“ zum
Wiederholen auswählbar.

### Weg A: mit dem Set-Editor (empfohlen)

1. Kuhmaschine öffnen → **Eltern** (oben rechts) → ganz unten **Neues Wochen-Set anlegen**.
2. Jahr und Kalenderwoche prüfen (vorausgefüllt mit der aktuellen Woche).
3. Titel eintragen, z. B. „Silben mit M, L, T“. Notiz ist freiwillig, z. B. „Arbeitsblatt Seite 12“.
4. Felder ausfüllen, durch Komma getrennt:
   - **Anlaute**: Großbuchstaben, z. B. `M, L, T, Sch`
   - **Vokale**: z. B. `a, e, i, o, u`
   - **Silben**: einzelne Silben vom Blatt, z. B. `Ma, Lo, Ti`
   - **Wörter**: Silben mit Bindestrich, 2 bis 4 Silben, z. B. `Ma-ma, To-ma-te`
5. Fehler stehen direkt unter dem Formular. Solange es Fehler gibt, sind die Knöpfe gesperrt.
6. **Im Spiel ausprobieren** zeigt das Set sofort in der Maschine, ohne etwas zu speichern.
   Oben erscheint „Vorschau“ mit dem Knopf **Beenden**.
7. **Herunterladen** speichert die Datei mit dem richtigen Namen, z. B. `2026-kw47.json`.
   Darunter steht, wohin sie im Repo gehört.
8. Datei nach `content/sets/kuhmaschine/` legen, committen und auf `main` pushen
   (geht auch im Browser auf GitHub: Ordner öffnen → *Add file* → *Upload files*).
9. Nach ein bis zwei Minuten ist das Set online. Fortschritt: Reiter **Actions** auf GitHub.

### Weg B: von Hand

Datei `content/sets/kuhmaschine/<jahr>-kw<nn>.json` anlegen (Woche immer zweistellig,
also `2026-kw07.json`):

```json
{
  "spiel": "kuhmaschine",
  "jahr": 2026,
  "kw": 47,
  "titel": "Silben mit M, L, T",
  "notiz": "Arbeitsblatt Seite 12",
  "daten": {
    "anlaute": ["M", "L", "T"],
    "vokale": ["a", "e", "i", "o", "u"],
    "silben": ["Ma", "Lo", "Ti"],
    "woerter": ["Ma-ma", "To-ma-te"]
  }
}
```

Dann lokal prüfen und pushen:

```bash
node scripts/build-index.mjs
```

### Was passiert, wenn ein Set fehlerhaft ist?

Das Skript `scripts/build-index.mjs` prüft jedes Set, lokal und im GitHub-Workflow.
Bei einem Fehler nennt es Datei und Problem, zum Beispiel:

```
✗ 1 Problem gefunden – es wurde nichts geschrieben.
  content/sets/kuhmaschine/2026-kw48.json
    – Wort "Tomate": Silben mit Bindestrich trennen (z. B. "Ma-ma").
```

Der Workflow bricht dann ab, und **die bisher veröffentlichte Seite bleibt unverändert**.
Datei korrigieren, erneut pushen, fertig.

### Wie die Maschine ein Set verwendet

| Einstellung „Aus dem Set nehmen“ | Ergebnis |
| --- | --- |
| Gemischt (Standard) | halb Wörter vom Blatt, halb zusammengesetzte Silben |
| Nur Wörter | nur `woerter` |
| Nur Silben | Silben aus `silben` zufällig kombiniert |

Ist `silben` leer, kombiniert die Maschine `anlaute` × `vokale` zu Silben.
Bei zusammengesetzten Silben ist die erste Silbe groß, der Rest klein
(„Ma“ + „lo“ + „ti“ → „Maloti“). Wörter vom Blatt erscheinen genau so, wie sie im Set stehen.

Die **Zähluhr** oben rechts auf der Maschine zählt jede Kuh, also jedes gelesene Wort, von 0 bis 20.
Danach beginnt sie wieder bei 0. Der Stand bleibt beim Neuladen erhalten. Im Elternbereich unter „Kuh“
lässt sich die Uhr auf 0 stellen.

**Bitte keine Fotos oder Scans von Arbeitsblättern ins Repo legen.** Das Set enthält nur
die Silben und Wörter.

---

## Sperrliste

`content/sperrliste.json` enthält Zufallswörter, die nie erscheinen sollen:

- `woerter`: genau dieses Wort (Groß-/Kleinschreibung egal)
- `teile`: jedes Wort, das diesen Teil enthält

Die Sperrliste gilt für zusammengesetzte Silben, nicht für Wörter aus einem Set.

---

## Neues Spiel anlegen

1. Ordner `games/<spiel-id>/` mit `index.html` anlegen (Vorlage: `games/kuhmaschine/`).
   Alle Pfade relativ schreiben, z. B. `../../shared/base.css`, niemals mit `/` am Anfang.
2. Eintrag in `content/games.json`:
   ```json
   {
     "id": "leserutsche",
     "titel": "Leserutsche",
     "fach": "lesen",
     "pfad": "games/leserutsche/",
     "bild": "assets/svg/kachel-leserutsche.svg",
     "sets": true
   }
   ```
   `fach` muss in `content/faecher.json` stehen. Ein Fach erscheint auf der
   Startseite erst, wenn es mindestens ein Spiel hat.
3. Kachelbild als SVG nach `assets/svg/` legen. Farben aus der Palette, 3 px dunkelbraune Kontur.
4. Nur wenn das Spiel Wochen-Sets nutzt (`"sets": true`): `games/<spiel-id>/schema.js` anlegen mit
   - `export const felder = [{ name, titel, hilfe, beispiel }, …]`. Daraus baut der
     Set-Editor sein Formular (`shared/set-editor.js`). Jedes Feld ist eine Liste.
   - `export function pruefeDaten(daten)`, gibt eine Liste von Fehlermeldungen zurück (leer = gültig).

   Den Rahmen (`spiel`, `jahr`, `kw`, `titel`, `notiz`, Dateiname) prüft `shared/content.js`
   für alle Spiele gleich. Sets kommen nach `content/sets/<spiel-id>/`.
5. `node scripts/build-index.mjs` ausführen. Das Skript prüft auch, ob Ordner, Bild und
   Fach existieren.

Hilfreiche gemeinsame Bausteine in `shared/`:

| Datei | Inhalt |
| --- | --- |
| `tokens.css` | Palette, Schriften, Rundungen, Abstände |
| `base.css` | Kopfleiste, Knöpfe, Elternbereich, Editor-Stile |
| `settings.js` | Einstellungen im `localStorage` (mit Fallback) |
| `content.js` | Laden von Fächern, Spielen, Sets und Prüfung des Set-Rahmens |
| `set-editor.js` | Formular, Prüfung, Vorschau, Download |
| `ui.js` | Vollbild, Elternbereich, kleiner DOM-Helfer |
| `cow.js` | Kühe aus zufälligen SVG-Teilen |

---

## Veröffentlichen auf GitHub Pages

Einmalig einrichten:

1. Repo auf GitHub → **Settings** → **Pages**.
2. Bei **Build and deployment** → **Source**: **GitHub Actions** wählen.
3. Fertig. Jeder Push auf `main` startet `.github/workflows/pages.yml`:
   Sets prüfen → Index erzeugen → Seite veröffentlichen.

Die Seite liegt dann unter `https://<benutzer>.github.io/<repo-name>/`. Alle Pfade sind relativ,
der Unterpfad funktioniert deshalb ohne Anpassung. Den Workflow kann man unter
**Actions** → *Seite veröffentlichen* → **Run workflow** auch von Hand starten.

Die Dateien `content/sets/*/index.json` erzeugt der Workflow. Sie stehen in `.gitignore`
und werden nicht von Hand bearbeitet.

---

## Grundschrift

Die Druckschrift ist ABeeZee (SIL Open Font License, liegt in `assets/fonts/`).
Für die Grundschrift ist ein Platz vorbereitet: Datei als
`assets/fonts/grundschrift.woff2` ablegen, danach kann man sie im Elternbereich unter
„Schrift“ wählen. Fehlt die Datei, zeigt der Elternbereich einen Hinweis und die Seite
nutzt die Druckschrift. Nur eine Schrift verwenden, deren Lizenz die Einbindung auf
einer Webseite erlaubt.

---

## Datenschutz

- Keine externen Anfragen: keine CDNs, keine Web-Schriften von fremden Servern, kein Tracking.
- Kein Backend, keine Konten. Einstellungen bleiben im Browser des Geräts (`localStorage`).
- Keine Namen oder anderen persönlichen Daten im Code oder in den Sets.

## Struktur

```
index.html                        Startseite: Fächer mit Spiel-Kacheln
games/kuhmaschine/                index.html, game.js, game.css, schema.js
shared/                           gemeinsame Bausteine (siehe oben)
content/faecher.json              Fächer (Reihenfolge, Farbe)
content/games.json                Spieleliste
content/sperrliste.json           gesperrte Zufallswörter
content/sets/<spiel>/<jahr>-kw<nn>.json   Wochen-Sets
scripts/build-index.mjs           Prüfung + Index (Node, ohne Abhängigkeiten)
assets/fonts/, assets/svg/        Schriften, Kachelbilder
.github/workflows/pages.yml       Veröffentlichung
```
