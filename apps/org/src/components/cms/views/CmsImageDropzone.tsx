'use client';

import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, UploadCloud } from 'lucide-react';
import { Button, cn } from '@ants/ui';
import {
  processImageFiles,
  type ProcessedImageResult,
} from '../../../lib/image-upload';

export interface CmsImageDropzoneProps {
  /** Heading displayed inside the dropzone (optional when compact) */
  label?: string;
  /** Explanatory subtext */
  description?: string;
  /** Button CTA text (defaults to 'Select Photo' or 'Select Photos') */
  buttonLabel?: string;
  /** Allow selecting/dropping multiple images */
  multiple?: boolean;
  /** Compact card mode for single photo replacement */
  compact?: boolean;
  /** Fired when files are successfully processed into Data URLs */
  onUpload: (results: ProcessedImageResult[]) => void;
  className?: string;
}

export function CmsImageDropzone({
  label = 'Upload Image',
  description,
  buttonLabel,
  multiple = false,
  compact = false,
  onUpload,
  className,
}: CmsImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const defaultButtonLabel =
    buttonLabel ?? (multiple ? 'Upload Photos' : 'Upload Photo');

  const handleFiles = async (fileList: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);
    setIsProcessing(true);

    try {
      const results = await processImageFiles(fileList);
      if (results.length === 0) {
        setUploadError('Please select valid image files (JPG, PNG, or WebP).');
      } else {
        onUpload(results);
      }
    } catch {
      setUploadError('Failed to process uploaded image. Please try another file.');
    } finally {
      setIsProcessing(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  if (compact) {
    return (
      <div className={cn('relative', className)}>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={
            isProcessing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
            )
          }
          disabled={isProcessing}
          onClick={() => inputRef.current?.click()}
          className="h-8 text-xs"
        >
          {isProcessing ? 'Optimizing...' : defaultButtonLabel}
        </Button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'group relative rounded-xl border border-dashed transition-all text-center',
        isDragging
          ? 'border-primary bg-primary-tint/40 shadow-sm'
          : 'border-border bg-surface-card hover:border-primary-tint-border hover:bg-surface-inset/50',
        'p-5 sm:p-6 space-y-3 cursor-pointer',
        className
      )}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      aria-label={`${label}. Click or drag files to upload.`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple={multiple}
        onChange={(e) => handleFiles(e.target.files)}
        className="sr-only"
      />

      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-inset text-primary transition-transform group-hover:scale-105">
        {isProcessing ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        ) : isDragging ? (
          <UploadCloud className="h-5 w-5 text-primary" aria-hidden="true" />
        ) : (
          <ImageIcon className="h-5 w-5 text-primary" aria-hidden="true" />
        )}
      </div>

      <div className="space-y-1">
        <h5 className="text-xs sm:text-sm font-bold text-foreground">
          {isProcessing ? 'Optimizing image...' : label}
        </h5>
        {description && (
          <p className="text-[11px] sm:text-xs text-foreground-muted max-w-sm mx-auto">
            {description}
          </p>
        )}
      </div>

      <div className="pt-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={
            isProcessing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
            )
          }
          disabled={isProcessing}
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          className="h-8 text-xs pointer-events-auto"
        >
          {isProcessing ? 'Processing...' : defaultButtonLabel}
        </Button>
      </div>

      {uploadError && (
        <p className="text-xs font-medium text-danger pt-1">{uploadError}</p>
      )}
    </div>
  );
}
