// Wires the page together. The story and nav are needed at once; each demo loads as it comes near.
import { gsap, ScrollTrigger, smoothScroll, refreshWhenReady } from './scroll';
import { reveal, splitWords } from './reveal';
import { initStory } from './story';
import { initPage } from './page';

smoothScroll();
const story = document.querySelector<HTMLElement>('[data-story]');
if (story) initStory(story);

const nav = document.querySelector<HTMLElement>('[data-nav]');
if (nav) ScrollTrigger.create({ start: 8, end: 'max', toggleClass: { targets: nav, className: 'is-scrolled' } });
const bar = document.querySelector<HTMLElement>('[data-progress]');
if (bar) gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

splitWords();
reveal();
initPage();

/** Load a module when an element comes within 900px of the viewport. */
function near(selector: string, load: (el: HTMLElement) => Promise<unknown>) {
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) return;
    const watcher = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        watcher.disconnect();
        load(target);
    }, { rootMargin: '900px 0px' });
    watcher.observe(target);
}
near('[data-signals]', (el) => import('./signals').then((m) => m.initSignals(el)));
near('[data-rule]', (el) => import('./rule').then((m) => m.initRule(el)));
near('#escalation', (el) => import('./escalation').then((m) => { m.initEscalation(el); ScrollTrigger.refresh(); }));
near('[data-checkin]', (el) => import('./checkin').then((m) => m.initCheckIn(el)));
near('#privacy', (el) => import('./privacy').then((m) => m.initPrivacy(el)));
near('[data-monitor]', (el) => import('./monitor').then((m) => m.initMonitor(el)));

refreshWhenReady();
