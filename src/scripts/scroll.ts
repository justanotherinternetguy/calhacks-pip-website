// GSAP's ScrollTrigger driven by Lenis, set up once for the page.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

/** Motion has been asked to be reduced: no blur, no smooth scroll, nothing that plays by itself. */
export const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Narrow screens stack the narration under the phones. */
export const narrow = () => window.matchMedia('(max-width: 760px)').matches;

export let lenis: Lenis | null = null;

export function smoothScroll() {
    if (calm) return;
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, anchors: { offset: -72 } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis!.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
}

/** Refresh once fonts have settled, then again if a hash points into the page. */
export function refreshWhenReady() {
    document.fonts.ready.then(() => {
        ScrollTrigger.refresh();
        if (location.hash) {
            const target = document.querySelector(location.hash);
            if (target) lenis ? lenis.scrollTo(target as HTMLElement, { immediate: true, offset: -72 }) : target.scrollIntoView();
        }
    });
}

export { gsap, ScrollTrigger };
