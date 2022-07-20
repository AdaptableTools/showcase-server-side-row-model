import { ColumnVO } from "@ag-grid-community/all-modules";
import { IServerSideGetRowsRequest } from "@ag-grid-community/core";
import { AdaptablePredicateDef, ColumnFilter } from "@adaptabletools/adaptable";

// TODO: import from adaptable when released
export interface ColumnFilterDef {
  dataType: "String" | "Number" | "Date" | "Boolean";
  predicate: AdaptablePredicateDef;
  columnFilter: ColumnFilter;
}

/**
 * Used to transform ag-grid request & adaptable filters into SQL queries.
 */
export class AdaptableSqlService {
  private tableName: string;
  constructor(tableName: string) {
    this.tableName = tableName;
  }

  public buildSql(
    request: IServerSideGetRowsRequest,
    filters?: ColumnFilterDef[]
  ) {
    const selectSql = this.createSelectSql(request);
    const fromSql = ` FROM  ${this.tableName}`;
    const whereSql = this.createAdaptableWhereSql(filters);
    const limitSql = this.createLimitSql(request);

    const orderBySql = this.createOrderBySql(request);
    const groupBySql = this.createGroupBySql(request);

    const SQL =
      selectSql + fromSql + whereSql + groupBySql + orderBySql + limitSql;
    return SQL;
  }

  private createSelectSql(request: IServerSideGetRowsRequest) {
    const rowGroupCols = request.rowGroupCols;
    const valueCols = request.valueCols;
    const groupKeys = request.groupKeys;

    if (this.isDoingGrouping(rowGroupCols, groupKeys)) {
      const colsToSelect: string[] = [];

      const rowGroupCol = rowGroupCols[groupKeys.length];
      if (typeof rowGroupCol.field === "string") {
        colsToSelect.push(rowGroupCol.field);
      }
      valueCols.forEach(function (valueCol) {
        colsToSelect.push(
          valueCol.aggFunc + "(" + valueCol.field + ") as " + valueCol.field
        );
      });

      return "select " + colsToSelect.join(", ");
    }

    return `select *`;
  }

  createAdaptableWhereSql(filters?: ColumnFilterDef[]) {
    if (!filters) {
      return "";
    }

    const whereParts = [];
    for (const filter of filters) {
      if (filter.dataType === "String") {
        const wherePart = this.createAdaptableTextFilterSql(
          filter.columnFilter
        );
        wherePart && whereParts.push(wherePart);
      } else if (filter.dataType === "Number") {
        const wherePart = this.createAdaptableNumberFilterSql(
          filter.columnFilter
        );
        wherePart && whereParts.push(wherePart);
      } else if (filter.dataType === "Date") {
        const wherePart = this.createAdaptableDateFilterSql(
          filter.columnFilter
        );
        wherePart && whereParts.push(wherePart);
      } else if (filter.dataType === "Boolean") {
        const wherePart = this.createAdaptableBooleanFilterSql(
          filter.columnFilter
        );
        wherePart && whereParts.push(wherePart);
      }
    }

    if (whereParts.length > 0) {
      return " where " + whereParts.join(" and ");
    } else {
      return "";
    }
  }

  createAdaptableTextFilterSql(columnFilter: ColumnFilter) {
    const columnId = columnFilter.ColumnId;
    const inputs = columnFilter.Predicate.Inputs ?? [];
    switch (columnFilter.Predicate.PredicateId) {
      case "Values":
        const valuesWhere = inputs
          .map((input) => {
            return `${columnId} = "${input}"`;
          })
          .join(" OR ");
        return valuesWhere ?? "";
      case "ExcludeValues":
        const excludeValuesWhere = inputs
          .map((input) => {
            return `${columnId} != "${input}"`;
          })
          .join(" AND ");
        return excludeValuesWhere.length ? excludeValuesWhere : "";
      case "Blanks":
        return `${columnId} IS NULL`;
      case "NonBlanks":
        return `${columnId} IS NOT NULL`;
      case "Is":
        return inputs[0] ? `${columnId} = "${inputs[0]}"` : "";
      case "IsNot":
        return inputs[0] ? `${columnId} != "${inputs[0]}"` : "";
      case "Contains":
        return inputs[0] ? `${columnId} LIKE "%${inputs[0]}%"` : "";
      case "NotContains":
        return inputs[0] ? `${columnId} NOT LIKE "%${inputs[0]}%"` : "";
      case "StartsWith":
        return inputs[0] ? `${columnId} LIKE "${inputs[0]}%"` : "";
      case "EndsWith":
        return inputs[0] ? `${columnId} LIKE "%${inputs[0]}"` : "";
      case "Regex":
        return inputs[0] ? `${columnId} REGEXP '${inputs[0]}'` : "";
    }

    return "";
  }

  createAdaptableNumberFilterSql(columnFilter: ColumnFilter) {
    const columnId = columnFilter.ColumnId;
    const inputs = columnFilter.Predicate.Inputs ?? [];

    switch (columnFilter.Predicate.PredicateId) {
      case "Values":
        const valuesWhere = inputs
          .map((input) => {
            return `${columnId} = ${input}`;
          })
          .join(" OR ");
        return valuesWhere ?? "";
      case "ExcludeValues":
        const excludeValuesWhere = inputs
          .map((input) => {
            return `${columnId} != ${input}`;
          })
          .join(" AND ");
        return excludeValuesWhere.length ? excludeValuesWhere : "";
      case "Blanks":
        return `${columnId} IS NULL`;
      case "NonBlanks":
        return `${columnId} IS NOT NULL`;
      case "GreaterThan":
        return inputs[0] !== undefined && inputs[0] !== ""
          ? `${columnId} > ${inputs[0]}`
          : "";
      case "LessThan":
        return inputs[0] !== undefined && inputs[0] !== ""
          ? `${columnId} < ${inputs[0]}`
          : "";
      case "Positive":
        return `${columnId} >= 0`;
      case "Negative":
        return `${columnId} < 0`;
      case "Zero":
        return `${columnId} = 0`;
      case "Equals":
        const eqInput = inputs[0];
        return eqInput !== undefined && eqInput !== ""
          ? `${columnId} = ${inputs[0]}`
          : "";
      case "NotEquals":
        const notEqInput = inputs[0];
        return notEqInput !== undefined && notEqInput !== ""
          ? `${columnId} != ${inputs[0]}`
          : "";
      case "Between":
        const input1 = inputs[0];
        const input2 = inputs[1];
        if (
          input1 === undefined ||
          input1 === "" ||
          input2 === undefined ||
          input2 === ""
        ) {
          return "";
        }
        return `${columnId} >= ${input1} AND ${columnId} <= ${input2}`;
      case "NotBetween":
        const notInput1 = inputs[0];
        const notInput2 = inputs[1];

        if (
          notInput1 === undefined ||
          notInput1 === "" ||
          notInput2 === undefined ||
          notInput2 === ""
        ) {
          return "";
        }

        return `${columnId} < ${notInput1} OR ${columnId} > ${notInput2}`;
    }
  }

  private createAdaptableDateFilterSql(columnFilter: ColumnFilter) {
    const columnId = columnFilter.ColumnId;
    const inputs = columnFilter.Predicate.Inputs ?? [];

    // 2022-06-02T21:00:00.000Z => 2022-06-02
    const columnWithoutTime = `CAST(${columnId} AS date)`;
    const isSameDaySql = (date1: string, date2: string) => {
      return `
        DAY(${date1}) = DAY(${date2}) AND
        MONTH(${date1}) = MONTH(${date2}) AND
        YEAR(${date1}) = YEAR(${date2})
      `;
    };

    const getQuarterSql = (date: string) => {
      return `
        CEILING((MONTH(${date}) * 4) / 12)
      `;
    };
    const todaySQL = "CAST(GETDATE() AS date)";
    const tomorrowSQL = `DATEADD(day, 1, ${todaySQL})`;
    const yesterdaySQL = `DATEADD(day, -1, ${todaySQL})`;
    const thisMondaySQL = `CAST(DATEADD(day, -WEEKDAY(${todaySQL}) + 1, ${todaySQL}) AS date)`;
    const thisSundaySql = `CAST(DATEADD(day, 7, ${thisMondaySQL}) AS date)`;

    switch (columnFilter.Predicate.PredicateId) {
      case "Values":
        const valuesWhere = inputs
          .map((input) => {
            return `${columnWithoutTime} = CAST("${input}" as DATE)`;
          })
          .join(" OR ");
        return valuesWhere ?? "";
      case "ExcludeValues":
        const excludeValuesWhere = inputs
          .map((input) => {
            return `${columnWithoutTime} != CAST("${input}" as DATE)`;
          })
          .join(" AND ");
        return excludeValuesWhere.length ? excludeValuesWhere : "";
      case "Blanks":
        return `${columnId} IS NULL OR ${columnId} = ''`;
      case "NonBlanks":
        return `${columnId} IS NOT NULL AND ${columnId} != ''`;
      case "Today":
        return isSameDaySql(columnId, "CAST(GETDATE() AS date)");
      case "Yesterday":
        return isSameDaySql(columnWithoutTime, yesterdaySQL);
      case "Tomorrow":
        return isSameDaySql(columnId, tomorrowSQL);
      case "ThisWeek":
        return `
          ${columnWithoutTime} >= ${thisMondaySQL} AND
          ${columnWithoutTime} < ${thisSundaySql}
        `;
      case "ThisMonth":
        return `
          YEAR(${columnWithoutTime}) = YEAR(${todaySQL}) AND
          MONTH(${columnWithoutTime}) = MONTH(${todaySQL})
        `;
      case "ThisQuarter":
        return `
          ${getQuarterSql(columnWithoutTime)} = ${getQuarterSql(todaySQL)} AND
          YEAR(${columnWithoutTime}) = YEAR(${todaySQL})
        `;
      case "ThisYear":
        return `
          YEAR(${columnWithoutTime}) = YEAR(${todaySQL})
        `;
      case "InPast":
        return `  
          ${columnWithoutTime} < ${todaySQL}
        `;
      case "InFuture":
        return `
          ${columnWithoutTime} > ${todaySQL}
        `;
      case "After":
        return inputs[0]
          ? `
          ${columnWithoutTime} > CAST("${inputs[0]}" as DATE)
        `
          : "";
      case "Before":
        return inputs[0]
          ? `
          ${columnWithoutTime} < CAST("${inputs[0]}" as DATE)
        `
          : "";
      case "On":
        return inputs[0]
          ? `
          ${columnWithoutTime} = CAST("${inputs[0]}" as DATE)
        `
          : "";
      case "NotOn":
        return inputs[0]
          ? `
          ${columnWithoutTime} != CAST("${inputs[0]}" as DATE)
        `
          : "";
      case "InRange":
        return inputs[0] && inputs[1]
          ? `
          ${columnWithoutTime} > CAST("${inputs[0]}" as DATE) AND
          ${columnWithoutTime} < CAST("${inputs[1]}" as DATE)
        `
          : "";

      // TODO: remove from options
      case "LastWorkDay":
      case "NextWorkDay":
        // not implemented
        return "";
    }
  }

  createAdaptableBooleanFilterSql(columnFilter: ColumnFilter) {
    const columnId = columnFilter.ColumnId;
    const inputs = columnFilter.Predicate.Inputs ?? [];
    switch (columnFilter.Predicate.PredicateId) {
      case "True":
        return `${columnId} = TRUE`;
      case "False":
        return `${columnId} = FALSE`;
      case "Blanks":
        return `${columnId} IS NULL`;
      case "NonBlanks":
        return `${columnId} IS NOT NULL`;
      case "BooleanToggle":
        return inputs[0] === "unchecked"
          ? `${columnId} = FALSE`
          : inputs[0] === "checked"
          ? `${columnId} = TRUE`
          : "";
    }

    return "";
  }

  private createGroupBySql(request: IServerSideGetRowsRequest) {
    const rowGroupCols = request.rowGroupCols;
    const groupKeys = request.groupKeys;

    if (this.isDoingGrouping(rowGroupCols, groupKeys)) {
      const colsToGroupBy: string[] = [];

      const rowGroupCol = rowGroupCols[groupKeys.length];
      rowGroupCol.field && colsToGroupBy.push(rowGroupCol.field);

      return " group by " + colsToGroupBy.join(", ");
    } else {
      // select all columns
      return "";
    }
  }

  private createOrderBySql(request: IServerSideGetRowsRequest) {
    const rowGroupCols = request.rowGroupCols;
    const groupKeys = request.groupKeys;
    const sortModel = request.sortModel;

    const grouping = this.isDoingGrouping(rowGroupCols, groupKeys);

    const sortParts: string[] = [];
    if (sortModel) {
      const groupColIds = rowGroupCols
        .map((groupCol) => groupCol.id)
        .slice(0, groupKeys.length + 1);

      sortModel.forEach(function (item) {
        if (grouping && groupColIds.indexOf(item.colId) < 0) {
          // ignore
        } else {
          sortParts.push(item.colId + " " + item.sort);
        }
      });
    }

    if (sortParts.length > 0) {
      return " order by " + sortParts.join(", ");
    } else {
      return "";
    }
  }

  private isDoingGrouping(rowGroupCols: ColumnVO[], groupKeys: string[]) {
    // we are not doing grouping if at the lowest level. we are at the lowest level
    // if we are grouping by more columns than we have keys for (that means the user
    // has not expanded a lowest level group, OR we are not grouping at all).
    return rowGroupCols.length > groupKeys.length;
  }

  private createLimitSql(request: IServerSideGetRowsRequest) {
    const startRow = request.startRow ?? 0;
    const endRow = request.endRow;

    if (endRow === undefined) {
      return "";
    }

    const pageSize = endRow - startRow;
    return " limit " + (pageSize + 1) + " offset " + startRow;
  }
}
