// The monitor mock: an episode plays into the incident log, the AI read adds it up with arrows from
// each incident to its points, then Sam answers "I'm OK" and the read resets.
interface Row { name: string; tier: 'watch' | 'danger' | 'ok'; ago: string; status: string; pts?: number; why?: string; }
const ROWS: Row[] = [
    { name: 'Unsteady walking', tier: 'watch', ago: '6 min ago', status: 'Over · lasted 2 min', pts: 12, why: 'unsteady walking, late, away from home' },
    { name: 'Possible fall', tier: 'watch', ago: '3 min ago', status: 'Moment', pts: 20, why: 'a possible fall soon after unsteady walking' },
    { name: 'Down after fall', tier: 'danger', ago: '3 min ago', status: 'Active · 3 min so far', pts: 24, why: 'no steps or touch since the fall' },
    { name: 'Check-in missed', tier: 'danger', ago: '1 min ago', status: 'Active · 1 min so far', pts: 18, why: 'no answer to “You okay?”' },
];
const COMBO = { label: 'unsteady, then a fall, then down', pts: 6, from: [0, 1, 2] };
const ENGINE = ['Engine level: watch', 'Engine level: watch', 'Engine level: check-in', 'Engine level: heads-up · floor 60'];

export function initMonitor(root: HTMLElement) {
    const log = root.querySelector<HTMLOListElement>('[data-log]')!;
    const contrib = root.querySelector<HTMLOListElement>('[data-contrib]')!;
    const wires = root.querySelector<SVGSVGElement>('[data-wires]')!;
    const grid = root.querySelector<HTMLElement>('.mon__grid')!;
    const score = root.querySelector<HTMLElement>('[data-ai-score]')!;
    const arc = root.querySelector<SVGPathElement>('[data-ai-arc]')!;
    const lvl = root.querySelector<HTMLElement>('[data-ai-lvl]')!;
    const traj = root.querySelector<HTMLElement>('[data-ai-traj]')!;
    const floor = root.querySelector<HTMLElement>('[data-ai-floor]')!;
    const dock = root.querySelector<HTMLElement>('[data-dock]')!;
    const dockT = root.querySelector<HTMLElement>('[data-dock-t]')!;
    const sub = root.querySelector<HTMLElement>('[data-mon-sub]')!;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let shownScore = 0;
    const setScore = (target: number) => {
        const from = shownScore;
        const t0 = performance.now();
        const step = (ms: number) => {
            const p = Math.min(1, (ms - t0) / 700);
            const v = Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3)));
            score.textContent = String(v);
            arc.style.strokeDashoffset = String(100 - v);
            if (p < 1) requestAnimationFrame(step); else shownScore = target;
        };
        requestAnimationFrame(step);
        const band = target >= 70 ? ['High', 'var(--coral)'] : target >= 40 ? ['Elevated', 'var(--butter)'] : target > 0 ? ['Low', 'var(--mint)'] : ['Calm', 'var(--mint)'];
        lvl.textContent = band[0];
        root.style.setProperty('--ai', band[1]);
    };

    const rowEl = (r: Row, i: number) => {
        const li = document.createElement('li');
        li.className = `log__row log__row--${r.tier}`;
        li.dataset.i = String(i);
        li.innerHTML = r.tier === 'ok'
            ? `<span class="log__name">Confirmed OK</span><span class="log__meta">now · Sam answered a check-in</span>`
            : `<span class="log__name"><i class="mark mark--${r.tier}"></i>${r.name}</span><span class="log__meta">${r.ago} · ${r.status}</span>`;
        return li;
    };
    const contribEl = (pts: number, why: string, from: number[]) => {
        const li = document.createElement('li');
        li.className = 'contrib__row';
        li.dataset.from = from.join(',');
        li.innerHTML = `<b>+${pts}</b><span>${why}</span>`;
        return li;
    };

    // Arrows from each log row to the points it earned.
    const drawWires = () => {
        const g = grid.getBoundingClientRect();
        wires.setAttribute('viewBox', `0 0 ${g.width} ${g.height}`);
        if (getComputedStyle(wires).display === 'none') return;
        let d = '';
        contrib.querySelectorAll<HTMLElement>('.contrib__row').forEach((c, ci) => {
            const cr = c.getBoundingClientRect();
            c.dataset.from!.split(',').forEach((fi) => {
                const row = log.querySelector<HTMLElement>(`[data-i="${fi}"]`);
                if (!row) return;
                const rr = row.getBoundingClientRect();
                const x1 = rr.right - g.left, y1 = rr.top + rr.height / 2 - g.top;
                const x2 = cr.left - g.left - 4, y2 = cr.top + cr.height / 2 - g.top;
                const mx = (x1 + x2) / 2;
                d += `<path class="wire" data-c="${ci}" data-r="${fi}" d="M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}"/>`;
            });
        });
        wires.innerHTML = `<defs><marker id="wire-head" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>` + d;
    };
    new ResizeObserver(drawWires).observe(grid);

    const hl = (attr: 'c' | 'r', i: string | null) => {
        wires.querySelectorAll<SVGPathElement>('.wire').forEach((w) => w.classList.toggle('is-hot', i !== null && w.dataset[attr] === i));
        wires.classList.toggle('has-hot', i !== null);
    };
    log.addEventListener('pointerover', (e) => { const r = (e.target as HTMLElement).closest<HTMLElement>('.log__row'); hl('r', r?.dataset.i ?? null); });
    contrib.addEventListener('pointerover', (e) => {
        const c = (e.target as HTMLElement).closest<HTMLElement>('.contrib__row');
        hl('c', c ? String(Array.from(contrib.children).indexOf(c)) : null);
    });
    [log, contrib].forEach((el) => el.addEventListener('pointerleave', () => hl('r', null)));

    // The episode, step by step.
    const reset = () => {
        log.replaceChildren(); contrib.replaceChildren(); wires.innerHTML = '';
        setScore(0); traj.textContent = 'Nothing to read yet'; floor.textContent = 'Engine level: idle';
        dock.classList.remove('is-open', 'is-late'); sub.textContent = 'Out tonight · with Ava';
    };
    let total = 0;
    const steps: (() => void)[] = [];
    ROWS.forEach((r, i) => steps.push(() => {
        log.prepend(rowEl(r, i));
        contrib.append(contribEl(r.pts!, r.why!, [i]));
        total += r.pts!;
        if (i === 2) { contrib.append(contribEl(COMBO.pts, COMBO.label, COMBO.from)); total += COMBO.pts; }
        setScore(total);
        traj.textContent = i < 2 ? 'Rising' : 'Rising fast';
        floor.textContent = ENGINE[i];
        if (i === 1) sub.textContent = 'Out tonight · separated';
        if (i === 3) { dock.classList.add('is-open'); dockT.textContent = 'Heads-up open · 2:00'; }
        requestAnimationFrame(drawWires);
    }));
    steps.push(() => { dock.classList.add('is-late'); dockT.textContent = 'Location unlock overdue · 4:12'; });
    steps.push(() => {}); // a beat to read it
    steps.push(() => {
        log.prepend(rowEl({ name: 'ok', tier: 'ok', ago: '', status: '' }, 99));
        total = 0;
        contrib.replaceChildren(); wires.innerHTML = '';
        setScore(0);
        traj.textContent = '“I’m OK” resets the read. Only what happens next counts.';
        floor.textContent = 'Engine level: resolved';
        dock.classList.remove('is-open', 'is-late');
        sub.textContent = 'Out tonight · answered “I’m OK”';
    });
    steps.push(() => {});

    const runAll = () => { reset(); total = 0; steps.slice(0, ROWS.length + 1).forEach((s) => s()); };
    if (calm) { runAll(); startWave(root, true); return; }

    let i = 0, visible = false, timer = 0;
    const tick = () => {
        if (!visible) { timer = 0; return; }
        if (i === 0) { reset(); total = 0; }
        steps[i]();
        i = (i + 1) % steps.length;
        timer = window.setTimeout(tick, i === 0 ? 2600 : 1900);
    };
    new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && !timer) timer = window.setTimeout(tick, 600);
    }, { threshold: 0.25 }).observe(root);
    startWave(root, false);
}

// A small live strip: unsteady walking, in the monitor's colours.
function startWave(root: HTMLElement, still: boolean) {
    const canvas = root.querySelector<HTMLCanvasElement>('[data-mon-wave]')!;
    const ctx = canvas.getContext('2d')!;
    const tiles = root.querySelectorAll<HTMLElement>('[data-mt]');
    let visible = false;
    const size = () => {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    new ResizeObserver(size).observe(canvas);
    const f = (t: number, k: number) => 0.5 + 0.28 * Math.sin(t * (11 + k) + Math.sin(t * 1.3) * 2) + 0.1 * Math.sin(t * 27 + k);
    const draw = (ms: number) => {
        const t = ms / 1000, w = canvas.clientWidth, h = canvas.clientHeight;
        ctx.clearRect(0, 0, w, h);
        [['#B69CFF', 1, 0.6], ['#4AA8FF', 0, 1]].forEach(([c, k, a]) => {
            ctx.globalAlpha = a as number; ctx.strokeStyle = c as string; ctx.lineWidth = 2; ctx.beginPath();
            for (let x = 0; x <= w; x += 3) { const v = f(t - (w - x) / 120, k as number); x ? ctx.lineTo(x, h - v * h) : ctx.moveTo(x, h - v * h); }
            ctx.stroke();
        });
        ctx.globalAlpha = 1;
        if (Math.floor(ms / 400) % 3 === 0) {
            tiles[0].textContent = String(100 + Math.round(Math.sin(t) * 5));
            tiles[1].textContent = (2.3 + Math.sin(t * 1.7) * 0.25).toFixed(1);
            tiles[2].textContent = `${80 + Math.round(Math.abs(Math.sin(t * 2.3)) * 30)} ms`;
        }
        if (visible && !still) requestAnimationFrame(draw);
    };
    if (still) { requestAnimationFrame(draw); return; }
    new IntersectionObserver(([e]) => { const was = visible; visible = e.isIntersecting; if (visible && !was) requestAnimationFrame(draw); }).observe(canvas);
}
