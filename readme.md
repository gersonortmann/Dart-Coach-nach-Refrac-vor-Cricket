# 🎯 Dart Coach - Web Training Application

**Version:** 0.3.0 (Migration Phase)
**Status:** Active Development
**Projektleitung:** [Gerson]
**Lead Development:** Gemini AI

## 📖 Projekt-Übersicht
Der **Dart Coach** ist eine webbasierte Trainingsanwendung für Dartspieler. Ziel ist es, das Training durch intelligente Features wie Sprachausgabe (Caller), automatische Score-Berechnung und visuelles Feedback zu digitalisieren, ohne die Einfachheit eines klassischen Whiteboards zu verlieren.

Die App ist als **Progressive Web App (PWA)** konzipiert, die primär im Browser (Chrome/Safari) auf Tablets oder Windows11-PCs neben dem Dartboard läuft.

## 🏗 Architektur & Tech-Stack

Wir verfolgen einen **"No-Build-Tool" Ansatz** für maximale Einfachheit und Wartbarkeit.

* **Frontend:** HTML5, CSS3 (CSS Grid/Flexbox für Responsiveness).
* **Logic:** Vanilla JavaScript (ES6 Modules). Keine schweren Frameworks (wie React/Angular), um Latenz zu minimieren.
* **State Management:** Eigener `Store` oder Event-Bus System (siehe `/js/core/`).
* **Persistence:** `localStorage` für Spielstände und Statistiken.
* **Voice:** Web Speech API für Text-to-Speech (Caller) und Speech-to-Text (Eingabe).

## 📂 Ordnerstruktur & Datenübersicht

Die Anwendung besteht aus ca. 23 Kern-Dateien, organisiert in logische Module:

/ (Root)
├── index.html            # Single Page Application Struktur (Div-Container für Screens)
│
├── css/
│   ├── base.css          # Globale Variablen (:root), Reset, Typografie, Farben (--text-color, --seg-single...)
│   ├── layouts.css       # Grid-Systeme, Dashboard-Layout, Hauptcontainer
│   ├── components.css    # Wiederverwendbare UI (Buttons, Cards, Modals, Inputs)
│   └── game.css          # Spezifisches Styling für Game-Screen, Keypads, Scoreboards, Darts-Anzeige
│
└── js/
    ├── app.js            # Einstiegspunkt: Initialisiert Event Listener und UI
    │
    ├── core/
    │   ├── constants.js  # Statische Daten (Checkout-Tabellen, globale Configs)
    │   ├── state.js      # Zentrales State Management (Active Session, Players Array, History)
    │   └── store.js      # Wrapper für LocalStorage (Datenpersistenz)
    │
    ├── games/            # --- SPIEL-LOGIK (STRATEGY PATTERN) ---
    │   ├── game-engine.js    # Der MANAGER. Steuert den Spielablauf, Turn-Wechsel, Undo & Input-Routing.
    │   │                     # Enthält die STRATEGY_MAP für die Spiel-Module.
    │   │
    │   ├── x01.js            # Strategie: 501/301 logic (Score subtraktion, Double-Out check)
    │   ├── bobs27.js         # Strategie: Bob's 27 (Minuspunkte, Survival)
    │   ├── shanghai.js       # Strategie: Shanghai (Round-Targets, Shanghai-Finish Check)
    │   ├── catch40.js        # Strategie: Catch 40 (61-100 Finish Training, 6 Darts Limit)
    │   ├── around-clock.js   # Strategie: Around the Clock (1-20 sequence)
    │   ├── single-training.js# Strategie: Scoring Training (S=1, D=2, T=3)
    │   └── warmup.js         # Strategie: Warmup Routine (Summary Input Mode)
    │
    └── ui/               # --- UI LOGIK (DOM MANIPULATION) ---
        ├── ui-core.js    # Navigation zwischen Screens, Utility Functions
        ├── ui-game.js    # Rendering des aktiven Spiels (Scoreboard, Darts, Keypad-Sichtbarkeit)
        ├── ui-setup.js   # Rendering der Spielauswahl und Optionen (Game Setup)
        ├── ui-stats.js   # (In Entwicklung) Statistik-Anzeige
        ├── ui-mgmt.js    # Spieler-Verwaltung (Erstellen, Löschen, Bearbeiten)
        └── ui-auth.js    # Login und PIN-Handling

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