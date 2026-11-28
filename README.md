# Kuhklasse

Eine kleine Lern-Webapp für Kinder in der 1. Klasse, zum Üben zu Hause. Sie läuft im
Browser auf Tablet, Handy und Laptop. Man muss nichts installieren und sich nicht anmelden.

> **Privates Hobbyprojekt.** Die Kuhklasse ist das Freizeitprojekt eines Elternteils.
> Sie ist kein Angebot einer Schule und keine geprüfte Lernsoftware. Inhalte und Übungen
> orientieren sich an dem, was die Kinder gerade in der Klasse lernen. Fehler sind trotzdem
> möglich, und im Zweifel gilt, was die Lehrkraft sagt. Die App ist kostenlos, nicht
> kommerziell und kann gern mit anderen Familien der Klasse geteilt werden.

## Die Spiele

### Kuhmaschine (Lesen)

Eine Melkmaschine zeigt Silben in großen Fenstern, darunter das ganze Wort, z. B.
„Ma lo ti“ → „Maloti“. Das Kind liest das Wort vor. Danach kommt eine Kuh aus der
Maschine und bekommt das Wort als Namen. Jede Kuh sieht anders aus. Eine kleine Uhr
auf der Maschine zählt die gelesenen Wörter bis 20.

Die Silben kommen entweder vom Leseblatt der Woche oder werden zufällig aus Buchstaben
gebaut, die das Kind schon kennt. Bis zu vier Silben pro Wort sind möglich.

### Silbenflug (Lesen)

Wie die Flugzeug-Tabelle auf den Leseblättern: Ein kleines Flugzeug zieht ein Banner mit
**einer Silbe** herein, das Kind liest sie laut vor. Die Begleitperson tippt auf den grünen
Haken, dann fliegt das Flugzeug weiter und bringt die nächste Silbe. Klappt eine Silbe noch
nicht, kommt sie mit dem Pfeil im Kreis ein paar Flüge später noch einmal. Wolken oben zeigen,
wie viele Flüge geschafft sind. Nach 20 Flügen landet das Flugzeug auf der Wiese, und eine Kuh
wartet schon.

### Tripel (Mathe)

Übt das Zerlegen im Zahlenraum bis 10 mit Tripel-Karten: Oben steht der „Boss“, unten zwei
Zahlen, die zusammen den Boss ergeben. Eine Zahl fehlt, das Kind tippt die richtige an.
Bei einer richtigen Antwort guckt eine kleine Kuh hinter der Karte hervor. Bei einer falschen
wird die Lösung gezeigt, und die Karte kommt etwas später noch einmal. Eine kleine Anzeige
zählt richtige und falsche Antworten der aktuellen Sitzung. Ein Tipp darauf öffnet den
Verlauf der letzten 500 Antworten, nach Tagen sortiert.

Die Kartenfarben entsprechen den Tripel-Karten aus der Klasse (Nachbarkarten,
Handkarten, Verdopplungen, Zehnerkarten und so weiter).

### Mischmasch (Kunst)

Farben mischen wie mit dem Tuschkasten: Oben steht ein Farbklecks als Ziel, unten ein
Tuschkasten mit Rot, Gelb, Blau, Weiß und Schwarz. Jeder Tipp auf ein Näpfchen gibt einen Tupfer
in die Schale, und die Farbe in der Schale mischt sich sofort neu. Passt die Farbe, läuft eine
große Kuh mit Flecken in genau dieser Farbe durchs Bild. Passt sie nicht, zeigt ein kleiner Hinweis, welche Farbe fehlt oder nicht
hineingehört. Mit dem Wasserglas wird die Schale ausgespült.

Gemischt wird nach dem Farbkreis (Gelb + Blau = Grün, nicht Grau wie bei Bildschirmlicht).
Es zählt das Verhältnis: 2 Gelb + 1 Blau ist dasselbe Gelbgrün wie 4 Gelb + 2 Blau. Es gibt
drei Stufen: Grundmischungen, Mengen sowie Hell und dunkel. Als zweite Spielart zeigt
„Was kommt raus?“ eine Mischung, und das Kind tippt die passende Farbe an.

## Für Kinder gemacht

- Große Knöpfe, die man ohne Lesen bedienen kann.
- Ruhige Gestaltung ohne Werbung, Punkte, Level oder Glitzer.
- Nur kurze, kleine Bewegungen. Ist am Gerät „Bewegung reduzieren“ eingestellt, bleibt alles still.
- Kein Ton.

## Elternbereich

Jedes Spiel hat oben rechts den Knopf **Eltern**. Dort lässt sich einstellen, was geübt wird,
z. B. welches Leseblatt, welche Buchstaben, wie viele Silben oder welche Tripel-Karten.
Außerdem gibt es eine Vollbild-Ansicht und die Wahl zwischen Druckschrift und Grundschrift.

## Datenschutz

- **Keine Anmeldung, keine Konten, keine Namen.** Die App fragt keine persönlichen Daten ab.
- **Kein Tracking, keine Werbung, keine Cookies, keine Analyse-Dienste.**
- **Keine Anfragen an fremde Server.** Schriften und Bilder liegen alle in der App selbst.
- **Einstellungen bleiben auf dem Gerät.** Gewählte Übungen, Schrift, der Stand der Zähluhr,
  die Bestätigung des Begrüßungshinweises und bei Tripel und Mischmasch die letzten 500 Antworten
  werden im Browser gespeichert (`localStorage`). Diese
  Daten verlassen das Gerät nicht und lassen sich jederzeit über die Browser-Einstellungen
  löschen („Website-Daten löschen“).
- **Hosting:** Die Seite wird über GitHub Pages ausgeliefert. Wie bei jeder Webseite verarbeitet
  der Anbieter dabei technisch notwendige Zugriffsdaten, z. B. die IP-Adresse. Details stehen in
  der [Datenschutzerklärung von GitHub](https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement).
- **Keine Fotos oder Scans von Arbeitsblättern im Projekt.** Aus den Übungsblättern werden nur
  einzelne Silben und Wörter übernommen.

Die Datenschutz-Hinweise stehen auch in der App selbst (Link unten auf der Startseite).

## Technik in Kürze

Reines HTML, CSS und JavaScript, ohne Framework und ohne externe Abhängigkeiten.
Die Druckschrift ist [ABeeZee](assets/fonts/ABeeZee-OFL.txt) (SIL Open Font License).
Notizen zur Pflege stehen in [docs/ENTWICKLUNG.md](docs/ENTWICKLUNG.md).
