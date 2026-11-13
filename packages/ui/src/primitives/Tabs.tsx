'use client';

import React, { createContext, useContext, useRef, useState } from 'react';
import { cn } from '../utils/cn';
import { useSlidingIndicator } from './SlidingHighlight';

export type TabsVariant = 'segmented' | 'underline';

export interface TabItem {
  value: string;
  label: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  content?: React.ReactNode;
}

export interface TabsProps {
  /** Controlled active tab value */
  value?: string;
  /** Default active tab value when uncontrolled */
  defaultValue?: string;
  /** Callback when active tab changes */
  onValueChange?: (value: string) => void;
  /** Visual variant: 'segmented' (tactile pill switch) or 'underline' (editorial academic bar) */
  variant?: TabsVariant;
  /** Optional declarative tab items list */
  items?: TabItem[];
  /** Compound children (TabsList + TabsContent) */
  children?: React.ReactNode;
  /** Additional wrapper className */
  className?: string;
}

interface TabsContextValue {
  activeValue: string;
  setActiveValue: (val: string) => void;
  variant: TabsVariant;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('Tabs compound components must be rendered within <Tabs>');
  }
  return ctx;
}

export function Tabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  variant = 'segmented',
  items,
  children,
  className,
}: TabsProps) {
  const initial = defaultValue ?? items?.[0]?.value ?? '';
  const [internalValue, setInternalValue] = useState<string>(initial);
  const activeValue = controlledValue ?? internalValue;

  const setActiveValue = (next: string) => {
    if (controlledValue === undefined) {
      setInternalValue(next);
    }
    onValueChange?.(next);
  };

  return (
    <TabsContext.Provider value={{ activeValue, setActiveValue, variant }}>
      <div className={cn('w-full', className)}>
        {items && items.length > 0 ? (
          <>
            <TabsList>
              {items.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  disabled={item.disabled}
                  icon={item.icon}
                  badge={item.badge}
                >
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {items.map(
              (item) =>
                item.content !== undefined && (
                  <TabsContent key={item.value} value={item.value}>
                    {item.content}
                  </TabsContent>
                )
            )}
          </>
        ) : null}
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { activeValue, variant } = useTabsContext();
  const listRef = useRef<HTMLDivElement | null>(null);
  const { rect, ready, animate } = useSlidingIndicator(listRef, activeValue, {
    activeSelector: '[role="tab"][aria-selected="true"]',
  });
  const indicatorReady = ready && rect.visible;

  return (
    <div
      ref={listRef}
      role="tablist"
      data-gliding-ready={indicatorReady ? 'true' : 'false'}
      className={cn(
        'ants-glide-host relative',
        variant === 'segmented'
          ? 'inline-flex items-center gap-1 rounded-xl border border-border bg-surface-inset p-1'
          : 'flex items-center gap-6 border-b border-border',
        className
      )}
      {...props}
    >
      {variant === 'segmented' ? (
        <span
          aria-hidden="true"
          data-animate={animate ? 'true' : 'false'}
          className="ants-glide-indicator z-0 rounded-lg bg-primary shadow-xs"
          style={{
            transform: `translate3d(${rect.x}px, ${rect.y}px, 0)`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            opacity: indicatorReady ? 1 : 0,
          }}
        />
      ) : (
        <span
          aria-hidden="true"
          data-animate={animate ? 'true' : 'false'}
          className="ants-glide-indicator z-0 rounded-full bg-primary"
          style={{
            transform: `translate3d(${rect.x}px, ${Math.max(0, rect.y + rect.height - 2)}px, 0)`,
            width: `${rect.width}px`,
            height: '2px',
            opacity: indicatorReady ? 1 : 0,
          }}
        />
      )}
      {children}
    </div>
  );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export function TabsTrigger({
  value,
  icon,
  badge,
  disabled,
  className,
  children,
  ...props
}: TabsTriggerProps) {
  const { activeValue, setActiveValue, variant } = useTabsContext();
  const isActive = activeValue === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-active={isActive ? 'true' : 'false'}
      disabled={disabled}
      onClick={() => !disabled && setActiveValue(value)}
      className={cn(
        'ants-glide-item relative z-10 inline-flex items-center justify-center gap-2 text-xs font-semibold transition-colors duration-150 select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none',
        variant === 'segmented'
          ? cn(
              'rounded-lg px-3 py-1.5',
              isActive
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            )
          : cn(
              '-mb-px border-b-2 pb-2.5 pt-1 text-sm',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground-muted hover:border-border-hover hover:text-foreground'
            ),
        className
      )}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
      {badge && (
        <span className="font-mono tabular-nums text-[11px] opacity-85">{badge}</span>
      )}
    </button>
  );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: TabsContentProps) {
  const { activeValue } = useTabsContext();
  if (activeValue !== value) return null;

  return (
    <div
      key={value}
      role="tabpanel"
      className={cn('mt-4 ants-panel-enter focus:outline-none', className)}
      {...props}
    >
      {children}
    </div>
  );
}

