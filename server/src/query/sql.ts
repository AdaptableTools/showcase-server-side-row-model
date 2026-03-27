import type {
  AdaptableFilter,
  NormalizedQueryRequest,
  PivotFieldDefinition,
} from '../contracts/api.js';
import { maxPivotFields } from '../config.js';
import { countriesInEurope } from '../data/countriesInEurope.js';

type SqlParam = string | number | boolean | null;

export interface SqlStatement {
  params: SqlParam[];
  text: string;
}

const selectableColumns = [
  'id',
  'athlete',
  'age',
  'country',
  'country_group',
  'year',
  'date_iso',
  'sport',
  'gold',
  'silver',
  'bronze',
  'total',
] as const;

const aggregationFns = {
  avg: 'AVG',
  count: 'COUNT',
  max: 'MAX',
  min: 'MIN',
  sum: 'SUM',
} as const;

const columnAliases: Record<string, string> = {
  athlete: 'athlete',
  age: 'age',
  bronze: 'bronze',
  country: 'country',
  country_group: 'country_group',
  countryGroup: 'country_group',
  date: 'date',
  dateIso: 'date_iso',
  date_iso: 'date_iso',
  gold: 'gold',
  id: 'id',
  silver: 'silver',
  sport: 'sport',
  total: 'total',
  year: 'year',
};

function statement(text: string, params: SqlParam[] = []): SqlStatement {
  return { params, text };
}

function quoteIdentifier(columnId: string): string {
  const resolvedColumn = columnAliases[columnId];

  if (!resolvedColumn) {
    throw new Error(`Unsupported column "${columnId}"`);
  }

  return `"${resolvedColumn}"`;
}

function resolveField(column: { id: string; field?: string | undefined }) {
  return column.field ?? column.id;
}

function quoteSelectableColumns() {
  return selectableColumns.map((column) => `"${column}"`).join(', ');
}

function joinStatements(parts: SqlStatement[], joiner: string): SqlStatement {
  const filteredParts = parts.filter((part) => part.text.trim().length > 0);

  if (!filteredParts.length) {
    return statement('');
  }

  return statement(
    filteredParts.map((part) => `(${part.text})`).join(joiner),
    filteredParts.flatMap((part) => part.params)
  );
}

function buildPagination(request: NormalizedQueryRequest) {
  if (request.endRow === undefined) {
    return statement('');
  }

  const startRow = request.startRow ?? 0;
  const pageSize = request.endRow - startRow;
  return statement('LIMIT ? OFFSET ?', [pageSize + 1, startRow]);
}

function isGrouping(request: NormalizedQueryRequest) {
  return request.rowGroupCols.length > request.groupKeys.length;
}

function currentGroupingField(request: NormalizedQueryRequest) {
  const groupingColumn = request.rowGroupCols[request.groupKeys.length];

  if (!groupingColumn) {
    return undefined;
  }

  return resolveField(groupingColumn);
}

function buildGroupKeyStatement(request: NormalizedQueryRequest): SqlStatement {
  const parts: SqlStatement[] = [];

  request.groupKeys.forEach((groupKey, index) => {
    const groupColumn = request.rowGroupCols[index];

    if (!groupColumn) {
      return;
    }

    const field = resolveField(groupColumn);
    parts.push(statement(`${quoteIdentifier(field)} = ?`, [groupKey]));
  });

  return joinStatements(parts, ' AND ');
}

function sanitizeInputs(inputs: unknown[] | undefined): SqlParam[] {
  return (inputs ?? [])
    .flat()
    .filter((input): input is SqlParam => input !== undefined && input !== null);
}

function buildTextFilter(filter: AdaptableFilter): SqlStatement {
  const columnId = quoteIdentifier(filter.columnFilter.ColumnId);
  const predicates = filter.columnFilter.Predicates ?? [];
  const parts = predicates
    .map((predicate) => {
      const inputs = sanitizeInputs(predicate.Inputs);

      switch (predicate.PredicateId) {
        case 'In':
          return joinStatements(
            inputs.map((input) => statement(`${columnId} = ?`, [String(input)])),
            ' OR '
          );
        case 'NotIn':
          return joinStatements(
            inputs.map((input) => statement(`${columnId} != ?`, [String(input)])),
            ' AND '
          );
        case 'Blanks':
          return statement(`${columnId} IS NULL OR ${columnId} = ''`);
        case 'NonBlanks':
          return statement(`${columnId} IS NOT NULL AND ${columnId} != ''`);
        case 'Is':
          return inputs[0] === undefined
            ? statement('')
            : statement(`${columnId} = ?`, [String(inputs[0])]);
        case 'IsNot':
          return inputs[0] === undefined
            ? statement('')
            : statement(`${columnId} != ?`, [String(inputs[0])]);
        case 'Contains':
          return inputs[0] === undefined
            ? statement('')
            : statement(`${columnId} LIKE ?`, [`%${String(inputs[0])}%`]);
        case 'NotContains':
          return inputs[0] === undefined
            ? statement('')
            : statement(`${columnId} NOT LIKE ?`, [`%${String(inputs[0])}%`]);
        case 'StartsWith':
          return inputs[0] === undefined
            ? statement('')
            : statement(`${columnId} LIKE ?`, [`${String(inputs[0])}%`]);
        case 'EndsWith':
          return inputs[0] === undefined
            ? statement('')
            : statement(`${columnId} LIKE ?`, [`%${String(inputs[0])}`]);
        case 'Regex':
          return inputs[0] === undefined
            ? statement('')
            : statement(`regexp(?, COALESCE(${columnId}, '')) = 1`, [String(inputs[0])]);
        default:
          return statement('');
      }
    })
    .filter((part) => part.text.length > 0);

  return joinStatements(parts, ' AND ');
}

function buildNumberFilter(filter: AdaptableFilter): SqlStatement {
  const columnId = quoteIdentifier(filter.columnFilter.ColumnId);
  const predicates = filter.columnFilter.Predicates ?? [];
  const parts = predicates
    .map((predicate) => {
      const inputs = sanitizeInputs(predicate.Inputs);

      console.log(predicate);
      switch (predicate.PredicateId) {
        case 'In':
          return joinStatements(
            inputs.map((input) => statement(`${columnId} = ?`, [Number(input)])),
            ' OR '
          );
        case 'NotIn':
          return joinStatements(
            inputs.map((input) => statement(`${columnId} != ?`, [Number(input)])),
            ' AND '
          );
        case 'Blanks':
          return statement(`${columnId} IS NULL`);
        case 'NonBlanks':
          return statement(`${columnId} IS NOT NULL`);
        case 'GreaterThan':
          return inputs[0] === undefined
            ? statement('')
            : statement(`${columnId} > ?`, [Number(inputs[0])]);
        case 'LessThan':
          return inputs[0] === undefined
            ? statement('')
            : statement(`${columnId} < ?`, [Number(inputs[0])]);
        case 'Positive':
          return statement(`${columnId} > 0`);
        case 'Negative':
          return statement(`${columnId} < 0`);
        case 'Zero':
          return statement(`${columnId} = 0`);
        case 'Equals':
          return inputs[0] === undefined
            ? statement('')
            : statement(`${columnId} = ?`, [Number(inputs[0])]);
        case 'NotEquals':
          return inputs[0] === undefined
            ? statement('')
            : statement(`${columnId} != ?`, [Number(inputs[0])]);
        case 'Between':
          return inputs[0] === undefined || inputs[1] === undefined
            ? statement('')
            : statement(`${columnId} >= ? AND ${columnId} <= ?`, [
                Number(inputs[0]),
                Number(inputs[1]),
              ]);
        case 'NotBetween':
          return inputs[0] === undefined || inputs[1] === undefined
            ? statement('')
            : statement(`${columnId} < ? OR ${columnId} > ?`, [
                Number(inputs[0]),
                Number(inputs[1]),
              ]);
        default:
          return statement('');
      }
    })
    .filter((part) => part.text.length > 0);

  return joinStatements(parts, ' AND ');
}

function buildDateColumnExpression(columnId: string) {
  const resolvedColumn = columnAliases[columnId];

  if (!resolvedColumn) {
    throw new Error(`Unsupported date column "${columnId}"`);
  }

  return resolvedColumn === 'date' ? `date("date_iso")` : `date("${resolvedColumn}")`;
}

function buildDateFilter(filter: AdaptableFilter): SqlStatement {
  const columnId = buildDateColumnExpression(filter.columnFilter.ColumnId);
  const today = `date('now', 'localtime')`;
  const monday = `date(${today}, '-' || ((CAST(strftime('%w', ${today}) AS integer) + 6) % 7) || ' days')`;
  const sunday = `date(${monday}, '+7 days')`;
  const predicates = filter.columnFilter.Predicates ?? [];

  const parts = predicates
    .map((predicate) => {
      const inputs = sanitizeInputs(predicate.Inputs);

      switch (predicate.PredicateId) {
        case 'In':
          return joinStatements(
            inputs.map((input) => statement(`${columnId} = date(?)`, [String(input)])),
            ' OR '
          );
        case 'NotIn':
          return joinStatements(
            inputs.map((input) => statement(`${columnId} != date(?)`, [String(input)])),
            ' AND '
          );
        case 'Blanks':
          return statement(`${columnId} IS NULL`);
        case 'NonBlanks':
          return statement(`${columnId} IS NOT NULL`);
        case 'Today':
          return statement(`${columnId} = ${today}`);
        case 'Yesterday':
          return statement(`${columnId} = date(${today}, '-1 day')`);
        case 'Tomorrow':
          return statement(`${columnId} = date(${today}, '+1 day')`);
        case 'ThisWeek':
          return statement(`${columnId} >= ${monday} AND ${columnId} < ${sunday}`);
        case 'ThisMonth':
          return statement(`strftime('%Y-%m', ${columnId}) = strftime('%Y-%m', ${today})`);
        case 'ThisQuarter':
          return statement(
            `CAST((CAST(strftime('%m', ${columnId}) AS integer) - 1) / 3 AS integer) = CAST((CAST(strftime('%m', ${today}) AS integer) - 1) / 3 AS integer) AND strftime('%Y', ${columnId}) = strftime('%Y', ${today})`
          );
        case 'ThisYear':
          return statement(`strftime('%Y', ${columnId}) = strftime('%Y', ${today})`);
        case 'InPast':
          return statement(`${columnId} < ${today}`);
        case 'InFuture':
          return statement(`${columnId} > ${today}`);
        case 'After':
          return inputs[0] === undefined
            ? statement('')
            : statement(`${columnId} > date(?)`, [String(inputs[0])]);
        case 'Before':
          return inputs[0] === undefined
            ? statement('')
            : statement(`${columnId} < date(?)`, [String(inputs[0])]);
        case 'On':
          return inputs[0] === undefined
            ? statement('')
            : statement(`${columnId} = date(?)`, [String(inputs[0])]);
        case 'NotOn':
          return inputs[0] === undefined
            ? statement('')
            : statement(`${columnId} != date(?)`, [String(inputs[0])]);
        case 'InRange':
          return inputs[0] === undefined || inputs[1] === undefined
            ? statement('')
            : statement(`${columnId} > date(?) AND ${columnId} < date(?)`, [
                String(inputs[0]),
                String(inputs[1]),
              ]);
        default:
          return statement('');
      }
    })
    .filter((part) => part.text.length > 0);

  return joinStatements(parts, ' AND ');
}

function buildBooleanFilter(filter: AdaptableFilter): SqlStatement {
  const columnId = quoteIdentifier(filter.columnFilter.ColumnId);
  const predicates = filter.columnFilter.Predicates ?? [];
  const parts = predicates
    .map((predicate) => {
      const inputs = sanitizeInputs(predicate.Inputs);

      switch (predicate.PredicateId) {
        case 'True':
          return statement(`${columnId} = 1`);
        case 'False':
          return statement(`${columnId} = 0`);
        case 'Blanks':
          return statement(`${columnId} IS NULL`);
        case 'NonBlanks':
          return statement(`${columnId} IS NOT NULL`);
        case 'BooleanToggle':
          return inputs[0] === 'checked'
            ? statement(`${columnId} = 1`)
            : inputs[0] === 'unchecked'
              ? statement(`${columnId} = 0`)
              : statement('');
        default:
          return statement('');
      }
    })
    .filter((part) => part.text.length > 0);

  return joinStatements(parts, ' AND ');
}

function buildCustomFilter(filter: AdaptableFilter): SqlStatement {
  const predicates = filter.columnFilter.Predicates ?? [];
  const parts = predicates
    .map((predicate) => {
      if (predicate.PredicateId === 'superstar') {
        return statement(`"gold" > 2 OR ("gold" + "silver" + "bronze") > 3`);
      }

      return statement('');
    })
    .filter((part) => part.text.length > 0);

  return joinStatements(parts, ' AND ');
}

function hasCustomPredicate(filter: AdaptableFilter) {
  return (filter.columnFilter.Predicates ?? []).some((predicate) =>
    ['superstar'].includes(predicate.PredicateId)
  );
}

function buildFilterStatement(filter: AdaptableFilter): SqlStatement {
  if (hasCustomPredicate(filter)) {
    return buildCustomFilter(filter);
  }

  switch (filter.dataType) {
    case 'text':
    case 'groupColumn':
      return buildTextFilter(filter);
    case 'number':
      return buildNumberFilter(filter);
    case 'date':
      return buildDateFilter(filter);
    case 'boolean':
      return buildBooleanFilter(filter);
    default:
      return statement('');
  }
}

function compileAstNode(node: unknown): SqlStatement {
  if (node === null) {
    return statement('NULL');
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return statement('?', [node]);
  }

  if (typeof node === 'boolean') {
    return statement('?', [node ? 1 : 0]);
  }

  if (Array.isArray(node)) {
    return statement(node.map(() => '?').join(', '), node as SqlParam[]);
  }

  if (!node || typeof node !== 'object') {
    return statement('');
  }

  const astNode = node as { args?: unknown[]; type?: string };
  const args = astNode.args ?? [];

  const binaryOp = (operator: string) => {
    const left = compileAstNode(args[0]);
    const right = compileAstNode(args[1]);
    return statement(`(${left.text} ${operator} ${right.text})`, [...left.params, ...right.params]);
  };

  switch (astNode.type) {
    case 'COL':
      return statement(quoteIdentifier(String(args[0])));
    case 'EQ':
      return binaryOp('=');
    case 'NEQ':
      return binaryOp('!=');
    case 'GT':
      return binaryOp('>');
    case 'LT':
      return binaryOp('<');
    case 'GTE':
      return binaryOp('>=');
    case 'LTE':
      return binaryOp('<=');
    case 'OR':
      return binaryOp('OR');
    case 'AND':
      return binaryOp('AND');
    case 'NOT': {
      const target = compileAstNode(args[0]);
      return statement(`NOT (${target.text})`, target.params);
    }
    case 'BETWEEN': {
      const target = compileAstNode(args[0]);
      const lower = compileAstNode(args[1]);
      const upper = compileAstNode(args[2]);
      return statement(`(${target.text} BETWEEN ${lower.text} AND ${upper.text})`, [
        ...target.params,
        ...lower.params,
        ...upper.params,
      ]);
    }
    case 'IN': {
      const target = compileAstNode(args[0]);
      const values = Array.isArray(args[1]) ? (args[1] as SqlParam[]) : [];

      if (!values.length) {
        return statement('1 = 0');
      }

      return statement(`${target.text} IN (${values.map(() => '?').join(', ')})`, [
        ...target.params,
        ...values,
      ]);
    }
    case 'IS_BLANK': {
      const target = compileAstNode(args[0]);
      return statement(`(${target.text} IS NULL OR ${target.text} = '')`, target.params);
    }
    case 'CONTAINS': {
      const target = compileAstNode(args[0]);
      const value = args[1];
      return statement(`${target.text} LIKE ?`, [...target.params, `%${String(value ?? '')}%`]);
    }
    case 'STARTS_WITH': {
      const target = compileAstNode(args[0]);
      const value = args[1];
      return statement(`${target.text} LIKE ?`, [...target.params, `${String(value ?? '')}%`]);
    }
    case 'ENDS_WITH': {
      const target = compileAstNode(args[0]);
      const value = args[1];
      return statement(`${target.text} LIKE ?`, [...target.params, `%${String(value ?? '')}`]);
    }
    case 'FROM_EUROPE':
      return statement(`"country" IN (${countriesInEurope.map(() => '?').join(', ')})`, [
        ...countriesInEurope,
      ]);
    default:
      return statement('');
  }
}

function buildWhereStatement(request: NormalizedQueryRequest): SqlStatement {
  const parts: SqlStatement[] = [];
  const groupKeyStatement = buildGroupKeyStatement(request);

  if (groupKeyStatement.text) {
    parts.push(groupKeyStatement);
  }

  request.adaptableFilters.forEach((filter) => {
    if (filter.columnFilter.ColumnId === 'ag-Grid-AutoColumn' && request.rowGroupCols.length > 0) {
      const resolvedCol = request.rowGroupCols[0]!;
      filter = {
        ...filter,
        columnFilter: {
          ...filter.columnFilter,
          ColumnId: resolvedCol.field ?? resolvedCol.id,
        },
      };
    }

    const filterStatement = buildFilterStatement(filter);
    if (filterStatement.text) {
      parts.push(filterStatement);
    }
  });

  if (request.gridFilterAST) {
    const astNodes = Array.isArray(request.gridFilterAST)
      ? request.gridFilterAST
      : [request.gridFilterAST];

    for (const astNode of astNodes) {
      const queryStatement = compileAstNode(astNode);
      if (queryStatement.text) {
        parts.push(queryStatement);
      }
    }
  }

  if (!parts.length) {
    return statement('');
  }

  const merged = joinStatements(parts, ' AND ');
  return statement(`WHERE ${merged.text}`, merged.params);
}

function buildAggregationExpression(fieldName: string, aggFunc: string, alias: string): string {
  const quotedField = quoteIdentifier(fieldName);
  const normalizedAgg = aggFunc.toLowerCase();

  switch (normalizedAgg) {
    case 'first':
      return `MIN(${quotedField}) AS "${alias}"`;
    case 'last':
      return `MAX(${quotedField}) AS "${alias}"`;
    case 'only':
      return `CASE WHEN COUNT(DISTINCT ${quotedField}) = 1 THEN MIN(${quotedField}) END AS "${alias}"`;
    default: {
      const aggregation = aggregationFns[normalizedAgg as keyof typeof aggregationFns];
      if (!aggregation) {
        throw new Error(`Unsupported aggregation "${aggFunc}"`);
      }
      return `${aggregation}(${quotedField}) AS "${alias}"`;
    }
  }
}

function buildGroupingSelect(request: NormalizedQueryRequest) {
  const groupField = currentGroupingField(request);

  if (!groupField) {
    return 'SELECT *';
  }

  const selectParts = [`${quoteIdentifier(groupField)} AS "${groupField}"`];

  request.valueCols.forEach((valueColumn) => {
    const fieldName = resolveField(valueColumn);
    const aggFunc = valueColumn.aggFunc ?? 'sum';
    selectParts.push(buildAggregationExpression(fieldName, aggFunc, fieldName));
  });

  return `SELECT ${selectParts.join(', ')}`;
}

function buildOrderByStatement(
  request: NormalizedQueryRequest,
  allowedFields: Set<string>
): SqlStatement {
  const sortStatements = request.sortModel
    .map((sort) => {
      if (!allowedFields.has(sort.colId)) {
        return statement('');
      }

      const direction = sort.sort.toUpperCase();

      if (sort.sortedValues?.length) {
        const cases = sort.sortedValues.map(() => 'WHEN ? THEN ?').join(' ');
        const params: SqlParam[] = [];

        sort.sortedValues.forEach((value, index) => {
          params.push(value, index);
        });

        return statement(
          `CASE "${sort.colId}" ${cases} ELSE 999999 END ${direction}, "${sort.colId}" ${direction}`,
          params
        );
      }

      return statement(`"${sort.colId}" ${direction}`);
    })
    .filter((part) => part.text.length > 0);

  if (!sortStatements.length) {
    return statement('');
  }

  return statement(
    `ORDER BY ${sortStatements.map((sortStatement) => sortStatement.text).join(', ')}`,
    sortStatements.flatMap((sortStatement) => sortStatement.params)
  );
}

function buildCountStatementForData(request: NormalizedQueryRequest): SqlStatement {
  const whereStatement = buildWhereStatement(request);

  if (isGrouping(request)) {
    const groupField = currentGroupingField(request);

    if (!groupField) {
      throw new Error('Grouping column is not defined.');
    }

    return statement(
      `SELECT COUNT(*) AS count FROM (
        SELECT ${quoteIdentifier(groupField)}
        FROM olympic_winners
        ${whereStatement.text}
        GROUP BY ${quoteIdentifier(groupField)}
      ) grouped_rows`,
      whereStatement.params
    );
  }

  return statement(
    `SELECT COUNT(*) AS count FROM olympic_winners ${whereStatement.text}`,
    whereStatement.params
  );
}

export function buildDataStatement(request: NormalizedQueryRequest): SqlStatement {
  const whereStatement = buildWhereStatement(request);
  const paginationStatement = buildPagination(request);

  if (isGrouping(request)) {
    const groupField = currentGroupingField(request);

    if (!groupField) {
      throw new Error('Grouping column is not defined.');
    }

    const orderBy = buildOrderByStatement(
      request,
      new Set([groupField, ...request.valueCols.map((valueColumn) => resolveField(valueColumn))])
    );

    return statement(
      `${buildGroupingSelect(request)}
       FROM olympic_winners
       ${whereStatement.text}
       GROUP BY ${quoteIdentifier(groupField)}
       ${orderBy.text}
       ${paginationStatement.text}`.trim(),
      [...whereStatement.params, ...orderBy.params, ...paginationStatement.params]
    );
  }

  const orderBy = buildOrderByStatement(request, new Set(selectableColumns));

  return statement(
    `SELECT ${quoteSelectableColumns()}
     FROM olympic_winners
     ${whereStatement.text}
     ${orderBy.text}
     ${paginationStatement.text}`.trim(),
    [...whereStatement.params, ...orderBy.params, ...paginationStatement.params]
  );
}

export function buildCountStatement(request: NormalizedQueryRequest) {
  return buildCountStatementForData(request);
}

function buildPivotBaseWhere(request: NormalizedQueryRequest) {
  return buildWhereStatement(request);
}

export function buildPivotKeyStatements(
  request: NormalizedQueryRequest
): { field: string; statement: SqlStatement }[] {
  if (!request.pivotCols.length) {
    return [];
  }

  const whereStatement = buildPivotBaseWhere(request);

  return request.pivotCols.map((pivotColumn) => {
    const fieldName = resolveField(pivotColumn);
    const nonNullWhere = whereStatement.text
      ? `${whereStatement.text} AND ${quoteIdentifier(fieldName)} IS NOT NULL`
      : `WHERE ${quoteIdentifier(fieldName)} IS NOT NULL`;

    return {
      field: fieldName,
      statement: statement(
        `SELECT DISTINCT ${quoteIdentifier(fieldName)} AS value
         FROM olympic_winners
         ${nonNullWhere}
         ORDER BY ${quoteIdentifier(fieldName)}
         LIMIT ?`
          .replace(/\s+/g, ' ')
          .trim(),
        [...whereStatement.params, maxPivotFields + 1]
      ),
    };
  });
}

export type PivotCombination = Record<string, string>;

function buildPivotFieldAlias(
  combination: PivotCombination,
  valueField: string,
  valueCount: number
) {
  const parts = Object.values(combination);
  if (valueCount > 1) {
    parts.push(valueField);
  }
  return parts.join('_');
}

function buildPivotAggregationSql(
  pivotConditions: { column: string; value: string }[],
  valueField: string,
  aggFunc: string,
  fieldAlias: string
): { sql: string; params: SqlParam[] } {
  const normalizedAgg = aggFunc.toLowerCase();

  const caseWhen = pivotConditions.map((c) => `${quoteIdentifier(c.column)} = ?`).join(' AND ');
  const conditionParams: SqlParam[] = pivotConditions.map((c) => c.value);
  const caseExpr = `CASE WHEN ${caseWhen} THEN ${quoteIdentifier(valueField)} END`;

  let valueSql: string;
  let params: SqlParam[];

  switch (normalizedAgg) {
    case 'count':
      valueSql = `SUM(CASE WHEN ${caseWhen} THEN 1 ELSE 0 END)`;
      params = [...conditionParams];
      break;
    case 'first':
      valueSql = `MIN(${caseExpr})`;
      params = [...conditionParams];
      break;
    case 'last':
      valueSql = `MAX(${caseExpr})`;
      params = [...conditionParams];
      break;
    case 'only':
      valueSql = `CASE WHEN COUNT(DISTINCT ${caseExpr}) = 1 THEN MIN(${caseExpr}) END`;
      params = [...conditionParams, ...conditionParams];
      break;
    default: {
      const aggregation = aggregationFns[normalizedAgg as keyof typeof aggregationFns];
      if (!aggregation) {
        throw new Error(`Unsupported aggregation "${aggFunc}"`);
      }
      valueSql = `${aggregation}(${caseExpr})`;
      params = [...conditionParams];
      break;
    }
  }

  return { sql: `${valueSql} AS "${fieldAlias}"`, params };
}

export function buildPivotStatements(
  request: NormalizedQueryRequest,
  combinations: PivotCombination[]
): {
  countStatement: SqlStatement;
  dataStatement: SqlStatement;
  pivotFields: PivotFieldDefinition[];
} {
  if (!request.pivotCols.length) {
    throw new Error('Pivot column is not defined.');
  }

  const pivotColFields = request.pivotCols.map((col) => resolveField(col));
  const whereStatement = buildPivotBaseWhere(request);
  const paginationStatement = buildPagination(request);
  const groupField = currentGroupingField(request);

  const valueColumns = request.valueCols.length
    ? request.valueCols
    : [{ aggFunc: 'sum', field: 'total', id: 'total' }];

  const selectParts: string[] = [];
  const selectParams: SqlParam[] = [];
  const pivotFields: PivotFieldDefinition[] = [];

  if (groupField) {
    selectParts.push(`${quoteIdentifier(groupField)} AS "${groupField}"`);
  }

  combinations.forEach((combination) => {
    const pivotConditions = pivotColFields.map((field) => ({
      column: field,
      value: combination[field] as string,
    }));

    valueColumns.forEach((valueColumn) => {
      const valueField = resolveField(valueColumn);
      const aggFunc = valueColumn.aggFunc ?? 'sum';
      const fieldAlias = buildPivotFieldAlias(combination, valueField, valueColumns.length);

      const agg = buildPivotAggregationSql(pivotConditions, valueField, aggFunc, fieldAlias);
      selectParts.push(agg.sql);
      selectParams.push(...agg.params);
      pivotFields.push({
        aggFunc,
        field: fieldAlias,
        headerName: fieldAlias.replace(/_/g, ' '),
        pivotValues: { ...combination },
        valueColumn: valueField,
      });
    });
  });

  const allowedSortFields = new Set([
    ...(groupField ? [groupField] : []),
    ...pivotFields.map((pivotField) => pivotField.field),
  ]);
  const orderBy = buildOrderByStatement(request, allowedSortFields);
  const defaultOrder = groupField && !orderBy.text ? 'ORDER BY MIN("id")' : '';

  const dataStatement = statement(
    `SELECT ${selectParts.join(', ')}
     FROM olympic_winners
     ${whereStatement.text}
     ${groupField ? `GROUP BY ${quoteIdentifier(groupField)}` : ''}
     ${orderBy.text || defaultOrder}
     ${paginationStatement.text}`.trim(),
    [...selectParams, ...whereStatement.params, ...orderBy.params, ...paginationStatement.params]
  );

  const countStatement = groupField
    ? statement(
        `SELECT COUNT(*) AS count FROM (
           SELECT ${quoteIdentifier(groupField)}
           FROM olympic_winners
           ${whereStatement.text}
           GROUP BY ${quoteIdentifier(groupField)}
         ) grouped_rows`,
        whereStatement.params
      )
    : statement(
        `SELECT CASE WHEN EXISTS (
           SELECT 1
           FROM olympic_winners
           ${whereStatement.text}
         ) THEN 1 ELSE 0 END AS count`,
        whereStatement.params
      );

  return { countStatement, dataStatement, pivotFields };
}

export function buildReportStatement(
  requestedColumns: string[],
  gridFilterAST?: unknown
): SqlStatement {
  const columns = requestedColumns.length
    ? requestedColumns.map((columnId) => `${quoteIdentifier(columnId)} AS "${columnId}"`)
    : quoteSelectableColumns();
  const request = {
    adaptableFilters: [],
    endRow: undefined,
    groupKeys: [],
    includeCount: false,
    includeSQL: false,
    pivotCols: [],
    pivotMode: false,
    gridFilterAST,
    rowGroupCols: [],
    sortModel: [],
    startRow: 0,
    valueCols: [],
  } satisfies NormalizedQueryRequest;
  const whereStatement = buildWhereStatement(request);

  return statement(
    `SELECT ${columns}
     FROM olympic_winners
     ${whereStatement.text}
     ORDER BY "id" ASC`.trim(),
    whereStatement.params
  );
}
