import { AdaptableApi } from '@adaptabletools/adaptable-react-aggrid';
import { ColDef, GridApi, IServerSideGetRowsParams } from 'ag-grid-enterprise';
import { getRandomInt } from './utils';
import { API_URL } from './environment';

export const createDataSource = (adaptableApi: AdaptableApi) => ({
  getRows(params: IServerSideGetRowsParams) {
    const filterState = adaptableApi.stateApi.getAdaptableFilterState();
    const sortState = adaptableApi.stateApi.getAdaptableSortState();
    const gridFilterAST = filterState.gridFilterAST;

    const sortModel = params.request.sortModel.map((sort: any) => {
      const customSort = sortState.customSorts.find(
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

    if (gridFilterAST) {
      console.log('gridFilter AST', gridFilterAST);
    }

    const request = {
      ...params.request,
      sortModel,
      adaptableFilters: filterState.columnFilterDefs,
      gridFilterAST: filterState.gridFilterAST,
      includeSQL: true,
    };

    fetch(API_URL, {
      method: 'post',
      body: JSON.stringify(request),
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
      .then((httpResponse) => httpResponse.json())
      .then((response) => {
        params.success({
          rowData: response.rows,
          rowCount: response.lastRow ?? 0,
        });

        if (response.pivotFields?.length) {
          addPivotColumnDefs(response, params.api);
        } else {
          if (!adaptableApi.layoutApi.isCurrentLayoutPivot()) {
            const existingPivotColDefs = params.api.getPivotResultColumns();
            if (existingPivotColDefs?.length) {
              params.api.setPivotResultColumns([]);
            }
          }
        }

        adaptableApi.systemStatusApi.setInfoSystemStatus(
          `SQL: ${response.sql.slice(0, 40)}`,
          response.sql
        );
      })
      .catch((error) => {
        console.log(error);
        params.fail();
      });
  },
});

function addPivotColumnDefs(response: any, agGridApi: GridApi) {
  const existingPivotColDefs = agGridApi.getPivotResultColumns();
  if (existingPivotColDefs && existingPivotColDefs.length > 0) {
    return;
  }

  const pivotColDefs: ColDef[] = response.pivotFields.map(function (field: any) {
    const [_key, value] = Object.entries(field)[0];
    const valueStr = `${value}`;
    return {
      headerName: valueStr,
      field: valueStr,
      filter: false,
      colId: `${Date.now()}`,
    };
  });

  // supply pivot result columns to the grid
  agGridApi.setPivotResultColumns(pivotColDefs);
}

export const getPermittedValues = async (columnId: string) => {
  const jsonResponse = await fetch(`${API_URL}/permitted-values?columnId=${columnId}`);
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
