// The check-in rule, run on whatever evidence the reader turns on.
const NAMES: Record<string, string> = { fall: 'Fall', gait: 'Walking', phone: 'Phone', location: 'Location', audio: 'Sound' };

export function initRule(root: HTMLElement) {
    const chips = Array.from(root.querySelectorAll<HTMLButtonElement>('.ev-chip'));
    const verdict = root.querySelector<HTMLElement>('[data-verdict]')!;
    const vt = root.querySelector<HTMLElement>('[data-verdict-t]')!;
    const vs = root.querySelector<HTMLElement>('[data-verdict-s]')!;
    const pips = Array.from(root.querySelectorAll<HTMLElement>('[data-pip]'));
    let timer = 0;
    let waitLeft = 0;

    const set = (state: string, t: string, s: string) => {
        if (verdict.dataset.state !== state) {
            verdict.animate([{ transform: 'scale(0.97)' }, { transform: 'scale(1.015)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' });
        }
        verdict.dataset.state = state;
        vt.textContent = t;
        vs.textContent = s;
    };

    const judge = () => {
        clearInterval(timer);
        const on = chips.filter((c) => c.getAttribute('aria-pressed') === 'true');
        const fams = new Set(on.filter((c) => c.dataset.tier === 'watch').map((c) => c.dataset.fam!));
        pips.forEach((p) => p.classList.toggle('is-on', on.some((c) => c.dataset.fam === p.dataset.pip)));
        root.querySelectorAll<HTMLElement>('.fam').forEach((f) => f.classList.toggle('is-on', on.some((c) => c.dataset.fam === f.dataset.fam)));

        const danger = on.find((c) => c.dataset.tier === 'danger');
        const alone = on.find((c) => c.dataset.alone);
        const name = (c: HTMLElement) => c.textContent!.trim();

        if (!on.length) return set('idle', 'Nothing open', 'The phone samples at the low rate and logs nothing.');
        if (danger && name(danger) === 'Grab') return set('alert', 'Friends told at once', 'A grab skips the check-in. Friends get “don’t chase” with the location at the snatch moment. Only your fingerprint dismisses it.');
        if (danger) return set('ask', 'You okay?', `${name(danger)} is a danger incident, so it asks on its own.`);
        if (fams.size >= 2) {
            const list = Array.from(fams).map((f) => NAMES[f]).join(' + ');
            return set('ask', 'You okay?', `Two kinds of evidence at once: ${list}.`);
        }
        if (alone) {
            waitLeft = 5;
            const tick = () => {
                if (waitLeft <= 0) { clearInterval(timer); set('ask', 'You okay?', `${name(alone)} stayed open for 5 s without being explained as a dropped phone.`); return; }
                set('wait', `Asking in ${waitLeft} s`, `${name(alone)} can ask on its own once it has been open 5 s. First the engine checks it wasn’t a dropped phone.`);
                waitLeft--;
            };
            tick();
            timer = window.setInterval(tick, 1000);
            return;
        }
        const same = on.length > 1;
        set('watch', 'Logged. Watching closely', same
            ? `Both are ${NAMES[Array.from(fams)[0]].toLowerCase()} evidence. Two from one family never ask. Full sensing is on and the mic may listen.`
            : 'Full sensing is on. It needs a second kind of evidence before it asks.');
    };

    chips.forEach((c) => c.addEventListener('click', () => {
        c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
        judge();
    }));
    root.querySelector('[data-rule-clear]')!.addEventListener('click', () => {
        chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
        judge();
    });
}
