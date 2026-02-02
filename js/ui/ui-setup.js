import { State } from '../core/state.js';
import { GameEngine } from '../games/game-engine.js';
import { UI } from './ui-core.js';
import { AutodartsService } from '../core/autodarts-service.js';

// HINWEIS: Training Plans für Clean Sweep Phase deaktiviert
// import { TRAINING_PLANS } from '../core/training-plans.js'; 

// --- PRIVATE STATUS-VARIABLEN ---
const STORAGE_KEY_SETTINGS = 'dart_coach_settings_v2';
const STORAGE_KEY_LINEUP = 'dart_coach_global_lineup';

// Clean Sweep: Wir erzwingen 'x01' als Standard
let selectedGameType = 'x01';
let useAutodarts = false;
let setupLineup = []; 

// Standardwerte für X01
let x01Settings = { 
    startScore: 501,
    doubleIn: false,
    doubleOut: true,
    mode: 'legs', 
    bestOf: 3 
};

let singleTrainingSettings = {
    mode: 'ascending' // Standard: Aufsteigend
};

let shanghaiSettings = {
    mode: 'ascending', // ascending, descending, random
    length: 'standard' // standard (1-7), full (1-20)
};

const GAME_ICONS = {
    'x01': '👑',
	'single-training': '🎯',
	'shanghai': '🏯',
	'bobs27': '☠️'
};

// --- PRIVATE HELPER: SPEICHERN & LADEN ---

function _loadSettings() {
    try {
        const rawSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
        if (rawSettings) {
            const data = JSON.parse(rawSettings);
            // Wir ignorieren alte 'gameType' Werte und bleiben bei X01
            if (data.x01) x01Settings = { ...x01Settings, ...data.x01 };
        }

        const rawLineup = localStorage.getItem(STORAGE_KEY_LINEUP);
        if (rawLineup) {
            const savedLineup = JSON.parse(rawLineup);
            const allAvailableIds = State.getAvailablePlayers().map(p => p.id);
            // Nur IDs übernehmen, die es noch gibt
            setupLineup = savedLineup.filter(id => allAvailableIds.includes(id));
        }
    } catch (e) {
        console.warn("Konnte Einstellungen nicht vollständig laden", e);
    }
}

function _saveSettings() {
    try {
        const settingsData = {
            gameType: 'x01', // Hardcoded für Phase 1
            x01: x01Settings
        };
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settingsData));
        localStorage.setItem(STORAGE_KEY_LINEUP, JSON.stringify(setupLineup));
    } catch (e) {
        console.error("Speichern fehlgeschlagen", e);
    }
}

// --- PRIVATE RENDER-FUNKTIONEN ---

function _renderGameSelector() {
    const grid = document.getElementById('game-selector-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    // Clean Sweep: Nur X01 in der Liste
	const games = ['x01', 'single-training', 'shanghai', 'bobs27'];
    
    games.forEach(gKey => {
        const div = document.createElement('div');
        div.className = 'dashboard-card'; 
        // Style-Anpassung, damit die Karte bei nur einem Element gut aussieht
        div.style.gridColumn = "span 2"; 
        div.style.maxWidth = "400px";
        div.style.margin = "0 auto";
        
        // Aktive Auswahl visualisieren
        if (gKey === selectedGameType) {
            div.style.border = '2px solid var(--accent-color)';
            div.style.background = 'linear-gradient(145deg, var(--panel-color), #1a2e24)';
        }

        const label = UI.getGameLabel(gKey);
        
        div.innerHTML = `
            <div class="card-icon">${GAME_ICONS[gKey] || '🎯'}</div>
            <div class="card-content">
                <div class="card-title">${label}</div>
                <div class="card-sub">501 / 301 Classic</div>
            </div>
        `;
        
        div.onclick = () => {
            selectedGameType = gKey;
            _saveSettings(); 
            UI.showScreen('screen-match-setup');
            _initMatchSetup();
        };
        grid.appendChild(div);
    });
}

function _initMatchSetup() {
    _renderSetupLists();
    
    // Options-Wrapper immer anzeigen (da keine Trainingspläne mehr stören)
    const optWrapper = document.getElementById('setup-options-wrapper');
    if(optWrapper) {
        optWrapper.style.display = 'block';
        _renderSetupOptions(); 
    }
}

function _renderSetupOptions() {
    const c = document.getElementById('setup-options-container');
    if(!c) return;

    // SICHERUNG: Start-Button retten, bevor wir den Container leeren!
    // Wir entfernen ihn temporär aus dem DOM, damit innerHTML='' ihn nicht zerstört.
    const startBtn = document.getElementById('btn-start-match');
    if (startBtn && startBtn.parentElement) {
        startBtn.parentElement.removeChild(startBtn);
    }
    
    // Alten Footer ausblenden (falls er noch sichtbar ist)
    const footer = document.querySelector('.setup-footer');
    if(footer) footer.style.display = 'none';

    // Container leeren
    c.innerHTML = '';

    // --- 1. HEADER TOOLBAR (Neu) ---
    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.justifyContent = 'space-between';
    headerRow.style.alignItems = 'center';
    headerRow.style.marginBottom = '25px';
    headerRow.style.paddingBottom = '15px';
    headerRow.style.borderBottom = '1px solid #444';
    headerRow.style.flexWrap = 'wrap'; // Falls es doch mal zu eng wird
    headerRow.style.gap = '15px';

    // --- GRUPPE LINKS: Start & Titel ---
    const leftGrp = document.createElement('div');
    leftGrp.style.display = 'flex';
    leftGrp.style.alignItems = 'center';
    leftGrp.style.gap = '15px';

    // A) Game On Button einfügen
    if(startBtn) {
        // Style-Anpassung für den Header (kompakter, aber gleicher Look)
        startBtn.style.width = 'auto';
        startBtn.style.margin = '0';
        startBtn.style.padding = '10px 25px'; // Kompakter als im Footer
        startBtn.style.fontSize = '1rem';
        startBtn.style.minWidth = '140px';
        startBtn.innerHTML = "GAME ON 🚀"; 
        leftGrp.appendChild(startBtn);
    }

    // B) Spiel-Titel
    const gameLabel = UI.getGameLabel(selectedGameType);
    const title = document.createElement('span');
    title.style.fontSize = '1.3rem';
    title.style.fontWeight = '800';
    title.style.color = 'var(--text-color)';
    title.style.textTransform = 'uppercase';
    title.innerText = gameLabel;
    leftGrp.appendChild(title);

    headerRow.appendChild(leftGrp);

    // --- GRUPPE RECHTS: Autodarts & Info ---
    const rightGrp = document.createElement('div');
    rightGrp.style.display = 'flex';
    rightGrp.style.alignItems = 'center';
    rightGrp.style.gap = '10px';

    // C) Autodarts Toggle
    const btnAuto = document.createElement('button');
    btnAuto.className = 'opt-btn-big'; // Basis-Design beibehalten
    // Manuelle Anpassung für Header
    btnAuto.style.width = 'auto';
    btnAuto.style.minWidth = 'auto';
    btnAuto.style.padding = '10px 20px';
    btnAuto.style.fontSize = '0.9rem';
    btnAuto.style.flex = 'none'; // Verhindert Strecken
    
    if(useAutodarts) {
        btnAuto.innerHTML = "📡 Autodarts: <b>AN</b>";
        btnAuto.classList.add('active');
        btnAuto.style.borderColor = 'var(--accent-color)';
        btnAuto.style.color = 'white';
    } else {
        btnAuto.innerHTML = "📡 Autodarts: AUS";
        btnAuto.classList.remove('active');
        btnAuto.style.borderColor = '#444';
        btnAuto.style.color = '#aaa';
    }
    
    btnAuto.onclick = () => {
        useAutodarts = !useAutodarts;
        _renderSetupOptions(); // Neu rendern
    };
    rightGrp.appendChild(btnAuto);

    // D) Info Button
    const config = GameEngine.getGameConfig(selectedGameType);
    const descText = (config && config.description) ? config.description : "Keine Beschreibung verfügbar.";
    
    const btnInfo = document.createElement('button');
    btnInfo.className = 'icon-btn-square';
    // Etwas größer als Standard für bessere Touch-Bedienung im Header
    btnInfo.style.width = '44px';
    btnInfo.style.height = '44px';
    btnInfo.style.fontSize = '1.2rem';
    btnInfo.style.background = '#333';
    btnInfo.style.color = '#ccc';
    btnInfo.style.border = '1px solid #444';
    btnInfo.innerText = "ℹ️";
    btnInfo.onclick = () => {
        UI.showMatchModal("SPIELREGELN", descText, "ALLES KLAR");
    };
    rightGrp.appendChild(btnInfo);

    headerRow.appendChild(rightGrp);
    c.appendChild(headerRow);


    // --- 2. SPIEL-OPTIONEN RENDERN ---
    // (Unverändert, nur der Autodarts-Teil am Ende fällt weg)
    if (selectedGameType === 'x01') {
        _renderX01OptionsBig(c); 
    } 

	else if (selectedGameType === 'single-training') {
        _renderSingleTrainingOptions(c);
    }
	else if (selectedGameType === 'shanghai') {
        _renderShanghaiOptions(c);
    }
	else if (selectedGameType === 'bobs27') {
		// Bob's 27 hat meist fixe Regeln, wir zeigen nur eine Info an
		const info = document.createElement('div');
		info.className = 'opt-group-big';
		info.innerHTML = '<p style="color:#888; text-align:center;">Starte mit 27 Punkten.<br>Triff die Doppel. Fehlwürfe kosten Punkte.<br>Fall nicht unter 0!</p>';
		c.appendChild(info);
	}
    // (Alter Autodarts Block am Ende ist gelöscht)
}

function _renderX01OptionsBig(container) {
    // 1. START PUNKTE
    const grpScore = document.createElement('div'); grpScore.className = 'opt-group-big';
    grpScore.innerHTML = '<span class="opt-label-big">Start Punkte</span>';
    const rowScore = document.createElement('div'); rowScore.className = 'opt-row-big';
    
    [301, 501, 701].forEach(val => {
        const b = document.createElement('button');
        b.className = 'opt-btn-big ' + (x01Settings.startScore === val ? 'active' : '');
        b.innerText = val;
        b.onclick = () => { 
            x01Settings.startScore = val; 
            _saveSettings(); 
            _renderSetupOptions(); 
        };
        rowScore.appendChild(b);
    });
    grpScore.appendChild(rowScore);
    container.appendChild(grpScore);

    // 2. MODUS & LÄNGE
    const grpFmt = document.createElement('div'); grpFmt.className = 'opt-group-big';
    grpFmt.innerHTML = '<span class="opt-label-big">Modus & Länge</span>';
    const rowFmt = document.createElement('div'); rowFmt.className = 'opt-row-big';
    
    ['Legs', 'Sets'].forEach(m => {
        const b = document.createElement('button');
        b.className = 'opt-btn-big ' + (x01Settings.mode === m.toLowerCase() ? 'active' : '');
        b.innerText = m;
        b.onclick = () => { 
            x01Settings.mode = m.toLowerCase(); 
            _saveSettings(); 
            _renderSetupOptions(); 
        };
        rowFmt.appendChild(b);
    });
    grpFmt.appendChild(rowFmt);
    
    const rowLen = document.createElement('div'); rowLen.className = 'opt-row-big'; rowLen.style.marginTop = '10px';
    const lengths = x01Settings.mode === 'sets' ? [1, 3, 5] : [1, 3, 5, 7, 9, 11];
    
    lengths.forEach(val => {
        const b = document.createElement('button');
        b.className = 'opt-btn-big ' + (x01Settings.bestOf === val ? 'active' : '');
        b.innerText = "Best of " + val;
        b.onclick = () => { 
            x01Settings.bestOf = val; 
            _saveSettings(); 
            _renderSetupOptions(); 
        };
        rowLen.appendChild(b);
    });
    grpFmt.appendChild(rowLen);
    container.appendChild(grpFmt);

    // 3. CHECK IN / OUT
    const grpMode = document.createElement('div'); grpMode.className = 'opt-group-big';
    grpMode.innerHTML = '<span class="opt-label-big">Check In / Out</span>';
    const rowMode = document.createElement('div'); rowMode.className = 'opt-switch-row-big';
    
    const btnIn = document.createElement('button');
    btnIn.className = 'opt-btn-big ' + (x01Settings.doubleIn ? 'active' : '');
    btnIn.innerText = "Double In";
    btnIn.onclick = () => { 
        x01Settings.doubleIn = !x01Settings.doubleIn; 
        _saveSettings(); 
        _renderSetupOptions(); 
    };
    
    const btnOut = document.createElement('button');
    btnOut.className = 'opt-btn-big ' + (x01Settings.doubleOut ? 'active' : '');
    btnOut.innerText = "Double Out";
    btnOut.onclick = () => { 
        x01Settings.doubleOut = !x01Settings.doubleOut; 
        _saveSettings(); 
        _renderSetupOptions(); 
    };
    
    rowMode.appendChild(btnIn); rowMode.appendChild(btnOut);
    grpMode.appendChild(rowMode);
    container.appendChild(grpMode);
}

function _renderSingleTrainingOptions(container) {
    const grp = document.createElement('div'); 
    grp.className = 'opt-group-big';
    grp.innerHTML = '<span class="opt-label-big">Ziel-Reihenfolge</span>';
    
    const row = document.createElement('div'); 
    row.className = 'opt-row-big';
    
    // Die drei Modi als Buttons
    const modes = [
        { id: 'ascending', label: '📈 1 - 20' },
        { id: 'descending', label: '📉 20 - 1' },
        { id: 'random', label: '🎲 Zufall' }
    ];
    
    modes.forEach(m => {
        const b = document.createElement('button');
        // Checken, ob dieser Modus aktiv ist
        b.className = 'opt-btn-big ' + (singleTrainingSettings.mode === m.id ? 'active' : '');
        b.innerText = m.label;
        
        b.onclick = () => { 
            singleTrainingSettings.mode = m.id; 
            // Neu rendern, um Active-Klasse zu aktualisieren
            _renderSetupOptions(); 
        };
        row.appendChild(b);
    });
    
    grp.appendChild(row);
    container.appendChild(grp);
}

function _renderShanghaiOptions(container) {
    // 1. Modus (Auf/Ab/Zufall)
    const grpMode = document.createElement('div'); 
    grpMode.className = 'opt-group-big';
    grpMode.innerHTML = '<span class="opt-label-big">Reihenfolge</span>';
    const rowMode = document.createElement('div'); rowMode.className = 'opt-row-big';
    
    const modes = [
        { id: 'ascending', label: '📈 Auf' },
        { id: 'descending', label: '📉 Ab' },
        { id: 'random', label: '🎲 Zufall' }
    ];
    
    modes.forEach(m => {
        const b = document.createElement('button');
        b.className = 'opt-btn-big ' + (shanghaiSettings.mode === m.id ? 'active' : '');
        b.innerText = m.label;
        b.onclick = () => { 
            shanghaiSettings.mode = m.id; 
            _renderSetupOptions(); 
        };
        rowMode.appendChild(b);
    });
    grpMode.appendChild(rowMode);
    container.appendChild(grpMode);

    // 2. Länge (Standard vs Full)
    const grpLen = document.createElement('div'); 
    grpLen.className = 'opt-group-big';
    grpLen.innerHTML = '<span class="opt-label-big">Länge</span>';
    const rowLen = document.createElement('div'); rowLen.className = 'opt-row-big';
    
    const lengths = [
        { id: 'standard', label: 'Standard (1-7)' },
        { id: 'full', label: 'Full (1-20)' }
    ];
    
    lengths.forEach(l => {
        const b = document.createElement('button');
        b.className = 'opt-btn-big ' + (shanghaiSettings.length === l.id ? 'active' : '');
        b.innerText = l.label;
        b.onclick = () => { 
            shanghaiSettings.length = l.id; 
            _renderSetupOptions(); 
        };
        rowLen.appendChild(b);
    });
    grpLen.appendChild(rowLen);
    container.appendChild(grpLen);
}

function _renderSetupLists() {
    const poolList = document.getElementById('setup-pool-list');
    const lineupList = document.getElementById('setup-lineup-list');
    if(!poolList || !lineupList) return;

    poolList.innerHTML = '';
    lineupList.innerHTML = '';

    const allPlayers = State.getAvailablePlayers();

    // Lineup rendern
    if(setupLineup.length === 0) {
        lineupList.innerHTML = '<div class="empty-state" style="color:#666; text-align:center; padding:20px; font-style:italic;">Leer</div>';
    } else {
        setupLineup.forEach((pId, index) => {
            const p = allPlayers.find(x => x.id === pId);
            if(!p) return; // Falls Spieler gelöscht wurde

            const item = document.createElement('div');
            item.className = 'player-setup-card'; 
            item.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <span class="rank-badge">${index + 1}</span>
                    <span>${p.name}</span>
                </div>
                <span class="action-icon icon-remove">✕</span>
            `;
            item.onclick = () => {
                setupLineup.splice(index, 1);
                _renderSetupLists();
            };
            lineupList.appendChild(item);
        });
    }

    // Pool rendern (nur Spieler, die nicht im Lineup sind)
    const available = allPlayers.filter(p => !setupLineup.includes(p.id));
    if(available.length === 0) {
        poolList.innerHTML = '<div class="empty-state" style="color:#666; text-align:center; padding:20px; font-style:italic;">Alle gewählt</div>';
    }
    available.forEach(p => {
        const item = document.createElement('div');
        item.className = 'player-setup-card';
        item.innerHTML = `
            <span>${p.name}</span>
            <span class="action-icon icon-add">+</span>
        `;
        item.onclick = () => {
            setupLineup.push(p.id);
            _renderSetupLists();
        };
        poolList.appendChild(item);
    });
}

function _shuffleLineup() {
    if(setupLineup.length < 2) return;
    for (let i = setupLineup.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [setupLineup[i], setupLineup[j]] = [setupLineup[j], setupLineup[i]];
    }
    _saveSettings();
    _renderSetupLists();
}

// Clean Sweep: Training Helper entfernt, da nicht genutzt.

// --- PUBLIC INTERFACE ---
export const Setup = {
    init: function() {
        console.log("🛠 Setup Init (Clean Sweep: X01 Only)");
        _loadSettings();
    },

    showGameSelector: function() {
        _renderGameSelector();
        UI.showScreen('screen-game-selector');
    },

    openSetupForCurrent: function() {
        // Da wir nur X01 haben, öffnen wir immer das X01 Setup
        selectedGameType = 'x01';
        _initMatchSetup(); 
        UI.showScreen('screen-match-setup');
    },
	
	openSetupForCurrent: function() {
        // NEU: Dynamische Erkennung des aktuellen Spiels
        const session = State.getActiveSession();
        if (session) {
            selectedGameType = session.gameId;
            // Falls Settings existieren, laden wir diese zurück in die globalen Variablen
            if (session.gameId === 'x01' && session.settings) {
                // Achtung: Hier müssten wir theoretisch x01Settings mit session.settings mergen,
                // aber für den Neustart reicht es oft, den Typ zu setzen.
            }
        } 
        
        // Setup initialisieren und anzeigen
        _initMatchSetup(); 
        UI.showScreen('screen-match-setup');
    },

    handleStartMatch: function() {
        // 1. Prüfen, ob Spieler ausgewählt wurden
        if(setupLineup.length === 0) { 
            UI.showMatchModal("KEINE SPIELER", "Bitte wähle mindestens einen Spieler für das Match aus.", "Oki doki."); 
            return;
        }
        
        // 2. Autodarts Konfiguration
        if (useAutodarts) {
            console.log("📡 Starting with Autodarts enabled.");
            AutodartsService.enable((val) => GameEngine.onInput(val));
        } else {
            AutodartsService.disable();
        }
        
        // 3. Spiel starten (Clean Sweep: Direkt und ohne Trainings-Check)
        let gameSettings = null;

        if (selectedGameType === 'x01') {
            gameSettings = x01Settings;
        }
		else if (selectedGameType === 'single-training') {
            gameSettings = singleTrainingSettings;
        }
		else if (selectedGameType === 'shanghai') {
            gameSettings = shanghaiSettings;
        }
        else if (GameEngine.hasOptions(selectedGameType)) {
            // Falls wir später Spiele mit Optionen haben (z.B. Around the Clock)
            // Prüfen wir sicherheitshalber, ob selectedGameOption existiert
            if (typeof selectedGameOption !== 'undefined') {
                gameSettings = selectedGameOption;
            }
        }

        console.log(`🚀 Starting Game: ${selectedGameType}`);
        GameEngine.startGame(selectedGameType, setupLineup, gameSettings);
    },

    // Placeholder falls Buttons noch existieren, um Fehler zu vermeiden
    loadNextTrainingBlock: function() { console.warn("Training disabled"); },

    shuffle: _shuffleLineup,
    
    getCurrentGameType: () => 'x01',
    getCurrentSettings: () => x01Settings,
    isTrainingActive: () => false
};