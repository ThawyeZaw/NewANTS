import type { D1Database } from '@cloudflare/workers-types';
import { drizzle, type AnyD1Database, type DrizzleD1Database } from 'drizzle-orm/d1';
import { schema } from './schema/index';

export * from './schema/index';
export {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from 'drizzle-orm';

export type AntsSchema = typeof schema;
export type AntsDatabase = DrizzleD1Database<AntsSchema>;

/**
 * Creates a typed Drizzle ORM instance bound to Cloudflare D1 (`env.DB`)
 * with full relational query support across all 55 ANTs ecosystem tables.
 */
export function createDb(d1: D1Database | AnyD1Database): AntsDatabase {
  return drizzle(d1 as AnyD1Database, { schema });
}
