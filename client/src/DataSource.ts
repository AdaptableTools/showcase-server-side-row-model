import { AdaptableApi } from "@adaptabletools/adaptable-react-aggrid";
import { ColDef, ColumnApi } from "@ag-grid-community/core";
import { getRandomInt } from "./utils";

const LOCAL = "http://localhost:4000/api";
const API_URL = process.env.REACT_APP_ADAPTABLE_API_PATH ?? LOCAL;

export const createDataSource = (adaptableApi: AdaptableApi) => ({
  getRows(params: any) {
    const filters = adaptableApi.filterApi.getColumnFilterDefs();
    const query = adaptableApi.queryApi.getCurrentQuery() ?? "";
    const queryAST = adaptableApi.queryLanguageApi.getASTForExpression(query);
    const customSorts = adaptableApi.customSortApi.getAllActiveCustomSort();

    const sortModel = params.request.sortModel.map((sort: any) => {
      const customSort = customSorts.find(
        (customSort) => customSort.ColumnId === sort.colId
      );
      if (customSort) {
        return {
          ...sort,
          sortedValues: customSort.SortedValues,
        };
      }
      return sort;
    });

    if (queryAST) {
      console.log("queryAST", queryAST);
    }

    const request = {
      ...params.request,
      sortModel,
      adaptableFilters: filters,
      queryAST,
      includeSQL: true,
    };

    fetch(API_URL, {
      method: "post",
      body: JSON.stringify(request),
      headers: { "Content-Type": "application/json; charset=utf-8" },
    })
      .then((httpResponse) => httpResponse.json())
      .then((response) => {
        params.success({
          rowData: response.rows,
          rowCount: response.lastRow ?? 0,
        });

        if (response.pivotFields?.length) {
          addPivotColumnDefs(response, params.columnApi);
        } else {
          const currentLayout = adaptableApi.layoutApi.getCurrentLayout();
          if (!currentLayout.EnablePivot) {
            const existingPivotColDefs =
              params.columnApi!.getPivotResultColumns();
            if (existingPivotColDefs?.length) {
              params.columnApi!.setPivotResultColumns([]);
            }
          }
        }

        adaptableApi.systemStatusApi.setInfoSystemStatus(
          `SQL: ${response.sql.slice(0, 40)}`,
          response.sql
        );
      })
      .catch((error) => {
        params.fail();
      });
  },
});

function addPivotColumnDefs(response: any, columnApi: ColumnApi) {
  const existingPivotColDefs = columnApi.getPivotResultColumns();
  if (existingPivotColDefs && existingPivotColDefs.length > 0) {
    return;
  }

  const pivotColDefs: ColDef[] = response.pivotFields.map(function (
    field: any
  ) {
    const [key, value] = Object.entries(field)[0];
    const valueStr = `${value}`;
    return {
      headerName: valueStr,
      field: valueStr,
      filter: false,
      colId: Date.now(),
    };
  });

  // supply pivot result columns to the grid
  columnApi.setPivotResultColumns(pivotColDefs);
}

export const getPermittedValues = async (columnId: string) => {
  const jsonResponse = await fetch(
    `${API_URL}/permitted-values?columnId=${columnId}`
  );
  return jsonResponse.json();
};

// updates data only locally, the api does not support editing
export const updateRows = (adaptableApi: AdaptableApi) => {
  const allRows = adaptableApi.gridApi.getAllRowNodes();
  const row = allRows[getRandomInt(0, allRows.length - 1)];

  if (!row || !row.data) {
    return;
  }

  const data = { ...row.data };
  data.gold += 1;

  row.setData(data);
};
