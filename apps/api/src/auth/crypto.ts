const PBKDF2_SCHEME = 'pbkdf2_sha256';
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const DERIVED_KEY_BYTES = 32;
const LOCAL_DEV_AUTH_SECRET = 'ants-dev-better-auth-secret-change-in-production';

const textEncoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i] ?? 0;
    out += byte.toString(16).padStart(2, '0');
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    return null;
  }
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < out.length; i += 1) {
    const pair = hex.slice(i * 2, i * 2 + 2);
    const parsed = Number.parseInt(pair, 16);
    if (Number.isNaN(parsed)) {
      return null;
    }
    out[i] = parsed;
  }
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> | null {
  if (!input || !/^[A-Za-z0-9_-]+$/.test(input)) {
    return null;
  }
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const out = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i += 1) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  } catch {
    return null;
  }
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

async function derivePbkdf2Bits(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
  keyLengthBytes: number
): Promise<Uint8Array<ArrayBuffer>> {
  const passwordBytes = textEncoder.encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations,
    },
    keyMaterial,
    keyLengthBytes * 8
  );

  return new Uint8Array(bits);
}

/**
 * Hashes a plaintext password using Web Crypto PBKDF2-HMAC-SHA256 (`100_000` iterations).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(new ArrayBuffer(SALT_BYTES));
  crypto.getRandomValues(salt);
  const derived = await derivePbkdf2Bits(password, salt, PBKDF2_ITERATIONS, DERIVED_KEY_BYTES);
  return `${PBKDF2_SCHEME}$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(derived)}`;
}

/**
 * Verifies a plaintext password against a stored PBKDF2-HMAC-SHA256 hash in constant time.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) {
    return false;
  }
  const parts = storedHash.split('$');
  if (parts.length !== 4) {
    return false;
  }
  const [scheme, iterRaw, saltHex, hashHex] = parts;
  if (scheme !== PBKDF2_SCHEME || !iterRaw || !saltHex || !hashHex) {
    return false;
  }

  const iterations = Number.parseInt(iterRaw, 10);
  if (!Number.isFinite(iterations) || iterations < 10_000 || iterations > 1_000_000) {
    return false;
  }

  const salt = hexToBytes(saltHex);
  const expectedHash = hexToBytes(hashHex);
  if (!salt || !expectedHash || expectedHash.length === 0) {
    return false;
  }

  const derived = await derivePbkdf2Bits(password, salt, iterations, expectedHash.length);
  return constantTimeEqual(derived, expectedHash);
}

/**
 * Generates a prefixed cryptographically random entity identifier safe for D1 primary keys.
 */
export function generateEntityId(prefix: string): string {
  const bytes = new Uint8Array(new ArrayBuffer(12));
  crypto.getRandomValues(bytes);
  return `${prefix}_${bytesToHex(bytes)}`;
}

/**
 * Generates a 256-bit base64url session token for D1 `session.token`.
 */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(new ArrayBuffer(32));
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

/**
 * Resolves the configured `BETTER_AUTH_SECRET`, falling back deterministically in local development.
 */
export function resolveAuthSecret(secret?: string): string {
  const trimmed = secret?.trim();
  return trimmed && trimmed.length >= 16 ? trimmed : LOCAL_DEV_AUTH_SECRET;
}

async function computeHmacSha256(message: string, secret: string): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(message));
  return new Uint8Array(signature);
}

/**
 * Signs a session token with HMAC-SHA256 for storage inside the `better-auth.session_token` cookie.
 */
export async function signSessionToken(token: string, secret: string): Promise<string> {
  const mac = await computeHmacSha256(token, secret);
  return `${token}.${bytesToBase64Url(mac)}`;
}

/**
 * Verifies an HMAC-SHA256 signed session cookie value and returns the raw token when valid.
 */
export async function verifySignedSessionToken(
  signedValue: string,
  secret: string
): Promise<string | null> {
  const dotIndex = signedValue.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex >= signedValue.length - 1) {
    return null;
  }

  const token = signedValue.slice(0, dotIndex);
  const sigEncoded = signedValue.slice(dotIndex + 1);
  const providedSig = base64UrlToBytes(sigEncoded);
  if (!token || !providedSig) {
    return null;
  }

  const expectedSig = await computeHmacSha256(token, secret);
  return constantTimeEqual(providedSig, expectedSig) ? token : null;
}
