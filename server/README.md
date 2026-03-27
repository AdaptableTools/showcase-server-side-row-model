# SQLite Node Server

This package recreates the public Adaptable showcase server on top of `SQLite + Express + Drizzle ORM`, while tightening the API contract, moving to parameterized SQL, and adding a SQLite-native pivot strategy.

## What It Includes

- A file-backed SQLite database seeded from the showcase `olympic_winners.sql` dataset
- A TypeScript Express server with both `POST /api` and `POST /api/query`
- Runtime validation for request payloads
- Server-side filtering, sorting, grouping, aggregation, pagination, and pivot support
- Distinct-value and report endpoints for Adaptable workflows
- Focused API tests covering paging, grouping, compatibility aliases, and pivot metadata

## Scripts

- `npm run dev`: start the server in watch mode
- `npm run start`: start the server once
- `npm run seed -- --force`: rebuild the SQLite database from the source SQL file
- `npm run typecheck`: run TypeScript checks
- `npm run test`: run the API test suite

## Data Files

- Source dataset: `data/olympic_winners.sql`
- Seeded SQLite database: `data/olympic-winners.sqlite`

## Environment Variables

- `PORT`: server port, defaults to `4000`
- `SQLITE_DB_PATH`: override the SQLite database path
- `OLYMPIC_SQL_PATH`: override the source SQL file path
- `MAX_PIVOT_FIELDS`: cap the number of generated pivot fields, defaults to `50`

## API

### `POST /api` and `POST /api/query`

Accept a server-side row model style request body with these main fields:

- `startRow`, `endRow`
- `rowGroupCols`, `groupKeys`
- `sortModel`
- `valueCols`
- `pivotMode`, `pivotCols`
- `adaptableFilters`
- `gridFilterAST`

Response shape:

- `rows`: result rows for the requested page
- `lastRow`: SSRM-compatible row count signal
- `count`: optional full count when `includeCount` is `true`
- `sql`: optional debug string when `includeSQL` is `true`
- `pivotFields`: optional pivot metadata

### `GET /api/permitted-values`

Query parameters:

- `columnId`

Returns distinct values as `{ value, label }[]`.

### `POST /api/report`

Accepts:

- `report`
- `reportColumns`
- `reportQueryAST`

Returns JSON export payloads shaped for server-side reporting.

## Notable Improvements Over The Reference

- Uses parameterized SQL instead of interpolating filter values directly
- Normalizes dates into a dedicated SQLite-friendly `date_iso` column
- Adds request validation and clearer error responses
- Supports SQLite-native pivot expansion without depending on SQL Server style `PIVOT`
- Keeps compatibility aliases while cleaning up the internal DTOs
