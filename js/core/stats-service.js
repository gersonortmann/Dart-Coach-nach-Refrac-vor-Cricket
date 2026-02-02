import { State } from './state.js';

export const StatsService = {
    
    // --- PUBLIC METHODS ---

    /**
     * X01 Statistiken abrufen
     */
    getX01Stats: function(playerId, days = 30) {
        const filteredHistory = this._getFilteredHistory(playerId, 'x01', days);
        if (!filteredHistory || filteredHistory.length === 0) return null;

        // 1. Aggregierte Werte (Lifetime)
        let totalGames = 0;
        let totalLegsWon = 0;
        let totalScoreSum = 0;
        let totalDartsThrown = 0;
        let bestAvg = 0;
        let highestCheckout = 0;
        
        let power = { score100: 0, score140: 0, score180: 0 };
        const heatmap = {};
        
        // Arrays für Charts
        const avgTrend = [];
        const f9Trend = []; // First 9 Avg
        const labels = [];

        // 2. Detaillierte Match-Liste aufbauen
        const matchHistoryDetails = [];

        filteredHistory.forEach(game => {
            totalGames++;
            
            // --- A) Match Ergebnis Analyse ---
            const isSets = game.settings.mode === 'sets';
            const startScore = game.settings.startScore || 501;
            const checkIn = game.settings.checkIn || 'Straight';
            const checkOut = game.settings.checkOut || 'Double';
            
            // Modus-String bauen (z.B. "501 DO")
            let modeShort = `${startScore} `;
            if(checkIn === 'Double') modeShort += 'DI/';
            modeShort += (checkOut === 'Double' ? 'DO' : 'SO');

            // Ergebnis & Gegner
            const opponents = (game.settings && game.settings.opponents) ? game.settings.opponents : [];
            let resultLabel = "Solo"; 
            let resultClass = "res-solo";
            let scoreStr = "";

            // Score String bauen (z.B. "3 : 1")
            // Wir müssen den Spieler in der game.players Liste finden
            // Achtung: In der History ist `game` das Match-Objekt.
            // Wir brauchen die Daten des aktuellen Spielers (playerId).
            // Da wir aus player.history lesen, sind game.stats meist die Stats DES Spielers.
            
            // Stats des Spielers in diesem Match
            const pStats = game.stats || {}; 
            
            // Ergebnis-Label (Sieg/Niederlage)
            if (opponents.length > 0) {
                if (typeof pStats.isWinner === 'boolean') {
                    if (pStats.isWinner) { resultLabel = "SIEG"; resultClass = "res-win"; }
                    else { resultLabel = "NIEDERLAGE"; resultClass = "res-loss"; }
                } else {
                    resultLabel = "VS"; resultClass = "res-solo";
                }
            }

            // Score String (Sets oder Legs)
            // Hinweis: Wir haben beim Speichern "setsWon" / "legsWon" oft nicht direkt im Root des History-Items,
            // sondern müssen rekonstruieren oder es wurde in `stats` gespeichert.
            // FALLBACK: Wenn wir es beim Speichern nicht explizit abgelegt haben, 
            // zeigen wir hier nur AVG an. Aber wir versuchen es aus dem Context zu holen.
            // (Für jetzt nehmen wir an, dass du es künftig mitspeicherst oder wir nehmen den AVG als Hauptwert).
            
            // WICHTIG: Damit wir "3 : 2" anzeigen können, müssen wir wissen, wie das Match ausging.
            // Das steht aktuell oft nur im `session`-Objekt beim Speichern, nicht zwingend im History-Item des Spielers.
            // Lösung: Wir zeigen hier primär den AVG und High Finish an, und das Ergebnis "SIEG/NIEDERLAGE".
            
            // --- B) Stats Summieren ---
            if (pStats.totalScore) totalScoreSum += pStats.totalScore;
            if (pStats.totalDarts) totalDartsThrown += pStats.totalDarts;
            
            const avg = pStats.average || 0;
            const first9 = pStats.first9Avg || 0;
            const checkout = pStats.highestCheckout || 0;

            if (avg > bestAvg) bestAvg = avg;
            if (checkout > highestCheckout) highestCheckout = checkout;

            // Power Scores (für dieses Match)
            const m100 = pStats.score100 || 0;
            const m140 = pStats.score140 || 0;
            const m180 = pStats.score180 || 0;

            power.score100 += m100;
            power.score140 += m140;
            power.score180 += m180;

            // Heatmap Daten sammeln (falls in Turns gespeichert)
            // (Code analog zu Shanghai, falls Turns vorhanden sind)
            if (game.turns) {
                 game.turns.forEach(turn => {
                     if(turn.darts) {
                         turn.darts.forEach(d => {
                             // Heatmap Logic X01 (Segment basierend auf d.val String)
                             // X01 speichert oft Strings wie "T20", "25", "S19"
                             // oder { val: 'T20' }
                             let val = d.val;
                             if(typeof val === 'object') val = val.val; // Safety
                             if(val && val !== '0' && val !== 'MISS') { // Miss ignorieren
                                 // val ist z.B. "T20" -> das passt direkt als ID!
                                 // Ausnahme Bull: "50" -> "50", "25" -> "25"
                                 // Ausnahme Single: "19" -> "S19" (müssen wir prüfen wie Engine speichert)
                                 // Engine speichert meist "S20", "D20", "T20", "25", "50".
                                 // Falls nur "20", machen wir "S20" draus.
                                 let segId = val.toString();
                                 if (/^\d+$/.test(segId) && segId !== '25' && segId !== '50') segId = 'S' + segId;
                                 heatmap[segId] = (heatmap[segId] || 0) + 1;
                             }
                         });
                     }
                 });
            }

            // Charts füllen
            avgTrend.push(avg);
            f9Trend.push(first9);
            labels.push(this._formatDate(game.date, days));

            // --- C) Match Objekt für Liste ---
            matchHistoryDetails.push({
                date: this._formatDate(game.date, days),
                opponents: opponents.length > 0 ? opponents.join(", ") : "Solo Practice",
                resultLabel: resultLabel,
                resultClass: resultClass,
                mode: modeShort, // "501 DO"
                avg: avg.toFixed(1),
                checkout: checkout > 0 ? checkout : '-',
                p100: m100,
                p140: m140,
                p180: m180
            });
        });

        // Lifetime AVG berechnen
        const lifeAvg = totalDartsThrown > 0 ? ((totalScoreSum / totalDartsThrown) * 3).toFixed(1) : "0.0";

        return {
            summary: {
                games: totalGames,
                lifetimeAvg: lifeAvg,
                bestAvg: bestAvg.toFixed(1),
                highestCheckout: highestCheckout,
                total180s: power.score180,
                total140s: power.score140,
                total100s: power.score100
            },
            heatmap: heatmap,
            matches: matchHistoryDetails.reverse(),
            // Chart Daten komplexer für X01
            charts: {
                labels: labels,
                avgTrend: avgTrend,
                f9Trend: f9Trend
            }
        };
    },
	
	getSingleTrainingStats: function(playerId, days = 30) {
        const filteredHistory = this._getFilteredHistory(playerId, 'single-training', days);
        if (!filteredHistory || filteredHistory.length === 0) return null;

        let totalGames = 0; let totalScoreSum = 0; let bestScore = 0;
        let globalHits = 0; let globalDarts = 0;
        let dist = { singles: 0, doubles: 0, triples: 0 };
        const heatmap = {};
        const matchHistoryDetails = [];

        filteredHistory.forEach(game => {
            totalGames++;
            const score = game.totalScore || 0;
            totalScoreSum += score;
            if (score > bestScore) bestScore = score;

            // Lokale Zähler für dieses Match
            let matchS = 0, matchD = 0, matchT = 0;
            let matchHits = 0; 
            let matchDarts = 0; // NEU

            const targets = game.targets || Array.from({length:20}, (_,i)=>i+1).concat([25]);

            game.turns.forEach((turn, roundIdx) => {
                const target = targets[roundIdx];
                if (turn.darts) {
                    turn.darts.forEach(d => {
                        globalDarts++;
                        matchDarts++; // NEU
                        
                        const input = d.val;
                        if (input && !input.isMiss) {
                            globalHits++;
                            matchHits++; // NEU
                            
                            if (input.multiplier === 1) { dist.singles++; matchS++; }
                            if (input.multiplier === 2) { dist.doubles++; matchD++; }
                            if (input.multiplier === 3) { dist.triples++; matchT++; }

                            let segId = "";
                            if (target === 25) { segId = input.multiplier === 2 ? "50" : "25"; }
                            else { const prefix = input.multiplier === 3 ? "T" : (input.multiplier === 2 ? "D" : "S"); segId = prefix + target; }
                            heatmap[segId] = (heatmap[segId] || 0) + 1;
                        }
                    });
                }
            });

            // Hit Rate für dieses Match berechnen
            const matchHitRate = matchDarts > 0 ? ((matchHits / matchDarts) * 100).toFixed(1) + '%' : '0.0%';

            const opponents = (game.settings && game.settings.opponents) ? game.settings.opponents : [];
            let resultLabel = "Solo"; let resultClass = "res-solo";

            if (opponents.length > 0) {
                if (game.stats && typeof game.stats.isWinner === 'boolean') {
                    if (game.stats.isWinner) { resultLabel = "SIEG"; resultClass = "res-win"; }
                    else { resultLabel = "NIEDERLAGE"; resultClass = "res-loss"; }
                } else { resultLabel = "VS"; resultClass = "res-solo"; }
            }

            matchHistoryDetails.push({
                date: this._formatDate(game.date, days),
                score: score,
                opponents: opponents.length > 0 ? opponents.join(", ") : "Solo Training",
                resultLabel: resultLabel,
                resultClass: resultClass,
                s: matchS,
                d: matchD,
                t: matchT,
                hitRate: matchHitRate // NEU
            });
        });

        return {
            summary: {
                games: totalGames,
                avgScore: (totalScoreSum / totalGames).toFixed(0),
                bestScore: bestScore,
                hitRate: globalDarts > 0 ? ((globalHits / globalDarts) * 100).toFixed(1) + '%' : '0.0%'
            },
            distribution: dist,
            heatmap: heatmap,
            matches: matchHistoryDetails.reverse(),
            chart: {
                labels: filteredHistory.map(h => this._formatDate(h.date, days)),
                values: filteredHistory.map(h => h.totalScore)
            }
        };
    },
	
	getShanghaiStats: function(playerId, days = 30) {
        const filteredHistory = this._getFilteredHistory(playerId, 'shanghai', days);
        if (!filteredHistory || filteredHistory.length === 0) return null;

        let totalGames = 0; let totalScoreSum = 0; let bestScore = 0;
        let globalHits = 0; let globalDarts = 0;
        let dist = { singles: 0, doubles: 0, triples: 0 };
        const heatmap = {};
        const matchHistoryDetails = [];

        filteredHistory.forEach(game => {
            totalGames++;
            const score = game.totalScore || 0;
            totalScoreSum += score;
            if (score > bestScore) bestScore = score;

            let matchS = 0, matchD = 0, matchT = 0;
            let matchHits = 0;
            let matchDarts = 0; // NEU

            const targets = game.targets || [1,2,3,4,5,6,7];

            game.turns.forEach((turn, roundIdx) => {
                const target = targets[roundIdx] !== undefined ? targets[roundIdx] : 0;
                if (turn.darts) {
                    turn.darts.forEach(d => {
                        globalDarts++;
                        matchDarts++; // NEU
                        
                        const input = d.val;
                        if (input && !input.isMiss) {
                            globalHits++;
                            matchHits++; // NEU
                            
                            if (input.multiplier === 1) { dist.singles++; matchS++; }
                            if (input.multiplier === 2) { dist.doubles++; matchD++; }
                            if (input.multiplier === 3) { dist.triples++; matchT++; }

                            let segId = "";
                            const prefix = input.multiplier === 3 ? "T" : (input.multiplier === 2 ? "D" : "S");
                            segId = prefix + target;
                            heatmap[segId] = (heatmap[segId] || 0) + 1;
                        }
                    });
                }
            });

            // Hit Rate für dieses Match
            const matchHitRate = matchDarts > 0 ? ((matchHits / matchDarts) * 100).toFixed(1) + '%' : '0.0%';

            const opponents = (game.settings && game.settings.opponents) ? game.settings.opponents : [];
            let resultLabel = "Solo"; let resultClass = "res-solo";

            if (opponents.length > 0) {
                if (game.stats && typeof game.stats.isWinner === 'boolean') {
                    if (game.stats.isWinner) { resultLabel = "SIEG"; resultClass = "res-win"; }
                    else { resultLabel = "NIEDERLAGE"; resultClass = "res-loss"; }
                } else { resultLabel = "VS"; resultClass = "res-solo"; }
            }

            matchHistoryDetails.push({
                date: this._formatDate(game.date, days),
                score: score,
                opponents: opponents.length > 0 ? opponents.join(", ") : "Solo Training",
                resultLabel: resultLabel,
                resultClass: resultClass,
                s: matchS,
                d: matchD,
                t: matchT,
                hitRate: matchHitRate // NEU
            });
        });

        return {
            summary: {
                games: totalGames,
                avgScore: (totalScoreSum / totalGames).toFixed(0),
                bestScore: bestScore,
                hitRate: globalDarts > 0 ? ((globalHits / globalDarts) * 100).toFixed(1) + '%' : '0.0%'
            },
            distribution: dist,
            heatmap: heatmap,
            matches: matchHistoryDetails.reverse(),
            chart: {
                labels: filteredHistory.map(h => this._formatDate(h.date, days)),
                values: filteredHistory.map(h => h.totalScore)
            }
        };
    },
	
	/**
     * BOB'S 27 STATISTIKEN
     */
    getBobs27Stats: function(playerId, days = 30) {
        const filteredHistory = this._getFilteredHistory(playerId, 'bobs27', days);
        
        // Falls keine Spiele da sind
        if (!filteredHistory || filteredHistory.length === 0) return null;

        let totalGames = 0;
        let highestScore = -9999;
        let scoreSum = 0;
        let gamesSurvived = 0;
        
        let totalDoublesHit = 0;
        let totalDartsThrown = 0;
        
        const heatmap = {}; 
        const matchHistoryDetails = [];

        filteredHistory.forEach(game => {
            totalGames++;
            // Fallback für Score (manchmal direkt in totalScore, manchmal in stats)
            const finalScore = game.totalScore !== undefined ? game.totalScore : (game.stats?.totalScore || 0);
            
            scoreSum += finalScore;
            if (finalScore > highestScore) highestScore = finalScore;

            // Survival Check: Score >= 0 und nicht aborted
            const survived = finalScore >= 0; 
            if (survived) gamesSurvived++;

            let matchHits = 0;
            let matchDarts = 0;

            const targets = game.targets || [];
            
            // Turns analysieren
            game.turns.forEach((turn, roundIdx) => {
                matchDarts += 3; // Bob's 27 immer 3 Darts Logik
                const hits = turn.hits || 0;
                matchHits += hits;
                
                // Heatmap füllen
                const targetVal = targets[roundIdx];
                if (targetVal) {
                    let heatId = "";
                    if (targetVal === 25) {
                        heatId = "50"; // Bullseye als Zentrum markieren
                    } else {
                        heatId = "D" + targetVal;
                    }
                    
                    if (hits > 0) {
                        heatmap[heatId] = (heatmap[heatId] || 0) + hits; 
                    }
                }
            });

            totalDoublesHit += matchHits;
            totalDartsThrown += matchDarts;

            const matchHitRate = matchDarts > 0 ? ((matchHits / matchDarts) * 100).toFixed(1) + '%' : '0.0%';
            
            matchHistoryDetails.push({
                date: this._formatDate(game.date, days),
                score: finalScore,
                resultLabel: survived ? "SURVIVED" : "BUST",
                resultClass: survived ? "res-win" : "res-loss",
                hitRate: matchHitRate,
                doublesHit: matchHits,
                rounds: game.turns.length
            });
        });

        return {
            summary: {
                games: totalGames,
                avgScore: (scoreSum / totalGames).toFixed(0),
                bestScore: highestScore,
                survivalRate: ((gamesSurvived / totalGames) * 100).toFixed(0) + '%',
                hitRate: totalDartsThrown > 0 ? ((totalDoublesHit / totalDartsThrown) * 100).toFixed(1) + '%' : '0.0%'
            },
            heatmap: heatmap,
            matches: matchHistoryDetails.reverse(),
            chart: {
                labels: filteredHistory.map(h => this._formatDate(h.date, days)),
                values: filteredHistory.map(h => h.totalScore !== undefined ? h.totalScore : 0)
            }
        };
    },

    /**
     * BEISPIEL FÜR ZUKUNFT (muss noch nicht genutzt werden):
     * getCatch40Stats: function(playerId, days) {
     * const history = this._getFilteredHistory(playerId, 'catch40', days);
     * if(!history) return null;
     * // ... Catch40 spezifische Berechnungen ...
     * }
     */


    // --- PRIVATE HELPER (GENERIC) ---

    /**
     * ZENTRALE FILTER-LOGIK
     * Holt Spieler, filtert nach Spieltyp und berechnet den Zeit-Cutoff.
     */
    _getFilteredHistory: function(playerId, gameId, days) {
        const player = State.getAvailablePlayers().find(p => p.id === playerId);
        if (!player || !player.history) return null;

        let cutoff = 0;
        if (days === 'all') {
            cutoff = 0;
        } else if (days === 'today') {
            // Setzt cutoff auf 00:00:00 des heutigen Tages
            const now = new Date();
            now.setHours(0,0,0,0);
            cutoff = now.getTime();
        } else {
            // Standard: X Tage zurückrechnen
            cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        }

        return player.history
            .filter(h => h.game === gameId && h.date >= cutoff)
            .sort((a, b) => a.date - b.date);
    },

    /**
     * ZENTRALE DATUMS-FORMATIERUNG
     * Entscheidet basierend auf dem Filter, ob Uhrzeit oder Datum angezeigt wird.
     */
    _formatDate: function(timestamp, daysFilter) {
        const dateObj = new Date(timestamp);
        if (daysFilter === 'today') {
            return dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        }
        return dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    },

    _countScores: function(history, min, max = min) {
        let count = 0;
        history.forEach(h => {
            h.turns.forEach(t => {
                if (t.score >= min && t.score <= max) count++;
            });
        });
        return count;
    },

    _generateHeatmap: function(history) {
        const counts = {};
        history.forEach(h => {
            h.turns.forEach(t => {
                if (t.darts) {
                    t.darts.forEach(d => {
                        counts[d.val] = (counts[d.val] || 0) + 1;
                    });
                }
            });
        });
        return counts; 
    }
};