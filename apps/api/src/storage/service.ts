import type { R2Bucket, R2ObjectBody } from '@cloudflare/workers-types';
import {
  STORAGE_BUCKET_PREFIXES,
  StorageFileMetadataDtoSchema,
  type AuthSessionBundle,
  type StorageFileMetadataDto,
  type StoragePrefix,
} from '@ants/shared-types';
import { hasAdminAccess, hasContributorAccess } from '@ants/shared-types';

export const MAX_STORAGE_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MiB

export const ALLOWED_STORAGE_MIME_TYPES = new Set<string>([
  'image/webp',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'application/json',
  'text/plain',
  'text/markdown',
]);

const MIME_TO_EXT: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'application/json': 'json',
  'text/plain': 'txt',
  'text/markdown': 'md',
};

const VALID_PREFIX_SET = new Set<string>(STORAGE_BUCKET_PREFIXES);

export class StorageServiceError extends Error {
  readonly status: 400 | 401 | 403 | 404 | 413 | 415 | 500;
  readonly code: string;

  constructor(
    status: 400 | 401 | 403 | 404 | 413 | 415 | 500,
    code: string,
    message: string
  ) {
    super(message);
    this.name = 'StorageServiceError';
    this.status = status;
    this.code = code;
  }
}

export interface ParsedStorageKey {
  key: string;
  prefix: StoragePrefix;
  segments: string[];
  visibility: 'public' | 'private';
}

/**
 * Normalizes and validates an R2 storage key, preventing path traversal and
 * confining keys to allowed ecosystem bucket prefixes.
 */
export function sanitizeStorageKey(rawKey: string): ParsedStorageKey {
  let decoded = rawKey;
  try {
    decoded = decodeURIComponent(rawKey);
  } catch {
    throw new StorageServiceError(400, 'INVALID_STORAGE_KEY', 'Malformed URL encoding in storage key.');
  }

  const normalized = decoded.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').trim();
  if (!normalized || normalized.length > 320) {
    throw new StorageServiceError(400, 'INVALID_STORAGE_KEY', 'Storage key is empty or too long.');
  }

  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f]/.test(normalized)) {
    throw new StorageServiceError(400, 'INVALID_STORAGE_KEY', 'Storage key contains control characters.');
  }

  const segments = normalized.split('/').filter((seg) => seg.length > 0);
  if (segments.length < 2) {
    throw new StorageServiceError(
      400,
      'INVALID_STORAGE_KEY',
      'Storage key must include a valid prefix and object filename.'
    );
  }

  for (const seg of segments) {
    if (seg === '.' || seg === '..' || !/^[a-zA-Z0-9._-]+$/.test(seg)) {
      throw new StorageServiceError(
        400,
        'INVALID_STORAGE_KEY',
        'Storage key contains invalid path segments or characters.'
      );
    }
  }

  const prefixCandidate = segments[0] ?? '';
  if (!VALID_PREFIX_SET.has(prefixCandidate)) {
    throw new StorageServiceError(
      400,
      'INVALID_STORAGE_PREFIX',
      `Storage prefix '${prefixCandidate}' is not allowed. Must be one of: ${STORAGE_BUCKET_PREFIXES.join(', ')}.`
    );
  }

  const prefix = prefixCandidate as StoragePrefix;
  return {
    key: segments.join('/'),
    prefix,
    segments,
    visibility: prefix === 'private' ? 'private' : 'public',
  };
}

function sanitizeFilename(rawFilename: string | undefined, contentType: string): string {
  const defaultExt = MIME_TO_EXT[contentType] ?? 'bin';
  if (!rawFilename || !rawFilename.trim()) {
    return `asset.${defaultExt}`;
  }
  const baseName = rawFilename.replace(/\\/g, '/').split('/').pop() ?? '';
  const cleaned = baseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');

  if (!cleaned) {
    return `asset.${defaultExt}`;
  }
  if (!cleaned.includes('.')) {
    return `${cleaned.slice(0, 64)}.${defaultExt}`;
  }
  return cleaned.slice(0, 80);
}

/**
 * Decodes a base64 Data URL (`data:<mime>;base64,<payload>`) and enforces
 * allowed MIME types and maximum upload size.
 */
export function parseDataUrlUpload(dataUrl: string): {
  bytes: Uint8Array;
  contentType: string;
} {
  const match = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl.trim());
  if (!match) {
    throw new StorageServiceError(400, 'INVALID_DATA_URL', 'Expected a valid base64 Data URL.');
  }

  const contentType = (match[1] ?? '').toLowerCase();
  if (!ALLOWED_STORAGE_MIME_TYPES.has(contentType)) {
    throw new StorageServiceError(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      `MIME type '${contentType}' is not permitted for R2 uploads.`
    );
  }

  const base64Clean = (match[2] ?? '').replace(/\s+/g, '');
  let binary: string;
  try {
    binary = atob(base64Clean);
  } catch {
    throw new StorageServiceError(400, 'INVALID_DATA_URL', 'Base64 payload could not be decoded.');
  }

  const len = binary.length;
  if (len === 0) {
    throw new StorageServiceError(400, 'EMPTY_FILE', 'Uploaded file cannot be empty.');
  }
  if (len > MAX_STORAGE_UPLOAD_BYTES) {
    throw new StorageServiceError(
      413,
      'FILE_TOO_LARGE',
      `File exceeds maximum size of ${MAX_STORAGE_UPLOAD_BYTES / (1024 * 1024)} MiB.`
    );
  }

  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return { bytes, contentType };
}

export function validateUploadContentType(rawMimeType: string | undefined): string {
  const normalized = (rawMimeType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (!normalized || !ALLOWED_STORAGE_MIME_TYPES.has(normalized)) {
    throw new StorageServiceError(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      `MIME type '${normalized || 'unknown'}' is not permitted for R2 uploads.`
    );
  }
  return normalized;
}

export function resolveUploadTargetKey(options: {
  prefix: StoragePrefix;
  requestedKey?: string;
  filename?: string;
  contentType: string;
  userId: string;
}): ParsedStorageKey {
  if (options.requestedKey) {
    return sanitizeStorageKey(options.requestedKey);
  }

  const safeName = sanitizeFilename(options.filename, options.contentType);
  const stamp = Date.now().toString(36);
  const randBytes = new Uint8Array(4);
  crypto.getRandomValues(randBytes);
  const randHex = Array.from(randBytes, (b) => b.toString(16).padStart(2, '0')).join('');

  if (options.prefix === 'avatars' || options.prefix === 'private') {
    return sanitizeStorageKey(`${options.prefix}/${options.userId}/${stamp}-${randHex}-${safeName}`);
  }

  const ym = new Date().toISOString().slice(0, 7);
  return sanitizeStorageKey(`${options.prefix}/${ym}/${stamp}-${randHex}-${safeName}`);
}

export function canReadStorageKey(
  parsed: ParsedStorageKey,
  session: AuthSessionBundle | null
): boolean {
  if (parsed.prefix !== 'private') {
    return true;
  }
  if (!session) {
    return false;
  }
  if (hasAdminAccess(session.user.roles)) {
    return true;
  }
  return parsed.segments[1] === session.user.id;
}

export function canWriteStorageKey(
  parsed: ParsedStorageKey,
  session: AuthSessionBundle
): boolean {
  if (hasAdminAccess(session.user.roles)) {
    return true;
  }
  if (parsed.prefix === 'avatars' || parsed.prefix === 'private') {
    return parsed.segments[1] === session.user.id;
  }
  return hasContributorAccess(session.user.roles);
}

export function canDeleteStorageKey(
  parsed: ParsedStorageKey,
  session: AuthSessionBundle
): boolean {
  return canWriteStorageKey(parsed, session);
}

export interface UploadStorageObjectOptions {
  bucket: R2Bucket;
  parsedKey: ParsedStorageKey;
  bytes: Uint8Array;
  contentType: string;
  uploadedByUserId: string;
  cacheControl?: string;
}

export async function uploadStorageObject(
  options: UploadStorageObjectOptions
): Promise<StorageFileMetadataDto> {
  if (options.bytes.byteLength === 0) {
    throw new StorageServiceError(400, 'EMPTY_FILE', 'Uploaded file cannot be empty.');
  }
  if (options.bytes.byteLength > MAX_STORAGE_UPLOAD_BYTES) {
    throw new StorageServiceError(
      413,
      'FILE_TOO_LARGE',
      `File exceeds maximum size of ${MAX_STORAGE_UPLOAD_BYTES / (1024 * 1024)} MiB.`
    );
  }

  const uploadedAt = new Date().toISOString();
  const cacheControl =
    options.cacheControl ??
    (options.parsedKey.visibility === 'private'
      ? 'private, no-store'
      : 'public, max-age=31536000, immutable');

  const putResult = await options.bucket.put(options.parsedKey.key, options.bytes, {
    httpMetadata: {
      contentType: options.contentType,
      cacheControl,
    },
    customMetadata: {
      uploadedByUserId: options.uploadedByUserId,
      uploadedAt,
      visibility: options.parsedKey.visibility,
    },
  });

  const etag = putResult?.httpEtag ?? putResult?.etag ?? `"${options.parsedKey.key}"`;

  return StorageFileMetadataDtoSchema.parse({
    key: options.parsedKey.key,
    url: `/api/storage/file/${options.parsedKey.key}`,
    contentType: options.contentType,
    size: options.bytes.byteLength,
    etag,
    uploadedAt,
    visibility: options.parsedKey.visibility,
  });
}

export async function getStorageObjectOrThrow(
  bucket: R2Bucket,
  rawKey: string,
  session: AuthSessionBundle | null
): Promise<{ parsed: ParsedStorageKey; object: R2ObjectBody }> {
  const parsed = sanitizeStorageKey(rawKey);
  if (!canReadStorageKey(parsed, session)) {
    if (!session) {
      throw new StorageServiceError(
        401,
        'UNAUTHORIZED',
        'Sign in required to access private storage files.'
      );
    }
    throw new StorageServiceError(
      403,
      'FORBIDDEN',
      'You do not have permission to read this private storage object.'
    );
  }

  const object = await bucket.get(parsed.key);
  if (!object) {
    throw new StorageServiceError(404, 'NOT_FOUND', `Storage object '${parsed.key}' was not found.`);
  }

  return { parsed, object };
}

export async function deleteStorageObjectOrThrow(
  bucket: R2Bucket,
  rawKey: string,
  session: AuthSessionBundle
): Promise<ParsedStorageKey> {
  const parsed = sanitizeStorageKey(rawKey);
  if (!canDeleteStorageKey(parsed, session)) {
    throw new StorageServiceError(
      403,
      'FORBIDDEN',
      'You do not have permission to delete this storage object.'
    );
  }

  await bucket.delete(parsed.key);
  return parsed;
}
