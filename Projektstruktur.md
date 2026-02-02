### 📋 PROJEKT-KONTEXT: Dart Web App (Modular Refactored)

**Projekt-Status:**
Refactoring abgeschlossen. Die App nutzt Vanilla JS (ES6+), HTML5 und CSS3. Keine externen Frameworks.
Die Architektur basiert auf einem **Strategy Pattern** für die Spielelogik: Die `game-engine.js` agiert als Controller und lädt dynamisch die Logik-Module (z.B. `x01.js`, `bobs27.js`) basierend auf der Spielauswahl.


```text
### 📂 Projekt-Verzeichnisstruktur & Dateibeschreibungen

#### **Wurzelverzeichnis (Root)**

* **`.firebaserc`**: Konfigurationsdatei für Firebase-Projekte (Mapping von Aliases auf Projekt-IDs).
* **`.gitignore`**: Bestimmt, welche Dateien und Ordner von der Git-Versionskontrolle ignoriert werden (z.B. `.firebase/`).
* **`dateiliste.txt` / `dateistruktur.txt**`: Hilfsdateien zur Dokumentation der aktuellen Verzeichnisinhalte.
* **`firebase.json`**: Haupteinstellungen für das Firebase-Hosting, einschließlich Rewrites für die Single Page Application (SPA).
* **`index.html`**: Das zentrale HTML-Dokument der App. Enthält die Container für alle Screens und bindet die Firebase-SDKs sowie das Hauptmodul `app.js` ein.
* **`manifest.json`**: PWA-Manifest, das Metadaten für die Installation der App (Name, Icons, Farben, Anzeige-Modus) definiert.
* **`Projektstruktur.md`**: Diese Dokumentationsdatei zur Übersicht der Systemarchitektur.
* **`readme.md`**: Allgemeine Projektbeschreibung, technische Übersicht und Installationshinweise.
* **`sw.js`**: Service Worker der Progressive Web App; zuständig für das Caching von Assets und die Offline-Verfügbarkeit.
* **`TODO.md`**: Roadmap und Backlog für zukünftige Features und Fehlerbehebungen.

#### **`assets/`**

* **`icon-192.png` / `icon-512.png**`: App-Icons in verschiedenen Auflösungen für PWA-Installationen und Homescreen-Verknüpfungen.

#### **`css/` (Styling im Gaming-Design)**

* **`base.css`**: Globale CSS-Variablen (Farben, Abstände), Reset-Styles und grundlegendes Layout für den Header.
* **`components.css`**: Design-Bausteine wie Gaming-Karten, Hero-Buttons, Modals und das Styling des Statistik-Dashboards (Glassmorphism).
* **`game.css`**: Spezifische Stile für den Spielbildschirm, inklusive Target-Box, Dart-Anzeige, Keypads und dem SVG-Board.
* **`layouts.css`**: Definition der Grid-Systeme für die verschiedenen Screens (Dashboard, Setup, Management, Statistik).

#### **`js/` (Applikationslogik)**

* **`app.js`**: Der globale Einstiegspunkt (Entry Point). Initialisiert die UI-Module, prüft den Firebase-Login-Status und steuert das initiale Routing.

#### **`js/core/` (Zentrale Dienste & State)**

* **`autodarts-service.js`**: Schnittstelle zur Autodarts-API (Firebase Realtime DB), um Wurfsignale externer Kamerasysteme zu empfangen.
* **`constants.js`**: Statische Datenressourcen, insbesondere die umfangreiche Checkout-Tabelle für X01.
* **`state.js`**: Das "Gehirn" der App (Single Source of Truth). Verwaltet die aktive Sitzung, Spielerdaten und berechnet Live-Statistiken.
* **`stats-service.js`**: Verarbeitet historische Daten für das Statistik-Dashboard, übernimmt Filterungen und berechnet Trends sowie Heatmap-Koordinaten.
* **`store.js`**: Daten-Wrapper für Firebase. Übernimmt Authentifizierung und die Synchronisierung der Spielerprofile/Historien mit der Cloud.

#### **`js/games/` (Spiellogik / Strategy Pattern)**

* **`game-engine.js`**: Zentraler Controller, der den Spielablauf (Turn-Wechsel, Undo, Input-Routing) steuert und zwischen UI und Spielmodulen vermittelt.
* **`x01.js`**: Spielmodul für 301/501. Enthält die Logik für Subtraktion, Double-Out-Prüfung und spezifische X01-Metriken.

#### **`js/ui/` (UI-Module & DOM-Manipulation)**

* **`ui-auth.js`**: Steuert die Anzeige für Login, Registrierung und den Gast-Modus.
* **`ui-core.js`**: Der primäre UI-Router. Verwaltet Screen-Wechsel, Header-Buttons und globale Modals (Confirm/Match).
* **`ui-game.js`**: Zuständig für das Rendering des aktiven Spiels, inklusive Score-Updates und Animationen (Bust, Check, Miss).
* **`ui-keyboard.js`**: Logik für das Pro-Keypad (X01-Eingabe) mit Modifier-Handling für Double und Triple.
* **`ui-mgmt.js`**: Interface für die Spieler-Verwaltung (Hinzufügen, Löschen, Umbenennen) und die Einsicht in die Historie.
* **`ui-setup.js`**: Steuert die Spielauswahl und das Match-Setup (Spieler-Lineup, Regeln, Formate).
* **`ui-stats-board.js`**: Generiert das interaktive SVG-Dartboard für Heatmaps basierend auf mathematischen Koordinaten.
* **`ui-stats.js`**: Verwaltet das bildschirmfüllende Statistik-Dashboard inklusive Charts und Match-Liste.
* **`ui-result.js`**: Bereitet die Match-End-Card (Match Result) mit Spielerstatistiken und Heatmaps auf.

---

```

#### 🎨 DESIGN SYSTEM (CSS)

* **Dark Mode Basis:** Hintergrund `#1e1e1e`, Panels `#2d2d2d`.
* **Schriftfarbe:** `--text-color: #e4e4e4` (Soft White) für augenschonenden Kontrast.
* **Keypad Farben:**
* Single: `--seg-single` (Helles Minz)
* Double: `--seg-double` (Smaragd)
* Triple: `--seg-triple` (Sattes Grün)
* Hit/Miss: `--btn-hit-bg` (Grün) / `--btn-miss-bg` (Rot) mit schwarzer Schrift.


* **Icons:** Nutzen Emoji oder CSS-Formen.

#### ⚙️ WICHTIGE INTERFACES (JS)

**1. Game Strategy Interface (`js/games/*.js`):**
Jedes Spiel-Modul muss (optional oder zwingend) folgende Methoden bereitstellen:

* `config`: Objekt mit `{ hasOptions: bool, mode: 'darts'|'summary'|'mixed', defaultProInput: bool }`
* `generateTargets(options)`: Gibt Array von Zielen zurück.
* `initPlayer(player, settings)`: Setzt Startwerte (z.B. `runningScore`, `currentResidual`).
* `processThrow(player, inputVal, currentTarget)`: Berechnet Punkte/Status für einen Wurf.
* `finishTurn(player, totalScore, ...)`: (Optional) Wird nach 3 Darts aufgerufen für Runden-Abschluss-Logik (z.B. Bob's 27 Minuspunkte).

**2. Game Engine (`js/games/game-engine.js`):**

* Nutzt `window.DartApp.Games[StrategyName]` basierend auf der `STRATEGY_MAP`.
* Handelt `startGame`, `onInput` (vom Keypad), `undoLastAction`.
* Speichert den aktuellen Zustand via `State.updateSessionState()`.

**3. State Management (`js/core/state.js`):**

* Hält das `activeSession` Objekt.
* Struktur: `players` (Array), `roundIndex`, `currentPlayerIndex`, `tempDarts` (aktuelle Aufnahme), `historyStack` (für Undo).