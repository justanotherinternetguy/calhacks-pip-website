// The live strip: synthesized motion for each situation, drawn as the monitor draws it, with the
// incidents the engine would open. Time runs in seconds from the start of a loop.
type Tier = 'context' | 'watch' | 'danger' | 'ask' | 'note' | 'alert';
interface Ev { at: number; name: string; tier: Tier; note?: string; }
interface Metrics { cadence: number | null; regularity: number | null; sway: number | null; wobble: number | null; }
interface Scene {
    title: string; text: string; length: number;
    sample(t: number): { a: number; r: number };
    metrics(t: number): Metrics;
    events: Ev[]; micAt?: number;
}

const TAU = Math.PI * 2;
/** Deterministic noise in [-1, 1], fixed per 20 ms sample. */
const noise = (t: number, seed = 0) => { const x = Math.sin(Math.floor(t * 50) * 12.9898 + seed * 78.233) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };
const smooth = (t: number, seed = 0) => { const i = Math.floor(t * 8), f = t * 8 - i; const a = noise(i / 50, seed), b = noise((i + 1) / 50, seed); return a + (b - a) * (f * f * (3 - 2 * f)); };

const walk = (t: number, amp = 0.36, hz = 1.85) => ({ a: 1 + amp * Math.sin(TAU * hz * t) + 0.11 * Math.sin(TAU * hz * 2 * t + 1) + 0.03 * noise(t), r: 0.55 + 0.22 * Math.sin(TAU * hz * 0.5 * t) + 0.05 * noise(t, 1) });
const still = (t: number, jitter = 0.02) => ({ a: 1 + jitter * noise(t), r: 0.04 + jitter * Math.abs(noise(t, 2)) });
const normal: Metrics = { cadence: 112, regularity: 0.86, sway: 1.0, wobble: 0.55 };
const wiggle = (m: Metrics, t: number): Metrics => ({
    cadence: m.cadence === null ? null : m.cadence + smooth(t, 3) * 2.5,
    regularity: m.regularity === null ? null : m.regularity + smooth(t, 4) * 0.02,
    sway: m.sway === null ? null : m.sway + smooth(t, 5) * 0.08,
    wobble: m.wobble === null ? null : m.wobble + smooth(t, 6) * 0.05,
});
const none: Metrics = { cadence: null, regularity: null, sway: null, wobble: null };
const mix = (a: Metrics, b: Metrics, p: number): Metrics => {
    const k = (x: number | null, y: number | null) => (x === null || y === null ? (p < 0.5 ? x : y) : x + (y - x) * p);
    return { cadence: k(a.cadence, b.cadence), regularity: k(a.regularity, b.regularity), sway: k(a.sway, b.sway), wobble: k(a.wobble, b.wobble) };
};
const ramp = (t: number, from: number, to: number) => Math.min(1, Math.max(0, (t - from) / (to - from)));

const SCENES: Record<string, Scene> = {
    walk: {
        title: 'Walking home', length: 12,
        text: 'Every measure sits inside your normal range. Nothing opens, and nobody is told anything.',
        sample: (t) => walk(t), metrics: (t) => wiggle(normal, t), events: [],
    },
    unsteady: {
        title: 'Walking, but not like you', length: 13, micAt: 6.2,
        text: 'Regularity drops while sway and wobble climb out of your range. After 35 s of this (a few seconds here) “unsteady walking” opens. That is a watch incident: full sensing, a listening window, and it counts toward a check-in. On its own, it asks nobody.',
        sample: (t) => {
            const p = ramp(t, 0.5, 2.5);
            const hz = 1.6 + 0.35 * smooth(t, 7) * p;
            const w = walk(t + 0.12 * smooth(t, 8) * p, 0.36 + 0.28 * p * (0.6 + 0.4 * smooth(t, 9)), hz);
            return { a: w.a + 0.18 * p * smooth(t * 3, 10), r: w.r + p * (0.9 + 0.6 * smooth(t, 11)) };
        },
        metrics: (t) => wiggle(mix(normal, { cadence: 97, regularity: 0.51, sway: 2.7, wobble: 1.55 }, ramp(t, 0.5, 3)), t),
        events: [{ at: 6, name: 'Unsteady walking', tier: 'watch', note: 'out of range for 35 s' }],
    },
    fall: {
        title: 'A hard fall', length: 13, micAt: 6.6,
        text: 'A free fall, a hit above 3 g, a tilt, then nothing. “Possible fall” opens, and after 15 s without steps or touch, “down after fall”. That is a danger incident, so the phone asks “You okay?” on its own.',
        sample: (t) => {
            if (t < 4) return walk(t);
            if (t < 4.28) return { a: 0.18 + 0.05 * noise(t), r: 1.8 + noise(t, 3) };
            if (t < 4.36) return { a: 4.25 - (t - 4.28) * 6, r: 6.5 };
            if (t < 5.2) { const d = Math.exp(-(t - 4.36) * 5); return { a: 1 + 1.4 * d * Math.sin(TAU * 6 * t), r: 0.2 + 3 * d }; }
            return still(t, 0.015);
        },
        metrics: (t) => (t < 4 ? wiggle(normal, t) : none),
        events: [
            { at: 4.36, name: 'High-g impact', tier: 'watch', note: '4.2 g' },
            { at: 6.6, name: 'Possible fall', tier: 'watch', note: 'impact, tilt, little movement' },
            { at: 9.2, name: 'Down after fall', tier: 'danger', note: 'no steps, no touch for 15 s' },
            { at: 9.8, name: 'You okay?', tier: 'ask', note: 'check-in on the lock screen' },
        ],
    },
    grab: {
        title: 'Someone grabs the phone', length: 12.5, micAt: 6.1,
        text: 'The phone is in your hand. A yank, a sharp twist, then a running cadence moving away. “Grab” is a danger incident, and it skips the check-in: friends are told at once, with the location at the snatch moment and a warning not to chase.',
        sample: (t) => {
            if (t < 4) return { a: 1 + 0.05 * smooth(t * 4, 12), r: 0.12 + 0.06 * Math.abs(smooth(t * 3, 13)) };
            if (t < 4.18) return { a: 1 + 2.6 * Math.sin(((t - 4) / 0.18) * Math.PI), r: 7.4 * Math.sin(((t - 4) / 0.18) * Math.PI) };
            const w = walk(t, 0.85, 2.75);
            return { a: w.a + 0.1 * noise(t, 4), r: 1.3 + 0.5 * smooth(t, 14) };
        },
        metrics: (t) => (t < 4.2 ? none : wiggle({ cadence: 168, regularity: 0.78, sway: 1.9, wobble: 1.2 }, t)),
        events: [
            { at: 4.2, name: 'Yank and twist', tier: 'context', note: 'phone in hand' },
            { at: 6, name: 'Grab', tier: 'danger', note: 'running away, 3.4 m/s' },
            { at: 6.6, name: 'Friends told at once', tier: 'alert', note: '“don’t chase”' },
        ],
    },
    drop: {
        title: 'Just a dropped phone', length: 12.5,
        text: 'A long free fall and a hit, but no body motion before or after, and it lands flat. The impact is reclassified as a drop and cleared, so no fall opens. If nobody picks it up within 60 s, “phone drop” opens instead.',
        sample: (t) => {
            if (t < 3) return { a: 1 + 0.04 * smooth(t * 4, 15), r: 0.1 + 0.05 * Math.abs(smooth(t * 3, 16)) };
            if (t < 3.42) return { a: 0.04 + 0.02 * noise(t), r: 3.2 + 0.4 * noise(t, 5) };
            if (t < 3.5) return { a: 5.4 - (t - 3.42) * 40, r: 5 };
            if (t < 3.9) { const d = Math.exp(-(t - 3.5) * 9); return { a: 1 + 1.8 * d * Math.sin(TAU * 9 * t), r: 2 * d }; }
            return { a: 1, r: 0 };
        },
        metrics: () => none,
        events: [
            { at: 3.5, name: 'High-g impact', tier: 'watch', note: '5.4 g' },
            { at: 5.9, name: 'Reclassified as a drop', tier: 'note', note: 'flat, no body motion' },
            { at: 9.5, name: 'Phone drop', tier: 'watch', note: 'not picked up in 60 s' },
        ],
    },
    dance: {
        title: 'Dancing', length: 12,
        text: 'Lots of energy, but no step rhythm and no tilt followed by stillness. Nothing opens. Agitation is weighted low on purpose, because a dance floor looks like this all night.',
        sample: (t) => ({ a: 1 + 0.75 * Math.sin(TAU * 2.3 * t) * (0.6 + 0.4 * smooth(t, 17)) + 0.45 * smooth(t * 5, 18) + 0.08 * noise(t, 6), r: 1.6 + 1.2 * Math.abs(smooth(t * 2, 19)) }),
        metrics: (t) => ({ cadence: null, regularity: 0.24 + 0.05 * smooth(t, 20), sway: null, wobble: null }),
        events: [{ at: 5, name: 'Nothing opens', tier: 'note', note: 'no gait rhythm, no tilt then still' }],
    },
};

const BAND = { cadence: [100, 126, 60, 180], regularity: [0.72, 0.95, 0, 1], sway: [0.55, 1.6, 0, 3.4], wobble: [0.3, 0.95, 0, 2] } as const;
const FMT = { cadence: (v: number) => v.toFixed(0), regularity: (v: number) => v.toFixed(2), sway: (v: number) => v.toFixed(2), wobble: (v: number) => v.toFixed(2) };

export function initSignals(root: HTMLElement) {
    const canvas = root.querySelector<HTMLCanvasElement>('[data-sig-canvas]')!;
    const ctx = canvas.getContext('2d')!;
    const title = root.querySelector<HTMLElement>('[data-sig-title]')!;
    const text = root.querySelector<HTMLElement>('[data-sig-text]')!;
    const feed = root.querySelector<HTMLUListElement>('[data-feed]')!;
    const mic = root.querySelector<HTMLElement>('[data-mic]')!;
    const micT = root.querySelector<HTMLElement>('[data-mic-t]')!;
    const consoleEl = root.querySelector<HTMLElement>('.console')!;
    const tiles = Array.from(root.querySelectorAll<HTMLElement>('[data-metric]')).map((el) => {
        const id = el.dataset.metric as keyof typeof BAND;
        const [lo, hi, min, max] = BAND[id];
        const ok = el.querySelector<HTMLElement>('.tile__ok')!;
        ok.style.left = `${((lo - min) / (max - min)) * 100}%`;
        ok.style.width = `${((hi - lo) / (max - min)) * 100}%`;
        return { el, id, v: el.querySelector<HTMLElement>('[data-v]')!, needle: el.querySelector<HTMLElement>('[data-needle]')! };
    });
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-scene]'));
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let scene = SCENES.walk;
    let start = performance.now();
    let shown = 0;
    let visible = false;
    let raf = 0;

    const choose = (id: string) => {
        scene = SCENES[id];
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scene === id)));
        title.textContent = scene.title;
        text.textContent = scene.text;
        restart();
    };
    const restart = () => {
        start = performance.now();
        shown = 0;
        feed.replaceChildren();
        consoleEl.classList.remove('is-watch', 'is-danger');
        mic.classList.remove('is-on');
        micT.textContent = 'Mic off';
    };
    buttons.forEach((b) => b.addEventListener('click', () => choose(b.dataset.scene!)));

    const size = () => {
        const r = canvas.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(r.width * dpr);
        canvas.height = Math.round(r.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    new ResizeObserver(size).observe(canvas);

    const WINDOW = 6, GMAX = 4.8;
    const draw = (now: number) => {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        const y = (g: number) => h - 8 - (Math.min(g, GMAX) / GMAX) * (h - 16);
        ctx.clearRect(0, 0, w, h);
        // your normal range, and the 3 g line
        ctx.fillStyle = 'rgba(61, 214, 163, 0.16)';
        ctx.fillRect(0, y(1.45), w, y(0.6) - y(1.45));
        ctx.strokeStyle = 'rgba(227, 218, 203, 0.10)';
        ctx.lineWidth = 1;
        for (let g = 1; g < GMAX; g++) { ctx.beginPath(); ctx.moveTo(0, y(g)); ctx.lineTo(w, y(g)); ctx.stroke(); }
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#FF6B5C';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, y(3)); ctx.lineTo(w, y(3)); ctx.stroke();
        ctx.setLineDash([]);
        const line = (pick: (s: { a: number; r: number }) => number, color: string, width: number, alpha = 1) => {
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            const steps = Math.max(120, Math.floor(w / 2));
            for (let i = 0; i <= steps; i++) {
                const t = now - WINDOW + (i / steps) * WINDOW;
                const v = pick(scene.sample(t));
                const px = (i / steps) * w;
                i ? ctx.lineTo(px, y(v)) : ctx.moveTo(px, y(v));
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
        };
        line((s) => s.r / 2, '#B69CFF', 1.6, 0.75);
        line((s) => s.a, '#4AA8FF', 2.4);
        // the leading dot
        const head = scene.sample(now);
        ctx.fillStyle = '#4AA8FF';
        ctx.strokeStyle = '#FBF3E4';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(w - 3, y(head.a), 4.5, 0, TAU); ctx.fill(); ctx.stroke();
    };

    const showMetrics = (t: number) => {
        const m = scene.metrics(t);
        tiles.forEach((tile) => {
            const v = m[tile.id];
            const [lo, hi, min, max] = BAND[tile.id];
            if (v === null) {
                tile.v.textContent = '–';
                tile.el.classList.add('is-idle');
                tile.el.classList.remove('is-out');
                return;
            }
            tile.el.classList.remove('is-idle');
            tile.v.textContent = FMT[tile.id](v);
            tile.needle.style.left = `${Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100))}%`;
            tile.el.classList.toggle('is-out', v < lo || v > hi);
        });
    };

    const ago = (s: number) => (s < 1.5 ? 'now' : `${Math.round(s)} s ago`);
    const showFeed = (t: number) => {
        while (shown < scene.events.length && scene.events[shown].at <= t) {
            const ev = scene.events[shown++];
            const li = document.createElement('li');
            li.className = `ev ev--${ev.tier}`;
            li.dataset.at = String(ev.at);
            const mark = ev.tier === 'watch' || ev.tier === 'danger' || ev.tier === 'context' ? `<i class="mark mark--${ev.tier}"></i>` : '<i class="ev__bullet"></i>';
            li.innerHTML = `${mark}<span class="ev__name">${ev.name}</span><span class="ev__note">${ev.note ?? ''}</span><span class="ev__ago">now</span>`;
            feed.prepend(li);
            if (ev.tier === 'watch') consoleEl.classList.add('is-watch');
            if (ev.tier === 'danger' || ev.tier === 'alert' || ev.tier === 'ask') consoleEl.classList.add('is-danger');
        }
        feed.querySelectorAll<HTMLElement>('.ev').forEach((li) => {
            li.querySelector('.ev__ago')!.textContent = ago(t - Number(li.dataset.at));
        });
        if (scene.micAt !== undefined && t >= scene.micAt && !mic.classList.contains('is-on')) {
            mic.classList.add('is-on');
            micT.textContent = 'Listening · 10 min window';
        }
    };

    const frame = (ms: number) => {
        let t = (ms - start) / 1000;
        if (t > scene.length) { restart(); t = 0; }
        draw(t);
        showMetrics(t);
        showFeed(t);
        raf = visible ? requestAnimationFrame(frame) : 0;
    };

    if (calm) {
        // One still frame per situation, at its most telling moment.
        const still = () => { const t = scene.length - 0.5; shown = 0; feed.replaceChildren(); size(); draw(t); showMetrics(t); showFeed(t); };
        buttons.forEach((b) => b.addEventListener('click', still));
        requestAnimationFrame(still);
        return;
    }

    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(frame);
    }).observe(canvas);
}
