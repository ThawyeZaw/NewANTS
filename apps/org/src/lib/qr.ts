/**
 * Pure TypeScript ISO/IEC 18004 QR Code Generator (Byte Mode, Error Correction Level L).
 *
 * Designed for `[ZYY-2.3]` Telegram Inquiry QR modals so any `https://t.me/<handle>?text=...`
 * deep link renders offline as a real, camera-scannable SVG QR matrix without external
 * runtime dependencies or network requests.
 */

export interface QrMatrixResult {
  /** QR symbol version (1..10) selected automatically for the encoded payload length */
  version: number;
  /** Width & height of the square QR module grid (excluding quiet zone) */
  size: number;
  /** Quiet-zone padding in modules recommended around the symbol */
  quietZone: number;
  /** Square boolean matrix (`true` = dark module, `false` = light module) */
  modules: boolean[][];
  /** Mask index (0..7) chosen after ISO penalty scoring */
  maskPattern: number;
  /** Whether the input text was trimmed to fit the maximum Version 10 Level-L capacity */
  truncated: boolean;
}

interface VersionSpec {
  version: number;
  size: number;
  dataCodewords: number;
  eccPerBlock: number;
  blocksGroup1: number;
  dataPerBlock1: number;
  blocksGroup2: number;
  dataPerBlock2: number;
  alignmentCenters: readonly number[];
  charCountBits: 8 | 16;
}

/** ISO/IEC 18004 Level-L capacity & block specifications for Versions 1–10 (up to ~271 UTF-8 bytes). */
const VERSION_SPECS: readonly VersionSpec[] = [
  { version: 1, size: 21, dataCodewords: 19, eccPerBlock: 7, blocksGroup1: 1, dataPerBlock1: 19, blocksGroup2: 0, dataPerBlock2: 0, alignmentCenters: [], charCountBits: 8 },
  { version: 2, size: 25, dataCodewords: 34, eccPerBlock: 10, blocksGroup1: 1, dataPerBlock1: 34, blocksGroup2: 0, dataPerBlock2: 0, alignmentCenters: [6, 18], charCountBits: 8 },
  { version: 3, size: 29, dataCodewords: 55, eccPerBlock: 15, blocksGroup1: 1, dataPerBlock1: 55, blocksGroup2: 0, dataPerBlock2: 0, alignmentCenters: [6, 22], charCountBits: 8 },
  { version: 4, size: 33, dataCodewords: 80, eccPerBlock: 20, blocksGroup1: 1, dataPerBlock1: 80, blocksGroup2: 0, dataPerBlock2: 0, alignmentCenters: [6, 26], charCountBits: 8 },
  { version: 5, size: 37, dataCodewords: 108, eccPerBlock: 26, blocksGroup1: 1, dataPerBlock1: 108, blocksGroup2: 0, dataPerBlock2: 0, alignmentCenters: [6, 30], charCountBits: 8 },
  { version: 6, size: 41, dataCodewords: 136, eccPerBlock: 18, blocksGroup1: 2, dataPerBlock1: 68, blocksGroup2: 0, dataPerBlock2: 0, alignmentCenters: [6, 34], charCountBits: 8 },
  { version: 7, size: 45, dataCodewords: 156, eccPerBlock: 20, blocksGroup1: 2, dataPerBlock1: 78, blocksGroup2: 0, dataPerBlock2: 0, alignmentCenters: [6, 22, 38], charCountBits: 8 },
  { version: 8, size: 49, dataCodewords: 194, eccPerBlock: 24, blocksGroup1: 2, dataPerBlock1: 97, blocksGroup2: 0, dataPerBlock2: 0, alignmentCenters: [6, 24, 42], charCountBits: 8 },
  { version: 9, size: 53, dataCodewords: 232, eccPerBlock: 30, blocksGroup1: 2, dataPerBlock1: 116, blocksGroup2: 0, dataPerBlock2: 0, alignmentCenters: [6, 26, 46], charCountBits: 8 },
  { version: 10, size: 57, dataCodewords: 274, eccPerBlock: 18, blocksGroup1: 2, dataPerBlock1: 68, blocksGroup2: 2, dataPerBlock2: 69, alignmentCenters: [6, 28, 50], charCountBits: 16 },
];

// Precomputed GF(256) exp/log lookup tables using primitive polynomial 0x11d.
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let val = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = val;
    GF_LOG[val] = i;
    val <<= 1;
    if (val & 0x100) val ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255] ?? 1;
  }
})();

function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[(GF_LOG[a] ?? 0) + (GF_LOG[b] ?? 0)] ?? 0;
}

function buildRsGenerator(degree: number): Uint8Array {
  let poly: number[] = [1];
  for (let i = 0; i < degree; i += 1) {
    const factor = [1, GF_EXP[i] ?? 1];
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let p = 0; p < poly.length; p += 1) {
      for (let f = 0; f < factor.length; f += 1) {
        next[p + f] = (next[p + f] ?? 0) ^ gfMultiply(poly[p] ?? 0, factor[f] ?? 0);
      }
    }
    poly = next;
  }
  return Uint8Array.from(poly);
}

/** Computes Reed-Solomon error correction bytes for a single data block. */
export function computeReedSolomonEcc(data: Uint8Array, eccCount: number): Uint8Array {
  const generator = buildRsGenerator(eccCount);
  const buffer = new Uint8Array(data.length + eccCount);
  buffer.set(data, 0);

  for (let i = 0; i < data.length; i += 1) {
    const lead = buffer[i] ?? 0;
    if (lead === 0) continue;
    for (let j = 0; j < generator.length; j += 1) {
      buffer[i + j] = (buffer[i + j] ?? 0) ^ gfMultiply(generator[j] ?? 0, lead);
    }
  }
  return buffer.slice(data.length);
}

function selectVersion(byteLength: number): VersionSpec {
  for (const spec of VERSION_SPECS) {
    const overheadBits = 4 + spec.charCountBits;
    const maxBytes = Math.floor((spec.dataCodewords * 8 - overheadBits) / 8);
    if (byteLength <= maxBytes) return spec;
  }
  return VERSION_SPECS[VERSION_SPECS.length - 1]!;
}

function encodeDataCodewords(bytes: Uint8Array, spec: VersionSpec): Uint8Array {
  const totalBits = spec.dataCodewords * 8;
  const bits: number[] = [];
  const pushBits = (value: number, length: number) => {
    for (let shift = length - 1; shift >= 0; shift -= 1) {
      bits.push((value >>> shift) & 1);
    }
  };

  // Mode indicator `0100` (Byte mode) + character count indicator
  pushBits(0b0100, 4);
  pushBits(bytes.length, spec.charCountBits);
  for (const b of bytes) {
    pushBits(b, 8);
  }

  // Up to 4 terminator zero bits, then align to whole 8-bit codewords
  const terminatorLen = Math.min(4, Math.max(0, totalBits - bits.length));
  pushBits(0, terminatorLen);
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords = new Uint8Array(spec.dataCodewords);
  for (let i = 0; i < bits.length / 8 && i < codewords.length; i += 1) {
    let val = 0;
    for (let bit = 0; bit < 8; bit += 1) {
      val = (val << 1) | (bits[i * 8 + bit] ?? 0);
    }
    codewords[i] = val;
  }

  // Pad remaining capacity with alternating ISO pad codewords (0xEC, 0x11)
  const usedBytes = Math.floor(bits.length / 8);
  for (let i = usedBytes; i < spec.dataCodewords; i += 1) {
    codewords[i] = (i - usedBytes) % 2 === 0 ? 0xec : 0x11;
  }

  return codewords;
}

function interleaveCodewords(dataCodewords: Uint8Array, spec: VersionSpec): number[] {
  const dataBlocks: Uint8Array[] = [];
  const eccBlocks: Uint8Array[] = [];
  let offset = 0;

  for (let b = 0; b < spec.blocksGroup1; b += 1) {
    const slice = dataCodewords.slice(offset, offset + spec.dataPerBlock1);
    offset += spec.dataPerBlock1;
    dataBlocks.push(slice);
    eccBlocks.push(computeReedSolomonEcc(slice, spec.eccPerBlock));
  }
  for (let b = 0; b < spec.blocksGroup2; b += 1) {
    const slice = dataCodewords.slice(offset, offset + spec.dataPerBlock2);
    offset += spec.dataPerBlock2;
    dataBlocks.push(slice);
    eccBlocks.push(computeReedSolomonEcc(slice, spec.eccPerBlock));
  }

  const interleaved: number[] = [];
  const maxDataLen = Math.max(spec.dataPerBlock1, spec.dataPerBlock2);
  for (let i = 0; i < maxDataLen; i += 1) {
    for (const block of dataBlocks) {
      if (i < block.length) interleaved.push(block[i]!);
    }
  }
  for (let i = 0; i < spec.eccPerBlock; i += 1) {
    for (const block of eccBlocks) {
      if (i < block.length) interleaved.push(block[i]!);
    }
  }
  return interleaved;
}

function computeFormatBits(maskPattern: number): number {
  // Error correction Level L = 0b01; generator polynomial 0x537; XOR mask 0x5412
  const data = (0b01 << 3) | (maskPattern & 0b111);
  let rem = data << 10;
  for (let bit = 14; bit >= 10; bit -= 1) {
    if ((rem >>> bit) & 1) {
      rem ^= 0x537 << (bit - 10);
    }
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function computeVersionBits(version: number): number {
  // Golay (18,6) generator polynomial 0x1f25 for Versions 7+
  let rem = version << 12;
  for (let bit = 17; bit >= 12; bit -= 1) {
    if ((rem >>> bit) & 1) {
      rem ^= 0x1f25 << (bit - 12);
    }
  }
  return (version << 12) | rem;
}

function createTemplateGrid(spec: VersionSpec): {
  modules: boolean[][];
  isFunction: boolean[][];
} {
  const { size, version, alignmentCenters } = spec;
  const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const isFunction = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  const setModule = (r: number, c: number, dark: boolean) => {
    if (r < 0 || c < 0 || r >= size || c >= size) return;
    modules[r]![c] = dark;
    isFunction[r]![c] = true;
  };

  const placeFinder = (top: number, left: number) => {
    for (let dy = -1; dy <= 7; dy += 1) {
      for (let dx = -1; dx <= 7; dx += 1) {
        const r = top + dy;
        const c = left + dx;
        if (r < 0 || c < 0 || r >= size || c >= size) continue;
        const inOuter = dy >= 0 && dy <= 6 && dx >= 0 && dx <= 6;
        const inBorder = dy === 0 || dy === 6 || dx === 0 || dx === 6;
        const inCenter = dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4;
        setModule(r, c, inOuter && (inBorder || inCenter));
      }
    }
  };

  // Three corner finder patterns + separators
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns along row 6 and column 6
  for (let i = 8; i < size - 8; i += 1) {
    const dark = i % 2 === 0;
    if (!isFunction[6]![i]) setModule(6, i, dark);
    if (!isFunction[i]![6]) setModule(i, 6, dark);
  }

  // Alignment patterns (5x5) avoiding corner finder regions
  for (const cy of alignmentCenters) {
    for (const cx of alignmentCenters) {
      const overlapsFinder =
        (cy <= 8 && cx <= 8) ||
        (cy <= 8 && cx >= size - 9) ||
        (cy >= size - 9 && cx <= 8);
      if (overlapsFinder) continue;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const dist = Math.max(Math.abs(dy), Math.abs(dx));
          setModule(cy + dy, cx + dx, dist === 0 || dist === 2);
        }
      }
    }
  }

  // Reserve format info zones (populated per mask candidate)
  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) {
      isFunction[8]![i] = true;
      isFunction[i]![8] = true;
    }
  }
  for (let i = 0; i < 8; i += 1) {
    isFunction[8]![size - 1 - i] = true;
  }
  for (let i = 0; i < 7; i += 1) {
    isFunction[size - 1 - i]![8] = true;
  }
  // Mandatory dark module at (4*version + 9, 8)
  setModule(size - 8, 8, true);

  // Version information blocks for Versions 7+
  if (version >= 7) {
    const versionBits = computeVersionBits(version);
    for (let i = 0; i < 18; i += 1) {
      const bit = ((versionBits >>> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = i % 3;
      setModule(size - 11 + b, a, bit);
      setModule(a, size - 11 + b, bit);
    }
  }

  return { modules, isFunction };
}

function writeFormatInfo(modules: boolean[][], size: number, maskPattern: number): void {
  const format = computeFormatBits(maskPattern);
  for (let i = 0; i < 15; i += 1) {
    const dark = ((format >>> i) & 1) === 1;
    // Top-left vertical strip (0..5, 7..8) + horizontal top-right strip
    if (i < 6) modules[i]![8] = dark;
    else if (i < 8) modules[i + 1]![8] = dark;
    else modules[size - 15 + i]![8] = dark;

    // Top-right horizontal (0..7) + top-left horizontal (8..14)
    if (i < 8) modules[8]![size - 1 - i] = dark;
    else if (i < 9) modules[8]![7] = dark;
    else modules[8]![14 - i] = dark;
  }
}

function matchesMask(mask: number, row: number, col: number): boolean {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    case 7:
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function placeDataModules(
  modules: boolean[][],
  isFunction: boolean[][],
  codewords: readonly number[],
  mask: number
): void {
  const size = modules.length;
  let bitIndex = 0;
  const totalBits = codewords.length * 8;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // Skip vertical timing line
    for (let step = 0; step < size; step += 1) {
      const row = upward ? size - 1 - step : step;
      for (let dx = 0; dx < 2; dx += 1) {
        const col = right - dx;
        if (isFunction[row]![col]) continue;
        let dark = false;
        if (bitIndex < totalBits) {
          const byte = codewords[bitIndex >>> 3] ?? 0;
          dark = ((byte >>> (7 - (bitIndex & 7))) & 1) === 1;
          bitIndex += 1;
        }
        modules[row]![col] = matchesMask(mask, row, col) ? !dark : dark;
      }
    }
    upward = !upward;
  }
}

function scorePenalty(modules: readonly (readonly boolean[])[]): number {
  const size = modules.length;
  let penalty = 0;

  // N1: 5+ consecutive modules in a row or column + N3: finder-like 1:1:3:1:1 patterns
  const scoreLine = (getter: (i: number) => boolean) => {
    let runColor = getter(0);
    let runLen = 1;
    let windowBits = runColor ? 1 : 0;

    for (let i = 1; i < size; i += 1) {
      const curr = getter(i);
      if (curr === runColor) {
        runLen += 1;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = curr;
        runLen = 1;
      }

      windowBits = ((windowBits << 1) | (curr ? 1 : 0)) & 0x7ff;
      if (i >= 10 && (windowBits === 0b10111010000 || windowBits === 0b00001011101)) {
        penalty += 40;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  };

  for (let r = 0; r < size; r += 1) {
    scoreLine((c) => modules[r]![c]!);
    scoreLine((c) => modules[c]![r]!);
  }

  // N2: 2x2 same-color blocks
  for (let r = 0; r < size - 1; r += 1) {
    for (let c = 0; c < size - 1; c += 1) {
      const color = modules[r]![c];
      if (
        modules[r]![c + 1] === color &&
        modules[r + 1]![c] === color &&
        modules[r + 1]![c + 1] === color
      ) {
        penalty += 3;
      }
    }
  }

  // N4: dark/light balance deviation from 50%
  let darkCount = 0;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (modules[r]![c]) darkCount += 1;
    }
  }
  const total = size * size;
  const deviation = Math.abs(darkCount * 20 - total * 10);
  penalty += Math.floor(deviation / total) * 10;

  return penalty;
}

/**
 * Encodes an arbitrary string (such as a `https://t.me/...` inquiry URL) into a
 * deterministic QR matrix using Byte mode and Error Correction Level L.
 */
export function encodeQrMatrix(text: string): QrMatrixResult {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text || 'https://the-ants.org');
  const maxSpec = VERSION_SPECS[VERSION_SPECS.length - 1]!;
  const maxBytes = Math.floor((maxSpec.dataCodewords * 8 - (4 + maxSpec.charCountBits)) / 8);

  const truncated = rawBytes.length > maxBytes;
  const bytes = truncated ? rawBytes.slice(0, maxBytes) : rawBytes;
  const spec = selectVersion(bytes.length);

  const dataCodewords = encodeDataCodewords(bytes, spec);
  const interleaved = interleaveCodewords(dataCodewords, spec);

  let bestMask = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestModules: boolean[][] = [];

  for (let mask = 0; mask < 8; mask += 1) {
    const { modules, isFunction } = createTemplateGrid(spec);
    writeFormatInfo(modules, spec.size, mask);
    placeDataModules(modules, isFunction, interleaved, mask);
    const score = scorePenalty(modules);
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
      bestModules = modules;
    }
  }

  return {
    version: spec.version,
    size: spec.size,
    quietZone: 4,
    modules: bestModules,
    maskPattern: bestMask,
    truncated,
  };
}

