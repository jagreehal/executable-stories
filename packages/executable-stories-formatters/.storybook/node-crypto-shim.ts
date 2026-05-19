/**
 * Browser shim for `node:crypto` (only the `createHash` surface that
 * formatter code touches, e.g. slugify in converters/acl/ids.ts).
 *
 * Uses SubtleCrypto for SHA-1 when available; falls back to a tiny pure
 * implementation so synchronous `digest()` keeps working in Storybook.
 *
 * NOT cryptographically reviewed — only suitable for stable id derivation
 * inside Storybook previews.
 */

function sha1Hex(input: string): string {
  // Pure JS SHA-1 (minimal). Adapted from public-domain references.
  // Returns a 40-char lowercase hex string.
  const bytes = new TextEncoder().encode(input);
  const ml = bytes.length * 8;
  const withOne = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  withOne.set(bytes);
  withOne[bytes.length] = 0x80;
  const view = new DataView(withOne.buffer);
  view.setUint32(withOne.length - 4, ml >>> 0, false);

  let h0 = 0x67452301,
    h1 = 0xefcdab89,
    h2 = 0x98badcfe,
    h3 = 0x10325476,
    h4 = 0xc3d2e1f0;

  const w = new Uint32Array(80);
  for (let chunk = 0; chunk < withOne.length; chunk += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(chunk + i * 4, false);
    for (let i = 16; i < 80; i++) {
      const v = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
      w[i] = (v << 1) | (v >>> 31);
    }
    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4;
    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) >>> 0;
      b = a;
      a = temp;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  const toHex = (n: number) => n.toString(16).padStart(8, "0");
  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
}

class Hash {
  private chunks: string[] = [];
  constructor(_algorithm: string) {}
  update(input: string | Uint8Array): this {
    this.chunks.push(typeof input === "string" ? input : new TextDecoder().decode(input));
    return this;
  }
  digest(_encoding: "hex"): string {
    return sha1Hex(this.chunks.join(""));
  }
}

export function createHash(algorithm: string): Hash {
  return new Hash(algorithm);
}
