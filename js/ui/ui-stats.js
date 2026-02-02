import { State } from '../core/state.js';
import { StatsService } from '../core/stats-service.js';
import { UI } from './ui-core.js';
import { StatsBoard } from './ui-stats-board.js';

export const Stats = {
    init: function() {
        const pSelect = document.getElementById('stats-player-select');
        const gSelect = document.getElementById('stats-game-select');
        const tFilter = document.getElementById('stats-time-filter');

        const players = State.getAvailablePlayers();
        if (players.length === 0) return;

        pSelect.innerHTML = players.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        
        // Dropdowns aktivieren, die im HTML noch disabled sind
        gSelect.disabled = false;
        tFilter.disabled = false;

        // Spiel-Optionen befüllen
        gSelect.innerHTML = `
            <option value="x01">X01 Match</option>
            <option value="single-training">Single Training</option>
			<option value="shanghai">Shanghai</option>
			<option value="bobs27">Bob's 27</option>
        `;
		
		tFilter.innerHTML = `
            <option value="today">Heute</option>
            <option value="7">Letzte 7 Tage</option>
            <option value="30" selected>Letzte 30 Tage</option>
            <option value="365">Letztes Jahr</option>
            <option value="all">Gesamter Zeitraum</option>
        `;

        pSelect.onchange = () => this.updateView();
        gSelect.onchange = () => this.updateView();
        tFilter.onchange = () => this.updateView();

        this.updateView();
    },

    updateView: function() {
		const playerId = document.getElementById('stats-player-select').value;
		const days = document.getElementById('stats-time-filter').value;
		const gameType = document.getElementById('stats-game-select').value;
		
		const container = document.getElementById('stats-main-dashboard');
		if (!container) return;

        // WEICHE FÜR DASHBOARDS
		if (gameType === 'x01') {
			const data = StatsService.getX01Stats(playerId, days);
            if (!data) { this._renderEmpty(container); return; }
			this.renderDashboardX01(container, data);
		} 
        else if (gameType === 'single-training') {
            const data = StatsService.getSingleTrainingStats(playerId, days);
            if (!data) { this._renderEmpty(container); return; }
            this.renderDashboardTraining(container, data);
        }
		else if (gameType === 'shanghai') {
            const data = StatsService.getShanghaiStats(playerId, days);
            if (!data) { this._renderEmpty(container); return; }
            this.renderDashboardShanghai(container, data);
        }
		else if (gameType === 'bobs27') {
            const data = StatsService.getBobs27Stats(playerId, days);
            if (!data) { this._renderEmpty(container); return; }
            this.renderDashboardBobs27(container, data);
        }
        else {
			this._renderEmpty(container, "Wähle ein Spiel");
		}
	},

	_renderEmpty: function(container, msg = "Keine Daten für diesen Zeitraum.") {
        container.innerHTML = `<p style="text-align:center; padding:50px; color:#666;">${msg}</p>`;
    },
	
	/**
     * DASHBOARD FÜR SINGLE TRAINING (NEU)
     */
    /**
     * DASHBOARD FÜR SINGLE TRAINING
     */
    renderDashboardTraining: function(container, data) {
        container.innerHTML = `
            <div class="stats-hero-grid" style="padding: 0 5px; margin-bottom: 20px;">
                <div class="hero-card accent"><span class="hero-label">Avg Score</span><span class="hero-val">${data.summary.avgScore}</span></div>
                <div class="hero-card"><span class="hero-label">Best Score</span><span class="hero-val" style="color:var(--highlight-color);">${data.summary.bestScore}</span></div>
                <div class="hero-card"><span class="hero-label">Trefferquote</span><span class="hero-val">${data.summary.hitRate}</span></div>
                <div class="hero-card"><span class="hero-label">Spiele</span><span class="hero-val">${data.summary.games}</span></div>
            </div>
            
            <div class="grid-triple-result">
                
                <div class="chart-wrapper-big">
                    <canvas id="mainTrendChart"></canvas>
                </div>
                
                <div class="heatmap-container" id="stats-heatmap-box">
                    <h4 style="color:#c4c4c4; margin-bottom:15px; letter-spacing:1px; font-size:0.8rem;">GESAMT HEATMAP</h4>
                    ${StatsBoard.generateSVG(300)}
                </div>

                <div class="score-distribution">
                    <h4 style="margin-bottom:20px; letter-spacing:1px; color:#c4c4c4;">VERTEILUNG</h4>
                    <div class="dist-bar"><span>Singles</span> <strong>${data.distribution.singles}</strong></div>
                    <div class="dist-bar"><span>Doubles</span> <strong>${data.distribution.doubles}</strong></div>
                    <div class="dist-bar gold"><span>Triples</span> <strong>${data.distribution.triples}</strong></div>
                </div>
            </div>

            <div class="stats-history-scroll-area" style="margin-top: 20px; padding: 20px;">
                <h4 style="margin-bottom:15px; color:#888; text-transform:uppercase; font-size:0.9rem;">Match Historie</h4>
                <div id="stats-match-list-container">
                    ${this._generateTrainingMatchListHTML(data.matches)}
                </div>
            </div>
        `;
        
        // Komponenten aktivieren
        setTimeout(() => {
            this.renderTrendChart(data.chart, "Score Verlauf");
            this.applyHeatmapData(data.heatmap, 'stats-heatmap-box');
        }, 0);
    },
	
    renderDashboardX01: function(container, data) {
        container.innerHTML = `
            <div class="stats-hero-grid" style="padding: 0 5px; margin-bottom: 20px;">
                <div class="hero-card accent"><span class="hero-label">Lifetime AVG</span><span class="hero-val">${data.summary.lifetimeAvg}</span></div>
                <div class="hero-card"><span class="hero-label">Best AVG</span><span class="hero-val" style="color:var(--highlight-color);">${data.summary.bestAvg}</span></div>
                <div class="hero-card"><span class="hero-label">High Finish</span><span class="hero-val">${data.summary.highestCheckout}</span></div>
                <div class="hero-card"><span class="hero-label">Total 180s</span><span class="hero-val" style="color:#eab308;">${data.summary.total180s}</span></div>
            </div>
            
            <div class="grid-x01-layout">
                
                <div class="chart-wrapper-big" style="background: rgba(255,255,255,0.03); border: 1px solid #333; border-radius: 12px; padding: 15px; height: 100%;">
                    <canvas id="mainTrendChart"></canvas>
                </div>

                <div class="heatmap-container" id="stats-heatmap-box" style="margin:0; height: 100%;">
                    <h4 style="color:#c4c4c4; margin-bottom:15px; letter-spacing:1px; font-size:0.8rem;">X01 HEATMAP</h4>
                    ${StatsBoard.generateSVG(280)} </div>

                <div class="score-distribution" style="margin:0; height: 100%;">
                    <h4 style="margin-bottom:20px; letter-spacing:1px; color:#c4c4c4;">SCORES</h4>
                    
                    <div class="dist-bar">
                        <span style="font-size:0.8rem;">100+</span> 
                        <strong>${data.summary.total100s}</strong>
                    </div>
                    
                    <div class="dist-bar">
                        <span style="font-size:0.8rem;">140+</span> 
                        <strong>${data.summary.total140s}</strong>
                    </div>
                    
                    <div class="dist-bar gold" style="margin-top:15px;">
                        <span style="font-size:0.9rem;">180</span> 
                        <strong style="font-size:1.4rem;">${data.summary.total180s}</strong>
                    </div>
                </div>
            </div>

            <div class="stats-history-scroll-area" style="margin-top: 20px; padding: 20px;">
                <h4 style="margin-bottom:15px; color:#888; text-transform:uppercase; font-size:0.9rem;">Match Historie</h4>
                <div id="stats-match-list-container">
                    ${this._generateX01MatchListHTML(data.matches)}
                </div>
            </div>
        `;
        
        setTimeout(() => {
            this.renderTrendChart(data.charts, "AVG Trend");
            this.applyHeatmapData(data.heatmap, 'stats-heatmap-box');
        }, 0);
    },
	
	renderDashboardShanghai: function(container, data) {
        container.innerHTML = `
            <div class="stats-hero-grid" style="padding: 0 5px; margin-bottom: 20px;">
                <div class="hero-card accent"><span class="hero-label">Avg Score</span><span class="hero-val">${data.summary.avgScore}</span></div>
                <div class="hero-card"><span class="hero-label">Best Score</span><span class="hero-val" style="color:var(--highlight-color);">${data.summary.bestScore}</span></div>
                <div class="hero-card"><span class="hero-label">Trefferquote</span><span class="hero-val">${data.summary.hitRate}</span></div>
                <div class="hero-card"><span class="hero-label">Spiele</span><span class="hero-val">${data.summary.games}</span></div>
            </div>
            
            <div class="grid-triple-result">
                
                <div class="chart-wrapper-big">
                    <canvas id="mainTrendChart"></canvas>
                </div>
                
                <div class="heatmap-container" id="stats-heatmap-box">
                    <h4 style="color:#c4c4c4; margin-bottom:15px; letter-spacing:1px; font-size:0.8rem;">SHANGHAI HEATMAP</h4>
                    ${StatsBoard.generateSVG(300)}
                </div>

                <div class="score-distribution">
                    <h4 style="margin-bottom:20px; letter-spacing:1px; color:#c4c4c4;">VERTEILUNG</h4>
                    <div class="dist-bar"><span>Singles</span> <strong>${data.distribution.singles}</strong></div>
                    <div class="dist-bar"><span>Doubles</span> <strong>${data.distribution.doubles}</strong></div>
                    <div class="dist-bar gold"><span>Triples</span> <strong>${data.distribution.triples}</strong></div>
                </div>
            </div>

            <div class="stats-history-scroll-area" style="margin-top: 20px; padding: 20px;">
                <h4 style="margin-bottom:15px; color:#888; text-transform:uppercase; font-size:0.9rem;">Match Historie</h4>
                <div id="stats-match-list-container">
                    ${this._generateTrainingMatchListHTML(data.matches)}
                </div>
            </div>
        `;
        
        setTimeout(() => {
            this.renderTrendChart(data.chart, "Score Verlauf");
            this.applyHeatmapData(data.heatmap, 'stats-heatmap-box');
        }, 0);
    },
	
	renderDashboardBobs27: function(container, data) {
        container.innerHTML = `
            <div class="stats-hero-grid" style="padding: 0 5px; margin-bottom: 20px;">
                <div class="hero-card accent"><span class="hero-label">Avg Score</span><span class="hero-val">${data.summary.avgScore}</span></div>
                <div class="hero-card"><span class="hero-label">Best Score</span><span class="hero-val" style="color:var(--highlight-color);">${data.summary.bestScore}</span></div>
                <div class="hero-card"><span class="hero-label">Survival Rate</span><span class="hero-val">${data.summary.survivalRate}</span></div>
                <div class="hero-card"><span class="hero-label">Hit Rate</span><span class="hero-val">${data.summary.hitRate}</span></div>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
                
                <div class="chart-wrapper-big" style="background: rgba(255,255,255,0.03); border: 1px solid #333; border-radius: 12px; padding: 15px; height: 350px;">
                    <canvas id="mainTrendChart"></canvas>
                </div>

                <div class="heatmap-container" id="stats-heatmap-box" style="margin:0; height: 350px; background: rgba(255,255,255,0.03); border: 1px solid #333; border-radius: 12px; display:flex; flex-direction:column; justify-content:center; align-items:center; width:100%;">
                    <h4 style="color:#c4c4c4; margin-bottom:15px; letter-spacing:1px; font-size:0.8rem; text-align:center;">DOUBLES HEATMAP</h4>
                    ${StatsBoard.generateSVG(280)}
                </div>
            </div>

            <div class="stats-history-scroll-area" style="margin-top: 20px; padding: 20px;">
                <h4 style="margin-bottom:15px; color:#888; text-transform:uppercase; font-size:0.9rem;">Match Historie</h4>
                <div id="stats-match-list-container">
                    ${this._generateBobsMatchListHTML(data.matches)}
                </div>
            </div>
        `;
        
        setTimeout(() => {
            this.renderTrendChart({
                labels: data.chart.labels,
                avgTrend: data.chart.values 
            }, "Score Verlauf");
            
            this.applyHeatmapData(data.heatmap, 'stats-heatmap-box');
        }, 0);
    },

	// Helper für die detaillierte Match-Liste inklusive Gegner
	_generateMatchListHTML: function(matches) {
		return matches.map(m => `
			<div class="history-item-complex" style="background: rgba(255,255,255,0.02); border: 1px solid #333; padding: 12px; margin-bottom: 8px; border-radius: 10px; display: grid; grid-template-columns: 1.5fr 1fr repeat(4, 0.8fr); align-items: center; gap: 5px; font-size: 0.85rem;">
				<div>
					<div style="font-size: 0.65rem; color: #555;">${m.date}</div>
					<div style="font-weight: bold; color: var(--accent-color);">${m.result} ${m.label}</div>
				</div>
				<div style="color: #888; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${m.opponent}">
					vs. ${m.opponent}
				</div>
				<div style="text-align: center;"><small style="display:block; color:#555; font-size:0.55rem;">AVG</small><strong>${m.avg}</strong></div>
				<div style="text-align: center;"><small style="display:block; color:#555; font-size:0.55rem;">F9</small><strong style="color:var(--highlight-color);">${m.f9avg}</strong></div>
				<div style="text-align: center;"><small style="display:block; color:#555; font-size:0.55rem;">LEG</small><strong>${m.bestLeg}</strong></div>
				<div style="text-align: center;"><small style="display:block; color:#555; font-size:0.55rem;">CHK</small><strong style="color:var(--accent-color);">${m.checkout}</strong></div>
			</div>
		`).join('');
	},
	
	// Helper für X01 Listen
    _generateX01MatchListHTML: function(matches) {
        return matches.map(m => `
            <div class="history-item-complex" style="background: rgba(255,255,255,0.02); border: 1px solid #333; padding: 10px; margin-bottom: 8px; border-radius: 10px; display: grid; grid-template-columns: 80px 1.2fr 0.8fr 1fr 1fr 1.8fr; align-items: center; gap: 10px; font-size: 0.85rem;">
                
                <div style="font-size: 0.75rem; color: #666;">${m.date}</div>
                
                <div style="min-width:0;">
                    <div class="${m.resultClass}" style="font-size:0.9rem; margin-bottom:2px;">${m.resultLabel}</div>
                    <div style="font-size:0.75rem; color:#888; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.opponents}</div>
                </div>

                <div style="text-align:center;">
                     <span style="background:#222; padding:2px 6px; border-radius:4px; color:#aaa; font-size:0.75rem;">${m.mode}</span>
                </div>

                <div style="text-align: center;">
                    <strong style="font-size:1.2rem; color:#fff;">${m.avg}</strong>
                    <small style="display:block; color:#555; font-size:0.6rem;">Ø Score</small>
                </div>

                <div style="text-align: center;">
                    <strong style="font-size:1.2rem; color:var(--highlight-color);">${m.checkout}</strong>
                    <small style="display:block; color:#555; font-size:0.6rem;">Hi-Fin</small>
                </div>

                <div style="display:flex; justify-content:flex-end; align-items:center; gap:8px;">
                    
                    <div style="display:flex; flex-direction:column; align-items:center; line-height:1;">
                        <span style="font-size:0.8rem; font-weight:bold; color:#fff;">${m.p100}</span>
                        <span style="font-size:0.6rem; color:#666;">100+</span>
                    </div>
                    
                    <div style="width:1px; height:20px; background:#444;"></div>

                    <div style="display:flex; flex-direction:column; align-items:center; line-height:1;">
                        <span style="font-size:0.8rem; font-weight:bold; color:#fff;">${m.p140}</span>
                        <span style="font-size:0.6rem; color:#666;">140+</span>
                    </div>

                    <div style="width:1px; height:20px; background:#444;"></div>

                    <div style="display:flex; flex-direction:column; align-items:center; line-height:1;">
                        <span style="font-size:0.8rem; font-weight:bold; color:#eab308;">${m.p180}</span>
                        <span style="font-size:0.6rem; color:#eab308;">180</span>
                    </div>
                </div>
            </div>
        `).join('');
    },
	
	// Helper für Training/Shanghai Listen
    _generateTrainingMatchListHTML: function(matches) {
        return matches.map(m => `
            <div class="history-item-complex" style="background: rgba(255,255,255,0.02); border: 1px solid #333; padding: 10px; margin-bottom: 8px; border-radius: 10px; display: grid; grid-template-columns: 90px 1.5fr 0.8fr 0.8fr 2.2fr; align-items: center; gap: 10px; font-size: 0.85rem;">
                
                <div style="font-size: 0.75rem; color: #666;">${m.date}</div>
                
                <div>
                    <div class="${m.resultClass}" style="font-size:0.9rem; margin-bottom:2px;">${m.resultLabel}</div>
                    <div style="font-size:0.75rem; color:#888; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.opponents}</div>
                </div>

                <div style="text-align: center;">
                    <strong style="font-size:1.2rem; color:#fff;">${m.score}</strong>
                    <small style="display:block; color:#555; font-size:0.6rem;">Punkte</small>
                </div>

                <div style="text-align: center;">
                    <strong style="font-size:1.2rem; color:var(--highlight-color);">${m.hitRate}</strong>
                    <small style="display:block; color:#555; font-size:0.6rem;">Quote</small>
                </div>

                <div style="display:flex; justify-content:flex-end; align-items:center; gap:10px;">
                    
                    <div style="display:flex; align-items:center; gap:4px;">
                        <span style="color:#666; font-size:0.8rem; font-weight:bold;">S:</span>
                        <span class="badge-sdt bg-s">${m.s}</span>
                    </div>
                    
                    <div style="width:1px; height:20px; background:#444;"></div>

                    <div style="display:flex; align-items:center; gap:4px;">
                        <span style="color:#666; font-size:0.8rem; font-weight:bold;">D:</span>
                        <span class="badge-sdt bg-d">${m.d}</span>
                    </div>

                    <div style="width:1px; height:20px; background:#444;"></div>

                    <div style="display:flex; align-items:center; gap:4px;">
                        <span style="color:#666; font-size:0.8rem; font-weight:bold;">T:</span>
                        <span class="badge-sdt bg-t">${m.t}</span>
                    </div>
                </div>
            </div>
        `).join('');
    },
	
	_generateBobsMatchListHTML: function(matches) {
        return matches.map(m => {
            // Zusatzinfo generieren: Wo ausgeschieden?
            // Wir nutzen 'rounds' um zu schätzen, welches Target es war.
            // Targets array: [1, 2... 20, 25] -> index = rounds - 1
            const targets = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,25];
            let infoText = `${m.rounds} Runden`;
            
            if (m.resultLabel === 'BUST') {
                // Wenn Bust, dann war die letzte Runde der "Tod"
                // m.rounds ist die Anzahl gespielter Runden. 
                // Index des Targets ist rounds - 1.
                // Achtung: Wenn Runde 1 Bust, dann rounds=1, index=0 (D1).
                const bustIndex = m.rounds - 1;
                if (bustIndex >= 0 && bustIndex < targets.length) {
                    const t = targets[bustIndex];
                    infoText = `Aus bei ${t === 25 ? 'BULL' : 'D'+t}`;
                }
            } else {
                // Bei Survived zeigen wir die Treffer-Anzahl
                infoText = `${m.doublesHit} Treffer`;
            }

            return `
            <div class="history-item-complex" style="background: rgba(255,255,255,0.02); border: 1px solid #333; padding: 10px; margin-bottom: 8px; border-radius: 10px; display: grid; grid-template-columns: 80px 1.2fr 1.2fr 1fr 1fr; align-items: center; gap: 10px; font-size: 0.85rem;">
                
                <div style="font-size: 0.75rem; color: #666;">${m.date}</div>
                
                <div class="${m.resultClass}" style="font-size:0.9rem; font-weight:bold;">${m.resultLabel}</div>

                <div style="font-size:0.8rem; color:#aaa;">${infoText}</div>

                <div style="text-align: center;">
                    <strong style="font-size:1.1rem; color:${m.score >= 0 ? '#fff' : 'var(--miss-color)'};">${m.score}</strong>
                    <small style="display:block; color:#555; font-size:0.6rem;">Punkte</small>
                </div>

                <div style="text-align: right;">
                    <strong style="font-size:1.1rem; color:var(--highlight-color);">${m.hitRate}</strong>
                    <small style="display:block; color:#555; font-size:0.6rem;">Quote</small>
                </div>
            </div>
        `}).join('');
    },

	applyHeatmapData: function(heatmapData, containerId) {
		if (!heatmapData) return;
		const values = Object.values(heatmapData);
		if(values.length === 0) return;
		const maxHits = Math.max(...values);

        const container = document.getElementById(containerId);
        if(!container) return;

		Object.entries(heatmapData).forEach(([segId, hits]) => {
			let elementId = `seg-${segId}`;
            
            // WICHTIG: Suche nur innerhalb des spezifischen Containers, 
            // damit wir nicht versehentlich andere SVGs auf der Seite ändern.
			let elements = [];
			if (segId.startsWith('S')) {
				const elO = container.querySelector(`#${elementId}-O`);
				const elI = container.querySelector(`#${elementId}-I`);
				if(elO) elements.push(elO);
				if(elI) elements.push(elI);
			} else {
				const el = container.querySelector(`#${elementId}`);
				if(el) elements.push(el);
			}

			const intensity = hits / maxHits;
			let heatClass = '';
			if (intensity > 0.7) heatClass = 'heat-high';
			else if (intensity > 0.3) heatClass = 'heat-medium';
			else if (intensity > 0) heatClass = 'heat-low';

			elements.forEach(el => {
                // Alte Klassen entfernen
                el.classList.remove('heat-low', 'heat-medium', 'heat-high');
				if (el) el.classList.add(heatClass);
			});
		});
	},

    renderMatchHistory: function(container, matches) {
		if (!matches || matches.length === 0) return;

		container.innerHTML = `
			<h4 style="margin: 30px 0 15px 0; color: #888; text-transform: uppercase; letter-spacing: 1px;">Letzte Matches</h4>
			<div class="stats-history-grid">
				${matches.map(m => `
					<div class="history-item-complex" style="background: rgba(255,255,255,0.02); border: 1px solid #333; padding: 15px; margin-bottom: 12px; border-radius: 12px; display: grid; grid-template-columns: 2fr repeat(4, 1fr); align-items: center; gap: 10px;">
						<div>
							<div style="font-size: 0.7rem; color: #666;">${m.date}</div>
							<div style="font-weight: bold; color: var(--accent-color); font-size: 1.1rem;">${m.result} ${m.label}</div>
						</div>
						<div style="text-align: center; border-left: 1px solid #333;">
							<small style="display:block; color:#666; font-size:0.6rem; text-transform:uppercase;">Avg</small>
							<span style="font-weight:bold; color:#fff;">${m.avg}</span>
						</div>
						<div style="text-align: center;">
							<small style="display:block; color:#666; font-size:0.6rem; text-transform:uppercase;">F9 Avg</small>
							<span style="font-weight:bold; color:var(--highlight-color);">${m.f9avg}</span>
						</div>
						<div style="text-align: center;">
							<small style="display:block; color:#666; font-size:0.6rem; text-transform:uppercase;">Best Leg</small>
							<span style="font-weight:bold; color:#fff;">${m.bestLeg} <small style="font-size:0.6rem;">Darts</small></span>
						</div>
						<div style="text-align: center;">
							<small style="display:block; color:#666; font-size:0.6rem; text-transform:uppercase;">Checkout</small>
							<span style="font-weight:bold; color:var(--accent-color);">${m.checkout}</span>
						</div>
					</div>
				`).join('')}
			</div>
		`;
	},

    renderTrendChart: function(chartData, label) {
        const canvas = document.getElementById('mainTrendChart');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        
        if (window.statsChartInstance) window.statsChartInstance.destroy();
        
        // Einfacher Datensatz für Single Training (nur Werte)
        // vs komplexer Datensatz für X01 (Avg & F9)
        // Wir prüfen, ob chartData.avgTrend existiert (X01) oder nur values (Training)
        
        let datasets = [];
        if (chartData.avgTrend) {
            // X01 Datasets
            datasets = [
                { label: 'AVG', data: chartData.avgTrend, borderColor: '#00d26a', backgroundColor: 'rgba(0, 210, 106, 0.1)', fill: true, tension: 0.4 },
                { label: 'First 9', data: chartData.f9Trend, borderColor: '#eab308', borderDash: [5, 5], tension: 0.4 }
            ];
        } else {
            // Training Dataset
            datasets = [
                { label: 'Punkte', data: chartData.values, borderColor: '#00d26a', backgroundColor: 'rgba(0, 210, 106, 0.1)', fill: true, tension: 0.3 }
            ];
        }

        window.statsChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: datasets
            },
            options: { 
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' }, beginAtZero: true },
                    x: { grid: { display: false }, ticks: { color: '#888', maxTicksLimit: 10 } }
                },
                plugins: { legend: { labels: { color: '#fff' } } }
            }
        });
    }
};