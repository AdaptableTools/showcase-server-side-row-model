import * as React from "react";
import omit from "lodash.omit";
// import Adaptable Component and other types
import AdaptableReact, {
  AdaptableApi,
  AdaptableOptions,
} from "@adaptabletools/adaptable-react-aggrid";

// import agGrid Component
import { AgGridReact } from "@ag-grid-community/react";

// import adaptable css and themes
import "@adaptabletools/adaptable-react-aggrid/base.css";
import "@adaptabletools/adaptable-react-aggrid/themes/light.css";
import "@adaptabletools/adaptable-react-aggrid/themes/dark.css";

// import aggrid themes (using new Alpine theme)
import "@ag-grid-community/all-modules/dist/styles/ag-grid.css";
import "@ag-grid-community/all-modules/dist/styles/ag-theme-alpine.css";
import "@ag-grid-community/all-modules/dist/styles/ag-theme-alpine-dark.css";

import {
  AllEnterpriseModules,
  ColDef,
  GridOptions,
} from "@ag-grid-enterprise/all-modules";

const LICENSE_KEY = process.env.REACT_APP_ADAPTABLE_LICENSE_KEY;
const LOCAL = "http://localhost:4000/api";
const NETLIFY = "http://localhost:9999/.netlify/functions/athletes";
const API_URL = process.env.REACT_APP_ADAPTABLE_API_PATH ?? LOCAL;

const createDataSource = (adaptableApi: AdaptableApi) => ({
  getRows(params: any) {
    const filters = adaptableApi.filterApi
      .getColumnFilters()
      .map((columnFilter) => {
        // TODO: replace when updated
        const column = adaptableApi.columnApi.getColumnFromId(
          columnFilter.ColumnId
        );
        const predicate = adaptableApi.predicateApi.getPredicateDefById(
          columnFilter.Predicate.PredicateId
        );
        return {
          predicate,
          dataType: column?.dataType,
          columnFilter: columnFilter,
        };
      });

    const request = {
      ...params.request,
      adaptableFilters: filters,
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
      })
      .catch((error) => {
        params.fail();
      });
  },
});

const columnDefs: ColDef[] = [
  { field: "id", hide: true, type: "abColDefString" },
  { field: "athlete", type: "abColDefString" },
  { field: "country", type: "abColDefString" },
  { field: "sport", type: "abColDefString" },
  { field: "year", type: "abColDefNumber" },
  { field: "gold", aggFunc: "sum", type: "abColDefNumber" },
  { field: "silver", aggFunc: "sum", type: "abColDefNumber" },
  { field: "bronze", aggFunc: "sum", type: "abColDefNumber" },
];

const gridOptions: GridOptions = {
  defaultColDef: {
    sortable: true,
    filter: true,
    floatingFilter: true,
    enableRowGroup: true,
  },
  rowModelType: "serverSide",
  columnDefs: columnDefs,
  sideBar: ["adaptable", "columns", "filters"],

  // server side props
  cacheBlockSize: 50,
  serverSideStoreType: "partial",
  // serverSideDatasource: dataSource,

  getRowId: (params) => {
    // TODO: remove after next update
    return params.data.id ?? Object.values(params.data)[0];
  },
};

const adaptableOptions: AdaptableOptions = {
  primaryKey: "id",
  userName: "Server-side Demo",
  licenseKey: LICENSE_KEY,
  adaptableId: "adaptable server side demo",
  settingsPanelOptions: {},
  adaptableQLOptions: {
    expressionOptions: {
      queryableColumns: ["country"],
    },
  },
  predefinedConfig: {
    Layout: {
      Revision: Date.now(),
      CurrentLayout: "All Columns Layout",
      Layouts: [
        {
          Name: "Pivot Layout",
          Columns: ["athlete", "country", "sport", "id", "year"],
          RowGroupedColumns: ["country", "sport"],
        },
        {
          Name: "All Columns Layout",
          Columns: [
            "athlete",
            "country",
            "sport",
            "id",
            "year",
            "gold",
            "silver",
            "bronze",
          ],
        },
      ],
    },
  },
};

const modules = AllEnterpriseModules;

const App: React.FC = () => {
  return (
    <div style={{ display: "flex", flexFlow: "column", height: "100vh" }}>
      <AdaptableReact
        style={{ flex: "none" }}
        gridOptions={gridOptions}
        adaptableOptions={adaptableOptions}
        onAdaptableReady={({ adaptableApi }) => {
          adaptableApi.eventApi.on("AdaptableReady", () => {
            gridOptions.api!.setServerSideDatasource(
              createDataSource(adaptableApi)
            );
          });
        }}
        modules={modules}
      />
      <div className="ag-theme-alpine" style={{ flex: 1 }}>
        <AgGridReact gridOptions={gridOptions} modules={modules} />
      </div>
    </div>
  );
};

export default App;
