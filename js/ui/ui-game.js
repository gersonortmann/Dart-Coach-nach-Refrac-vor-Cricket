import { State } from '../core/state.js';
import { GameEngine } from '../games/game-engine.js';
import { UI } from './ui-core.js';
import { Keyboard } from './ui-keyboard.js';
import { ResultScreen } from './ui-result.js';

export const Game = {
    
    switchToGame: function() { 
        UI.showScreen('screen-game'); 
        
        // 1. ZENTRALER RESET: Alle Tastaturen verstecken
        if (Keyboard && Keyboard.hideAll) {
            Keyboard.hideAll();
        }
        
        const session = State.getActiveSession();
        if (!session) return;

        // 2. Spezifisches Layout laden
        if (session.gameId === 'single-training' || session.gameId === 'shanghai') {
            if(Keyboard.setTrainingLayout) Keyboard.setTrainingLayout();
        } 
        else if (session.gameId === 'bobs27') {
             if(Keyboard.setBobs27Layout) Keyboard.setBobs27Layout();
        }
        else {
            // Standard X01
            Keyboard.init(); // Stellt sicher, dass Events da sind
            Keyboard.setVisibleLayout(); 
        }
        
        this.updateGameDisplay(); 
    },

    updateGameDisplay: function() {
        const session = State.getActiveSession(); 
        if(!session) return;

        if (session.gameId === 'single-training') {
            this._renderTraining(session);
        }
		else if (session.gameId === 'shanghai') {
            this._renderShanghai(session);
        }
		else if (session.gameId === 'bobs27') {
            this._renderBobs27(session);
        }
		else {
            this._renderX01(session);
        }
    },

    // _checkAnimation WURDE ENTFERNT

    /**
     * SINGLE TRAINING
     */
    _renderBobs27: function(session) {
        const player = session.players[session.currentPlayerIndex];
        const targetValEl = document.getElementById('game-target-val');
        const lblTarget = document.getElementById('lbl-target-desc');
        const hintContainer = document.getElementById('checkout-suggestion');
        const boxContainer = document.getElementById('dart-display-container');
        const scoreContainer = document.getElementById('turn-score-container'); 
        
        const headerName = document.getElementById('game-player-name');
        const headerScore = document.getElementById('game-player-score');
        const matchInfo = document.getElementById('game-match-info');

        // Header Infos
        headerName.innerText = player.name;
        headerScore.innerText = player.currentResidual; 
        matchInfo.innerText = "Bob's 27";
        
        // Wenn der Spieler eliminiert ist, zeigen wir das auch an
        if (player.isEliminated) {
            headerScore.style.color = 'var(--miss-color)';
            headerScore.innerText = "BUST";
        } else {
            headerScore.style.color = '';
        }

        lblTarget.innerText = "Triff das Doppel";
        
        // --- TARGET BERECHNUNG ---
        // Basis: Anzahl der gespielten Runden
        let currentTargetIndex = player.turns.length;

        // Wenn Animation läuft (wir zeigen gerade das Overlay für den Wurf),
        // wollen wir noch das "alte" Ziel sehen, auf das geworfen wurde.
        if (session.animation && currentTargetIndex > 0) {
            currentTargetIndex--;
        }

        // Sicherheitscheck & End-Status
        if (currentTargetIndex >= session.targets.length) {
            targetValEl.innerText = "END";
        } else {
            const targetRaw = session.targets[currentTargetIndex];
            const targetText = targetRaw === 25 ? "BULL" : "D" + targetRaw;
            targetValEl.innerText = targetText;
        }

        // Runden Info
        // Wir zeigen immer die NÄCHSTE Runde an (index + 1), außer wir sind fertig
        let displayRound = player.turns.length + 1;
        if (session.animation) displayRound--; // Während Animation alte Runden-Nr
        if (displayRound > session.targets.length) displayRound = session.targets.length;

        hintContainer.classList.remove('hidden');
        hintContainer.innerText = `Runde: ${displayRound} / 21`;

        // Container aufräumen (wir brauchen keine Dart-Boxen bei Bob)
        boxContainer.classList.add('hidden');
        scoreContainer.classList.add('hidden');
        
        this._renderMultiplayerScoreboard(session);
    },
	
	_renderTraining: function(session) {
        const player = session.players[session.currentPlayerIndex];
        const targetValEl = document.getElementById('game-target-val');
        
        // Cleanup alter Klassen (sicherheitshalber)
        targetValEl.classList.remove('anim-bust', 'anim-miss', 'anim-check', 'bust-flash');

        const lblTarget = document.getElementById('lbl-target-desc');
        const hintContainer = document.getElementById('checkout-suggestion');
        const scoreVal = document.getElementById('turn-score-val');
        const scoreContainer = document.getElementById('turn-score-container'); 
        const boxContainer = document.getElementById('dart-display-container');
        const headerName = document.getElementById('game-player-name');
        const headerScore = document.getElementById('game-player-score');
        const matchInfo = document.getElementById('game-match-info');

        headerName.innerText = `${player.name} ist dran`;
        headerScore.innerText = player.currentResidual; 
        matchInfo.innerText = "Single Training";

        lblTarget.innerText = "Ziel-Segment";
        
        // Timing-Fix: Während einer Animation (z.B. Overlay) noch beim alten Ziel bleiben
        let currentTargetIndex = player.turns.length;
        if (session.animation && currentTargetIndex > 0) {
            currentTargetIndex--;
        }

        // Ende-Check (Kein "DONE" Text mehr, einfach stehen lassen)
        if (currentTargetIndex >= session.targets.length) {
            const lastTarget = session.targets[session.targets.length - 1];
            targetValEl.innerText = lastTarget === 25 ? "BULL" : lastTarget;
            boxContainer.classList.add('hidden');
            return; 
        }

        let target = session.targets[currentTargetIndex];
        let isBull = false; 
        if(target === 25) { target = "BULL"; isBull = true; }
        
        targetValEl.innerText = target;
        
        hintContainer.classList.remove('hidden');
        hintContainer.innerText = `Runde: ${currentTargetIndex + 1} / 21`;

        scoreContainer.classList.remove('hidden');
        const currentTurnPoints = (session.tempDarts || []).reduce((acc, d) => acc + (d.points || 0), 0);
        scoreVal.innerText = currentTurnPoints;

        boxContainer.classList.remove('hidden');
        this._updateDartBoxes(session);

        if (Keyboard.setTrainingLayout) Keyboard.setTrainingLayout(isBull);
        this._renderMultiplayerScoreboard(session);
    },

    /**
     * SHANGHAI
     */
    _renderShanghai: function(session) {
        const player = session.players[session.currentPlayerIndex];
        const targetValEl = document.getElementById('game-target-val');

        // Cleanup
        targetValEl.classList.remove('anim-bust', 'anim-miss', 'anim-check', 'bust-flash');

        const lblTarget = document.getElementById('lbl-target-desc');
        const hintContainer = document.getElementById('checkout-suggestion');
        const scoreVal = document.getElementById('turn-score-val');
        const scoreContainer = document.getElementById('turn-score-container'); 
        const boxContainer = document.getElementById('dart-display-container');
        const headerName = document.getElementById('game-player-name');
        const headerScore = document.getElementById('game-player-score');
        const matchInfo = document.getElementById('game-match-info');

        headerName.innerText = `${player.name} ist dran`;
        headerScore.innerText = player.currentResidual + " Pkt"; 
        matchInfo.innerText = "Shanghai";

        lblTarget.innerText = "Ziel-Segment";
        
        let currentTargetIndex = player.turns.length; 
        
        // WICHTIG: Timing-Fix behalten!
        // Wenn Animation läuft, zeigen wir noch das alte Ziel, damit es nicht springt,
        // während das Overlay läuft. Aber wir schreiben kein "MISS" mehr rein.
        if (session.animation && currentTargetIndex > 0) {
            currentTargetIndex--;
        }

        if (currentTargetIndex >= session.targets.length) {
            // Letztes Ziel stehen lassen, kein "DONE"
            const lastTarget = session.targets[session.targets.length - 1];
            targetValEl.innerText = lastTarget;
            boxContainer.classList.add('hidden'); 
            return; 
        }

        const target = session.targets[currentTargetIndex];
        targetValEl.innerText = target;
        
        hintContainer.classList.remove('hidden');
        hintContainer.innerText = `Runde: ${currentTargetIndex + 1} / ${session.targets.length}`;

        scoreContainer.classList.remove('hidden');
        let turnPoints = 0;
        if (session.tempDarts) {
            session.tempDarts.forEach(d => {
                if (!d.val.isMiss) {
                    turnPoints += (target * d.val.multiplier);
                }
            });
        }
        scoreVal.innerText = turnPoints;

        boxContainer.classList.remove('hidden');
        this._updateDartBoxes(session);

        if (Keyboard.setTrainingLayout) Keyboard.setTrainingLayout(false);
        this._renderMultiplayerScoreboard(session);
    },

    /**
     * X01 (Klassik)
     */
    _renderX01: function(session) {
        const player = session.players[session.currentPlayerIndex];
        const targetValEl = document.getElementById('game-target-val');

        // Cleanup (Entfernt alte Klassen, falls noch da)
        targetValEl.classList.remove('anim-bust', 'anim-miss', 'anim-check', 'bust-flash');

        const lblTarget = document.getElementById('lbl-target-desc'); 
        const hintContainer = document.getElementById('checkout-suggestion'); 
        const scoreContainer = document.getElementById('turn-score-container'); 
        const scoreVal = document.getElementById('turn-score-val');
        const boxContainer = document.getElementById('dart-display-container');

        boxContainer.classList.remove('hidden'); 
        const currentTurnPoints = (session.tempDarts || []).reduce((acc, d) => acc + (d.points || 0), 0);

        lblTarget.innerText = "Rest";
        
        // HIER WAR VORHER DER CHECK_ANIMATION AUFRUF -> WEG DAMIT
        // Wir zeigen jetzt immer direkt den Restscore an.
        targetValEl.innerText = player.currentResidual; 
            
        const dartsLeft = 3 - (session.tempDarts || []).length;
        let guide = dartsLeft > 0 ? GameEngine.getCheckoutGuide(player.currentResidual, dartsLeft) : "";
        
        if(guide) { 
            hintContainer.innerText = guide; 
            hintContainer.classList.remove('hidden'); 
        } else {
            hintContainer.classList.add('hidden');
        }
        
        scoreContainer.classList.remove('hidden'); 
        scoreVal.innerText = currentTurnPoints;
        
        document.getElementById('game-player-name').innerText = `${player.name} ist dran`;
        
        this._updateDartBoxes(session);
        this._renderMultiplayerScoreboard(session);
    },

    _updateDartBoxes: function(session) {
        for(let i=1; i<=3; i++) {
            const box = document.getElementById(`dart-box-${i}`);
            box.classList.remove('filled', 'is-miss'); 
            box.style.color = ''; 
            
            const dart = session.tempDarts ? session.tempDarts[i-1] : null;
            if(dart) {
                box.classList.add('filled');
                
                if (typeof dart.val === 'object') {
                    // Training Logic
                    const input = dart.val;
                    if (input.isMiss || input.multiplier === 0) {
                        box.innerText = "✖";
                        box.classList.add('is-miss');
                    } else {
                        const map = { 1: 'S', 2: 'D', 3: 'T' };
                        box.innerText = map[input.multiplier] || input.multiplier;
                    }
                } else {
                    // X01 Logic
                    if (dart.val === '0') { 
                        box.innerText = "✖"; 
                        box.classList.add('is-miss'); 
                    } else {
                        let text = dart.val.toString(); 
                        text = text.replace('S', '');
                        if (text === '25') text = '25';
                        if (text === '50') text = 'Bull';
                        box.innerText = text; 
                    }
                }
            } else { 
                box.innerText = ""; 
            }
        }
    },

    _renderMultiplayerScoreboard: function(session) {
        const sbContainer = document.getElementById('multiplayer-scoreboard');
        if (!sbContainer) return;

        sbContainer.innerHTML = '';
        const inactivePlayers = session.players.filter((p, idx) => idx !== session.currentPlayerIndex);
        
        if (inactivePlayers.length === 0) {
            sbContainer.style.display = 'none';
        } else {
            sbContainer.style.display = 'flex';
            inactivePlayers.forEach(p => {
                const card = document.createElement('div');
                card.className = 'player-mini-card';
                
                let scoreVal = p.currentResidual;
                if (session.gameId === 'shanghai' || session.gameId === 'single-training') {
                    scoreVal += " Pkt";
                }

                const isSets = session.settings.mode === 'sets';
                const detailLine = isSets 
                    ? `L:${p.legsWon} | S:${p.setsWon}` 
                    : `Legs: ${p.legsWon}`;
                
                card.innerHTML = `
                    <div class="mini-name">${p.name}</div>
                    <div class="mini-score">${scoreVal}</div>
                    <div class="mini-legs" style="font-size:0.7rem; color:#666;">${detailLine}</div>
                `;
                sbContainer.appendChild(card);
            });
        }
    },

    /**
     * Zeigt ein Overlay (Score, Miss, Check) an.
     * type: 'score' | 'miss' | 'check'
     */
    showOverlay: function(content, type = 'score') {
        const overlay = document.createElement('div');
        overlay.className = 'turn-score-overlay visible';
        
        if (type === 'miss') {
            overlay.classList.add('ts-miss');
        } else if (type === 'check') {
            overlay.classList.add('ts-check');
        } else if (type === 'score') {
            const score = parseInt(content);
            if (score === 180) overlay.classList.add('ts-180');
            else if (score >= 100) overlay.classList.add('ts-high');
            else overlay.classList.add('ts-standard');
        }

        overlay.innerHTML = `<div class="ts-val">${content}</div>`;
        document.body.appendChild(overlay);

        setTimeout(() => {
            overlay.classList.remove('visible');
            setTimeout(() => {
                if(overlay.parentNode) document.body.removeChild(overlay);
            }, 300);
        }, 1500); 
    },

    showResult: function() { ResultScreen.show(); },
    renderDetails: function(playerId) { ResultScreen.renderDetails(playerId); },
    selectResultPlayer: function(playerId) { ResultScreen.renderDetails(playerId); }
};