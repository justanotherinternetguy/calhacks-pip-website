// The night, scrubbed by scroll. Timeline time is in chapters of 100: the hero is 0–100, then
// night mode, detection, check-in, heads-up, unlock and friends, and a short rest at the end.
import { gsap, ScrollTrigger, calm, narrow } from './scroll';

const HEX = '0123456789abcdef';
const scrambled = () => Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => HEX[(Math.random() * 16) | 0]).join('')).join('·');
const CLOCKS = ['19:58', '23:12', '23:41', '23:42', '23:44', '23:46', '23:52'];

export function initStory(root: HTMLElement) {
    const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector(sel) as T;
    const $$ = (sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));

    const phones = $('[data-phones]');
    const you = $('[data-phone-you]');
    const friend = $('[data-phone-friend]');
    const halo = $('[data-halo]');
    const clock = $('[data-clock]');
    const clock2 = $('[data-clock2]');
    const count = $('[data-count]');
    const arc = $<SVGCircleElement>('[data-count-arc]');
    const cipher = $('[data-cipher]');
    const dots = Array.from(root.querySelectorAll<HTMLElement>('.story__dots li'));

    // Scale the phones to the room they have.
    let s = 1;
    const fit = () => {
        const r = phones.getBoundingClientRect();
        s = Math.min(1, (r.height - 24) / 640, r.width / (narrow() ? 470 : 580));
        s = Math.max(0.42, s);
        phones.style.setProperty('--s', s.toFixed(3));
    };
    fit();
    ScrollTrigger.addEventListener('refreshInit', fit);

    // Where the two phones stand once Ava's comes in, in the phones' own (unscaled) pixels.
    const apart = () => (narrow() ? 100 : 140);

    if (calm) {
        // No scrubbing: show the night's two ends side by side and leave the narration on the hero.
        gsap.set(friend, { opacity: 1, x: () => apart(), rotate: 4 });
        gsap.set(you, { x: () => -apart(), rotate: -4 });
        return;
    }

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    // Narration: blur and rise in, rest, blur away.
    const blurIn = { opacity: 1, y: 0, filter: 'blur(0px)', duration: 14 };
    const blurOut = { opacity: 0, y: -26, filter: 'blur(12px)', duration: 12, ease: 'power2.in' };
    const hero = $('[data-hero]');
    tl.to(hero, { ...blurOut, duration: 22, onStart: () => { hero.style.pointerEvents = 'none'; }, onReverseComplete: () => { hero.style.pointerEvents = 'auto'; } }, 46);
    tl.to('[data-hint]', { opacity: 0, duration: 12 }, 4);
    tl.to('.story__dots', { opacity: 1, duration: 10 }, 90);
    $$('[data-chapter]').forEach((el, i) => {
        const at = (i + 1) * 100;
        gsap.set(el, { opacity: 0, y: 30, filter: 'blur(12px)' });
        tl.to(el, { ...blurIn, onComplete: () => { el.style.filter = ''; } }, at + 6);
        if (i < 5) tl.to(el, blurOut, at + 80);
    });

    // On a phone, the hero covers the stage; the phones wait behind it.
    if (narrow()) {
        gsap.set([you, '[data-rings]'], { opacity: 0.12, y: 40 });
        tl.to([you, '[data-rings]'], { opacity: 1, y: 0, duration: 30 }, 50);
    }

    // The halo behind the phones takes each chapter's colour.
    const tints = ['#4AA8FF', '#4AA8FF', '#FFD35A', '#B69CFF', '#FF6B5C', '#FF6B5C', '#3DD6A3'];
    tints.forEach((c, i) => { if (i) tl.to(halo, { backgroundColor: c, duration: 24, ease: 'none' }, i * 100); });

    // 1. Night mode switches itself on: the house goes, friends and the group's zone appear.
    tl.to('[data-np] .np__a', { opacity: 0, y: -12, duration: 8 }, 118)
      .fromTo('[data-np] .np__b', { y: 12 }, { opacity: 1, y: 0, duration: 8 }, 120)
      .to('[data-home-icon]', { opacity: 0, scale: 0.6, transformOrigin: '130px 140px', duration: 10 }, 116)
      .fromTo('[data-friend]', { scale: 0, transformOrigin: 'center' }, { opacity: 1, scale: 1, duration: 10, stagger: 4, ease: 'back.out(2.4)' }, 126)
      .to('[data-zone]', { opacity: 1, duration: 14 }, 132)
      .to('[data-sheet-a]', { opacity: 0, duration: 8 }, 128)
      .to('[data-sheet-b]', { opacity: 1, duration: 8 }, 134);

    // 2. A hard fall: the live strip slides in, the line runs past 3 g, incidents open.
    const wave = $<SVGPathElement>('[data-wave]');
    const len = wave.getTotalLength();
    gsap.set(wave, { strokeDasharray: len, strokeDashoffset: len });
    tl.to('[data-sense]', { opacity: 1, y: 0, duration: 12 }, 208)
      .to('[data-wave]', { strokeDashoffset: 0, duration: 42, ease: 'none' }, 216)
      .to('[data-inc-fall]', { opacity: 1, scale: 1, duration: 6, ease: 'back.out(3)' }, 244)
      .to('[data-inc-down]', { opacity: 1, scale: 1, duration: 6, ease: 'back.out(3)' }, 262)
      .to('[data-inc-mic]', { opacity: 1, scale: 1, duration: 6, ease: 'back.out(3)' }, 270);

    // 3. "You okay?" opens out of the bottom of the screen, and its two minutes start.
    tl.to('[data-scr-check]', { clipPath: 'circle(150% at 50% 100%)', duration: 22, ease: 'power2.inOut' }, 302);
    const left = { t: 120 };
    const showCount = () => {
        const t = Math.round(left.t);
        count.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
        arc.style.strokeDashoffset = String(100 - (left.t / 120) * 100);
    };
    tl.to(left, { t: 0, duration: 100, ease: 'none', onUpdate: showCount }, 326);

    // 4. No answer. Sam's phone steps back; Ava's comes in and gets the heads-up.
    tl.to('[data-scr-told]', { opacity: 1, duration: 8 }, 426)
      .to(you, { x: () => -apart(), rotate: -5, scale: 0.94, duration: 26, ease: 'power3.inOut' }, 408)
      .fromTo(friend, { x: () => apart() * 2.6, rotate: 12, opacity: 0 }, { x: () => apart(), rotate: 4, opacity: 1, duration: 28, ease: 'power3.out' }, 414);

    // 5. The hour keys travel to Ava. The seal lifts and the map clears.
    const keys = $$('.key');
    keys.forEach((k, i) => {
        tl.fromTo(k, { x: () => -apart(), y: -40, opacity: 0, scale: 0.4 },
            { keyframes: [
                { opacity: 1, scale: 1.1, duration: 6 },
                { x: () => apart(), y: -60 + i * 50, rotate: 360, duration: 22, ease: 'power2.inOut' },
                { opacity: 0, scale: 0.4, duration: 6 }
            ] }, 508 + i * 6);
    });
    const scramble = { p: 0 };
    tl.to(scramble, { p: 1, duration: 36, ease: 'none', onUpdate: () => { cipher.textContent = scrambled(); } }, 506)
      .to('[data-lock]', { opacity: 0, duration: 10 }, 548)
      .to('.map__svg', { filter: 'blur(0px) saturate(1)', scale: 1, duration: 16 }, 548)
      .to('.map__acc', { opacity: 1, duration: 10 }, 558)
      .to('[data-pin]', { opacity: 1, y: 0, duration: 10, ease: 'bounce.out' }, 560)
      .to('.fr__lvl-a', { opacity: 0, duration: 6 }, 556)
      .to('.fr__lvl-b', { opacity: 1, duration: 6 }, 560);

    // 6. Ava rings Sam's phone, says she's going, and marks Sam found.
    const press = (sel: string, at: number, color = '#FFD35A') => tl.to(sel, { y: 3, boxShadow: '0 0 0 #1E1B2E', backgroundColor: color, duration: 4 }, at);
    press('[data-act-ring]', 608);
    tl.to('[data-ringwaves]', { opacity: 1, duration: 4 }, 610)
      .to('[data-ringwaves]', { opacity: 0, duration: 6 }, 640);
    press('[data-act-go]', 630);
    press('[data-act-found]', 652, '#3DD6A3');
    tl.to('[data-found]', { opacity: 1, y: 0, duration: 10, ease: 'back.out(2)' }, 658)
      .to('[data-notif]', { opacity: 0, duration: 6 }, 656)
      .to('.fr__lvl-b', { opacity: 0, duration: 6 }, 658)
      .to('.fr__lvl-c', { opacity: 1, duration: 6 }, 662)
      .to('[data-scr-safe]', { opacity: 1, duration: 10 }, 664)
      .to({}, { duration: 1 }, 760);

    gsap.set('[data-notif]', { yPercent: -140 });
    tl.to('[data-notif]', { yPercent: 0, duration: 12, ease: 'back.out(1.6)' }, 440);

    // The clocks and the chapter dots follow the timeline itself, so they keep up while the scrub catches up.
    let last = -1;
    tl.eventCallback('onUpdate', () => {
        const t = tl.time();
        const ch = Math.min(6, Math.floor(t / 100));
        if (ch !== last) {
            last = ch;
            clock.textContent = CLOCKS[ch];
            clock2.textContent = CLOCKS[Math.max(5, ch)];
        }
        dots.forEach((d, i) => d.style.setProperty('--p', String(Math.min(1, Math.max(0, (t - (i + 1) * 100) / 100)))));
    });

    ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.7,
        animation: tl,
        invalidateOnRefresh: true,
    });
}
