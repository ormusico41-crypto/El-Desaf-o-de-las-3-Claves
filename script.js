const NOTE_NAMES = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"];

class GameEngine {
    constructor() {
        this.config = { clef: 'treble', difficulty: 'easy' };
        this.state = { score: 0, index: 0, total: 12 };
        this.audioCtx = null;
        this.init();
    }

    init() {
        document.getElementById('clef-selector').addEventListener('click', e => {
            if(e.target.dataset.value) {
                document.querySelectorAll('#clef-selector .toggle-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.config.clef = e.target.dataset.value;
            }
        });
        document.getElementById('btn-start').onclick = () => this.start();
        document.getElementById('btn-restart').onclick = () => location.reload();
        document.getElementById('btn-quit').onclick = () => location.reload();
    }

    start() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        document.getElementById('screen-settings').classList.add('hidden');
        document.getElementById('screen-game').classList.remove('hidden');
        this.next();
    }

    playNote(freq, type='sine', dur=0.5) {
        if(!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + dur);
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(); osc.stop(this.audioCtx.currentTime + dur);
    }

    next() {
        if(this.state.index >= this.state.total) return this.end();
        this.state.index++;
        const notes = ["C4","D4","E4","F4","G4","A4","B4","C5"];
        const p = notes[Math.floor(Math.random()*notes.length)];
        this.current = { p, idx: ["C","D","E","F","G","A","B"].indexOf(p[0]) };
        this.render(p, this.config.clef);
        this.renderOpts();
        this.timer();
    }

    render(note, clef) {
        const cont = document.getElementById('staff-container'); cont.innerHTML = '';
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", "0 0 300 200");
        
        [80, 100, 120, 140, 160].forEach(y => {
            const l = document.createElementNS(ns, "line");
            l.setAttribute("x1", 20); l.setAttribute("y1", y); l.setAttribute("x2", 280); l.setAttribute("y2", y);
            l.setAttribute("stroke", "#333"); l.setAttribute("stroke-width", 2); svg.appendChild(l);
        });

        const ct = document.createElementNS(ns, "text"); ct.setAttribute("x", "30"); ct.setAttribute("class", "clef-symbol");
        if(clef==='treble') { ct.textContent = "\uD834\uDD1E"; ct.setAttribute("y", "155"); ct.setAttribute("font-size", "140"); }
        else if(clef==='bass') { ct.textContent = "\uD834\uDD22"; ct.setAttribute("y", "130"); ct.setAttribute("font-size", "100"); }
        else { ct.textContent = "\uD834\uDD21"; ct.setAttribute("y", "145"); ct.setAttribute("font-size", "120"); }
        svg.appendChild(ct);

        const y = 160 - (this.current.idx * 10);
        const h = document.createElementNS(ns, "ellipse"); h.setAttribute("cx", 160); h.setAttribute("cy", y); h.setAttribute("rx", 13); h.setAttribute("ry", 10);
        h.setAttribute("transform", `rotate(-10 160 ${y})`); svg.appendChild(h);

        const s = document.createElementNS(ns, "line"); s.setAttribute("x1", 173); s.setAttribute("y1", y); s.setAttribute("x2", 173); s.setAttribute("y2", y-65);
        s.setAttribute("stroke", "#333"); s.setAttribute("stroke-width", 2.5); svg.appendChild(s);

        cont.appendChild(svg);
    }

    renderOpts() {
        const cont = document.getElementById('options-container'); cont.innerHTML = '';
        [0,1,2,3,4,5,6].sort(()=>Math.random()-0.5).slice(0,4).forEach(i => {
            const b = document.createElement('button'); b.className = 'option-btn'; b.textContent = NOTE_NAMES[i];
            b.onclick = () => {
                if(i === this.current.idx) { 
                    b.classList.add('correct'); this.state.score++; 
                    this.playNote(880, 'sine', 0.3); // Sonido premio
                } else { 
                    b.classList.add('incorrect'); 
                    this.playNote(150, 'sawtooth', 0.4); // Sonido error
                }
                document.getElementById('current-score').textContent = this.state.score;
                setTimeout(() => this.next(), 800);
            };
            cont.appendChild(b);
        });
    }

    timer() {
        const bar = document.getElementById('visual-timer');
        bar.style.transition = 'none'; bar.style.transform = 'scaleX(1)';
        setTimeout(() => { bar.style.transition = 'transform 6s linear'; bar.style.transform = 'scaleX(0)'; }, 50);
    }

    end() {
        document.getElementById('screen-game').classList.add('hidden');
        document.getElementById('screen-end').classList.remove('hidden');
        document.getElementById('final-score-value').textContent = this.state.score;
        this.playNote(440, 'sine', 0.2); this.playNote(554, 'sine', 0.2); this.playNote(659, 'sine', 0.5);
    }
}
window.onload = () => new GameEngine();
