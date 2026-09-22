import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const dbUrl =
	process.env.DATABASE_URL ||
	`postgres://${process.env.POSTGRES_USER || 'gravlytics'}:${process.env.POSTGRES_PASSWORD || 'gravlytics_dev'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'gravlytics'}`;

export const pgClient = postgres(dbUrl);

export const drizzleDb = drizzle(pgClient, { schema });

export * from './schema';
export { eq, and, or, desc, asc, like, ilike, sql, inArray } from 'drizzle-orm';
