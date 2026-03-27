import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);

export const packageRoot = path.resolve(currentDir, '..');
export const dataDir = path.join(packageRoot, 'data');
export const dbDataDir = path.join(packageRoot, 'db');

export const defaultDbPath =
  process.env.SQLITE_DB_PATH ?? path.join(dbDataDir, 'olympic-winners.sqlite');
export const sourceSqlPath =
  process.env.OLYMPIC_SQL_PATH ?? path.join(dbDataDir, 'olympic_winners.sql');
export const defaultPort = Number(process.env.PORT ?? 4000);
export const maxPivotFields = Number(process.env.MAX_PIVOT_FIELDS ?? 1000);
