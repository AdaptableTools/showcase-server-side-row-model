import { IServerSideGetRowsRequest } from "@ag-grid-community/all-modules";
import alasql from "alasql";
import { AdaptableSqlService, ColumnFilterDef } from "./SqlService";

export class SqlCLient {
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
    console.log("permitted values", results);
    return new Promise((res) => {
      setTimeout(() => {
        res(results);
      }, 2000);
    });
  }

  getData(
    request: IServerSideGetRowsRequest,
    filters: ColumnFilterDef[],
    queryAST: any
  ) {
    const sql = this.sqlService.buildSql(request, filters, queryAST);

    const results = alasql(sql);
    const lastRow = this.getRowCount(request, results);

    return {
      rows: results,
      lastRow: lastRow,
    };
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
