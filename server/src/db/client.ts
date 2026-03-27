import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { defaultDbPath } from '../config.js';
import { schema } from './schema.js';

export interface DatabaseContext {
  db: BetterSQLite3Database<typeof schema>;
  dbPath: string;
  sqlite: Database.Database;
}

let singletonContext: DatabaseContext | undefined;

function attachCustomFunctions(sqlite: Database.Database) {
  sqlite.function(
    'regexp',
    { deterministic: true },
    (pattern: string, value: string | null | undefined) => {
      if (value === null || value === undefined) {
        return 0;
      }

      try {
        return new RegExp(pattern, 'i').test(String(value)) ? 1 : 0;
      } catch {
        return 0;
      }
    }
  );
}

export function createDatabaseContext(dbPath: string = defaultDbPath): DatabaseContext {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  attachCustomFunctions(sqlite);

  return {
    db: drizzle(sqlite, { schema }),
    dbPath,
    sqlite,
  };
}

export function getDatabaseContext(dbPath: string = defaultDbPath): DatabaseContext {
  if (!singletonContext || singletonContext.dbPath !== dbPath) {
    singletonContext?.sqlite.close();
    singletonContext = createDatabaseContext(dbPath);
  }

  return singletonContext;
}

export function closeDatabaseContext() {
  singletonContext?.sqlite.close();
  singletonContext = undefined;
}
