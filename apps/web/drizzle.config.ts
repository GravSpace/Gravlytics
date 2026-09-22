import { defineConfig } from 'drizzle-kit';

const dbUrl =
	process.env.DATABASE_URL ||
	`postgres://${process.env.POSTGRES_USER || 'gravlytics'}:${process.env.POSTGRES_PASSWORD || 'gravlytics_dev'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'gravlytics'}`;

export default defineConfig({
	schema: './src/lib/server/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: dbUrl
	}
});
