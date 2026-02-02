import { State } from '../core/state.js'; 
import { X01 } from './x01.js';
import { SingleTraining } from './single-training.js';
import { Shanghai } from './shanghai.js';
import { Bobs27 } from './bobs27.js';
import { UI } from '../ui/ui-core.js';

const STRATEGY_MAP = {
    'x01': X01,
    'single-training': SingleTraining,
    'shanghai': Shanghai,
    'bobs27': Bobs27
};

// --- PRIVATE VARS ---
let isLocked = false; // Die globale Sperre für Eingaben
let lastInputTime = 0; // Spam-Schutz

function _getStrategy(gameId) {
    return STRATEGY_MAP[gameId] || null;
}

function _pushUndoState(session) {
    if (!session.historyStack) session.historyStack = [];
    // Wir speichern eine tiefe Kopie relevanter Daten
    // (Performance-Hinweis: JSON.stringify ist hier okay, solange State klein bleibt)
    const snapshot = JSON.stringify({
        pIdx: session.currentPlayerIndex,
        rIdx: session.roundIndex, 
        turnTotal: session.turnTotalIndex, 
        players: session.players,
        tempDarts: session.tempDarts,
        // WICHTIG: Falls Strategies eigene State-Felder haben (wie Cricket Marks),
        // werden sie hier mitgesichert, da sie im 'players'-Objekt hängen.
    });
    session.historyStack.push(snapshot);
    if (session.historyStack.length > 50) session.historyStack.shift();
}

/**
 * Steuert Animationen und Input-Sperre zentral
 */
function _triggerAnimation(type, duration = 1000, callback) {
    isLocked = true; // SPERREN
    
    State.updateSessionState({ animation: type });
    UI.updateGameDisplay();

    setTimeout(() => {
        State.updateSessionState({ animation: null }); // Reset
        isLocked = false; // ENTSPERREN
        UI.updateGameDisplay();
        if (callback) callback();
    }, duration);
}

function _nextTurn(session) {
    isLocked = true;
    
    // Kleines Delay für UX (damit man das Ergebnis noch kurz sieht)
    setTimeout(() => {
        let currentIdx = session.currentPlayerIndex;
        let nextPIdx = (currentIdx + 1) % session.players.length;
        
        const allFinished = session.players.every(p => p.finished);
        if (allFinished) {
            isLocked = false;
            UI.showResult();
            return;
        }

        // Überspringe fertige Spieler
        let loopCount = 0;
        while (session.players[nextPIdx].finished && loopCount < session.players.length) {
            nextPIdx = (nextPIdx + 1) % session.players.length;
            loopCount++;
        }

        let nextRoundIndex = session.roundIndex;
        let nextTurnTotal = (session.turnTotalIndex || 0) + 1;
        
        // Wenn wir wieder beim ersten Spieler sind, neue Runde
        if (nextPIdx === 0) nextRoundIndex++;

        State.updateSessionState({
            currentPlayerIndex: nextPIdx,
            turnTotalIndex: nextTurnTotal,
            roundIndex: nextRoundIndex, 
            tempDarts: [] 
        });

        isLocked = false; // ENTSPERREN
        UI.updateGameDisplay();
    }, 800); 
}

export const GameEngine = {
    
    hasOptions(gameType) { 
        const strategy = _getStrategy(gameType);
        return strategy ? strategy.config.hasOptions : false;
    },
    
    getResultData: function(session, player) {
        const strategy = _getStrategy(session.gameId);
        if (strategy && strategy.getResultData) {
            return strategy.getResultData(session, player);
        }
        return null; 
    },
    
    getGameConfig: function(gameType) {
        const strategy = _getStrategy(gameType);
        return strategy ? strategy.config : null;
    },

    getCheckoutGuide(score, dartsLeftInTurn) {
        const session = State.getActiveSession();
        if(session && session.gameId === 'x01') {
             return X01.getCheckoutGuide(score, dartsLeftInTurn);
        }
        return "";
    },  

    startGame(gameType, selectedPlayerIds, gameOptions) {
        const strategy = _getStrategy(gameType);
        if (!strategy) return;
        
        isLocked = false; 

        let targets = strategy.generateTargets ? strategy.generateTargets(gameOptions) : [];
        let defaultPro = strategy.config.defaultProInput;

        State.createSession(gameType, gameOptions, selectedPlayerIds);
        const session = State.getActiveSession();
        
        session.players.forEach(p => {
            if(strategy.initPlayer) strategy.initPlayer(p, gameOptions, targets);
        });

        State.updateSessionState({
            targets: targets,
            roundIndex: 0,
            turnTotalIndex: 0,
            tempDarts: [],
            historyStack: [],
            useProInput: defaultPro,
            animation: null 
        });
        
        UI.switchToGame();
    },

    /**
     * ZENTRALE INPUT METHODE (REFACTORED)
     */
    onInput(value) {
        if (isLocked) return; 

        // Spam-Schutz (200ms)
        const now = Date.now();
        if (now - lastInputTime < 200) return;
        lastInputTime = now;

        const session = State.getActiveSession();
        if(!session || session.status !== 'running') return;
        
        const strategy = _getStrategy(session.gameId);
        if (!strategy) return;

        // 1. Snapshot für Undo (VOR der Änderung durch Strategy)
        _pushUndoState(session);
    
        const pIdx = session.currentPlayerIndex;
        const player = session.players[pIdx];
        
        if (player.finished) { _nextTurn(session); return; }

        // 2. DELEGATION: Die Strategy macht die Arbeit
        // Sie ändert den State (Punkte abziehen etc.) und sagt uns, was zu tun ist.
        const result = strategy.handleInput(session, player, value);

        // 3. UI FEEDBACK (Overlay)
        if (result.overlay) {
            UI.showOverlay(result.overlay.text, result.overlay.type);
        }

        // 4. AKTION AUSFÜHREN
        switch (result.action) {
            case 'BUST':
                // State wurde bereits in strategy resettet, wir machen nur die Show
                _triggerAnimation('BUST', 1500, () => {
                    State.updateSessionState({ tempDarts: [] }); // TempDarts leeren bei Bust
                    _nextTurn(session);
                });
                break;

            case 'WIN_LEG':
            case 'WIN_MATCH':
                _triggerAnimation('CHECK', 1000, () => {
                    // Modal Texte kommen jetzt auch aus der Strategy (via handleWin Helper oder direkt)
                    let matchStatus = { isMatchOver: (result.action === 'WIN_MATCH') };
                    
                    if (strategy.handleWinLogik) {
                        // Falls Strategy komplexe Texte/Stats hat (wie X01 Sets/Legs)
                        matchStatus = strategy.handleWinLogik(session, player, result);
                    } else {
                        // Standard Fallback
                        matchStatus.messageTitle = result.action === 'WIN_MATCH' ? 'SIEG!' : 'RUNDE GEWONNEN';
                        matchStatus.messageBody = `${player.name} hat es geschafft!`;
                        matchStatus.nextActionText = result.action === 'WIN_MATCH' ? 'STATISTIK' : 'WEITER';
                    }

                    if (result.action === 'WIN_MATCH') {
                        player.finished = true;
                        UI.showMatchModal(
                            matchStatus.messageTitle, 
                            matchStatus.messageBody, 
                            matchStatus.nextActionText, 
                            () => UI.showResult()
                        );
                    } else {
                        UI.showMatchModal(
                            matchStatus.messageTitle, 
                            matchStatus.messageBody, 
                            matchStatus.nextActionText, 
                            () => this.resetLeg(session, strategy)
                        );
                    }
                });
                break;

            case 'NEXT_TURN':
                // Bei "Sofort-Wechsel" Spielen (Bob's 27) wollen wir evtl. eine kurze Pause,
                // um das Overlay zu sehen, dann weiter.
                if (result.delay) {
                    isLocked = true;
                    UI.updateGameDisplay(); // Update Scoreboard sofort
                    setTimeout(() => {
                        _nextTurn(session);
                    }, result.delay);
                } else {
                    _nextTurn(session);
                }
                break;
            
            case 'FINISH_GAME':
                // Sonderfall: Spiel vorbei ohne expliziten Win (z.B. Bob's 27 alle Runden durch)
                UI.updateGameDisplay();
                setTimeout(() => {
                    if(session.players.every(p => p.finished)) {
                        UI.showResult();
                    } else {
                         _nextTurn(session);
                    }
                }, 1000);
                break;

            case 'CONTINUE':
            default:
                // Einfach nur UI updaten (z.B. 1. Dart geworfen)
                UI.updateGameDisplay();
                break;
        }
    },

    resetLeg: function(session, strategy) {
        session.firstPlayerOfLeg = (session.firstPlayerOfLeg + 1) % session.players.length;
        session.currentPlayerIndex = session.firstPlayerOfLeg;

        session.players.forEach(p => {
            if(strategy.initPlayer) strategy.initPlayer(p, session.settings, session.targets);
            p.startOfTurnResidual = p.currentResidual;
            // Falls Cricket: p.marks resetten? Das entscheidet initPlayer!
        });
        
        session.tempDarts = [];
        session.roundIndex = 0; 
        session.turnTotalIndex = 0;
        
        UI.updateGameDisplay(); 
    },
    
    undoLastAction: function() {
        if (isLocked) return;
        
        const session = State.getActiveSession();
        if(!session || !session.historyStack || session.historyStack.length === 0) return;
        
        // Restore State (Generic)
        const lastState = JSON.parse(session.historyStack.pop());
        
        session.currentPlayerIndex = lastState.pIdx;
        session.roundIndex = lastState.rIdx;
        session.turnTotalIndex = lastState.turnTotal;
        session.players = lastState.players; 
        session.tempDarts = lastState.tempDarts;
        
        UI.updateGameDisplay();
    }
};