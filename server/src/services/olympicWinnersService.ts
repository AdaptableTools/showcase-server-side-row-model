import type Database from 'better-sqlite3';
import { maxPivotFields } from '../config.js';
import type {
  NormalizedQueryRequest,
  PermittedValue,
  QueryResponse,
  ReportRequest,
  ReportResponse,
} from '../contracts/api.js';
import { createDatabaseContext, getDatabaseContext, type DatabaseContext } from '../db/client.js';
import { ensureDatabaseReady } from '../db/seed.js';
import {
  buildCountStatement,
  buildDataStatement,
  buildPivotKeyStatements,
  buildPivotStatements,
  buildReportStatement,
  type PivotCombination,
} from '../query/sql.js';

const selectableColumns = new Set([
  'athlete',
  'age',
  'bronze',
  'country',
  'country_group',
  'countryGroup',
  'date',
  'date_iso',
  'gold',
  'id',
  'silver',
  'sport',
  'total',
  'year',
]);

type SqlRow = Record<string, unknown>;

function getPageSize(request: NormalizedQueryRequest) {
  if (request.endRow === undefined) {
    return Number.POSITIVE_INFINITY;
  }

  return request.endRow - request.startRow;
}

function getLastRow(request: NormalizedQueryRequest, rowCount: number) {
  if (rowCount === 0) {
    return 0;
  }

  const pageSize = getPageSize(request);
  const currentLastRow = request.startRow + rowCount;

  if (!Number.isFinite(pageSize)) {
    return currentLastRow;
  }

  return rowCount <= pageSize ? currentLastRow : -1;
}

function cutToRequestedPage(request: NormalizedQueryRequest, rows: SqlRow[]) {
  const pageSize = getPageSize(request);

  if (!Number.isFinite(pageSize)) {
    return rows;
  }

  return rows.slice(0, pageSize);
}

function renderSqlForDebug(text: string, params: unknown[]) {
  return `${text}\n-- params: ${JSON.stringify(params)}`;
}

function readRows(sqlite: Database.Database, text: string, params: unknown[]) {
  return sqlite.prepare(text).all(...params) as SqlRow[];
}

function readCount(sqlite: Database.Database, text: string, params: unknown[]) {
  const row = sqlite.prepare(text).get(...params) as { count: number } | undefined;
  return row?.count ?? 0;
}

export class OlympicWinnersService {
  readonly context: DatabaseContext;

  constructor(context: DatabaseContext = getDatabaseContext()) {
    this.context = context;
    ensureDatabaseReady(this.context.sqlite);
  }

  static fromDbPath(dbPath: string) {
    return new OlympicWinnersService(createDatabaseContext(dbPath));
  }

  dispose() {
    this.context.sqlite.close();
  }

  getPermittedValues(columnId: string): PermittedValue[] {
    if (!selectableColumns.has(columnId)) {
      throw new Error(`Unsupported column "${columnId}"`);
    }

    const physicalColumn = columnId === 'countryGroup' ? 'country_group' : columnId;
    const rows = readRows(
      this.context.sqlite,
      `SELECT DISTINCT "${physicalColumn}" AS value
       FROM olympic_winners
       WHERE "${physicalColumn}" IS NOT NULL
       ORDER BY "${physicalColumn}" ASC`,
      []
    );

    return rows.map((row) => ({
      label: String(row.value),
      value: (row.value ?? null) as string | number | boolean | null,
    }));
  }

  getData(request: NormalizedQueryRequest): QueryResponse {
    return request.pivotMode ? this.getPivotData(request) : this.getTableData(request);
  }

  private getTableData(request: NormalizedQueryRequest): QueryResponse {
    const dataStatement = buildDataStatement(request);
    const rows = readRows(this.context.sqlite, dataStatement.text, dataStatement.params);
    const pageRows = cutToRequestedPage(request, rows);

    const response: QueryResponse = {
      success: true,
      lastRow: getLastRow(request, rows.length),
      rows: pageRows,
    };

    if (request.includeCount) {
      const countStatement = buildCountStatement(request);
      response.count = readCount(this.context.sqlite, countStatement.text, countStatement.params);
    }

    if (request.includeSQL) {
      response.sql = renderSqlForDebug(dataStatement.text, dataStatement.params);
    }

    return response;
  }

  private getPivotCombinations(request: NormalizedQueryRequest): PivotCombination[] {
    const keyStatements = buildPivotKeyStatements(request);

    if (!keyStatements.length) {
      return [];
    }

    const valuesPerColumn = keyStatements.map(({ field, statement: stmt }) => {
      const rows = readRows(this.context.sqlite, stmt.text, stmt.params);
      const values = rows.map((row) => String(row.value));

      if (values.length > maxPivotFields) {
        throw new Error(
          `Too many pivot values for "${field}". Narrow the filters or raise MAX_PIVOT_FIELDS.`
        );
      }

      return { field, values };
    });

    let combinations: PivotCombination[] = [{}];
    for (const { field, values } of valuesPerColumn) {
      const next: PivotCombination[] = [];
      for (const combo of combinations) {
        for (const value of values) {
          next.push({ ...combo, [field]: value });
        }
      }
      combinations = next;
    }

    const valueColCount = request.valueCols.length || 1;
    if (combinations.length * valueColCount > maxPivotFields) {
      throw new Error('Too many pivot combinations. Narrow the filters or raise MAX_PIVOT_FIELDS.');
    }

    return combinations;
  }

  private getPivotData(request: NormalizedQueryRequest): QueryResponse {
    const combinations = this.getPivotCombinations(request);

    if (!combinations.length) {
      return {
        success: true,
        lastRow: 0,
        pivotFields: [],
        pivotResultFields: [],
        rows: [],
      };
    }

    const { countStatement, dataStatement, pivotFields } = buildPivotStatements(
      request,
      combinations
    );
    const rows = readRows(this.context.sqlite, dataStatement.text, dataStatement.params);
    const pageRows = cutToRequestedPage(request, rows);
    const groupedCount = readCount(this.context.sqlite, countStatement.text, countStatement.params);

    const cleanedRows = pageRows.map((row, index) => {
      const cleanRow: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        if (value !== null && value !== undefined) {
          cleanRow[key] = value;
        }
      }
      cleanRow.id = String(index + request.startRow);
      return cleanRow;
    });

    const pivotFieldEntries = pivotFields.map((f) => ({
      field: f.field,
      pivotValues: Object.fromEntries(
        Object.entries(f.pivotValues).map(([k, v]) => {
          const num = Number(v);
          return [k, Number.isNaN(num) ? v : num];
        })
      ),
      valueColumn: f.valueColumn,
      aggFunc: f.aggFunc,
    }));

    const response: QueryResponse = {
      success: true,
      rows: cleanedRows,
      lastRow: groupedCount,
      pivotFields: pivotFieldEntries,
      pivotResultFields: pivotFieldEntries.map((f) => f.field),
    };

    if (request.includeCount) {
      response.count = groupedCount;
    }

    if (request.includeSQL) {
      response.sql = renderSqlForDebug(dataStatement.text, dataStatement.params);
    }

    return response;
  }

  getReportData(request: ReportRequest): ReportResponse {
    const requestedColumns = request.reportColumns
      .map((column) => column.field ?? column.columnId)
      .filter((column): column is string => Boolean(column))
      .filter((column) => selectableColumns.has(column));
    const statement = buildReportStatement(requestedColumns, request.reportQueryAST);
    const rows = readRows(this.context.sqlite, statement.text, statement.params);

    return {
      type: 'json',
      data: {
        columns: request.reportColumns,
        rows,
        sql: renderSqlForDebug(statement.text, statement.params),
      },
    };
  }
}
