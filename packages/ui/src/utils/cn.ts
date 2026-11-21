/**
 * Lightweight className concatenation utility for @ants/ui primitives.
 */
export function cn(...inputs: Array<string | undefined | null | false>): string {
  return inputs.filter(Boolean).join(' ');
}

