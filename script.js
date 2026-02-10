/**
 * Pentagrama Master - Game Logic
 */

// --- Constants & Transl ---
const TRANSLATIONS = {
    es: {
        game_title: "Pentagrama Master",
        challenge_subtitle: "El Desafío de las 3 Claves",
        select_clef: "Selecciona la Clave",
        clef_sol: "Sol",
        clef_fa: "Fa",
        clef_do: "Do",
        clef_mixed: "Mix",
        difficulty: "Dificultad",
        easy: "Fácil",
        hard: "Avanzado",
        start_game: "¡Jugar!",
        score: "Puntos",
        game_over: "¡Juego Terminado!",
        play_again: "Jugar de Nuevo",
        tap_to_start: "Toca para activar sonido"
    },
    en: {
        game_title: "Staff Master",
        challenge_subtitle: "The 3 Clefs Challenge",
        select_clef: "Select Clef",
        clef_sol: "Treble",
        clef_fa: "Bass",
        clef_do: "Alto",
        clef_mixed: "Mix",
        difficulty: "Difficulty",
        easy: "Easy",
        hard: "Advanced",
        start_game: "Play!",
        score: "Score",
        game_over: "Game Over!",
        play_again: "Play Again",
        tap_to_start: "Tap to enable sound"
    }
};

const NOTE_NAMES_EN = ["C", "D", "E", "F", "G", "A", "B"];
const NOTE_NAMES_ES = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"];

// Frequency map (simplified for 4 octaves)
// C3 to B5 (enough for game)
const PITCH_FREQUENCIES = {
    // Octave 2 (Bass low)
    "C2": 65.41, "D2": 73.42, "E2": 82.41, "F2": 87.31, "G2": 98.00, "A2": 110.00, "B2": 123.47,
    // Octave 3
    "C3": 130.81, "D3": 146.83, "E3": 164.81, "F3": 174.61, "G3": 196.00, "A3": 220.00, "B3": 246.94,
    // Octave 4 (Middle C is C4)
    "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.00, "A4": 440.00, "B4": 493.88,
    // Octave 5
    "C5": 523.25, "D5": 587.33, "E5": 659.25, "F5": 698.46, "G5": 783.99, "A5": 880.00, "B5": 987.77,
    // Octave 6
    "C6": 1046.50
};

// --- Game Engine Class ---
class GameEngine {
    constructor() {
        this.language = 'es';
        this.config = {
            clef: 'treble', // treble, bass, alto, mixed
            difficulty: 'easy' // easy, hard
        };
        this.state = {
            score: 0,
            questionIndex: 0,
            totalQuestions: 12,
            isPlaying: false,
            currentNote: null,
            timerId: null
        };

        this.audioCtx = null;
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.renderText();
        document.body.classList.add('loaded');
    }

    cacheDOM() {
        // Screens
        this.screens = {
            settings: document.getElementById('screen-settings'),
            game: document.getElementById('screen-game'),
            end: document.getElementById('screen-end')
        };

        // Settings UI
        this.ui = {
            langToggle: document.getElementById('lang-toggle'),
            langText: document.querySelector('.lang-text'),
            clefBtns: document.querySelectorAll('#clef-selector .toggle-btn'),
            diffBtns: document.querySelectorAll('#difficulty-selector .toggle-btn'),
            startBtn: document.getElementById('btn-start'),
            restartBtn: document.getElementById('btn-restart'),
            soundTestBtn: document.getElementById('btn-sound-test'),

            // Game UI
            timerBar: document.getElementById('visual-timer'),
            currentScore: document.getElementById('current-score'),
            staffContainer: document.getElementById('staff-container'),
            optionsContainer: document.getElementById('options-container'),

            // End UI
            finalScore: document.getElementById('final-score-value')
        };
    }

    bindEvents() {
        // Language Toggle
        this.ui.langToggle.addEventListener('click', () => {
            this.language = this.language === 'es' ? 'en' : 'es';
            this.ui.langText.textContent = this.language.toUpperCase();
            this.renderText();
            if (this.state.isPlaying && this.state.currentNote) {
                this.renderOptions(this.state.currentNote.noteNameIndex);
            }
        });

        // Config Selectors
        this.setupSelector(this.ui.clefBtns, 'clef');
        this.setupSelector(this.ui.diffBtns, 'difficulty');

        // Flow
        this.ui.startBtn.addEventListener('click', () => this.startGame());
        this.ui.restartBtn.addEventListener('click', () => this.resetGame());

        // Sound Test Button
        if (this.ui.soundTestBtn) {
            this.ui.soundTestBtn.addEventListener('click', () => {
                this.initAudio();
                this.playTone(440, 'sine'); // A4 test
                this.playTone(554, 'sine'); // C#5
                this.playTone(659, 'sine'); // E5 (Major chord arpeggio fast) to be fun

                // Visual feedback
                const originalText = this.ui.soundTestBtn.innerHTML;
                this.ui.soundTestBtn.innerHTML = "¡Sonido Activo! 🎶";
                this.ui.soundTestBtn.classList.add('active');
                setTimeout(() => {
                    this.ui.soundTestBtn.innerHTML = originalText;
                    this.ui.soundTestBtn.classList.remove('active');
                }, 2000);
            });
        }

        // Quit Button (New)
        const quitBtn = document.getElementById('btn-quit');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => {
                this.state.isPlaying = false;
                clearInterval(this.state.timerId);
                this.resetGame();
            });
        }
    }

    setupSelector(nodeList, configKey) {
        nodeList.forEach(btn => {
            btn.addEventListener('click', (e) => {
                nodeList.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.config[configKey] = e.target.dataset.value;
            });
        });
    }

    renderText() {
        const t = TRANSLATIONS[this.language];
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (t[key]) el.textContent = t[key];
        });
    }

    // --- Audio Logic ---
    initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    playTone(freq, type = 'sine') {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = type; // sine, square, triangle, sawtooth
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.5);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 1.5);
    }

    playFeedbackSound(isCorrect) {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = isCorrect ? 'sine' : 'sawtooth';

        if (isCorrect) {
            // High ping
            osc.frequency.setValueAtTime(500, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1000, this.audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.5);
        } else {
            // Low buzz
            osc.frequency.setValueAtTime(150, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4);
        }

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.5);
    }

    // --- Game Logic ---
    startGame() {
        this.initAudio();
        this.state.score = 0;
        this.state.questionIndex = 0;
        this.state.isPlaying = true;
        this.ui.currentScore.textContent = "0";

        this.switchScreen('game');
        this.nextQuestion();
    }

    switchScreen(screenName) {
        Object.values(this.screens).forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });

        const target = this.screens[screenName];
        target.classList.remove('hidden');
        // Slight delay for animation
        setTimeout(() => target.classList.add('active'), 10);
    }

    nextQuestion() {
        if (this.state.questionIndex >= this.state.totalQuestions) {
            this.endGame();
            return;
        }

        this.state.questionIndex++;

        // Generate Question
        const question = this.generateNote();
        this.state.currentNote = question;

        // Render Staff
        StaffRenderer.render(this.ui.staffContainer, question.note, question.clef);

        // Play Sound
        setTimeout(() => {
            if (PITCH_FREQUENCIES[question.pitch]) {
                this.playTone(PITCH_FREQUENCIES[question.pitch], 'triangle');
            }
        }, 500);

        // Render Options
        this.renderOptions(question.noteNameIndex);

        // Start Timer
        this.startTimer();
    }

    generateNote() {
        // Logic to pick a note based on difficulty/clef
        let clef = this.config.clef;
        if (clef === 'mixed') {
            const clefs = ['treble', 'bass', 'alto'];
            clef = clefs[Math.floor(Math.random() * clefs.length)];
        }

        // Define ranges
        // Note Format: [IndexInOctave, Octave, NoteNameIndex]
        // C4 = 0, D4 = 1 ...
        // We will simplify: store a list of valid notes for Sol/Fa/Do

        // EASY: within staff lines
        // HARD: includes ledger lines

        // Treble: Lines E4, G4, B4, D5, F5. Spaces F4, A4, C5, E5.
        // Range Easy: E4 to F5
        // Range Hard: A3 to C6

        const ranges = {
            treble: {
                easy: ['E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5'],
                hard: ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6']
            },
            bass: {
                easy: ['G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3'],
                hard: ['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4']
            },
            alto: {
                easy: ['F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4'],
                hard: ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']
            }
        };

        const range = ranges[clef][this.config.difficulty];
        const noteStr = range[Math.floor(Math.random() * range.length)]; // e.g., "C4"

        // Parse noteStr
        const pitchChar = noteStr.charAt(0);
        const octave = parseInt(noteStr.charAt(1));
        const noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const noteIndex = noteNames.indexOf(pitchChar);

        return {
            note: noteStr,
            pitch: noteStr,
            noteNameIndex: noteIndex, // 0-6
            clef: clef
        };
    }

    renderOptions(correctIndex) {
        this.ui.optionsContainer.innerHTML = '';
        const opts = new Set();
        opts.add(correctIndex);

        while (opts.size < 4) {
            opts.add(Math.floor(Math.random() * 7));
        }

        // Shuffle
        const optsArray = Array.from(opts).sort(() => Math.random() - 0.5);

        optsArray.forEach(idx => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = this.language === 'en' ? NOTE_NAMES_EN[idx] : NOTE_NAMES_ES[idx];
            btn.onclick = () => this.handleAnswer(idx, correctIndex, btn);
            this.ui.optionsContainer.appendChild(btn);
        });
    }

    handleAnswer(selectedIndex, correctIndex, btnElement) {
        if (!this.state.isPlaying) return;

        clearInterval(this.state.timerId);
        this.state.isPlaying = false; // block inputs

        // Highlight correct
        const allBtns = this.ui.optionsContainer.children;
        let correctBtn;
        for (let b of allBtns) {
            // Find button with correct text
            // simplified logic since we know the text derived from index
            const expectedText = this.language === 'en' ? NOTE_NAMES_EN[correctIndex] : NOTE_NAMES_ES[correctIndex];
            if (b.textContent === expectedText) correctBtn = b;
        }

        if (selectedIndex === correctIndex) {
            btnElement.classList.add('correct');
            this.playFeedbackSound(true);
            this.state.score++;
            this.ui.currentScore.textContent = this.state.score;
        } else {
            btnElement.classList.add('incorrect');
            correctBtn.classList.add('correct');
            this.playFeedbackSound(false);
        }

        setTimeout(() => {
            this.state.isPlaying = true;
            this.nextQuestion();
        }, 1500);
    }

    startTimer() {
        const timeLimit = this.config.difficulty === 'easy' ? 7 : 5;
        let timeLeft = timeLimit;

        this.ui.timerBar.style.transition = 'none';
        this.ui.timerBar.style.transform = 'scaleX(1)';

        // Force reflow
        this.ui.timerBar.offsetHeight;

        this.ui.timerBar.style.transition = `transform ${timeLimit}s linear`;
        this.ui.timerBar.style.transform = 'scaleX(0)';

        if (this.state.timerId) clearInterval(this.state.timerId);

        this.state.timerId = setInterval(() => {
            timeLeft -= 0.1;
            if (timeLeft <= 0) {
                clearInterval(this.state.timerId);
                // Time up! treat as wrong
                this.handleAnswer(-1, this.state.currentNote.noteNameIndex, { classList: { add: () => { } } });
            }
        }, 100);
    }

    endGame() {
        this.state.isPlaying = false;
        clearInterval(this.state.timerId);
        this.ui.finalScore.textContent = this.state.score;
        this.switchScreen('end');
    }

    resetGame() {
        this.switchScreen('settings');
    }
}

// --- Staff Renderer (SVG) ---
const StaffRenderer = {
    render: function (container, noteStr, clefType) {
        // Clear previous
        container.innerHTML = '';

        // Create SVG
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("viewBox", "0 0 300 200");

        // Config
        const lineY = [80, 100, 120, 140, 160]; // 5 lines
        const clickY = 10; // spacing between possible note positions (half-steps on staff visual)

        // Helper to draw line
        const drawLine = (y, width = 300, x = 0) => {
            const line = document.createElementNS(ns, "line");
            line.setAttribute("x1", x);
            line.setAttribute("y1", y);
            line.setAttribute("x2", width);
            line.setAttribute("y2", y);
            line.classList.add("staff-line");
            svg.appendChild(line);
        };

        // Draw Staff
        lineY.forEach(y => drawLine(y));

        // Draw Clef (Simplified paths or text for now to save space, but could use path)
        // Draw Clef with SVG Paths
        const clefPath = document.createElementNS(ns, "path");
        clefPath.classList.add("clef-path");

        // Paths for Treble, Bass, Alto (Standard SVG paths simplified)
        // Treble Clef Path (Approximate)
        const TREBLE_PATH = "M18.8,51.8c-2.3,1.9-3.7,4.5-3.7,7.7c0,5.3,3.9,7.9,8.4,7.9c3.9,0,6.5-1.9,6.5-5.3c0-2.8-2.2-4.9-5-5 c-0.5,0-0.9,0.1-1.3,0.3c0.3-1.6,1.4-2.8,3.2-3.1c4.5-0.8,8.2,1.3,9.4,5.4c1.1,3.9-0.5,8.1-4.1,10.6c-3.1,2.2-7.1,3.3-11.4,3.3 c-7.7,0-13.8-5.3-13.8-13.3c0-6.1,3.6-11.3,8.7-14.3c3.4-2,7.5-3,11.3-3c1.7,0,3.3,0.2,4.8,0.6c-0.8-4.2-2.1-7.8-3.4-11.3 c-0.6-1.6-1.2-3.2-1.8-4.7c-0.6-1.5-1.1-2.9-1.5-4.3c-0.7-2.6-1-5-1-7.1c0-4.6,1.5-7.9,4.2-9.8c2.2-1.5,5-2.2,8.1-2.2 c4.1,0,7.2,1.2,9.2,3.6c2,2.3,2.9,5.5,2.9,9.2c0,4.8-1.5,10.3-4.5,16.2C42.3,29,39.8,33,37,36.5c-4.4,5.6-9.1,10.2-14.1,13.7 C21.4,50.9,20.1,51.5,18.8,51.8z M41.4,19.3c1.9-3.7,2.8-7.3,2.8-10.4c0-2.5-0.6-4.6-1.8-6.1c-1.2-1.5-3-2.3-5.5-2.3 c-2,0-3.8,0.5-5.2,1.5c-1.7,1.2-2.6,3.3-2.6,6c0,1.3,0.2,2.8,0.6,4.5c0.4,1.4,0.9,2.9,1.6,4.5C34.3,24.1,38.2,25.3,41.4,19.3z M35.3,44c4.6-3.2,8.9-7.5,13-12.7c2.6-3.3,4.9-7,6.8-10.9c0.7,0.2,1.5,0.3,2.3,0.3c3.7,0,6.7-1.3,8.8-3.8c2.1-2.5,3.2-5.9,3.2-10 c0-4-0.9-7.1-2.8-9.3c-2.3-2.7-5.9-4.1-10.5-4.1c-6.1,0-10.8,2-13.9,5.9c-2.6,3.3-3.9,7.6-3.9,12.7c0,3.3,0.5,6.8,1.6,10.4 c1.2,3.3,2.5,6.8,3.2,10.7c-4.4-0.3-9-0.5-13.8,0.6C12.8,3,5.2,13.1,5.2,25.3c0,13,9,22.3,21.5,22.3c6.9,0,13.4-2.8,18.9-8.1 L35.3,44z M33.6,58.8c0-1.8-1.5-3.3-3.3-3.3c-1.8,0-3.3,1.5-3.3,3.3c0,1.8,1.5,3.3,3.3,3.3C32.1,62.1,33.6,60.6,33.6,58.8z";

        // Bass Clef Path (Standard F Clef)
        const BASS_PATH = "M26.2,21.5c4.1,0,7.3,3.3,7.3,7.4c0,4.1-3.3,7.4-7.4,7.4c-4.1,0-7.3-3.3-7.3-7.4C18.8,24.8,22.1,21.5,26.2,21.5 z M26.2,16.8c-6.7,0-12.1,5.4-12.1,12.1c0,2.3,0.7,4.5,1.9,6.4c-3.1,1.9-5.1,5.3-5.1,9.2c0,6,4.9,10.9,10.9,10.9 c6,0,10.9-4.9,10.9-10.9c0-0.8-0.1-1.6-0.3-2.3c3.7-2,6.2-5.9,6.2-10.4C38.6,22,33,16.8,26.2,16.8z M21.8,44.5 c-3.4,0-6.1-2.7-6.1-6.1c0-3.4,2.7-6.1,6.1-6.1s6.1,2.7,6.1,6.1C27.9,41.8,25.2,44.5,21.8,44.5z M47.5,18.5c-2.1,0-3.8,1.7-3.8,3.8 s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S49.6,18.5,47.5,18.5z M47.5,29.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8 S49.6,29.5,47.5,29.5z";

        // Alto Clef Path
        const ALTO_PATH = "M23,55.5c0,3-2.5,5.5-5.5,5.5S12,58.5,12,55.5s2.5-5.5,5.5-5.5S23,52.5,23,55.5z M23,24.5c0,3-2.5,5.5-5.5,5.5 S12,27.5,12,24.5s2.5-5.5,5.5-5.5S23,21.5,23,24.5z M45,20v40h-4V20H45z M37,20v40h-4V20H37z M28,40c0-10,6-18.7,15-22.3V14 c-11.2,3.8-19,14.5-19,26s7.8,22.2,19,26v-3.7C34,58.7,28,50,28,40z";


        // Draw Clef with Image (User provided PNGs)
        const clefImg = document.createElementNS(ns, "image");
        clefImg.classList.add("clef-img");

        // Helper to set href safely
        const setHref = (el, url) => {
            el.setAttributeNS("http://www.w3.org/1999/xlink", "href", url);
            el.setAttribute("href", url);
        };

        // Coordenadas base
        // Staff height is 200. Clean space roughly 0-200.

        if (clefType === 'treble') {
            setHref(clefImg, "assets/images/clef_treble.png");
            // Treble Image: +20% size (84x156), adjusted Y to center spiral
            clefImg.setAttribute("x", "0");
            clefImg.setAttribute("y", "42");
            clefImg.setAttribute("width", "84");
            clefImg.setAttribute("height", "156");

        } else if (clefType === 'bass') {
            setHref(clefImg, "assets/images/clef_bass.png");
            // Bass Image: Moved up ~5% (Y=75)
            // dots need to be on 4th line (Y=100)
            clefImg.setAttribute("x", "5");
            clefImg.setAttribute("y", "75");
            clefImg.setAttribute("width", "60");
            clefImg.setAttribute("height", "80");

        } else if (clefType === 'alto') {
            setHref(clefImg, "assets/images/clef_alto.png");
            // Alto Image
            clefImg.setAttribute("x", "5");
            clefImg.setAttribute("y", "80");
            clefImg.setAttribute("width", "60");
            clefImg.setAttribute("height", "80");
        }
        svg.appendChild(clefImg);

        // Calculate Note Position
        // Treble: bottom line is E4 (index 0 for calculation ease?).
        // Let's manually map noteStr to Y position.
        // Y = 160 is E4 line (bottom). 150 is F4 space...

        // Note: noteStr e.g. "C4"
        // We need a reliable mapping per clef.
        const getNoteY = (n, c) => {
            // Note chars: C D E F G A B
            const map = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
            const nChar = n.charAt(0); // 'C'
            const oct = parseInt(n.charAt(1)); // 4

            // Calculate scale degree absolute value: (octave * 7) + noteIndex
            const absVal = (oct * 7) + map[nChar];

            // Reference: Treble bottom line E4. AbsVal(E4) = 4*7 + 2 = 30.
            // Y at 30 = 160.
            // Each step up is -10 Y.

            let refVal, refY;
            if (c === 'treble') {
                refVal = 30; // E4
                refY = 160;
            } else if (c === 'bass') {
                refVal = 16; // G2 (bottom line) -> 2*7+4 = 18. Wait. G2 is bottom line?
                // Bass clef bottom line is G2.
                // AbsVal(G2) = 2*7 + 4 = 18.
                refVal = 18;
                refY = 160;
            } else if (c === 'alto') {
                // Alto clef center line is C4. Center line is 120.
                // AbsVal(C4) = 4*7 + 0 = 28.
                refVal = 28;
                refY = 120;
            }

            const diff = absVal - refVal;
            return refY - (diff * 10);
        };

        const noteY = getNoteY(noteStr, clefType);

        // Draw Ledger Lines
        // Staff top Y: 80 (F5 in Treble). Staff bottom Y: 160 (E4 in Treble).
        // If Y < 80 or Y > 160, draw ledger lines.
        // Ledger lines appear every 20 units (on lines).
        // NoteY is localized.

        // Logic: if note is on a line (Y is divisible by 20), draw line through it.
        // if note is in space (Y ends in 10), check if outside staff lines.

        // Draw Ledgers
        if (noteY > 160) { // Below staff
            for (let y = 180; y <= noteY; y += 20) {
                drawLine(y, 180, 140); // small width
            }
        }
        if (noteY < 80) { // Above staff
            for (let y = 60; y >= noteY; y -= 20) {
                drawLine(y, 180, 140);
            }
        }

        // Create Note Group for Animation
        const noteGroup = document.createElementNS(ns, "g");
        noteGroup.classList.add("note-group");

        // Draw Note Head
        const head = document.createElementNS(ns, "ellipse");
        head.setAttribute("cx", 160);
        head.setAttribute("cy", noteY);
        head.setAttribute("rx", 12);
        head.setAttribute("ry", 9); // oval
        head.setAttribute("transform", "rotate(-10 160 " + noteY + ")"); // slight tilt
        head.classList.add("note-head");
        noteGroup.appendChild(head);

        // Draw Stem
        // If note is below middle line (120), stem up. If above/on, stem down.
        const stem = document.createElementNS(ns, "line");
        stem.classList.add("note-stem");
        if (noteY < 120) {
            // Stem down
            stem.setAttribute("x1", 149);
            stem.setAttribute("y1", noteY);
            stem.setAttribute("x2", 149);
            stem.setAttribute("y2", noteY + 60);
        } else {
            // Stem up
            stem.setAttribute("x1", 171); // right side
            stem.setAttribute("y1", noteY);
            stem.setAttribute("x2", 171);
            stem.setAttribute("y2", noteY - 60);
        }
        // Basic rule: Above B4 (Treble 120) -> stem down.
        // Actually for simplicity let's stick to standard engraving rules broadly.
        // Center line is 120.
        // If noteY > 120 (lower pitch), Stem Up.
        // If noteY <= 120 (higher pitch), Stem Down.
        if (noteY > 120) {
            // Stem Up (Right side)
            stem.setAttribute("x1", 171);
            stem.setAttribute("y1", noteY);
            stem.setAttribute("x2", 171);
            stem.setAttribute("y2", noteY - 60);
        } else {
            // Stem Down (Left side)
            stem.setAttribute("x1", 149);
            stem.setAttribute("y1", noteY);
            stem.setAttribute("x2", 149);
            stem.setAttribute("y2", noteY + 60);
        }

        noteGroup.appendChild(stem);
        svg.appendChild(noteGroup);

        container.appendChild(svg);
    }
};

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    new GameEngine();
});
