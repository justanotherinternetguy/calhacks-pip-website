// The escalation rail, scrubbed by scroll, and the hold-for-help button.
import { ScrollTrigger, calm } from './scroll';

const NODES = [0, 2, 4, 10];

export function initEscalation(root: HTMLElement) {
    const esc = root.querySelector<HTMLElement>('[data-esc]')!;
    const fill = root.querySelector<HTMLElement>('[data-esc-fill]')!;
    const clock = root.querySelector<HTMLElement>('[data-esc-clock]')!;
    const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-esc-step]'));

    const show = (p: number) => {
        // The rail runs node to node at equal spacing; the clock runs 0, 2, 4, 10 minutes between them.
        const span = p * (NODES.length - 1);
        const i = Math.min(NODES.length - 2, Math.floor(span));
        const min = NODES[i] + (NODES[i + 1] - NODES[i]) * (span - i);
        const secs = Math.round(min * 60);
        clock.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
        fill.style.setProperty('--p', p.toFixed(4));
        steps.forEach((s, j) => s.classList.toggle('is-on', p >= j / (NODES.length - 1) - 0.001));
    };

    if (calm) show(1);
    else {
        show(0);
        ScrollTrigger.create({ trigger: esc, start: 'top 72%', end: 'bottom 42%', scrub: 0.5, onUpdate: (st) => show(st.progress) });
    }

    initSos(root.querySelector<HTMLElement>('[data-sos]')!);
}

function initSos(root: HTMLElement) {
    const btn = root.querySelector<HTMLButtonElement>('[data-sos-btn]')!;
    const arc = root.querySelector<SVGCircleElement>('[data-sos-arc]')!;
    const label = root.querySelector<HTMLElement>('[data-sos-label]')!;
    const text = root.querySelector<HTMLElement>('[data-sos-text]')!;
    const cancel = root.querySelector<HTMLButtonElement>('[data-sos-cancel]')!;
    const idleText = text.textContent!;
    const HOLD = 1400;
    let started = 0, raf = 0, sent = false;

    const paint = (p: number) => { arc.style.strokeDashoffset = String(100 - p * 100); };
    const tick = (ms: number) => {
        const p = Math.min(1, (ms - started) / HOLD);
        paint(p);
        if (p >= 1) { fire(); return; }
        raf = requestAnimationFrame(tick);
    };
    const down = (e: Event) => {
        if (sent) return;
        e.preventDefault();
        started = performance.now();
        root.classList.add('is-holding');
        label.textContent = 'Keep holding…';
        raf = requestAnimationFrame(tick);
    };
    const up = () => {
        if (sent || !started) return;
        cancelAnimationFrame(raf);
        started = 0;
        root.classList.remove('is-holding');
        label.textContent = 'Hold for help';
        arc.animate([{ strokeDashoffset: arc.style.strokeDashoffset }, { strokeDashoffset: '100' }], { duration: 260, easing: 'ease-out' });
        paint(0);
    };
    const fire = () => {
        sent = true;
        started = 0;
        root.classList.remove('is-holding');
        root.classList.add('is-sent');
        label.textContent = 'Help is on the way';
        text.textContent = 'SOS sent. Friends were told and your location unlocked at once. It counts as consent. To stand it down, you need your fingerprint.';
        cancel.hidden = false;
        if ('vibrate' in navigator) navigator.vibrate?.(80);
    };
    cancel.addEventListener('click', () => {
        sent = false;
        root.classList.remove('is-sent');
        label.textContent = 'Hold for help';
        text.textContent = idleText;
        cancel.hidden = true;
        paint(0);
    });

    btn.addEventListener('pointerdown', down);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, up));
    btn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) down(e); });
    btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') up(); });
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    paint(0);
}
