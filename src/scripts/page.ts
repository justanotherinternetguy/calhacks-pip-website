// Small things across the page: the incident filter, counters, the nav's current section, copy.
import { gsap, ScrollTrigger, calm } from './scroll';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(Flip);

export function initPage() {
    incidentFilter();
    counters();
    navHere();
    copyButton();
}

function incidentFilter() {
    const list = document.querySelector<HTMLElement>('[data-incs]');
    const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-inc-tabs] button'));
    if (!list) return;
    const cards = Array.from(list.children) as HTMLElement[];
    tabs.forEach((tab) => tab.addEventListener('click', () => {
        const tier = tab.dataset.tier!;
        tabs.forEach((t) => t.setAttribute('aria-pressed', String(t === tab)));
        const state = Flip.getState(cards);
        cards.forEach((c) => { c.hidden = tier !== 'all' && c.dataset.tier !== tier; });
        if (calm) return;
        Flip.from(state, {
            duration: 0.55, ease: 'power3.inOut', absolute: true, scale: true, nested: true,
            onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.6)' }),
            onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.85, duration: 0.3 }),
        });
    }));
}

function counters() {
    document.querySelectorAll<HTMLElement>('[data-count-to]').forEach((el) => {
        const to = Number(el.dataset.countTo);
        if (calm) return;
        const v = { n: 0 };
        el.textContent = '0';
        ScrollTrigger.create({
            trigger: el, start: 'top 92%', once: true,
            onEnter: () => gsap.to(v, { n: to, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = String(Math.round(v.n)); } }),
        });
    });
}

function navHere() {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-navlink]'));
    links.forEach((a) => {
        const section = document.querySelector(a.getAttribute('href')!);
        if (!section) return;
        ScrollTrigger.create({
            trigger: section, start: 'top 50%', end: 'bottom 50%',
            onToggle: (st) => a.classList.toggle('is-here', st.isActive),
        });
    });
}

function copyButton() {
    const btn = document.querySelector<HTMLButtonElement>('[data-copy]');
    const pre = document.querySelector<HTMLElement>('[data-commands]');
    if (!btn || !pre) return;
    btn.addEventListener('click', async () => {
        const text = pre.innerText.split('\n').filter((l) => l.trim().startsWith('$') || l.startsWith('    ')).map((l) => l.replace(/^\$\s*/, '').replace(/\s+#.*$/, '')).join('\n');
        try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; } catch { btn.textContent = 'Select and copy'; }
        setTimeout(() => { btn.textContent = 'Copy'; }, 1600);
    });
}
