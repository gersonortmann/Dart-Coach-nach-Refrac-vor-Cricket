import { State } from '../core/state.js';
import { GameEngine } from '../games/game-engine.js';
import { Auth } from './ui-auth.js';
import { Setup } from './ui-setup.js';
import { Stats } from './ui-stats.js';
import { Management } from './ui-mgmt.js';
import { Game } from './ui-game.js';
import { Keyboard } from './ui-keyboard.js';
import { AutodartsService } from '../core/autodarts-service.js';

const GAME_NAMES = {
    'x01': 'X01 Match',
	'single-training': 'Single Training',
	'shanghai': 'Shanghai',
	'bobs27': "Bob's 27"
    /* CLEAN SWEEP: Andere Spiele vorerst deaktiviert
    'cricket': 'Cricket',
    'warmup': 'Warmup Routine',
    'aroundclock': 'Around the Clock',
    'catch40': 'Catch 40',
    */
};

const SCREEN_CONFIG = {
    'screen-login': { 
        home: false, restart: false, logout: false, 
        badge: false, title: "🎯 DART COACH V2" 
    },
    'screen-dashboard': { 
        home: false, restart: false, logout: true, 
        badge: false, title: "Dart Coach V2.0 by Schlomo" 
    },
    'screen-game-selector': { 
        home: true, restart: false, logout: false, 
        badge: false, title: "Dart Coach V2.0 by Schlomo" 
    },
    'screen-match-setup': { 
        home: true, restart: false, logout: false, 
        badge: false, title: "DYNAMIC_SETUP" // Platzhalter für dynamischen Titel
    },
    'screen-game': { 
        home: true, restart: true, logout: false, 
        badge: true, title: "DYNAMIC_GAME"   // Platzhalter für dynamischen Titel
    },
    'screen-result': { 
        home: false, restart: false, logout: false, 
        badge: false, title: "MATCH RESULT" 
    }
};

// --- HELPER FUNKTIONEN (Privat im Modul) ---

function _updateHeaderButtons(config) {
    const btnHome = document.getElementById('btn-home');
    const btnRestart = document.getElementById('btn-restart');
    const btnLogout = document.getElementById('btn-logout'); 
    const adBadge = document.getElementById('ad-status-badge');

    // Sichtbarkeit setzen (Fallback auf 'none' wenn Element fehlt)
    if (btnHome) btnHome.style.display = config.home ? 'flex' : 'none';
    if (btnRestart) btnRestart.style.display = config.restart ? 'flex' : 'none';
    if (btnLogout) btnLogout.style.display = config.logout ? 'flex' : 'none';

    // Autodarts Badge Logik
    if (adBadge) {
        if (config.badge && AutodartsService.isActive()) {
            adBadge.classList.remove('hidden');
            adBadge.classList.add('connected');
            const t = document.getElementById('ad-status-text');
            if(t) t.innerText = "AUTODARTS: ON";
        } else {
            adBadge.classList.add('hidden');
        }
    }
}

function _getGameTitle() {
    // Versuche Titel aus der laufenden Session zu holen
    const session = State.getActiveSession();
    if (session && session.settings) {
        const type = session.gameId;
        const settings = session.settings;
        let title = GAME_NAMES[type] || "DART COACH";

        if (type === 'x01') {
            title = `${settings.startScore}`;
            let details = [];
            const modeLabel = settings.mode === 'sets' ? 'Sets' : 'Legs';
            details.push(`Best of ${settings.bestOf} ${modeLabel}`);
            if (settings.doubleIn) details.push("Double In");
            if (settings.doubleOut) details.push("Double Out");
            if (details.length > 0) title += ` (${details.join(', ')})`;
        }
        return title.toUpperCase();
    }
    
    // Fallback: Setup Modul (wenn noch kein Spiel läuft)
    if (Setup) {
        const type = Setup.getCurrentGameType();
        let t = GAME_NAMES[type] || "DART COACH";
        // if(Setup.isTrainingActive()) t = "TRAINING - " + t; // Optional, falls Training wiederkommt
        return t.toUpperCase();
    }
    return "DART COACH";
}

function _showMatchModal(title, message, btnText, callback) {
	const modal = document.createElement('div');
	modal.className = 'modal-overlay'; 
	
	// Timeout für Animation
	setTimeout(() => modal.classList.add('active'), 10);

	modal.innerHTML = `
		<div class="modal-box">
			<h2 class="modal-title">${title}</h2>
			<p class="modal-text">${message}</p>
			
			<div style="display:flex; justify-content:center;">
				<button id="modal-btn-next" class="btn-hero btn-hero-primary" style="min-width:180px;">
					${btnText || "WEITER"}
				</button>
			</div>
		</div>
	`;

	document.body.appendChild(modal);

	const btnNext = modal.querySelector('#modal-btn-next');

	const close = () => {
		modal.classList.remove('active');
		setTimeout(() => {
			if(modal.parentNode) document.body.removeChild(modal);
		}, 300);
	};

	btnNext.onclick = () => {
		close();
		if (callback) callback();
	};
	
	// Optional: Enter-Taste zum Bestätigen
	const keyHandler = (e) => {
		if(e.key === 'Enter') {
			document.removeEventListener('keydown', keyHandler);
			btnNext.click();
		}
	};
	document.addEventListener('keydown', keyHandler);
}

function _getSetupTitle() {
    let gameName = "GAME";
    if (Setup) {
        const type = Setup.getCurrentGameType();
        gameName = GAME_NAMES[type] || type;
    }
    return ("MATCH SETUP - " + gameName).toUpperCase();
}

function _toggleFullscreen() { 
    const e = document.documentElement; 
    if(!document.fullscreenElement) e.requestFullscreen().catch(()=>{}); else document.exitFullscreen(); 
}

function _showConfirm(title, message, onConfirm, options = {}) {
    const confirmLabel = options.confirmLabel || "JA";
    const cancelLabel = options.cancelLabel || "ABBRECHEN";
    // Standard-Klassen nutzen, falls keine übergeben werden
    const confirmClass = options.confirmClass || "btn-hero-primary"; 
    const cancelClass = options.cancelClass || "btn-hero-secondary"; 

    const modal = document.createElement('div');
    // 'active' Klasse sorgt für den Fade-In Effekt (siehe CSS)
    modal.className = 'modal-overlay'; 
    
    // Kleines Timeout, damit die Animation greift
    setTimeout(() => modal.classList.add('active'), 10);

    modal.innerHTML = `
        <div class="modal-box">
            <h2 style="margin-top:0; margin-bottom:15px; color:var(--text-color); font-size:1.5rem;">${title}</h2>
            <p style="color:#ccc; margin-bottom:30px; line-height:1.5; font-size:1rem;">${message}</p>
            
            <div style="display:flex; gap:15px; justify-content:center;">
                <button id="modal-btn-confirm" class="btn-hero ${confirmClass}" style="min-width:120px; font-size:0.9rem; padding:12px;">
                    ${confirmLabel}
                </button>
                <button id="modal-btn-cancel" class="btn-hero ${cancelClass}" style="min-width:120px; font-size:0.9rem; padding:12px;">
                    ${cancelLabel}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const btnConfirm = modal.querySelector('#modal-btn-confirm');
    const btnCancel = modal.querySelector('#modal-btn-cancel');

    const close = () => {
        modal.classList.remove('active');
        // Warten bis CSS Animation fertig ist, dann aus DOM entfernen
        setTimeout(() => {
            if(modal.parentNode) document.body.removeChild(modal);
        }, 300);
    };

    btnConfirm.onclick = () => {
        close();
        if (onConfirm) onConfirm();
    };

    btnCancel.onclick = () => {
        close();
    };
}

// --- PUBLIC INTERFACE (Export) ---
export const UI = {
    // Hilfsfunktionen für Sub-Module
    getGameLabel: (key) => GAME_NAMES[key] || key,
    isGuest: () => Auth ? Auth.isGuest() : false,
    showConfirm: _showConfirm,
	showMatchModal: _showMatchModal,
	showOverlay: (content, type) => { if(Game) Game.showOverlay(content, type); },

    init: function() {
        // SUB-MODULE INITIALISIEREN
        if(Auth) Auth.init();
        if(Setup) Setup.init();
		if(Keyboard) Keyboard.init();
        // Mgmt & Stats brauchen kein Init beim Start, werden beim Klick initiiert
        
        // --- EVENT LISTENER ---

        // Dashboard Buttons
        const btnPlay = document.getElementById('dash-btn-play'); 
        if(btnPlay) btnPlay.addEventListener('click', () => { 
            if(Setup) Setup.showGameSelector(); 
        });
        
        const btnTrain = document.getElementById('dash-btn-training'); 
        if(btnTrain) btnTrain.addEventListener('click', () => { 
            this.showMatchModal("TRAININGSPLÄNE", "Dieses Feature befindet sich noch im Aufbau. Hier findest du bald kuratierte Routinen für dein Training.", "Oki doki."); 
        });

        const btnStats = document.getElementById('dash-btn-stats');
        if(btnStats) btnStats.addEventListener('click', () => {
            if (Stats) { Stats.init(); }
            this.showScreen('screen-stats');
        });

        const btnSettings = document.getElementById('dash-btn-settings');
        if(btnSettings) btnSettings.addEventListener('click', () => {
            if (Management) { Management.init(); }
            this.showScreen('screen-management');
        });

        // Setup Buttons
        const btnShuffle = document.getElementById('btn-shuffle-players'); 
        if(btnShuffle) btnShuffle.addEventListener('click', () => {
            if(Setup) Setup.shuffle();
        });
        
        const btnStart = document.getElementById('btn-start-match');
        if(btnStart) btnStart.addEventListener('click', () => {
             if(Setup) Setup.handleStartMatch();
        });

        // Global Navigation
        const btnFinish = document.getElementById('btn-finish-game');
        if(btnFinish) btnFinish.addEventListener('click', async () => { 
            const isGuest = this.isGuest(); 
            if(!isGuest) await State.saveActiveSession(); 
            
            // CLEAN SWEEP: Training Plans deaktiviert
            /*
            const activePlan = State.getActivePlan();
            if (activePlan) {
                const result = State.advancePlanBlock();
                if (result.finished) { 
                    this.showMatchModal("TRAINING BEENDET", "Alle Blöcke absolviert. Starke Leistung!", "ZUM MENÜ", () => { this.showScreen('screen-dashboard'); }); 
                } else { 
                    if(Setup) Setup.loadNextTrainingBlock(); 
                }
            } else { 
                this.showScreen('screen-dashboard'); 
            }
            */
            // Stattdessen direkt zum Dashboard:
			this.showScreen('screen-dashboard');
        });

        const btnFull = document.getElementById('btn-fullscreen'); 
        if(btnFull) btnFull.addEventListener('click', _toggleFullscreen);
        
        document.querySelectorAll('.back-btn').forEach(b => b.addEventListener('click', () => { this.showScreen('screen-dashboard'); }));
        
        const btnHome = document.getElementById('btn-home'); 
        if(btnHome) btnHome.addEventListener('click', () => { 
            if(State.getCurrentScreen() === 'screen-game') { 
                // KORREKTUR: Jetzt mit 3 Argumenten: (Titel, Text, Callback)
                _showConfirm(
                    "MENÜ", 
                    "Möchtest du das Spiel abbrechen und zum Hauptmenü zurückkehren?", 
                    () => { 
                        State.setScreen('screen-dashboard'); 
                        this.showScreen('screen-dashboard'); 
                    }
                ); 
            } else { 
                State.setScreen('screen-dashboard'); 
                this.showScreen('screen-dashboard'); 
            } 
        });

        const btnRestart = document.getElementById('btn-restart'); 
        if(btnRestart) btnRestart.addEventListener('click', () => { 
            // KORREKTUR: Jetzt mit 3 Argumenten: (Titel, Text, Callback)
            _showConfirm(
                "NEUSTART",
                "Möchtest du wirklich zurück zum Setup? Das aktuelle Spiel wird beendet.", 
                () => { 
                     if(Setup) Setup.openSetupForCurrent();
                }
            ); 
        });
		
		AutodartsService.setStatusListener((status) => {
            const badge = document.getElementById('ad-status-badge');
            const text = document.getElementById('ad-status-text');
            if(!badge || !text) return;

            if(status === 'CONNECTED') {
                badge.classList.add('connected');
                text.innerText = "AUTODARTS: ON";
            } else {
                badge.classList.remove('connected');
                text.innerText = "AUTODARTS: OFF";
            }
        });
        
        // CLEAN SWEEP: Input Toggle Button entfernt (nur noch ProKeypad)
        /*
        const btnToggle = document.getElementById('btn-toggle-input'); 
        if(btnToggle) btnToggle.addEventListener('click', () => GameEngine.toggleInputMode());
        */
		
        this.showScreen('screen-login');
    },

    onLoginSuccess: async function() { 
        await State.initAfterLogin(); 
        this.showScreen('screen-dashboard'); 
    },

    showScreen: function(id) {
        // 1. Screens umschalten
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });
        
        const targetScreen = document.getElementById(id);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            targetScreen.classList.add('active');
            State.setScreen(id);
        } else {
            console.warn(`Screen '${id}' not found in DOM.`);
            return;
        }

        // 2. Konfiguration laden (Fallback auf leeres Objekt um Fehler zu vermeiden)
        const config = SCREEN_CONFIG[id] || { home: true, restart: false, logout: false, badge: false, title: "DART COACH" };

        // 3. Header Buttons & Badge aktualisieren
        _updateHeaderButtons(config);

        // 4. Titel setzen
        const titleEl = document.getElementById('app-title');
        if (titleEl) {
            if (config.title === "DYNAMIC_GAME") {
                titleEl.innerText = _getGameTitle();
            } else if (config.title === "DYNAMIC_SETUP") {
                titleEl.innerText = _getSetupTitle();
            } else {
                titleEl.innerText = config.title;
            }
        }
    },

    // --- DELEGIERUNG AN UI GAME MODUL ---
    switchToGame: function() { 
        if(Game) Game.switchToGame(); 
    },

    updateGameDisplay: function() {
        if(Game) Game.updateGameDisplay();
    },

    showResult: function() {
         if(Game) Game.showResult();
    },

    selectResultPlayer: function(playerId) {
         if(Game) Game.selectResultPlayer(playerId);
    },

    renderDetails: function(playerId) {
         if(Game) Game.renderDetails(playerId);
    }
};