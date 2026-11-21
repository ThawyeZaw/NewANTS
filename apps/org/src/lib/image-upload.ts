/**
 * Client-Side Image Upload & Compression Engine for The ANTs CMS (`apps/org`).
 *
 * Scaled and compressed in-browser to WebP/JPEG Base64 Data URLs so images:
 * 1. Fit comfortably within `localStorage` quotas (<120 KB per photo).
 * 2. Render instantly in `<EditorialArtworkView />` and the fullscreen lightbox without server lag.
 * 3. Export and import cleanly inside JSON backup files (`ants-org-cms-backup.json`).
 */

export interface ProcessedImageResult {
  dataUrl: string;
  fileName: string;
  fileSizeBytes: number;
  fileSizeLabel: string;
  width: number;
  height: number;
  shotLabel: string;
}

export interface ProcessImageOptions {
  /** Maximum width or height in pixels (defaults to 1280) */
  maxDimension?: number;
  /** Compression quality between 0.1 and 1.0 (defaults to 0.82) */
  quality?: number;
  /** Preferred mime type (defaults to 'image/webp' with fallback to 'image/jpeg') */
  preferredMimeType?: string;
}

/** Formats byte size into human-readable label (e.g. 94 KB, 1.2 MB) */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Derives a clean human-readable shot title from a file name */
export function deriveShotLabelFromFileName(fileName: string): string {
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '').trim();
  const cleaned = nameWithoutExt
    .replace(/[-_+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return 'Uploaded Photo';

  return cleaned
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Reads a single file as a Base64 Data URL (cross-environment: browser & node/tests) */
export async function readFileAsDataUrl(file: File): Promise<string> {
  if (typeof file.arrayBuffer === 'function' && typeof Buffer !== 'undefined') {
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mime = file.type || 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  }

  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read image as Data URL'));
        }
      };
      reader.onerror = () => reject(reader.error ?? new Error('File read error'));
      reader.readAsDataURL(file);
    });
  }

  return `data:${file.type || 'image/jpeg'};base64,mock`;
}

/**
 * Compresses an image file client-side using an offscreen canvas.
 * Falls back to raw Data URL in non-browser or test environments.
 */
export async function processImageFile(
  file: File,
  options: ProcessImageOptions = {}
): Promise<ProcessedImageResult> {
  const maxDim = options.maxDimension ?? 1280;
  const quality = options.quality ?? 0.82;
  const preferredMime = options.preferredMimeType ?? 'image/webp';
  const shotLabel = deriveShotLabelFromFileName(file.name);

  // Read raw data URL first
  const rawDataUrl = await readFileAsDataUrl(file);

  // If in SSR / headless environment without DOM or Canvas, return raw data
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof document.createElement !== 'function'
  ) {
    return {
      dataUrl: rawDataUrl,
      fileName: file.name,
      fileSizeBytes: file.size,
      fileSizeLabel: formatFileSize(file.size),
      width: 1200,
      height: 800,
      shotLabel,
    };
  }

  // Load image into an HTMLImageElement to read dimensions and draw to canvas
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to decode image: ${file.name}`));
    image.src = rawDataUrl;
  });

  const naturalWidth = img.naturalWidth || img.width || 800;
  const naturalHeight = img.naturalHeight || img.height || 600;

  // Compute scaled dimensions preserving aspect ratio
  let targetWidth = naturalWidth;
  let targetHeight = naturalHeight;

  if (targetWidth > maxDim || targetHeight > maxDim) {
    if (targetWidth >= targetHeight) {
      targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
      targetWidth = maxDim;
    } else {
      targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
      targetHeight = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return {
      dataUrl: rawDataUrl,
      fileName: file.name,
      fileSizeBytes: file.size,
      fileSizeLabel: formatFileSize(file.size),
      width: targetWidth,
      height: targetHeight,
      shotLabel,
    };
  }

  // Smooth scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Try preferred mime type (e.g. webp), fallback to jpeg
  let optimizedDataUrl = '';
  try {
    optimizedDataUrl = canvas.toDataURL(preferredMime, quality);
    if (!optimizedDataUrl.startsWith(`data:${preferredMime}`)) {
      optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
    }
  } catch {
    optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  // Calculate approximate byte size of the Data URL
  const approxBytes = Math.round((optimizedDataUrl.length * 3) / 4);

  return {
    dataUrl: optimizedDataUrl,
    fileName: file.name,
    fileSizeBytes: approxBytes,
    fileSizeLabel: formatFileSize(approxBytes),
    width: targetWidth,
    height: targetHeight,
    shotLabel,
  };
}

/** Processes multiple image files in batch */
export async function processImageFiles(
  files: FileList | File[],
  options?: ProcessImageOptions
): Promise<ProcessedImageResult[]> {
  const fileArray = Array.from(files).filter((file) =>
    file.type ? file.type.startsWith('image/') : /\.(jpe?g|png|webp|gif|svg)$/i.test(file.name)
  );

  if (fileArray.length === 0) return [];

  const results = await Promise.all(
    fileArray.map((file) =>
      processImageFile(file, options).catch(() => null)
    )
  );

  return results.filter((res): res is ProcessedImageResult => res !== null);
}
