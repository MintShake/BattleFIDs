import { neon } from '@neondatabase/serverless';

// Single connection factory — reused across requests in the same worker
export const sql = neon(process.env.DATABASE_URL!);
