'use client';

import React from 'react';
import { Button, Modal } from '@ants/ui';
import { POMODORO_KEYBOARD_SHORTCUTS } from '../../../mocks/pomodoro.mock';

export interface ShortcutsModalViewProps {
  open?: boolean;
  onClose?: () => void;
  shortcuts?: { keys: string[]; label: string }[];
}

export function ShortcutsModalView({
  open = false,
  onClose,
  shortcuts = POMODORO_KEYBOARD_SHORTCUTS,
}: ShortcutsModalViewProps) {
  return (
    <Modal
      open={open}
      onClose={() => onClose?.()}
      title="Keyboard shortcuts"
      size="md"
      footer={
        <Button size="sm" onClick={() => onClose?.()}>
          Done
        </Button>
      }
    >
      <ul className="divide-y divide-border">
        {shortcuts.map((item) => (
          <li
            key={item.label}
            className="flex items-center justify-between gap-4 py-2.5 text-sm"
          >
            <span className="text-foreground">{item.label}</span>
            <span className="flex items-center gap-1">
              {item.keys.map((key) => (
                <kbd
                  key={key}
                  className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-border bg-surface-inset px-2 py-0.5 font-mono text-xs font-medium text-foreground"
                >
                  {key}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
