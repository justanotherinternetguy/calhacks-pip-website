// Shamir secret sharing over GF(256), the same scheme safety-crypto uses for the day key.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
        EXP[i] = x;
        LOG[x] = i;
        x ^= (x << 1) ^ (x & 0x80 ? 0x11b : 0); // multiply by 3 in GF(2^8), AES polynomial
        x &= 0xff;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
const mul = (a: number, b: number) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
const div = (a: number, b: number) => (a ? EXP[(LOG[a] + 255 - LOG[b]) % 255] : 0);

export interface Share { x: number; y: Uint8Array; }

export function split(secret: Uint8Array, n: number, k: number): Share[] {
    const shares: Share[] = Array.from({ length: n }, (_, i) => ({ x: i + 1, y: new Uint8Array(secret.length) }));
    const coeffs = new Uint8Array(k - 1);
    secret.forEach((byte, b) => {
        crypto.getRandomValues(coeffs);
        shares.forEach((s) => {
            // Horner: a0 + x(a1 + x(a2 + …))
            let y = 0;
            for (let c = k - 2; c >= 0; c--) y = mul(y ^ coeffs[c], s.x);
            s.y[b] = mul(y, 1) ^ byte;
        });
    });
    return shares;
}

/** Lagrange interpolation at x = 0. With fewer than k shares the answer is noise. */
export function combine(shares: Share[]): Uint8Array {
    const out = new Uint8Array(shares[0].y.length);
    for (let b = 0; b < out.length; b++) {
        let acc = 0;
        shares.forEach((si, i) => {
            let num = 1, den = 1;
            shares.forEach((sj, j) => { if (i !== j) { num = mul(num, sj.x); den = mul(den, si.x ^ sj.x); } });
            acc ^= mul(si.y[b], div(num, den));
        });
        out[b] = acc;
    }
    return out;
}

export const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
