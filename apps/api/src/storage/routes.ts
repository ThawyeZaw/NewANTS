import { Hono } from 'hono';
import {
  StoragePrefixSchema,
  StorageUploadDataUrlInputSchema,
  type StoragePrefix,
} from '@ants/shared-types';
import {
  getR2Binding,
  jsonApiError,
  parseJsonBody,
  requireAuthenticatedSession,
  resolveOptionalSession,
  type ApiRouteContext,
} from '../http/context';
import type { ApiBindings } from '../types';
import {
  StorageServiceError,
  canWriteStorageKey,
  deleteStorageObjectOrThrow,
  getStorageObjectOrThrow,
  parseDataUrlUpload,
  resolveUploadTargetKey,
  uploadStorageObject,
  validateUploadContentType,
} from './service';

function extractWildcardFileKey(requestPath: string): string {
  const marker = '/file/';
  const idx = requestPath.indexOf(marker);
  if (idx === -1) {
    return '';
  }
  return requestPath.slice(idx + marker.length);
}

function handleStorageError(c: ApiRouteContext, err: unknown): Response {
  if (err instanceof StorageServiceError) {
    return jsonApiError(c, err.status, err.code, err.message);
  }
  const message =
    err instanceof Error && err.message ? err.message : 'Unexpected R2 storage error.';
  return jsonApiError(c, 500, 'INTERNAL_SERVER_ERROR', message);
}

function isBlobLike(value: unknown): value is Blob & { name?: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Blob).arrayBuffer === 'function' &&
    typeof (value as Blob).type === 'string'
  );
}

function readOptionalFormString(formData: FormData, field: string): string | undefined {
  const raw = formData.get(field);
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Hono router implementing `/api/storage/*` private Cloudflare R2 proxy endpoints.
 */
export function createStorageRouter(): Hono<{ Bindings: ApiBindings }> {
  const storage = new Hono<{ Bindings: ApiBindings }>();

  storage.get('/file/*', async (c) => {
    const bucket = getR2Binding(c);
    if (bucket instanceof Response) return bucket;

    const rawKey = extractWildcardFileKey(c.req.path);
    try {
      const session = await resolveOptionalSession(c, c.env?.DB);
      const { parsed, object } = await getStorageObjectOrThrow(bucket, rawKey, session);

      const etag = object.httpEtag || object.etag || `"${parsed.key}"`;
      const ifNoneMatch = c.req.header('if-none-match');
      if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === '*')) {
        return new Response(null, {
          status: 304,
          headers: {
            ETag: etag,
          },
        });
      }

      const headers = new Headers();
      if (typeof object.writeHttpMetadata === 'function') {
        object.writeHttpMetadata(headers as unknown as Parameters<typeof object.writeHttpMetadata>[0]);
      }
      if (!headers.get('content-type') && object.httpMetadata?.contentType) {
        headers.set('Content-Type', object.httpMetadata.contentType);
      }
      if (!headers.get('content-type')) {
        headers.set('Content-Type', 'application/octet-stream');
      }
      if (!headers.get('cache-control')) {
        headers.set(
          'Cache-Control',
          object.httpMetadata?.cacheControl ??
            (parsed.visibility === 'private'
              ? 'private, no-store'
              : 'public, max-age=31536000, immutable')
        );
      }
      headers.set('ETag', etag);
      headers.set('X-Content-Type-Options', 'nosniff');
      if (typeof object.size === 'number') {
        headers.set('Content-Length', String(object.size));
      }

      const responseBody: ConstructorParameters<typeof Response>[0] =
        c.req.method === 'HEAD'
          ? null
          : (object.body as unknown as ConstructorParameters<typeof Response>[0]);
      return new Response(responseBody, {
        status: 200,
        headers,
      });
    } catch (err) {
      return handleStorageError(c, err);
    }
  });

  storage.post('/upload', async (c) => {
    const bucket = getR2Binding(c);
    if (bucket instanceof Response) return bucket;

    const authResult = await requireAuthenticatedSession(c);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    try {
      const reqContentType = (c.req.header('content-type') ?? '').toLowerCase();
      let bytes: Uint8Array;
      let contentType: string;
      let prefix: StoragePrefix = 'org';
      let filename: string | undefined;
      let requestedKey: string | undefined;
      let cacheControl: string | undefined;

      if (reqContentType.includes('multipart/form-data')) {
        const formData = await c.req.formData();
        const fileEntry = formData.get('file');
        if (!isBlobLike(fileEntry)) {
          return jsonApiError(
            c,
            400,
            'MISSING_FILE',
            'Multipart request must include a file field.'
          );
        }

        const rawPrefix = readOptionalFormString(formData, 'prefix') ?? 'org';
        const parsedPrefix = StoragePrefixSchema.safeParse(rawPrefix);
        if (!parsedPrefix.success) {
          return jsonApiError(
            c,
            400,
            'INVALID_STORAGE_PREFIX',
            `Invalid upload prefix '${rawPrefix}'.`
          );
        }

        prefix = parsedPrefix.data;
        contentType = validateUploadContentType(fileEntry.type);
        bytes = new Uint8Array(await fileEntry.arrayBuffer());
        filename = readOptionalFormString(formData, 'filename') ?? fileEntry.name;
        requestedKey = readOptionalFormString(formData, 'key');
        cacheControl = readOptionalFormString(formData, 'cacheControl');
      } else {
        const rawBody = await parseJsonBody(c);
        if (rawBody instanceof Response) return rawBody;

        const parsed = StorageUploadDataUrlInputSchema.safeParse(rawBody);
        if (!parsed.success) {
          const firstMsg = parsed.error.issues[0]?.message ?? 'Invalid storage upload payload.';
          return jsonApiError(c, 400, 'VALIDATION_ERROR', firstMsg, parsed.error.flatten());
        }

        const decoded = parseDataUrlUpload(parsed.data.dataUrl);
        bytes = decoded.bytes;
        contentType = decoded.contentType;
        prefix = parsed.data.prefix;
        filename = parsed.data.filename;
        requestedKey = parsed.data.key;
        cacheControl = parsed.data.cacheControl;
      }

      const parsedKey = resolveUploadTargetKey({
        prefix,
        requestedKey,
        filename,
        contentType,
        userId: session.user.id,
      });

      if (!canWriteStorageKey(parsedKey, session)) {
        return jsonApiError(
          c,
          403,
          'FORBIDDEN',
          `Role permission required to upload under '${parsedKey.prefix}/'.`
        );
      }

      const metadata = await uploadStorageObject({
        bucket,
        parsedKey,
        bytes,
        contentType,
        uploadedByUserId: session.user.id,
        cacheControl,
      });

      return c.json(
        {
          ok: true as const,
          data: metadata,
        },
        201
      );
    } catch (err) {
      return handleStorageError(c, err);
    }
  });

  storage.delete('/file/*', async (c) => {
    const bucket = getR2Binding(c);
    if (bucket instanceof Response) return bucket;

    const authResult = await requireAuthenticatedSession(c);
    if (authResult instanceof Response) return authResult;

    const rawKey = extractWildcardFileKey(c.req.path);
    try {
      const deleted = await deleteStorageObjectOrThrow(bucket, rawKey, authResult.session);
      return c.json(
        {
          ok: true as const,
          data: {
            deleted: true as const,
            key: deleted.key,
          },
        },
        200
      );
    } catch (err) {
      return handleStorageError(c, err);
    }
  });

  return storage;
}
