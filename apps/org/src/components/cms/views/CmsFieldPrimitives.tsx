'use client';

import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { Button, Input, cn } from '@ants/ui';

export function CmsFieldLabel({
  htmlFor,
  label,
  hint,
  children,
}: {
  htmlFor?: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="text-xs font-semibold text-foreground"
        >
          {label}
        </label>
        {hint && (
          <span className="text-[11px] text-foreground-muted">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export function CmsTextarea({
  id,
  value,
  onChange,
  rows = 3,
  placeholder,
  mono = false,
  className,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full rounded-lg border border-border bg-surface-card px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary',
        mono && 'font-mono text-xs leading-relaxed',
        className
      )}
    />
  );
}

export function CmsSelect({
  id,
  value,
  onChange,
  options,
  className,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-10 w-full rounded-lg border border-border bg-surface-card px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary',
        className
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Editable list of text items (highlights, paragraphs, achievements, subjects).
 */
export function CmsStringListEditor({
  label,
  hint,
  items,
  onChange,
  placeholder = 'Add item...',
  multiline = false,
  addLabel = 'Add',
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  multiline?: boolean;
  addLabel?: string;
}) {
  const [draft, setDraft] = useState('');

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setDraft('');
  };

  const handleUpdate = (idx: number, val: string) => {
    onChange(items.map((item, i) => (i === idx ? val : item)));
  };

  const handleDelete = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const handleMove = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(idx, 1);
    if (moved !== undefined) next.splice(target, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        {hint && (
          <span className="text-[11px] text-foreground-muted">{hint}</span>
        )}
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-1.5">
              {multiline ? (
                <CmsTextarea
                  rows={2}
                  value={item}
                  onChange={(val) => handleUpdate(idx, val)}
                  className="flex-1"
                />
              ) : (
                <Input
                  value={item}
                  onChange={(e) => handleUpdate(idx, e.target.value)}
                  className="flex-1 h-9 text-xs"
                />
              )}
              <div className="flex shrink-0 items-center gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleMove(idx, 'up')}
                  disabled={idx === 0}
                  aria-label={`Move ${label} item ${idx + 1} up`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-card text-foreground-muted hover:text-foreground disabled:opacity-35"
                >
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(idx, 'down')}
                  disabled={idx === items.length - 1}
                  aria-label={`Move ${label} item ${idx + 1} down`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-card text-foreground-muted hover:text-foreground disabled:opacity-35"
                >
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(idx)}
                  aria-label={`Delete ${label} item ${idx + 1}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-card text-foreground-muted hover:border-danger-border hover:bg-danger-tint hover:text-on-danger-tint"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2">
        {multiline ? (
          <CmsTextarea
            rows={2}
            value={draft}
            onChange={setDraft}
            placeholder={placeholder}
            className="flex-1"
          />
        ) : (
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder={placeholder}
            className="flex-1 h-9 text-xs"
          />
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleAdd}
          disabled={!draft.trim()}
          leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
          className="h-9 shrink-0"
        >
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * Editable pill tag list (e.g., Article tags or Facilitators).
 */
export function CmsTagListEditor({
  label,
  tags,
  onChange,
  placeholder = 'Add tag and press Enter...',
}: {
  label: string;
  tags: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  const addTag = () => {
    const clean = draft.trim();
    if (!clean) return;
    if (!tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      onChange([...tags, clean]);
    }
    setDraft('');
  };

  return (
    <div className="space-y-2">
      <span className="block text-xs font-semibold text-foreground">{label}</span>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-inset px-2.5 py-1 text-xs font-medium text-foreground"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => onChange(tags.filter((t) => t !== tag))}
                aria-label={`Remove ${tag}`}
                className="rounded-full p-0.5 text-foreground-muted hover:text-foreground"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="h-9 text-xs"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addTag}
          disabled={!draft.trim()}
          leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
          className="h-9 shrink-0"
        >
          Add
        </Button>
      </div>
    </div>
  );
}

