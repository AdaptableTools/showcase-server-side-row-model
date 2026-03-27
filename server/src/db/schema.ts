import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const olympicWinners = sqliteTable(
  'olympic_winners',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    athlete: text('athlete'),
    age: integer('age'),
    country: text('country'),
    countryGroup: text('country_group'),
    year: integer('year'),
    date: text('date'),
    dateIso: text('date_iso'),
    sport: text('sport'),
    gold: integer('gold'),
    silver: integer('silver'),
    bronze: integer('bronze'),
    total: integer('total'),
  },
  (table) => ({
    countryIdx: index('olympic_winners_country_idx').on(table.country),
    countryGroupIdx: index('olympic_winners_country_group_idx').on(table.countryGroup),
    yearIdx: index('olympic_winners_year_idx').on(table.year),
    sportIdx: index('olympic_winners_sport_idx').on(table.sport),
    dateIsoIdx: index('olympic_winners_date_iso_idx').on(table.dateIso),
  })
);

export const schema = {
  olympicWinners,
};

export type OlympicWinnerRow = typeof olympicWinners.$inferSelect;
