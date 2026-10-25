// Sections come in as they are scrolled to: a soft rise and a blur that clears. Each element once.
import { gsap, ScrollTrigger, calm } from './scroll';

export function reveal(selector = '[data-reveal]') {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (calm) { nodes.forEach((n) => n.classList.add('is-shown')); return; }
    nodes.forEach((node) => {
        const children = node.dataset.reveal === 'children' ? Array.from(node.children) : [node];
        gsap.set(children, { opacity: 0, y: 30, filter: 'blur(10px)' });
        ScrollTrigger.create({
            trigger: node,
            start: 'top 88%',
            once: true,
            onEnter: () => gsap.to(children, {
                opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.95, ease: 'power3.out', stagger: 0.08,
                clearProps: 'filter,transform',
                onComplete: () => node.classList.add('is-shown')
            })
        });
    });
}

/** Big headings: each word rises out of a blur, in turn. */
export function splitWords(selector = '[data-words]') {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        if (calm) return;
        const walk = (node: Node) => {
            Array.from(node.childNodes).forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) {
                    const frag = document.createDocumentFragment();
                    (child.textContent || '').split(/(\s+)/).forEach((part) => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.append(part); return; }
                        const w = document.createElement('span');
                        w.className = 'word';
                        w.textContent = part;
                        frag.append(w);
                    });
                    child.replaceWith(frag);
                } else if (child.nodeType === Node.ELEMENT_NODE && !(child as Element).matches('svg')) walk(child);
            });
        };
        walk(el);
        const words = el.querySelectorAll('.word');
        gsap.set(words, { opacity: 0, y: '0.4em', filter: 'blur(8px)' });
        ScrollTrigger.create({
            trigger: el, start: 'top 90%', once: true,
            onEnter: () => gsap.to(words, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out', stagger: 0.045, clearProps: 'filter,transform' })
        });
    });
}
