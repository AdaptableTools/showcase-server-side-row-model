import type { AdaptableApi, InFilterValue } from '@adaptabletools/adaptable-react-aggrid';
import type { ColDef, ColGroupDef, GridApi, IServerSideGetRowsParams } from 'ag-grid-enterprise';
import { getRandomInt } from './utils';
import { API_URL } from './environment';

interface PivotFieldEntry {
  field: string;
  pivotValues: Record<string, string | number>;
  valueColumn: string;
  aggFunc: string;
}

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
    console.trace('request to server', request);
    fetch(API_URL, {
      method: 'post',
      body: JSON.stringify(request),
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
      .then((httpResponse) => httpResponse.json())
      .then((response) => {
        if (response.pivotFields?.length) {
          addPivotColumnDefs(response.pivotFields, params.api);
        } else {
          if (!adaptableApi.layoutApi.isCurrentLayoutPivot()) {
            const existingPivotColDefs = params.api.getPivotResultColumns();
            if (existingPivotColDefs?.length) {
              params.api.setPivotResultColumns([]);
            }
          }
        }

        params.success({
          rowData: response.rows,
          rowCount: response.lastRow ?? 0,
        });

        if (response.sql) {
          adaptableApi.systemStatusApi.setInfoSystemStatus(
            `SQL: ${response.sql.slice(0, 40)}`,
            response.sql
          );
        }
      })
      .catch((error) => {
        console.log(error);
        params.fail();
      });
  },
});

function addPivotColumnDefs(pivotFields: PivotFieldEntry[], agGridApi: GridApi) {
  const newFieldIds = pivotFields.map((f) => f.field);
  const existingCols = agGridApi.getPivotResultColumns();

  if (existingCols?.length) {
    const existingIds = existingCols.map((c) => c.getColId());
    if (
      existingIds.length === newFieldIds.length &&
      existingIds.every((id, i) => id === newFieldIds[i])
    ) {
      return;
    }
  }

  const pivotColDefs = createPivotResultColumns(pivotFields);
  agGridApi.setPivotResultColumns(pivotColDefs);
}

function createPivotResultColumns(pivotFields: PivotFieldEntry[]): (ColDef | ColGroupDef)[] {
  if (!pivotFields.length) return [];

  const uniqueValueCols = new Set(pivotFields.map((f) => f.valueColumn));
  const hasMultipleValueCols = uniqueValueCols.size > 1;
  const pivotKeys = Object.keys(pivotFields[0].pivotValues);

  const root: (ColDef | ColGroupDef)[] = [];

  for (const pf of pivotFields) {
    const allLevels = pivotKeys.map((k) => String(pf.pivotValues[k]));

    if (hasMultipleValueCols) {
      insertIntoTree(root, allLevels, {
        colId: pf.field,
        headerName: pf.valueColumn,
        field: pf.field,
        filter: false,
        cellDataType: 'number',
      });
    } else {
      const groupLevels = allLevels.slice(0, -1);
      const leafLabel = allLevels[allLevels.length - 1];
      insertIntoTree(root, groupLevels, {
        colId: pf.field,
        headerName: leafLabel,
        field: pf.field,
        filter: false,
        cellDataType: 'number',
      });
    }
  }

  return root;
}

function insertIntoTree(
  siblings: (ColDef | ColGroupDef)[],
  groupLevels: string[],
  leafCol: ColDef,
  parentPath = ''
) {
  if (groupLevels.length === 0) {
    siblings.push(leafCol);
    return;
  }

  const [current, ...rest] = groupLevels;
  const groupId = parentPath ? `${parentPath}_${current}` : `pivot_${current}`;

  let group = siblings.find((s): s is ColGroupDef => 'groupId' in s && s.groupId === groupId);

  if (!group) {
    group = { groupId, headerName: current, children: [] };
    siblings.push(group);
  }

  insertIntoTree(group.children, rest, leafCol, groupId);
}

export const getPermittedValues = async (columnId: string): Promise<InFilterValue[]> => {
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
