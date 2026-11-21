import { integer, text } from 'drizzle-orm/sqlite-core';

/**
 * Returns the current UTC timestamp formatted as an ISO-8601 string.
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Non-null ISO-8601 `created_at` text column with automatic default timestamp.
 */
export function createdAtColumn() {
  return text('created_at').notNull().$defaultFn(nowIso);
}

/**
 * Non-null ISO-8601 `updated_at` text column with automatic default timestamp.
 */
export function updatedAtColumn() {
  return text('updated_at').notNull().$defaultFn(nowIso);
}

/**
 * Reusable `{ createdAt, updatedAt }` ISO-8601 column pair for D1 SQLite tables.
 */
export function isoTimestamps() {
  return {
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  };
}

/**
 * Boolean flag stored as SQLite integer (`0` / `1`) mapped to TS `boolean`.
 */
export function booleanFlag(columnName: string, defaultValue = false) {
  return integer(columnName, { mode: 'boolean' }).notNull().default(defaultValue);
}
