import { GameEngine } from '../games/game-engine.js';

let inputModifier = ''; 

function _resetModifiers() {
    inputModifier = ''; 
    const btnD = document.getElementById('btn-mod-double'); 
    const btnT = document.getElementById('btn-mod-triple'); 
    const grid = document.getElementById('num-grid-container');
    
    if(btnD) btnD.classList.remove('active-mod'); 
    if(btnT) btnT.classList.remove('active-mod'); 
    if(grid) { 
        grid.classList.remove('mode-double'); 
        grid.classList.remove('mode-triple'); 
    }
}

export const Keyboard = {
    
    init: function() {
        // --- PRO KEYPAD SETUP ---
        const btnD = document.getElementById('btn-mod-double'); 
        const btnT = document.getElementById('btn-mod-triple'); 
        const grid = document.getElementById('num-grid-container');

        if(btnD) { 
            const nD = btnD.cloneNode(true); btnD.parentNode.replaceChild(nD, btnD); 
            nD.onclick = () => { 
                if(inputModifier === 'D') { _resetModifiers(); } 
                else { _resetModifiers(); inputModifier = 'D'; nD.classList.add('active-mod'); if(grid) grid.classList.add('mode-double'); } 
            }; 
        }
        if(btnT) { 
            const nT = btnT.cloneNode(true); btnT.parentNode.replaceChild(nT, btnT); 
            nT.onclick = () => { 
                if(inputModifier === 'T') { _resetModifiers(); } 
                else { _resetModifiers(); inputModifier = 'T'; nT.classList.add('active-mod'); if(grid) grid.classList.add('mode-triple'); } 
            }; 
        }

        document.querySelectorAll('.num-btn, .bull-btn, .miss').forEach(btn => { 
            const n = btn.cloneNode(true); btn.parentNode.replaceChild(n, btn); 
            n.onclick = (e) => { 
                const target = e.target.closest('button');
                if(!target) return;
                let raw = target.dataset.val; 
                let final = raw; 
                
                if(raw !== '0' && raw !== '25' && raw !== '50') { 
                    if(inputModifier === 'D') final = 'D' + raw; 
                    else if(inputModifier === 'T') final = 'T' + raw; 
                    else final = 'S' + raw; 
                } 
                if(raw === '25' && inputModifier === 'D') final = '50'; 
                
                GameEngine.onInput(final); 
                _resetModifiers(); 
            }; 
        });

        const btnBack = document.getElementById('btn-pro-back'); 
        if(btnBack) { 
            const nB = btnBack.cloneNode(true); btnBack.parentNode.replaceChild(nB, btnBack); 
            nB.onclick = () => GameEngine.undoLastAction(); 
        }
    },

    /**
     * ZENTRALE FUNKTION: Versteckt ALLE bekannten Keypads
     */
    hideAll: function() {
        const ids = [
            'keypad-warmup', 
            'keypad-yesno', 
            'keypad-hitmiss', 
            'keypad-segment', 
            'keypad-catch40', 
            'keypad-bull-only', 
            'keypad-pro', 
            'keypad-training',
            'keypad-bobs27' // WICHTIG: Bobs27 muss hier rein!
        ];
        
        ids.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.classList.add('hidden');
                // Sicherstellen, dass Inline-Styles (wie display:grid) überschrieben werden
                if(id === 'keypad-bobs27' || id === 'keypad-training') {
                    el.style.display = 'none';
                }
            }
        });
    },

    setVisibleLayout: function() {
        this.hideAll(); // Erst alles verstecken
        const kpPro = document.getElementById('keypad-pro');
        if(kpPro) kpPro.classList.remove('hidden');
    },

    // --- TRAINING KEYPAD (Dynamisch Bull/Standard) ---
    setTrainingLayout: function(isBullMode = false) {
        this.hideAll(); // Erst alles verstecken

        let trainContainer = document.getElementById('keypad-training');
        if (!trainContainer) {
            trainContainer = document.createElement('div');
            trainContainer.id = 'keypad-training';
            trainContainer.className = 'keypad-grid';
            trainContainer.style.gap = '10px';
            trainContainer.style.padding = '10px';
            
            const screen = document.getElementById('screen-game');
            screen.appendChild(trainContainer);
        }

        trainContainer.classList.remove('hidden');
        trainContainer.style.display = 'grid'; // WICHTIG: Erzwingt Grid Layout (falls vorher none)

        if (isBullMode) {
            // --- BULL LAYOUT (2 Spalten) ---
            trainContainer.style.gridTemplateColumns = '1fr 1fr';
            trainContainer.innerHTML = `
                <button class="key-btn bull-btn" data-mult="1" style="height:80px; font-size:1.1rem; background:var(--bull-color);">SINGLE BULL</button>
                <button class="key-btn bull-btn" data-mult="2" style="height:80px; font-size:1.1rem; background:var(--bull-color);">DOUBLE BULL</button>
                
                <button class="key-btn miss" data-mult="0" style="background: var(--btn-miss-bg); color:black; height:80px; font-size:1.1rem;">MISS</button>
                
                <button class="key-btn" id="btn-train-undo" style="background: #555; color: white; height:80px; font-size:1.5rem;">
                    ⬅
                </button>
            `;
        } else {
            // --- STANDARD LAYOUT (3 Spalten) ---
            trainContainer.style.gridTemplateColumns = '1fr 1fr 1fr';
            trainContainer.innerHTML = `
                <button class="key-btn seg-single" data-mult="1" style="height:80px; font-size:1.1rem;">SINGLE</button>
                <button class="key-btn seg-double" data-mult="2" style="height:80px; font-size:1.1rem;">DOUBLE</button>
                <button class="key-btn seg-triple" data-mult="3" style="height:80px; font-size:1.1rem;">TRIPLE</button>
                
                <button class="key-btn miss" data-mult="0" style="grid-column: span 2; background: var(--btn-miss-bg); color:black; height:80px; font-size:1.1rem;">MISS</button>
                
                <button class="key-btn" id="btn-train-undo" style="grid-column: span 1; background: #555; color: white; height:80px; font-size:1.5rem;">
                    ⬅
                </button>
            `;
        }

        // Events
        const buttons = trainContainer.querySelectorAll('.key-btn[data-mult]');
        buttons.forEach(btn => {
            btn.onclick = () => {
                const mult = parseInt(btn.dataset.mult);
                GameEngine.onInput({ multiplier: mult, isMiss: (mult === 0) });
            };
        });

        // FIX: Undo einheitlich auf undoLastAction
        const undoBtn = document.getElementById('btn-train-undo');
        if(undoBtn) undoBtn.onclick = () => GameEngine.undoLastAction();
    },
    
    /**
     * Layout für Bob's 27 (Eigenes Grid)
     */
    setBobs27Layout: function() {
        this.hideAll(); // Erst alles verstecken

        let bobsBoard = document.getElementById('keypad-bobs27');
        
        if (!bobsBoard) {
            // Wir erstellen den Container dynamisch, falls er noch nicht existiert
            const screen = document.getElementById('screen-game');
            if (!screen) return; 

            bobsBoard = document.createElement('div');
            bobsBoard.id = 'keypad-bobs27';
            
            // Styling direkt hier setzen
            bobsBoard.style.display = 'grid';
            bobsBoard.style.gridTemplateColumns = '1fr 1fr 1fr 1fr';
            bobsBoard.style.gap = '10px';
            bobsBoard.style.marginTop = '10px'; 
            bobsBoard.style.width = '100%';

            // Die 4 Tasten
            const keys = [
                { label: 'MISS', val: 0, color: 'var(--miss-color)', text: '#fff' },
                { label: '1 HIT', val: 1, color: 'rgba(0, 210, 106, 0.6)', text: '#fff' },
                { label: '2 HITS', val: 2, color: 'rgba(0, 210, 106, 0.8)', text: '#fff' },
                { label: '3 HITS', val: 3, color: 'rgba(0, 210, 106, 1.0)', text: '#000' }
            ];

            keys.forEach(k => {
                const btn = document.createElement('button');
                btn.className = 'key-btn';
                btn.innerText = k.label;
                btn.style.backgroundColor = k.color;
                btn.style.color = k.text;
                btn.style.fontWeight = 'bold';
                btn.style.fontSize = '1.1rem';
                btn.style.minHeight = '80px';
                btn.style.borderRadius = '8px';
                btn.style.border = 'none';
                
                btn.onclick = () => {
                    if(GameEngine && GameEngine.onInput) GameEngine.onInput({ hits: k.val });
                };
                bobsBoard.appendChild(btn);
            });

            // Undo Zeile darunter
            const undoRow = document.createElement('div');
            undoRow.style.gridColumn = '1 / -1';
            undoRow.style.marginTop = '5px';
            
            const undoBtn = document.createElement('button');
            undoBtn.className = 'key-btn secondary';
            undoBtn.innerText = 'Rückgängig';
            undoBtn.style.width = '100%';
            undoBtn.style.padding = '15px';
            undoBtn.style.borderRadius = '8px';
            
            // FIX: Auch hier undoLastAction statt onUndo
            undoBtn.onclick = () => { if(GameEngine && GameEngine.undoLastAction) GameEngine.undoLastAction(); };
            
            undoRow.appendChild(undoBtn);
            bobsBoard.appendChild(undoRow);

            // Dem Screen hinzufügen
            screen.appendChild(bobsBoard);
        }
        
        // Anzeigen und Grid erzwingen
        bobsBoard.classList.remove('hidden');
        bobsBoard.style.display = 'grid';
    }
};