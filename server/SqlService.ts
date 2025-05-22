import { ColumnVO, SortModelItem, IServerSideGetRowsRequest } from 'ag-grid-enterprise';
import { ColumnFilter, ColumnFilterDef } from '@adaptabletools/adaptable';
import { countriesInEurope } from './data/countriesInEurope';

/**
 * AdaptableSqlService is a service that transforms adaptable filters and AdaptableQL into SQL.
 *
 * This is only for demo purposes to demonstrate how Adaptable features can be implemented on the backend.
 * It should not be used in production.
 */
export class AdaptableSqlService {
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * It builds an SQL string from ag-grid request object, adaptable filters and AdaptableQL.
   *
   * @param request Ag-Grid request object.
   * @param filters Adaptable filters.
   * @param queryAST AdaptableQL query as AST.
   * @returns SQL string.
   */
  public buildSql(request: IServerSideGetRowsRequest, filters?: ColumnFilterDef[], queryAST?: any) {
    const selectSql = this.createSelectSql(request);
    const fromSql = ` FROM  ${this.tableName}`;
    const whereSql = this.createAdaptableWhereSql(filters, queryAST);
    const limitSql = this.createLimitSql(request);

    const orderBySql = this.createOrderBySql(request);
    const groupBySql = this.createGroupBySql(request);

    const SQL = selectSql + fromSql + whereSql + groupBySql + orderBySql + limitSql;

    return SQL;
  }

  /**
   * It builds an SQL string for a Report.
   *
   * @param columnsIds list of columns which should be included in the report
   * @param queryAST AdaptableQL query as AST (if the report is based on a query)
   * @returns SQL string.
   */
  buildReportDataSql(columnIds: string[], reportQueryAST: any) {
    const selectSql = columnIds.length ? 'select ' + columnIds.join(', ') : 'select *';
    const fromSql = ` FROM  ${this.tableName}`;
    const whereSql = this.createAdaptableWhereSql([], reportQueryAST);

    const SQL = selectSql + fromSql + whereSql;

    return SQL;
  }

  /**
   * It builds an SQL string from ag-grid request object for pivoted data.
   * This implementation takes into account the first pivot and value column.
   *
   * @param request Ag-Grid request object.
   * @param filters Adaptable filters.
   * @param queryAST AdaptableQL query as AST.
   * @returns SQL string.
   */
  public createPivotSql(
    request: IServerSideGetRowsRequest,
    filters?: ColumnFilterDef[],
    queryAST?: any
  ) {
    const [firstRowGroupCol] = request.rowGroupCols;
    const [firstValueCol] = request.valueCols;
    const [firstPivotCol] = request.pivotCols;
    const orderBySql = this.createOrderBySql(request);

    return `
      SELECT 
        ${firstRowGroupCol.id}, 
        ${firstPivotCol.id}, ${firstValueCol.id}
      FROM olympic_winners 
      PIVOT (SUM([${firstValueCol.id}]) FOR ${firstPivotCol.id})
      ${orderBySql};
    `;
  }

  public createPivotFieldsSql(request: IServerSideGetRowsRequest) {
    const [firstPivotCol] = request.pivotCols;

    return `
      SELECT 
        DISTINCT ${firstPivotCol.id}
      FROM olympic_winners 
      ORDER BY ${firstPivotCol.id};`;
  }

  /**
   * It builds an SQL string that queries the database for the total number of rows.
   *
   * @param request Ag-Grid request object.
   * @param filters Adaptable filters.
   * @param queryAST AdaptableQL query as AST.
   * @returns Sql string.
   */
  public buildCountSql(
    request: IServerSideGetRowsRequest,
    filters?: ColumnFilterDef[],
    queryAST?: any
  ) {
    const selectSql = 'SELECT COUNT(*)';
    const fromSql = ` FROM  ${this.tableName}`;
    const whereSql = this.createAdaptableWhereSql(filters, queryAST);
    const groupBySql = this.createGroupBySql(request);

    const SQL = selectSql + fromSql + whereSql + groupBySql;

    return SQL;
  }

  /**
   * It constructs the SELECT part of the SQL query.
   *
   * @param request Ag-Grid request object.
   * @returns Sql string.
   */
  private createSelectSql(request: IServerSideGetRowsRequest) {
    const rowGroupCols = request.rowGroupCols;
    const valueCols = request.valueCols;
    const groupKeys = request.groupKeys;

    if (this.isDoingGrouping(rowGroupCols, groupKeys)) {
      const colsToSelect: string[] = [];

      const rowGroupCol = rowGroupCols[groupKeys.length];
      if (typeof rowGroupCol.field === 'string') {
        colsToSelect.push(rowGroupCol.field);
      }
      valueCols.forEach(function (valueCol) {
        colsToSelect.push(valueCol.aggFunc + '(' + valueCol.field + ') as ' + valueCol.field);
      });

      return 'select ' + colsToSelect.join(', ');
    }

    return `select *`;
  }

  /**
   * It constructs the filter (WHERE) part of the SQL query.
   * It takes into account the Adaptable filters and AdaptableQL query.
   *
   * @param filters Adaptable filters.
   * @param queryAST AdaptableQL query as AST.
   * @returns Sql string.
   */
  createAdaptableWhereSql(filters?: ColumnFilterDef[], queryAST?: any): string {
    if (!filters) {
      return '';
    }

    const whereParts = [...this.buildFilterWhereParts(filters)];

    if (queryAST) {
      const astPart = this.buildQueryASTWherePart(queryAST);
      astPart.length && whereParts.push(astPart);
    }

    if (whereParts.length > 0) {
      return ' where ' + whereParts.join(' and ');
    } else {
      return '';
    }
  }

  /**
   * Builds the WHERE part base on the Adaptable filters.
   *
   * @param filters Adaptable filters.
   * @returns Sql string.
   */
  private buildFilterWhereParts(filters?: ColumnFilterDef[]): string[] {
    if (!filters) {
      return [];
    }
    const whereParts = [];
    for (const filter of filters) {
      if (this.isCustomAdaptableFilter(filter)) {
        const wherePart = this.createAdaptableCustomFilterSql(filter.columnFilter);
        wherePart.length && whereParts.push(wherePart);
      } else if (filter.dataType === 'text') {
        const wherePart = this.createAdaptableTextFilterSql(filter.columnFilter);
        wherePart && whereParts.push(wherePart);
      } else if (filter.dataType === 'number') {
        const wherePart = this.createAdaptableNumberFilterSql(filter.columnFilter);
        wherePart && whereParts.push(wherePart);
      } else if (filter.dataType === 'date') {
        const wherePart = this.createAdaptableDateFilterSql(filter.columnFilter);
        wherePart && whereParts.push(wherePart);
      } else if (filter.dataType === 'boolean') {
        const wherePart = this.createAdaptableBooleanFilterSql(filter.columnFilter);
        wherePart && whereParts.push(wherePart);
      }
    }
    return whereParts;
  }

  /**
   * It creates the SQL part for filtering strings.
   *
   * @param columnFilter Adaptable column filter.
   * @returns Sql string.
   */
  createAdaptableTextFilterSql(columnFilter: ColumnFilter) {
    const columnId = columnFilter.ColumnId;

    const predicates = columnFilter.Predicates ?? [];
    const predicateClauses = predicates
      .map((predicate) => {
        const inputs = predicate.Inputs ?? [];
        switch (predicate.PredicateId) {
          case 'In':
            return inputs.map((input) => `${columnId} = "${input}"`).join(' OR ');
          case 'NotIn':
            return inputs.map((input) => `${columnId} != "${input}"`).join(' AND ');
          case 'Blanks':
            return `${columnId} IS NULL`;
          case 'NonBlanks':
            return `${columnId} IS NOT NULL`;
          case 'Is':
            return inputs[0] ? `${columnId} = "${inputs[0]}"` : '';
          case 'IsNot':
            return inputs[0] ? `${columnId} != "${inputs[0]}"` : '';
          case 'Contains':
            return inputs[0] ? `${columnId} LIKE "%${inputs[0]}%"` : '';
          case 'NotContains':
            return inputs[0] ? `${columnId} NOT LIKE "%${inputs[0]}%"` : '';
          case 'StartsWith':
            return inputs[0] ? `${columnId} LIKE "${inputs[0]}%"` : '';
          case 'EndsWith':
            return inputs[0] ? `${columnId} LIKE "%${inputs[0]}"` : '';
          case 'Regex':
            return inputs[0] ? `${columnId} REGEXP '${inputs[0]}'` : '';
          default:
            return '';
        }
      })
      .filter(Boolean);

    return predicateClauses.length ? predicateClauses.join(' AND ') : '';
  }

  /**
   * It creates the SQL part for filtering numbers.
   *
   * @param columnFilter Adaptable column filter.
   * @returns Sql string.
   */
  createAdaptableNumberFilterSql(columnFilter: ColumnFilter) {
    const columnId = columnFilter.ColumnId;
    const predicates = columnFilter.Predicates ?? [];
    const predicateClauses = predicates
      .map((predicate) => {
        const inputs = predicate.Inputs ?? [];
        switch (predicate.PredicateId) {
          case 'Values':
            return inputs.map((input) => `${columnId} = ${input}`).join(' OR ');
          case 'ExcludeValues':
            return inputs.map((input) => `${columnId} != ${input}`).join(' AND ');
          case 'Blanks':
            return `${columnId} IS NULL`;
          case 'NonBlanks':
            return `${columnId} IS NOT NULL`;
          case 'GreaterThan':
            return inputs[0] !== undefined && inputs[0] !== '' ? `${columnId} > ${inputs[0]}` : '';
          case 'LessThan':
            return inputs[0] !== undefined && inputs[0] !== '' ? `${columnId} < ${inputs[0]}` : '';
          case 'Positive':
            return `${columnId} > 0`;
          case 'Negative':
            return `${columnId} < 0`;
          case 'Zero':
            return `${columnId} = 0`;
          case 'Equals':
            return inputs[0] !== undefined && inputs[0] !== '' ? `${columnId} = ${inputs[0]}` : '';
          case 'NotEquals':
            return inputs[0] !== undefined && inputs[0] !== '' ? `${columnId} != ${inputs[0]}` : '';
          case 'Between':
            return inputs[0] !== undefined &&
              inputs[0] !== '' &&
              inputs[1] !== undefined &&
              inputs[1] !== ''
              ? `${columnId} >= ${inputs[0]} AND ${columnId} <= ${inputs[1]}`
              : '';
          case 'NotBetween':
            return inputs[0] !== undefined &&
              inputs[0] !== '' &&
              inputs[1] !== undefined &&
              inputs[1] !== ''
              ? `${columnId} < ${inputs[0]} OR ${columnId} > ${inputs[1]}`
              : '';
          default:
            return '';
        }
      })
      .filter(Boolean);

    return predicateClauses.length ? predicateClauses.join(' AND ') : '';
  }

  /**
   * It creates the SQL part for filtering dates.
   *
   * @param columnFilter Adaptable column filter.
   * @returns Sql string.
   */
  private createAdaptableDateFilterSql(columnFilter: ColumnFilter) {
    const columnId = columnFilter.ColumnId;
    const columnWithoutTime = `CAST(${columnId} AS date)`;
    const todaySQL = 'CAST(GETDATE() AS date)';
    const tomorrowSQL = `DATEADD(day, 1, ${todaySQL})`;
    const yesterdaySQL = `DATEADD(day, -1, ${todaySQL})`;
    const thisMondaySQL = `CAST(DATEADD(day, -WEEKDAY(${todaySQL}) + 1, ${todaySQL}) AS date)`;
    const thisSundaySql = `CAST(DATEADD(day, 7, ${thisMondaySQL}) AS date)`;

    const predicates = columnFilter.Predicates ?? [];
    const predicateClauses = predicates
      .map((predicate) => {
        const inputs = predicate.Inputs ?? [];
        switch (predicate.PredicateId) {
          case 'Values':
            return inputs
              .map((input) => `${columnWithoutTime} = CAST("${input}" AS DATE)`)
              .join(' OR ');
          case 'ExcludeValues':
            return inputs
              .map((input) => `${columnWithoutTime} != CAST("${input}" AS DATE)`)
              .join(' AND ');
          case 'Blanks':
            return `${columnId} IS NULL OR ${columnId} = ''`;
          case 'NonBlanks':
            return `${columnId} IS NOT NULL AND ${columnId} != ''`;
          case 'Today':
            return `CAST(${columnId} AS DATE) = ${todaySQL}`;
          case 'Yesterday':
            return `CAST(${columnId} AS DATE) = ${yesterdaySQL}`;
          case 'Tomorrow':
            return `CAST(${columnId} AS DATE) = ${tomorrowSQL}`;
          case 'ThisWeek':
            return `${columnWithoutTime} >= ${thisMondaySQL} AND ${columnWithoutTime} < ${thisSundaySql}`;
          case 'ThisMonth':
            return `YEAR(${columnWithoutTime}) = YEAR(${todaySQL}) AND MONTH(${columnWithoutTime}) = MONTH(${todaySQL})`;
          case 'ThisQuarter':
            return `CEILING(MONTH(${columnWithoutTime}) * 4 / 12) = CEILING(MONTH(${todaySQL}) * 4 / 12) AND YEAR(${columnWithoutTime}) = YEAR(${todaySQL})`;
          case 'ThisYear':
            return `YEAR(${columnWithoutTime}) = YEAR(${todaySQL})`;
          case 'InPast':
            return `${columnWithoutTime} < ${todaySQL}`;
          case 'InFuture':
            return `${columnWithoutTime} > ${todaySQL}`;
          case 'After':
            return inputs[0] ? `${columnWithoutTime} > CAST("${inputs[0]}" AS DATE)` : '';
          case 'Before':
            return inputs[0] ? `${columnWithoutTime} < CAST("${inputs[0]}" AS DATE)` : '';
          case 'On':
            return inputs[0] ? `${columnWithoutTime} = CAST("${inputs[0]}" AS DATE)` : '';
          case 'NotOn':
            return inputs[0] ? `${columnWithoutTime} != CAST("${inputs[0]}" AS DATE)` : '';
          case 'InRange':
            return inputs[0] && inputs[1]
              ? `${columnWithoutTime} > CAST("${inputs[0]}" AS DATE) AND ${columnWithoutTime} < CAST("${inputs[1]}" AS DATE)`
              : '';
          case 'LastWorkDay':
          case 'NextWorkDay':
          default:
            return '';
        }
      })
      .filter(Boolean);

    return predicateClauses.length ? predicateClauses.join(' AND ') : '';
  }

  /**
   * It creates the SQL part for filtering booleans.
   *
   * @param columnFilter Adaptable column filter.
   * @returns Sql string.
   */
  createAdaptableBooleanFilterSql(columnFilter: ColumnFilter) {
    const columnId = columnFilter.ColumnId;

    const predicates = columnFilter.Predicates ?? [];
    const predicateClauses = predicates
      .map((predicate) => {
        const inputs = predicate.Inputs ?? [];
        switch (predicate.PredicateId) {
          case 'True':
            return `${columnId} = TRUE`;
          case 'False':
            return `${columnId} = FALSE`;
          case 'Blanks':
            return `${columnId} IS NULL`;
          case 'NonBlanks':
            return `${columnId} IS NOT NULL`;
          case 'BooleanToggle':
            return inputs[0] === 'unchecked'
              ? `${columnId} = FALSE`
              : inputs[0] === 'checked'
              ? `${columnId} = TRUE`
              : '';
          default:
            return '';
        }
      })
      .filter(Boolean);

    return predicateClauses.length ? predicateClauses.join(' AND ') : '';
  }

  /**
   * I checks if the column filter uses a custom predicate.
   * A custom predicate is one that Adaptable does not ship with out of the box.
   * https://docs.adaptabletools.com/guide/handbook-filtering-custom-filters
   *
   * @param columnFilter Adaptable column filter.
   */
  private isCustomAdaptableFilter(filterDef: ColumnFilterDef) {
    const customFilterIds = ['superstar'];
    const predicates = filterDef.columnFilter.Predicates ?? [];
    return predicates.some((predicate) => customFilterIds.includes(predicate.PredicateId));
  }

  /**
   * Handles the custom filter predicate 'superstar'.
   * https://docs.adaptabletools.com/guide/handbook-filtering-custom-filters
   *
   * @param columnFilter Adaptable column filter.
   * @returns
   */
  private createAdaptableCustomFilterSql(columnFilter: ColumnFilter) {
    const predicates = columnFilter.Predicates ?? [];
    const predicateClauses = predicates
      .map((predicate) => {
        switch (predicate.PredicateId) {
          case 'superstar':
            return `gold > 2 OR (gold + silver + bronze) > 3`;
          default:
            return '';
        }
      })
      .filter(Boolean);

    return predicateClauses.length ? predicateClauses.join(' AND ') : '';
  }

  /**
   * Builds the SQL part for grouping.
   *
   * @param request Ag-Grid request.
   * @returns SQL string.
   */
  private createGroupBySql(request: IServerSideGetRowsRequest) {
    const rowGroupCols = request.rowGroupCols;
    const groupKeys = request.groupKeys;

    if (this.isDoingGrouping(rowGroupCols, groupKeys)) {
      const colsToGroupBy: string[] = [];

      const rowGroupCol = rowGroupCols[groupKeys.length];
      rowGroupCol.field && colsToGroupBy.push(rowGroupCol.field);

      return ' group by ' + colsToGroupBy.join(', ');
    } else {
      // select all columns
      return '';
    }
  }

  /**
   * Builds the SQL part for ordering.
   *
   * @param request Ag-Grid request.
   * @returns SQL string.
   */
  private createOrderBySql(request: IServerSideGetRowsRequest) {
    const rowGroupCols = request.rowGroupCols ?? [];
    const groupKeys = request.groupKeys ?? [];
    const sortModel: (SortModelItem & { sortedValues?: string[] })[] = request.sortModel;

    const grouping = this.isDoingGrouping(rowGroupCols, groupKeys);

    const sortParts: string[] = [];
    if (sortModel) {
      const groupColIds = rowGroupCols
        .map((groupCol) => groupCol.id)
        .slice(0, groupKeys.length + 1);

      sortModel.forEach(function (item) {
        if (grouping && groupColIds.indexOf(item.colId) < 0) {
          // ignore
        } else if (item.sortedValues) {
          // sort by values
          // sort is defined in width adaptable custom sort
          sortParts.push(
            `CASE ${item.colId} ${item.sortedValues
              .map((value, index) => `WHEN "${value}" THEN '${index}'`)
              .join(' ')} ELSE ${item.colId} END ${item.sort}`
          );
        } else {
          sortParts.push(item.colId + ' ' + item.sort);
        }
      });
    }

    if (sortParts.length > 0) {
      return ' order by ' + sortParts.join(', ');
    } else {
      return '';
    }
  }

  private isDoingGrouping(rowGroupCols: ColumnVO[], groupKeys: string[]) {
    // we are not doing grouping if at the lowest level. we are at the lowest level
    // if we are grouping by more columns than we have keys for (that means the user
    // has not expanded a lowest level group, OR we are not grouping at all).
    return rowGroupCols?.length > groupKeys?.length;
  }

  /**
   * Creates the SQL part for pagination.
   *
   * @param request Ag-Grid request.
   * @returns SQL string.
   */
  private createLimitSql(request: IServerSideGetRowsRequest) {
    const startRow = request.startRow ?? 0;
    const endRow = request.endRow;

    if (endRow === undefined) {
      return '';
    }

    const pageSize = endRow - startRow;
    return ' limit ' + (pageSize + 1) + ' offset ' + startRow;
  }

  /**
   * Creates the SQL filtering part for a subset of adaptable query predicates.
   *
   * https://docs.adaptabletools.com/guide/adaptable-ql-server-evaluation#using-the-ast
   * @param queryAST AdaptableQL query AST.
   * @returns Sql string.
   */
  private buildQueryASTWherePart(queryAST?: any): string {
    if (typeof queryAST === undefined) {
      return '';
    }

    if (typeof queryAST === 'string') {
      return `"${queryAST}"`;
    }
    if (typeof queryAST === 'number') {
      return `${queryAST}`;
    }
    if (typeof queryAST === 'boolean') {
      return queryAST === true ? 'TRUE' : 'FALSE';
    }
    if (Array.isArray(queryAST)) {
      return queryAST.map((item) => this.buildQueryASTWherePart(item)).join(' ');
    }

    const args = queryAST?.args.map((n: any) => this.buildQueryASTWherePart(n));

    switch (queryAST.type) {
      case 'COL':
        const [colName] = queryAST.args;
        return colName;
      case 'EQ':
        return `${args[0]} = ${args[1]}`;
      case 'NEQ':
        return `${args[0]} != ${args[1]}`;
      case 'GT':
        return `${args[0]} > ${args[1]}`;
      case 'LT':
        return `${args[0]} < ${args[1]}`;
      case 'GTE':
        return `${args[0]} >= ${args[1]}`;
      case 'OR':
        return `${args[0]} OR ${args[1]}`;
      case 'AND':
        return `${args[0]} AND ${args[1]}`;
      case 'NOT':
        return `IS NOT ${args[0]}`;
      case 'BETWEEN':
        return `${args[0]} >= ${args[1]} AND ${args[0]} <= ${args[2]}`;
      case 'IN':
        return args[1]
          .split(' ')
          .map((input: string) => {
            return `${args[0]} = ${input}`;
          })
          .join(' OR ');
      case 'IS_BLANK':
        return `${args[0]} IS NULL`;
      case 'CONTAINS':
        // must remove string quotations
        const testStr = args[1]?.replace(/["']/g, '');
        return `${args[0]} LIKE '%${testStr}%'`;
      case 'STARTS_WITH':
        return `${args[0]} LIKE '${args[1]}%'`;
      case 'ENDS_WITH':
        return `${args[0]} LIKE '%${args[1]}'`;
      case 'FROM_EUROPE':
        // this is a custom expression function
        return countriesInEurope
          .map(({ country }: { country: string }) => {
            return `country = "${country}"`;
          })
          .join(' OR ');
    }

    return '';
  }
}
