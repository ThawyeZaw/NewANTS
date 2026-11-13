'use client';

import React, { useMemo, useState } from 'react';
import { Check, Copy, Lightbulb } from 'lucide-react';
import { Checkbox, cn } from '@ants/ui';
import {
  parseInlineMarkdownTokens,
  parseMarkdownBlocks,
  type MarkdownBlock,
} from '../../../lib/study/learning';

export interface MarkdownPreviewViewProps {
  markdown: string;
  onToggleChecklist?: (itemText: string) => void;
  className?: string;
}

function renderInlineTokens(text: string): React.ReactNode {
  const tokens = parseInlineMarkdownTokens(text);
  return tokens.map((token, idx) => {
    if (token.type === 'bold') {
      return (
        <strong key={idx} className="font-semibold text-foreground">
          {token.text}
        </strong>
      );
    }
    if (token.type === 'code') {
      return (
        <code
          key={idx}
          className="rounded bg-surface-inset px-1.5 py-0.5 font-mono text-[0.86em] font-medium text-primary border border-border-subtle"
        >
          {token.text}
        </code>
      );
    }
    return <React.Fragment key={idx}>{token.text}</React.Fragment>;
  });
}

function CodeBlockView({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked in restricted context.
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-inset/75">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-[0.06em] text-foreground-subtle">
        <span>{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-sans text-[11px] font-medium normal-case tracking-normal text-foreground-muted transition-colors hover:bg-surface-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-success" aria-hidden="true" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-xs sm:text-[13px] leading-relaxed text-foreground tabular-nums">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function MarkdownPreviewView({
  markdown,
  onToggleChecklist,
  className,
}: MarkdownPreviewViewProps) {
  const blocks: MarkdownBlock[] = useMemo(() => parseMarkdownBlocks(markdown), [markdown]);

  if (blocks.length === 0) {
    return (
      <p className={cn('text-sm italic text-foreground-subtle', className)}>
        Start typing Markdown in the editor to preview structured notes, formulas, and checklists.
      </p>
    );
  }

  return (
    <div className={cn('space-y-4 text-sm leading-relaxed text-foreground-muted', className)}>
      {blocks.map((block, index) => {
        if (block.type === 'h1') {
          return (
            <h1
              key={`${block.id}-${index}`}
              id={block.id}
              className="scroll-mt-20 border-b border-border pb-2 text-xl sm:text-2xl font-bold tracking-tight text-foreground"
            >
              {block.text}
            </h1>
          );
        }

        if (block.type === 'h2') {
          return (
            <h2
              key={`${block.id}-${index}`}
              id={block.id}
              className="scroll-mt-20 pt-2 text-base sm:text-lg font-bold tracking-tight text-foreground"
            >
              {block.text}
            </h2>
          );
        }

        if (block.type === 'h3') {
          return (
            <h3
              key={`${block.id}-${index}`}
              id={block.id}
              className="scroll-mt-20 pt-1 text-sm font-bold uppercase tracking-[0.04em] text-foreground"
            >
              {block.text}
            </h3>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <p key={index} className="leading-relaxed text-foreground-muted">
              {renderInlineTokens(block.text)}
            </p>
          );
        }

        if (block.type === 'callout') {
          return (
            <div
              key={index}
              className="flex items-start gap-3 rounded-xl border border-primary-tint-border bg-primary-tint/50 px-4 py-3 text-sm text-foreground"
            >
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <div className="space-y-1">
                {block.lines.map((line, lineIdx) => (
                  <p key={lineIdx} className="leading-relaxed">
                    {renderInlineTokens(line)}
                  </p>
                ))}
              </div>
            </div>
          );
        }

        if (block.type === 'code') {
          return <CodeBlockView key={index} language={block.language} code={block.code} />;
        }

        if (block.type === 'ul') {
          return (
            <ul key={index} className="list-disc space-y-1.5 pl-5 text-foreground-muted">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  {renderInlineTokens(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol key={index} className="list-decimal space-y-1.5 pl-5 text-foreground-muted">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  {renderInlineTokens(item)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === 'checklist') {
          return (
            <div
              key={index}
              className="space-y-2 rounded-xl border border-border bg-surface-inset/40 p-3.5"
            >
              {block.items.map((item, itemIdx) => (
                <div key={`${item.text}-${itemIdx}`} className="flex items-start gap-2.5">
                  <Checkbox
                    checked={item.checked}
                    strikeWhenChecked
                    onCheckedChange={() => onToggleChecklist?.(item.text)}
                    disabled={!onToggleChecklist}
                    label={renderInlineTokens(item.text)}
                  />
                </div>
              ))}
            </div>
          );
        }

        return <hr key={index} className="border-border" />;
      })}
    </div>
  );
}
