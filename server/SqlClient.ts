import { ColumnFilterDef } from "@adaptabletools/adaptable";
import { IServerSideGetRowsRequest } from "@ag-grid-community/all-modules";
import alasql from "alasql";
import { AdaptableSqlService } from "./SqlService";

/**
 * This is a service that abstracts away the details of how to get data from a SQL database.
 * It creates an SQL string using the SqlService.
 * It executes the SQL string using the alasql library https://github.com/AlaSQL/alasql.
 *
 * This is for demo purposes only. Do not use this in production.
 */
export class SqlClient {
  sqlService: AdaptableSqlService;
  tableName: string;
  primaryKey: string;

  constructor(primaryKey: string, tableName: string) {
    this.sqlService = new AdaptableSqlService(tableName);
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  /**
   * Retrieves the possible distinct values for a column.
   * It is used in the Values filter.
   * https://docs.adaptabletools.com/guide/dev-guide-tutorial-column-values
   *
   * @param columnName column field name
   * @returns SQL string;
   */
  getPermittedValues(columnName: string): Promise<string[]> {
    const sql = `SELECT DISTINCT ${columnName} FROM olympic_winners`;
    const results = alasql(sql).map((result: any) => result[columnName]);
    return results;
  }

  /**
   * Retrieves data from the database using the Ag-Grid request, Adaptable filters and AdaptableQL.
   *
   * @param request AgGrid request
   * @param filters Adaptable filters
   * @param queryAST AdaptableQL AST
   * @param includeCount whether to include the total number of rows
   * @param includeSQL whether to include the SQL string in the response.
   * @returns dataset
   */
  getData(
    request: IServerSideGetRowsRequest,
    filters: ColumnFilterDef[],
    queryAST: any,
    includeCount: boolean = false,
    includeSQL: boolean = false
  ) {
    if (request.pivotMode) {
      return this.requestPivotData(
        request,
        filters,
        queryAST,
        includeCount,
        includeSQL
      );
    } else {
      return this.requestData(
        request,
        filters,
        queryAST,
        includeCount,
        includeSQL
      );
    }
  }

  /**
   * Handles the request for data when is in table mode.
   *
   * @param request AgGrid request
   * @param filters Adaptable filters
   * @param queryAST AdaptableQL AST
   * @param includeCount whether to include the total number of rows
   * @param includeSQL whether to include the SQL string in the response.
   * @returns data
   */
  requestData(
    request: IServerSideGetRowsRequest,
    filters: ColumnFilterDef[],
    queryAST: any,
    includeCount: boolean = false,
    includeSQL: boolean = false
  ) {
    const sql = this.sqlService.buildSql(request, filters, queryAST);
    const results = alasql(sql);
    const lastRow = this.getRowCount(request, results);

    const result: {
      rows: any[];
      lastRow: number;
      count?: number;
      sql?: string;
    } = {
      rows: results,
      lastRow: lastRow,
    };

    if (includeCount) {
      const countSql = this.sqlService.buildCountSql(
        request,
        filters,
        queryAST
      );
      const count = alasql(countSql);
      result["count"] = count[0]["COUNT(*)"] as number;
    }

    if (includeSQL) {
      result["sql"] = sql;
    }

    return result;
  }

  /**
   * Handles the request for data when is in pivot mode.
   * This is more limited example than the table mode.
   *
   * @param request AgGrid request
   * @param filters Adaptable filters
   * @param queryAST AdaptableQL AST
   * @param includeCount whether to include the total number of rows
   * @param includeSQL whether to include the SQL string in the response.
   * @returns data
   */
  async requestPivotData(
    request: IServerSideGetRowsRequest,
    filters: ColumnFilterDef[],
    queryAST: any,
    includeCount: boolean = false,
    includeSQL: boolean = false
  ) {
    // alaqsl has a bug when pivoting, on the third request it fails
    // https://github.com/AlaSQL/alasql/issues/490#issuecomment-319905922
    try {
      // @ts-ignore
      alasql.databases.alasql.resetSqlCache();
      // @ts-ignore
      alasql.databases.dbo.resetSqlCache();
    } catch (e) {
      console.log("Failed to reset cache", e);
    }

    const resultsSql = this.sqlService.createPivotSql(
      request,
      filters,
      queryAST
    );
    // pivot results must have unique ids
    const results = await alasql(resultsSql).map(
      (item: any, index: number) => ({
        ...item,
        id: `${index}`,
      })
    );
    const paginatedResults = results.slice(request.startRow!, request.endRow!);
    const pivotFieldsSql = this.sqlService.createPivotFieldsSql(request);
    const pivotFields: any[] = alasql(pivotFieldsSql);

    const result: {
      rows: any[];
      lastRow: number;
      count?: number;
      sql?: string;
      pivotFields?: any[];
    } = {
      rows: paginatedResults,
      lastRow: results.length,
      pivotFields,
      sql: resultsSql,
    };

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return result;
  }

  /**
   * Calculates the row count
   *
   * @param request AgGrid request
   * @param results dataset returned
   * @returns row count
   */
  getRowCount(request: IServerSideGetRowsRequest, results: any[]) {
    if (results === null || results === undefined || results.length === 0) {
      return 0;
    }
    const currentLastRow = request.startRow! + results.length;
    return currentLastRow <= request.endRow! ? currentLastRow : -1;
  }

  /**
   * Makes sure the page is of the requested size.
   *
   * @param request AgGrid request
   * @param results dataset returned
   * @returns truncated dataset
   */
  cutResultsToPageSize(request: IServerSideGetRowsRequest, results: any[]) {
    const pageSize = request.endRow! - request.startRow!;
    if (results && results.length > pageSize) {
      return results.splice(0, pageSize);
    } else {
      return results;
    }
  }
}
