import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config';
import * as schema from './schema';

// Connection pooling for PostgreSQL (works with Supabase Pooler / direct PG)
const queryClient = postgres(config.databaseUrl, {
  max: config.env === 'production' ? 10 : 5,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: config.databaseUrl.includes('supabase') || config.databaseUrl.includes('sslmode=require') ? 'require' : false,
});

export const db = drizzle(queryClient, { schema });
export { queryClient };
export * from './schema';

