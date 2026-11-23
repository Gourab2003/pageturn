const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const CODES = new Uint8Array(64);
for (let i = 0; i < 64; i++) CODES[i] = ALPHABET.charCodeAt(i);
const PAD = 61; // '='

/** Fast Uint8Array → base64 (no btoa needed; works on Hermes). */
export function bytesToBase64(bytes: Uint8Array): string {
  const n = bytes.length;
  const out = new Uint8Array(Math.ceil(n / 3) * 4);
  let o = 0;
  let i = 0;
  for (; i + 2 < n; i += 3) {
    const t = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out[o++] = CODES[(t >> 18) & 63];
    out[o++] = CODES[(t >> 12) & 63];
    out[o++] = CODES[(t >> 6) & 63];
    out[o++] = CODES[t & 63];
  }
  if (i < n) {
    const hasTwo = i + 1 < n;
    const t = (bytes[i] << 16) | ((hasTwo ? bytes[i + 1] : 0) << 8);
    out[o++] = CODES[(t >> 18) & 63];
    out[o++] = CODES[(t >> 12) & 63];
    out[o++] = hasTwo ? CODES[(t >> 6) & 63] : PAD;
    out[o++] = PAD;
  }
  let s = '';
  const STEP = 0x2000;
  for (let k = 0; k < out.length; k += STEP) {
    s += String.fromCharCode.apply(null, out.subarray(k, k + STEP) as unknown as number[]);
  }
  return s;
}
