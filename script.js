const TRANSLATIONS = {
    es: { clef_sol: "Sol", clef_fa: "Fa", clef_do: "Do", score: "Puntos" },
    en: { clef_sol: "Treble", clef_fa: "Bass", clef_do: "Alto", score: "Score" }
};

const NOTE_NAMES_ES = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"];
const PITCH_FREQUENCIES = { "C4": 261.63, "E4": 329.63, "G4": 392.00, "B4": 493.88, "D5": 587.33 };

class GameEngine {
    constructor() {
        this.language = 'es';
        this.config = { clef: 'treble', difficulty: 'easy' };
        this.state = { score: 0, questionIndex: 0, totalQuestions: 12, isPlaying: false };
        this.audioCtx = null;
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        document.body.classList.add('loaded');
    }

    cacheDOM() {
        this.ui = {
            clefBtns: document.querySelectorAll('#clef-selector .toggle-btn'),
            startBtn: document.getElementById('btn-start'),
            staffContainer: document.getElementById('staff-container'),
            optionsContainer: document.getElementById('options-container'),
            timerBar: document.getElementById('visual-timer'),
            currentScore: document.getElementById('current-score')
        };
        this.screens = { settings: document.getElementById('screen-settings'), game: document.getElementById('screen-game'), end: document.getElementById('screen-end') };
    }

    bindEvents() {
        this.ui.clefBtns.forEach(btn => btn.addEventListener('click', (e) => {
            this.ui.clefBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            this.config.clef = e.target.dataset.value;
        }));
        this.ui.startBtn.addEventListener('click', () => this.startGame());
        document.getElementById('btn-restart').addEventListener('click', () => location.reload());
        document.getElementById('btn-quit').addEventListener('click', () => location.reload());
    }

    startGame() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.state.score = 0;
        this.state.questionIndex = 0;
        this.screens.settings.classList.add('hidden');
        this.screens.game.classList.remove('hidden');
        this.nextQuestion();
    }

    nextQuestion() {
        if (this.state.questionIndex >= this.state.totalQuestions) {
            this.screens.game.classList.add('hidden');
            this.screens.end.classList.remove('hidden');
            document.getElementById('final-score-value').textContent = this.state.score;
            return;
        }
        this.state.questionIndex++;
        const note = this.generateNote();
        this.renderStaff(note.pitch, note.clef);
        this.renderOptions(note.noteIndex);
        this.startTimer();
    }

    generateNote() {
        const notes = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
        let clef = this.config.clef === 'mixed' ? ['treble','bass','alto'][Math.floor(Math.random()*3)] : this.config.clef;
        const pitch = notes[Math.floor(Math.random() * notes.length)];
        return { pitch, noteIndex: ["C","D","E","F","G","A","B"].indexOf(pitch[0]), clef };
    }

    renderStaff(note, clef) {
        this.ui.staffContainer.innerHTML = '';
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 300 200");
        
        [80, 100, 120, 140, 160].forEach(y => {
            const l = document.createElementNS(ns, "line");
            l.setAttribute("x1", 0); l.setAttribute("y1", y); l.setAttribute("x2", 300); l.setAttribute("y2", y);
            l.setAttribute("stroke", "#333"); l.setAttribute("stroke-width", 2);
            svg.appendChild(l);
        });

        const ct = document.createElementNS(ns, "text");
        ct.setAttribute("x", "15"); ct.setAttribute("class", "clef-symbol");
        if (clef==='treble') { ct.textContent = "\uD834\uDD1E"; ct.setAttribute("y", "155"); ct.setAttribute("font-size", "130"); }
        else if (clef==='bass') { ct.textContent = "\uD834\uDD22"; ct.setAttribute("y", "125"); ct.setAttribute("font-size", "90"); }
        else { ct.textContent = "\uD834\uDD21"; ct.setAttribute("y", "145"); ct.setAttribute("font-size", "110"); }
        svg.appendChild(ct);

        const noteY = 160 - (["C","D","E","F","G","A","B"].indexOf(note[0]) * 10);
        const head = document.createElementNS(ns, "ellipse");
        head.setAttribute("cx", 160); head.setAttribute("cy", noteY); head.setAttribute("rx", 12); head.setAttribute("ry", 9);
        head.setAttribute("transform", `rotate(-10 160 ${noteY})`);
        svg.appendChild(head);

        const stem = document.createElementNS(ns, "line");
        stem.setAttribute("x1", 172); stem.setAttribute("y1", noteY); stem.setAttribute("x2", 172); stem.setAttribute("y2", noteY-60);
        stem.setAttribute("stroke", "#333"); stem.setAttribute("stroke-width", 2);
        svg.appendChild(stem);

        this.ui.staffContainer.appendChild(svg);
    }

    renderOptions(correct) {
        this.ui.optionsContainer.innerHTML = '';
        [0,1,2,3,4,5,6].sort(() => Math.random()-0.5).slice(0,4).forEach(i => {
            const b = document.createElement('button');
            b.className = 'option-btn'; b.textContent = NOTE_NAMES_ES[i];
            b.onclick = () => {
                if (i === correct) { b.classList.add('correct'); this.state.score++; this.ui.currentScore.textContent = this.state.score; }
                else b.classList.add('incorrect');
                setTimeout(() => this.nextQuestion(), 1000);
            };
            this.ui.optionsContainer.appendChild(b);
        });
    }

    startTimer() {
        this.ui.timerBar.style.transition = 'none'; this.ui.timerBar.style.transform = 'scaleX(1)';
        setTimeout(() => { this.ui.timerBar.style.transition = 'transform 5s linear'; this.ui.timerBar.style.transform = 'scaleX(0)'; }, 50);
    }
}

window.addEventListener('DOMContentLoaded', () => new GameEngine());
