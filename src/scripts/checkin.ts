// A check-in you can answer: hold to "prove it's you", then type three words. The first answer sets
// your rhythm (as onboarding practice does); later answers are compared with it.
const WORDS = ['maple', 'orbit', 'tulip', 'river', 'cobalt', 'lantern', 'pepper', 'meadow', 'velvet', 'harbor', 'copper', 'willow', 'saddle', 'pebble', 'canyon', 'mango', 'quartz', 'falcon', 'ember', 'cedar', 'basil', 'comet', 'thistle', 'marble', 'otter', 'glacier', 'cricket', 'juniper', 'nectar', 'puzzle', 'raven', 'sunset', 'violet', 'walnut', 'zephyr', 'bramble', 'cinder', 'fennel', 'island', 'lemon'];
const pick = () => { const pool = WORDS.slice(); return [0, 1, 2].map(() => pool.splice((Math.random() * pool.length) | 0, 1)[0]); };
const median = (xs: number[]) => { const s = xs.slice().sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mad = (xs: number[]) => { const m = median(xs); return median(xs.map((x) => Math.abs(x - m))); };
const BAR_MAX = 900;

interface Rhythm { med: number; spread: number; cv: number; }

export function initCheckIn(root: HTMLElement) {
    const q = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
    const finger = q<HTMLButtonElement>('[data-ci-finger]');
    const ring = root.querySelector<SVGCircleElement>('[data-ci-finger-ring]')!;
    const wordsEl = q('[data-ci-words]');
    const input = q<HTMLInputElement>('[data-ci-input]');
    const bars = q('[data-ci-bars]');
    const band = q('[data-ci-band]');
    const ok = q<HTMLButtonElement>('[data-ci-ok]');
    const res = q('[data-ci-res]');
    const resT = q('[data-ci-res-t]');
    const resS = q('[data-ci-res-s]');
    const stats = q('[data-ci-stats]');
    const why = q('[data-ci-why]');

    let words: string[] = [];
    let times: number[] = [];
    let backspaces = 0;
    let base: Rhythm | null = null;

    const state = (s: string) => { root.dataset.state = s; };
    const fresh = () => {
        words = pick();
        wordsEl.innerHTML = words.map((w) => `<span>${w}</span>`).join('');
        input.value = '';
        times = [];
        backspaces = 0;
        bars.replaceChildren();
        paintBand();
        why.textContent = base ? 'Unsteady walking, then a hard fall.' : 'Practice round: this sets your rhythm.';
    };
    const paintBand = () => {
        if (!base) { band.style.opacity = '0'; return; }
        const lo = Math.max(0, base.med - 2.5 * base.spread), hi = base.med + 2.5 * base.spread;
        band.style.opacity = '1';
        band.style.bottom = `${(lo / BAR_MAX) * 100}%`;
        band.style.height = `${(Math.min(hi, BAR_MAX) - lo) / BAR_MAX * 100}%`;
    };

    // 1. Prove it's you: a short hold on the fingerprint.
    let holdStart = 0, raf = 0;
    const holdTick = (ms: number) => {
        const p = Math.min(1, (ms - holdStart) / 650);
        ring.style.strokeDashoffset = String(100 - p * 100);
        if (p >= 1) { holdStart = 0; ring.style.strokeDashoffset = '100'; state('typing'); fresh(); setTimeout(() => input.focus({ preventScroll: true }), 60); return; }
        raf = requestAnimationFrame(holdTick);
    };
    const holdDown = (e: Event) => { e.preventDefault(); holdStart = performance.now(); raf = requestAnimationFrame(holdTick); };
    const holdUp = () => { if (!holdStart) return; cancelAnimationFrame(raf); holdStart = 0; ring.style.strokeDashoffset = '100'; };
    finger.addEventListener('pointerdown', holdDown);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => finger.addEventListener(ev, holdUp));
    finger.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) holdDown(e); });
    finger.addEventListener('keyup', holdUp);
    finger.addEventListener('contextmenu', (e) => e.preventDefault());

    // 2. Type: every key's time goes into the rhythm.
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    // Input events, not keys: phone keyboards often report every key as "Unidentified".
    input.addEventListener('input', (e) => {
        if ((e as InputEvent).inputType?.startsWith('delete')) backspaces++;
        const now = performance.now();
        if (times.length) {
            const gap = now - times[times.length - 1];
            const bar = document.createElement('i');
            bar.style.height = `${Math.min(100, (gap / BAR_MAX) * 100)}%`;
            if (base && Math.abs(gap - base.med) > 2.5 * base.spread) bar.className = 'is-off';
            bars.append(bar);
            while (bars.children.length > 28) bars.firstElementChild!.remove();
        }
        times.push(now);
    });
    ok.addEventListener('click', submit);

    function submit() {
        const typed = input.value.trim().toLowerCase().replace(/\s+/g, ' ');
        if (typed !== words.join(' ')) {
            root.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(9px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(0)' }], { duration: 380 });
            why.textContent = 'Not quite. The check-in stays open for another try.';
            return;
        }
        const gaps = times.slice(1).map((t, i) => t - times[i]).filter((g) => g < 3000);
        if (gaps.length < 4) return;
        const med = median(gaps);
        const spread = Math.max(1.4826 * mad(gaps), 0.22 * med, 28);
        const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        const sd = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length);
        const cv = sd / mean;
        const total = (times[times.length - 1] - times[0]) / 1000;
        const row = (k: string, v: string) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;

        if (!base) {
            base = { med, spread, cv };
            res.dataset.kind = 'ok';
            resT.textContent = 'Rhythm saved';
            resS.textContent = 'That was your practice round. Now answer a real one, and type it badly on purpose: slowly, with one thumb, or with a few mistakes.';
            stats.innerHTML = row('Key gap', `${Math.round(med)} ms`) + row('Steadiness', `${Math.round((1 - Math.min(1, cv)) * 100)} %`) + row('Took', `${total.toFixed(1)} s`);
            state('done');
            return;
        }
        const zMed = Math.abs(med - base.med) / base.spread;
        const zCv = Math.max(0, cv - base.cv) / 0.18;
        const zBack = backspaces / Math.max(1, words.join(' ').length) / 0.06;
        const z = Math.max(zMed, zCv, zBack);
        const off = z > 2.5;
        res.dataset.kind = off ? 'off' : 'ok';
        resT.textContent = off ? 'Answered, but may be impaired' : 'Check-in dismissed';
        resS.textContent = off
            ? 'The words were right but the rhythm was far from yours. The check-in is answered, and friends hear “answered, but may be impaired”.'
            : 'Right words, in your rhythm. Everything that was open is acknowledged, and nobody is told.';
        stats.innerHTML = row('Key gap', `${Math.round(med)} ms <small>yours ${Math.round(base.med)}</small>`) + row('Off your rhythm', `${z.toFixed(1)} SD <small>limit 2.5</small>`) + row('Backspaces', String(backspaces));
        state('done');
    }

    q('[data-ci-again]').addEventListener('click', () => { state('typing'); fresh(); input.focus({ preventScroll: true }); });
    why.textContent = 'A possible fall, then no movement.';
}
