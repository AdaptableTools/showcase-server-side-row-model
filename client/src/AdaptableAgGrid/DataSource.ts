import { AdaptableApi } from '@adaptabletools/adaptable-react-aggrid';
import { ColDef, GridApi, IServerSideGetRowsParams } from '@ag-grid-community/core';
import { getRandomInt } from './utils';
import { API_URL } from './environment';
import { JUMP_TO_INDEX, SERVER_SIDE_CACHE_BLOCK_SIZE } from './AdaptableAgGrid.tsx';

let timeoutId: any = null;

export const createDataSource = (adaptableApi: AdaptableApi) => ({
  getRows(params: IServerSideGetRowsParams) {
    if (JUMP_TO_INDEX.value) {
      const jumpIndex = JUMP_TO_INDEX.value;
      JUMP_TO_INDEX.value = undefined;

      // tricks the grid that it has jumpIndex + cacheBlockSize rows loaded
      params.success({
        rowData: [],
        rowCount: jumpIndex + SERVER_SIDE_CACHE_BLOCK_SIZE,
      });
      params.api.setRowCount(jumpIndex + SERVER_SIDE_CACHE_BLOCK_SIZE, false);

      adaptableApi.agGridApi.ensureIndexVisible(jumpIndex, 'top');
      adaptableApi.agGridApi.refreshServerSide({ purge: false });
      return;
    }

    const filters = adaptableApi.columnFilterApi.getColumnFilterDefs();
    const query = adaptableApi.gridFilterApi.getCurrentGridFilterExpression() ?? '';
    const queryAST = adaptableApi.expressionApi.getASTForExpression(query);
    const customSorts = adaptableApi.customSortApi.getActiveCustomSorts();

    const sortModel = params.request.sortModel.map((sort: any) => {
      const customSort = customSorts.find((customSort) => customSort.ColumnId === sort.colId);
      if (customSort) {
        return {
          ...sort,
          sortedValues: customSort.SortedValues,
        };
      }
      return sort;
    });

    if (queryAST) {
      console.log('queryAST', queryAST);
    }

    const request = {
      ...params.request,
      sortModel,
      adaptableFilters: filters,
      queryAST,
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
          rowCount: response.lastRow ?? -1,
        });

        if (response.pivotFields?.length) {
          addPivotColumnDefs(response, params.api);
        } else {
          const currentLayout = adaptableApi.layoutApi.getCurrentLayout();
          if (!currentLayout.EnablePivot) {
            const existingPivotColDefs = params.api.getPivotResultColumns();
            if (existingPivotColDefs?.length) {
              params.api.setPivotResultColumns([]);
            }
          }
        }

        // poor man's flashing system status
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        adaptableApi.systemStatusApi.setErrorSystemStatus(`SQL: ${response.sql}`, response.sql);
        timeoutId = setTimeout(
          () =>
            adaptableApi.systemStatusApi.setInfoSystemStatus(`SQL: ${response.sql}`, response.sql),
          500
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
      colId: Date.now(),
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
