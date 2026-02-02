import { State } from '../core/state.js';

export const Cricket = {
    config: {
        hasOptions: true,
        mode: 'mixed',
        description: "Triff 15 bis 20 und Bull je 3x zum Öffnen. Punkte gibts danach."
    },

    generateTargets: function(settings) {
        return [15, 16, 17, 18, 19, 20, 25];
    },

    initPlayer: function(player, settings, targets) {
        player.currentResidual = 0; // Score (Punkte)
        player.scoreHistory = [0];
        player.finished = false;
        player.turns = [];
        
        // Marks tracken: { 15: 0, 16: 0, ..., 25: 0 }
        player.marks = {};
        targets.forEach(t => player.marks[t] = 0);
    },

    handleInput: function(session, player, input) {
        // NORMALIZE INPUT: Wir wollen immer Strings oder saubere Werte
        let normalizedInput = input;
        
        // Falls Input ein Objekt ist (z.B. { isMiss: true }), wandeln wir es um
        if (typeof input === 'object' && input.isMiss) {
            normalizedInput = "MISS";
        }
        
        let targetNum = 0;
        let multiplier = 1;

        const str = normalizedInput.toString();
        
        // Parsing Logic
        if (str === 'MISS') {
            targetNum = 0;
        } else if (str === '25') { 
            targetNum = 25; multiplier = 1; 
        } else if (str === '50') { 
            targetNum = 25; multiplier = 2; 
        } else {
            // S20, D20, T20 Parsing
            const type = str.charAt(0);
            const val = parseInt(str.substring(1));
            
            if (type === 'D') multiplier = 2;
            else if (type === 'T') multiplier = 3;
            else multiplier = 1; // 'S' oder nur Zahl
            
            if (!isNaN(val)) targetNum = val;
        }

        // Logic Processing
        const validTargets = session.targets; 
        let turnPoints = 0;
        let overlayText = null;
        let overlayType = null;

        if (validTargets.includes(targetNum)) {
            const result = this._processMark(session, player, targetNum, multiplier);
            turnPoints = result.points;
            
            if (result.closed) {
                overlayText = "CLOSED"; overlayType = 'check';
            } else if (turnPoints > 0) {
                overlayText = "+" + turnPoints; overlayType = 'score';
            }
        } 

        // Speichern (WICHTIG: normalizedInput nutzen!)
        session.tempDarts.push({ 
            val: normalizedInput, 
            points: turnPoints, 
            targetHit: targetNum,
            marksAdded: multiplier 
        });

        // ... WIN CONDITIONS (Gekürzt für Übersicht) ...
        if (this._checkWinCondition(session, player)) {
            this._logTurn(player, session);
            return { action: 'WIN_MATCH', overlay: { text: 'WINNER!', type: 'check' } };
        }

        // Turn Ende?
        if (session.tempDarts.length >= 3) {
            this._logTurn(player, session);
            
            // Check auf "MISS" Overlay (wenn 3 Darts ohne Treffer)
            const roundHasHits = session.tempDarts.some(d => session.targets.includes(d.targetHit));
            if (!roundHasHits && !overlayText) {
                 overlayText = "MISS"; overlayType = 'miss';
            }
            
            return { action: 'NEXT_TURN', overlay: overlayText ? { text: overlayText, type: overlayType } : null, delay: overlayText ? 1000 : 500 };
        }

        return { action: 'CONTINUE', overlay: overlayText ? { text: overlayText, type: overlayType } : null };
    },

    _processMark: function(session, player, target, multiplier) {
        let pointsScored = 0;
        let marksToAdd = multiplier;
        const currentMarks = player.marks[target];
        let justClosed = false;
        let actualMarksAdded = 0;

        const needed = 3 - currentMarks;

        if (needed > 0) {
            // Noch nicht geschlossen
            if (marksToAdd >= needed) {
                // Schließen
                player.marks[target] = 3;
                actualMarksAdded = needed;
                justClosed = true;
                
                const surplus = marksToAdd - needed;
                if (surplus > 0) {
                    pointsScored = this._calculateScoring(session, player, target, surplus);
                }
            } else {
                // Nur addieren
                player.marks[target] += marksToAdd;
                actualMarksAdded = marksToAdd;
            }
        } else {
            // Schon zu
            pointsScored = this._calculateScoring(session, player, target, marksToAdd);
        }

        return { points: pointsScored, closed: justClosed, marksAdded: actualMarksAdded };
    },

    _calculateScoring: function(session, player, target, count) {
        // Prüfen: Ist Zahl bei ALLEN Gegnern geschlossen?
        const opponents = session.players.filter(p => p.id !== player.id);
        const allOpponentsClosed = opponents.every(op => (op.marks && op.marks[target] >= 3));

        if (allOpponentsClosed) return 0;

        const pts = target * count;
        const mode = session.settings.cricketMode || 'standard';

        if (mode === 'standard') {
            player.currentResidual += pts;
        } else {
            // Cut Throat
            opponents.forEach(op => {
                if (op.marks[target] < 3) {
                    op.currentResidual += pts;
                }
            });
        }
        return pts;
    },

    _checkWinCondition: function(session, player) {
        // 1. Alles geschlossen?
        const allClosed = Object.values(player.marks).every(m => m >= 3);
        if (!allClosed) return false;

        // 2. Score Check
        const mode = session.settings.cricketMode || 'standard';
        const myScore = player.currentResidual;
        const opponents = session.players.filter(p => p.id !== player.id);
        
        if (mode === 'standard') {
            return opponents.every(op => myScore >= op.currentResidual);
        } else {
            return opponents.every(op => myScore <= op.currentResidual);
        }
    },

    _determineWinnerByScore: function(session) {
        // Sortieren nach Score
        const sorted = [...session.players].sort((a,b) => b.currentResidual - a.currentResidual);
        return sorted[0];
    },

    _logTurn: function(player, session) {
        const turnScore = session.tempDarts.reduce((a, b) => a + b.points, 0);
        player.turns.push({
            roundIndex: session.roundIndex,
            score: turnScore, 
            darts: [...session.tempDarts],
            marksSnapshot: JSON.parse(JSON.stringify(player.marks)) // Deep Copy!
        });
        player.scoreHistory.push(player.currentResidual);
    },
    
    // Für die Stats
    getResultData: function(session, player) {
        let totalMarksHit = 0;
        let dartsThrown = 0;
        
        let sCount = 0;
        let dCount = 0;
        let tCount = 0;
        
        const heatmap = {};
        const scoreHistory = player.scoreHistory || [];

        // Durch alle Turns iterieren, um Stats zu sammeln
        player.turns.forEach(t => {
            if(t.darts) {
                t.darts.forEach(d => {
                    dartsThrown++;
                    // d.marksAdded trackt, wie viele "nutzbare" Marks es waren
                    // Wir wollen aber hier die geworfenen Marks wissen für die Statistik
                    let marks = 0;
                    
                    // Parsing aus dem Input String rekonstruieren, falls marksAdded nicht ausreicht
                    // Besser: Wir nutzen marksAdded, aber das ist gecapped auf "needed".
                    // Für MPR zählt man üblicherweise alle Marks auf gültige Ziele.
                    
                    const val = d.val.toString();
                    // Multiplier ermitteln
                    let mult = 1;
                    if(val.startsWith('D') || val === '50') mult = 2;
                    else if(val.startsWith('T')) mult = 3;
                    
                    // Ist es ein gültiges Cricket Ziel?
                    // targetHit > 0 bedeutet Treffer auf Ziel
                    if (d.targetHit > 0) {
                        totalMarksHit += mult;
                        if(mult === 1) sCount++;
                        if(mult === 2) dCount++;
                        if(mult === 3) tCount++;

                        // Heatmap
                        let segId = val;
                        // Vereinheitlichen für Heatmap (z.B. "20" -> "S20")
                        if(!isNaN(val) && val !== '25' && val !== '50') segId = 'S' + val; 
                        heatmap[segId] = (heatmap[segId] || 0) + 1;
                    }
                });
            }
        });

        // MPR Berechnung
        // (Total Marks / Darts) * 3
        const mpr = dartsThrown > 0 ? ((totalMarksHit / dartsThrown) * 3).toFixed(2) : "0.00";

        // Chart Data (Punkte Verlauf)
        const labels = scoreHistory.map((_, i) => i.toString());

        return {
            summary: {
                score: player.currentResidual,
                marks: totalMarksHit,
                mpr: mpr
            },
            distribution: {
                singles: sCount,
                doubles: dCount,
                triples: tCount
            },
            chart: { labels: labels, values: scoreHistory },
            heatmap: heatmap
        };
    }
};