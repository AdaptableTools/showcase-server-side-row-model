import { IServerSideGetRowsRequest } from "@ag-grid-community/all-modules";
import alasql from "alasql";
import { AdaptableSqlService, ColumnFilterDef } from "./SqlService";

export class SqlClient {
  sqlService: AdaptableSqlService;
  tableName: string;
  primaryKey: string;

  constructor(primaryKey: string, tableName: string) {
    this.sqlService = new AdaptableSqlService(tableName);
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  getPermittedValues(columnName: string): Promise<string[]> {
    const sql = `SELECT DISTINCT ${columnName} FROM olympic_winners`;
    const results = alasql(sql).map((result: any) => result[columnName]);
    return results;
  }

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
    const results = await alasql(resultsSql);
    const pivotFieldsSql = this.sqlService.createPivotFieldsSql(request);
    const pivotFields: any[] = alasql(pivotFieldsSql);

    const result: {
      rows: any[];
      lastRow: number;
      count?: number;
      sql?: string;
      pivotFields?: any[];
    } = {
      rows: results,
      // loading all the pivoted data in one go
      lastRow: results.length,
      pivotFields,
      sql: resultsSql,
    };

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return result;
  }

  getRowCount(request: IServerSideGetRowsRequest, results: any[]) {
    if (results === null || results === undefined || results.length === 0) {
      return 0;
    }
    const currentLastRow = request.startRow! + results.length;
    return currentLastRow <= request.endRow! ? currentLastRow : -1;
  }

  cutResultsToPageSize(request: IServerSideGetRowsRequest, results: any[]) {
    const pageSize = request.endRow! - request.startRow!;
    if (results && results.length > pageSize) {
      return results.splice(0, pageSize);
    } else {
      return results;
    }
  }
}
