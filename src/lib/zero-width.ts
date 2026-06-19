/**
 * Zero-Width Character URL Encoder / Decoder
 *
 * Encoding scheme — base-4 (2 bits per character):
 *   \u200B  Zero Width Space          → 00
 *   \u200C  Zero Width Non-Joiner     → 01
 *   \u200D  Zero Width Joiner         → 10
 *   \uFEFF  Zero Width No-Break Space  → 11
 *
 * Wire format: [2-byte big-endian length] [URL bytes as UTF-8] → base-4 ZWC string
 */

const ZWC = ['\u200B', '\u200C', '\u200D', '\uFEFF'] as const;
const ZWC_PATTERN = /[\u200B\u200C\u200D\uFEFF]/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function bytesToBinary(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(2).padStart(8, '0'))
    .join('');
}

function binaryToBytes(binary: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i + 7 < binary.length; i += 8) {
    bytes.push(parseInt(binary.substring(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Encode a URL string into an invisible zero-width character sequence. */
export function encodeUrl(url: string): string {
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (url.length > 10000) {
    throw new Error('URL too long (max 10 000 characters)');
  }

  const data = textToBytes(url);
  const len = data.length;

  // 2-byte big-endian length header (max 65 535 bytes)
  const header = new Uint8Array([(len >> 8) & 0xff, len & 0xff]);
  const combined = new Uint8Array(header.length + data.length);
  combined.set(header);
  combined.set(data, header.length);

  const binary = bytesToBinary(combined);
  const padded = binary.length % 2 === 0 ? binary : binary + '0';

  let encoded = '';
  for (let i = 0; i < padded.length; i += 2) {
    const idx = parseInt(padded.substring(i, i + 2), 2);
    encoded += ZWC[idx];
  }

  return encoded;
}

/** Decode a zero-width character sequence back to the original URL. */
export function decodeZeroWidth(encoded: string): string {
  let binary = '';
  for (const ch of encoded) {
    const idx = ZWC.indexOf(ch as (typeof ZWC)[number]);
    if (idx !== -1) {
      binary += idx.toString(2).padStart(2, '0');
    }
  }

  if (binary.length < 16) {
    throw new Error('Encoded data too short');
  }

  const bytes = binaryToBytes(binary);
  if (bytes.length < 2) {
    throw new Error('Invalid encoded data');
  }

  const len = (bytes[0] << 8) | bytes[1];
  if (len === 0 || bytes.length < 2 + len) {
    throw new Error('Invalid data length');
  }

  return bytesToText(bytes.slice(2, 2 + len));
}

/** Returns true when *str* contains at least one zero-width character. */
export function containsZeroWidthChars(str: string): boolean {
  return ZWC_PATTERN.test(str);
}

/** Human-readable representation: each ZWC becomes a visible dot. */
export function visualizeZeroWidth(encoded: string): string {
  return encoded.replace(/[\u200B\u200C\u200D\uFEFF]/g, '\u00B7');
}

/** Return encoding statistics for display. */
export function getEncodingInfo(url: string) {
  const encoded = encodeUrl(url);
  const charCount: Record<string, number> = {
    ZWS: 0,
    ZWNJ: 0,
    ZWJ: 0,
    BOM: 0,
  };
  for (const ch of encoded) {
    const names: Record<string, string> = {
      '\u200B': 'ZWS',
      '\u200C': 'ZWNJ',
      '\u200D': 'ZWJ',
      '\uFEFF': 'BOM',
    };
    const name = names[ch];
    if (name) charCount[name]++;
  }

  return {
    originalLength: url.length,
    encodedLength: encoded.length,
    compressionRatio: Math.round((encoded.length / url.length) * 100),
    charCount,
  };
}
