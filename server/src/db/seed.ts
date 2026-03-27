import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { defaultDbPath, sourceSqlPath } from '../config.js';
import { createDatabaseContext } from './client.js';

const createTableSql = `
CREATE TABLE IF NOT EXISTS olympic_winners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete TEXT,
  age INTEGER,
  country TEXT,
  country_group TEXT,
  year INTEGER,
  date TEXT,
  date_iso TEXT,
  sport TEXT,
  gold INTEGER,
  silver INTEGER,
  bronze INTEGER,
  total INTEGER
);

CREATE INDEX IF NOT EXISTS olympic_winners_country_idx ON olympic_winners(country);
CREATE INDEX IF NOT EXISTS olympic_winners_country_group_idx ON olympic_winners(country_group);
CREATE INDEX IF NOT EXISTS olympic_winners_year_idx ON olympic_winners(year);
CREATE INDEX IF NOT EXISTS olympic_winners_sport_idx ON olympic_winners(sport);
CREATE INDEX IF NOT EXISTS olympic_winners_date_iso_idx ON olympic_winners(date_iso);
`;

export interface SeedOptions {
  force?: boolean;
  sourcePath?: string;
}

function extractInsertSql(rawSql: string): string {
  const insertMatch = rawSql.match(/INSERT INTO [`"]?olympic_winners[`"]?\([\s\S]+/i);

  if (!insertMatch) {
    throw new Error('Could not find olympic_winners INSERT statement in the source SQL file.');
  }

  return insertMatch[0].replaceAll("\\'", "''");
}

function isTableSeeded(sqlite: Database.Database): boolean {
  const tableExists = sqlite
    .prepare(
      "SELECT 1 AS exists_flag FROM sqlite_master WHERE type = 'table' AND name = 'olympic_winners'"
    )
    .get();

  if (!tableExists) {
    return false;
  }

  const countRow = sqlite
    .prepare('SELECT COUNT(*) AS count FROM olympic_winners')
    .get() as { count: number };

  return countRow.count > 0;
}

export function seedDatabase(sqlite: Database.Database, options: SeedOptions = {}) {
  const { force = false, sourcePath = sourceSqlPath } = options;

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source dataset not found at ${sourcePath}`);
  }

  if (isTableSeeded(sqlite) && !force) {
    return;
  }

  const rawSql = fs.readFileSync(sourcePath, 'utf8');
  const insertSql = extractInsertSql(rawSql);

  sqlite.exec('BEGIN');

  try {
    if (force) {
      sqlite.exec('DROP TABLE IF EXISTS olympic_winners');
    }

    sqlite.exec(createTableSql);
    sqlite.exec('DELETE FROM olympic_winners');
    sqlite.exec(insertSql);
    sqlite.exec(`
      UPDATE olympic_winners
      SET date_iso = substr(date, 7, 4) || '-' || substr(date, 4, 2) || '-' || substr(date, 1, 2)
      WHERE date IS NOT NULL AND date != '';
    `);
    sqlite.exec('COMMIT');
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}

export function ensureDatabaseReady(sqlite: Database.Database, options: SeedOptions = {}) {
  if (!isTableSeeded(sqlite)) {
    seedDatabase(sqlite, options);
  }
}

function isDirectExecution() {
  if (!process.argv[1]) {
    return false;
  }

  return fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
}

if (isDirectExecution()) {
  const force = process.argv.includes('--force');
  const context = createDatabaseContext(defaultDbPath);

  try {
    seedDatabase(context.sqlite, { force });
    const count = context.sqlite
      .prepare('SELECT COUNT(*) AS count FROM olympic_winners')
      .get() as { count: number };
    console.log(`Seeded ${count.count} olympic_winners rows into ${context.dbPath}`);
  } finally {
    context.sqlite.close();
  }
}
