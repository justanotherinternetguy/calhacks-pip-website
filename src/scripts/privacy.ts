// The key-splitting demo, the ciphertext that never decrypts, the proximity cells and a QR code.
import { split, combine, hex, type Share } from './shamir';

const NAMES = ['Ava', 'Jo', 'Kai', 'Mo'];
const group = (h: string) => h.match(/.{1,4}/g)!.join(' ');

export function initPrivacy(root: HTMLElement) {
    initShamir(root.querySelector<HTMLElement>('[data-shamir]')!);
    initBlob(root.querySelector<HTMLElement>('[data-blob]')!);
    initCells(root.querySelector<HTMLElement>('[data-cells]')!);
    drawQr(root.querySelector<SVGSVGElement>('[data-qr]')!);
}

function initShamir(root: HTMLElement) {
    const dayEl = root.querySelector<HTMLElement>('[data-daykey]')!;
    const rebuiltEl = root.querySelector<HTMLElement>('[data-rebuilt]')!;
    const statusEl = root.querySelector<HTMLElement>('[data-status]')!;
    const out = root.querySelector<HTMLElement>('[data-out]')!;
    const outLabel = root.querySelector<HTMLElement>('[data-out-label]')!;
    const audit = root.querySelector<HTMLElement>('[data-audit]')!;
    const auditT = root.querySelector<HTMLElement>('[data-audit-t]')!;
    const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-share]'));
    const kTabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-k]'));

    let k = 2;
    let key = new Uint8Array(16);
    let shares: Share[] = [];

    const make = () => {
        crypto.getRandomValues(key);
        shares = split(key, 4, k);
        dayEl.textContent = group(hex(key));
        cards.forEach((c, i) => {
            c.querySelector('[data-share-hex]')!.textContent = group(hex(shares[i].y)).slice(0, 19) + '…';
            c.querySelector('[data-approve]')!.setAttribute('aria-pressed', 'false');
            c.classList.remove('is-on');
            c.animate([{ transform: 'translateY(-8px)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 500, delay: i * 70, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' });
        });
        update();
    };

    const update = () => {
        const chosen = cards.map((c, i) => (c.classList.contains('is-on') ? i : -1)).filter((i) => i >= 0);
        if (!chosen.length) {
            out.dataset.state = 'none';
            outLabel.textContent = 'Combined shares';
            rebuiltEl.innerHTML = '<span class="hx-dim">' + group('0'.repeat(32)).replace(/0/g, '·') + '</span>';
            statusEl.textContent = `Approve shares as Sam’s friends. It takes ${k}.`;
            audit.hidden = true;
            return;
        }
        const got = combine(chosen.map((i) => shares[i]));
        const match = chosen.length >= k;
        const gotHex = hex(got), keyHex = hex(key);
        // Colour each byte: right or wrong.
        let html = '';
        for (let b = 0; b < 16; b++) {
            const byte = gotHex.slice(b * 2, b * 2 + 2);
            html += `<span class="${byte === keyHex.slice(b * 2, b * 2 + 2) ? 'hx-ok' : 'hx-bad'}">${byte}</span>`;
            if (b % 2 === 1 && b < 15) html += ' ';
        }
        rebuiltEl.innerHTML = html;
        out.dataset.state = match ? 'ok' : 'bad';
        const who = chosen.map((i) => NAMES[i]);
        const list = who.length > 1 ? `${who.slice(0, -1).join(', ')} and ${who[who.length - 1]}` : who[0];
        if (match) {
            outLabel.textContent = 'Rebuilt day key';
            statusEl.innerHTML = `<b>${chosen.length} of ${k}.</b> It matches the day key. The last known location decrypts: <b>23:47, 40 m from the corner of State and Aurora.</b>`;
            audit.hidden = false;
            auditT.textContent = `Logged for Sam and the whole group: ${list} unlocked Sam’s location at 23:51.`;
        } else {
            outLabel.textContent = 'Combined shares';
            statusEl.innerHTML = `<b>${chosen.length} of ${k}.</b> The result is noise, not the key. ${k - chosen.length === 1 ? 'One more friend' : `${k - chosen.length} more friends`} would have to approve.`;
            audit.hidden = true;
        }
        rebuiltEl.animate([{ filter: 'blur(4px)', opacity: 0.4 }, { filter: 'blur(0)', opacity: 1 }], { duration: 360, easing: 'ease-out' });
    };

    cards.forEach((c) => {
        const btn = c.querySelector<HTMLButtonElement>('[data-approve]')!;
        btn.addEventListener('click', () => {
            const on = !c.classList.contains('is-on');
            c.classList.toggle('is-on', on);
            btn.setAttribute('aria-pressed', String(on));
            btn.textContent = on ? 'Approved' : 'Approve';
            update();
        });
    });
    kTabs.forEach((t) => t.addEventListener('click', () => {
        k = Number(t.dataset.k);
        kTabs.forEach((x) => x.setAttribute('aria-pressed', String(x === t)));
        cards.forEach((c) => { c.classList.remove('is-on'); const b = c.querySelector('[data-approve]')!; b.setAttribute('aria-pressed', 'false'); b.textContent = 'Approve'; });
        make();
    }));
    root.querySelector('[data-newkey]')!.addEventListener('click', () => {
        cards.forEach((c) => { c.classList.remove('is-on'); c.querySelector('[data-approve]')!.textContent = 'Approve'; });
        make();
    });
    make();
}

function initBlob(el: HTMLElement) {
    const bytes = new Uint8Array(72);
    const draw = () => {
        crypto.getRandomValues(bytes);
        el.textContent = hex(bytes).match(/.{1,8}/g)!.join(' ');
    };
    draw();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let on = false;
    new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(el);
    setInterval(() => { if (on) draw(); }, 1600);
}

// A 8×5 patch of map cells: Sam in sky, Ava in mint. Each covers its cell and the 8 around it;
// shared cells mean "together". Ava wanders off and back.
function initCells(el: HTMLElement) {
    const cells = Array.from(el.querySelectorAll<HTMLElement>('i'));
    const state = el.querySelector<HTMLElement>('[data-cells-state]')!;
    const W = 8, H = 5;
    const sam = { x: 2, y: 2 };
    const path = [{ x: 3, y: 2 }, { x: 4, y: 1 }, { x: 5, y: 2 }, { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 5, y: 1 }, { x: 4, y: 2 }];
    let step = 0;
    const near = (p: { x: number; y: number }, x: number, y: number) => Math.abs(p.x - x) <= 1 && Math.abs(p.y - y) <= 1;
    const paint = () => {
        const ava = path[step % path.length];
        let shared = 0;
        cells.forEach((c, i) => {
            const x = i % W, y = Math.floor(i / W);
            if (y >= H) return;
            const a = near(sam, x, y), b = near(ava, x, y);
            c.className = (a && b ? 'is-both' : a ? 'is-a' : b ? 'is-b' : '') + (x === sam.x && y === sam.y ? ' is-sam' : '') + (x === ava.x && y === ava.y ? ' is-ava' : '');
            if (a && b) shared++;
        });
        const together = shared > 0;
        state.textContent = together ? 'together' : 'separated';
        state.dataset.on = String(together);
    };
    paint();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let on = false;
    new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(el);
    setInterval(() => { if (on) { step++; paint(); } }, 1400);
}

// A decorative QR-like code: the three finder squares and seeded noise.
function drawQr(svg: SVGSVGElement) {
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const finder = (x: number, y: number) => `<rect x="${x}" y="${y}" width="7" height="7" rx="1.4" class="qr-ink"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="1" class="qr-paper"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.6" class="qr-ink"/>`;
    let dots = '';
    for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
        const inFinder = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
        if (!inFinder && rnd() > 0.52) dots += `<rect x="${x + 0.1}" y="${y + 0.1}" width="0.8" height="0.8" rx="0.25" class="qr-ink"/>`;
    }
    svg.innerHTML = finder(0, 0) + finder(14, 0) + finder(0, 14) + dots;
}
