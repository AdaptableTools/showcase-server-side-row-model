import * as React from "react";
// import Adaptable Component and other types
import AdaptableReact, {
  AdaptableApi,
  AdaptableOptions,
  BooleanFunctionName,
  FilterPermittedValuesContext,
  ModuleExpressionFunctionsContext,
} from "@adaptabletools/adaptable-react-aggrid";

// import agGrid Component
import { AgGridReact } from "@ag-grid-community/react";
import { ColDef, GridOptions, Module } from "@ag-grid-community/core";

import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import { SideBarModule } from "@ag-grid-enterprise/side-bar";
import { ColumnsToolPanelModule } from "@ag-grid-enterprise/column-tool-panel";
import { FiltersToolPanelModule } from "@ag-grid-enterprise/filter-tool-panel";
import { StatusBarModule } from "@ag-grid-enterprise/status-bar";
import { MenuModule } from "@ag-grid-enterprise/menu";
import { RangeSelectionModule } from "@ag-grid-enterprise/range-selection";
import { RichSelectModule } from "@ag-grid-enterprise/rich-select";
import { ExcelExportModule } from "@ag-grid-enterprise/excel-export";
import { RowGroupingModule } from "@ag-grid-enterprise/row-grouping";
import { ClipboardModule } from "@ag-grid-enterprise/clipboard";
import { ServerSideRowModelModule } from "@ag-grid-enterprise/server-side-row-model";

// import adaptable css and themes
import "@adaptabletools/adaptable-react-aggrid/base.css";
import "@adaptabletools/adaptable-react-aggrid/themes/light.css";
import "@adaptabletools/adaptable-react-aggrid/themes/dark.css";

import "@ag-grid-community/core/dist/styles/ag-grid.css";
import "@ag-grid-community/core/dist/styles/ag-theme-alpine-dark.css";
import "@ag-grid-community/core/dist/styles/ag-theme-alpine.css";
import "@ag-grid-community/core/dist/styles/ag-theme-balham-dark.css";
import "@ag-grid-community/core/dist/styles/ag-theme-balham.css";
import "@ag-grid-community/core/dist/styles/ag-theme-blue.css";
import { createDataSource, getPermittedValues, updateRows } from "./DataSource";

const LICENSE_KEY = process.env.REACT_APP_ADAPTABLE_LICENSE_KEY;

const modules: Module[] = [
  ClientSideRowModelModule,
  SideBarModule,
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  StatusBarModule,
  MenuModule,
  RangeSelectionModule,
  RichSelectModule,
  ExcelExportModule,
  RowGroupingModule,
  ClipboardModule,
  ServerSideRowModelModule,
];

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

  columnDefs: columnDefs,
  sideBar: ["adaptable", "columns", "filters"],

  // server side props
  rowModelType: "serverSide",
  cacheBlockSize: 50,
  serverSideStoreType: "partial",
};

const supportedQueryBooleanOperators: BooleanFunctionName[] = [
  "EQ",
  "NEQ",
  "GT",
  "LT",
  "GTE",
  "LTE",
  "AND",
  "OR",
  "NOT",
  "BETWEEN",
  "IN",
  "IS_BLANK",
  "CONTAINS",
  "STARTS_WITH",
  "ENDS_WITH",
];

const adaptableOptions: AdaptableOptions = {
  primaryKey: "id",
  userName: "server-side-demo-user",
  licenseKey: LICENSE_KEY,
  adaptableId: "AdapTable ServerRowModel Demo",
  settingsPanelOptions: {},

  adaptableQLOptions: {
    expressionOptions: {
      moduleExpressionFunctions: (
        context: ModuleExpressionFunctionsContext
      ) => {
        if (context.module === "Query") {
          return {
            systemBooleanFunctions: supportedQueryBooleanOperators,
            systemScalarFunctions: ["COL"],
            systemAggregatedBooleanFunctions: ["COL"],
            systemAggregatedScalarFunctions: ["COL"],
            systemObservableFunctions: ["COL"],
          };
        }
        return;
      },
    },
  },
  dashboardOptions: {
    customToolbars: [
      {
        name: "Update data",
        toolbarButtons: [
          {
            label: "Update data",
            onClick: (button, context) => {
              updateRows(context.adaptableApi!);
            },
          },
        ],
      },
    ],
  },
  userInterfaceOptions: {
    filterPermittedValues: [
      {
        scope: {
          All: true,
        },
        async values(context: FilterPermittedValuesContext) {
          const columnId = context.column.columnId;
          return getPermittedValues(columnId);
        },
      },
    ],
  },
  predefinedConfig: {
    Dashboard: {
      Revision: Date.now(),
      Tabs: [
        {
          Name: "Main",
          Toolbars: ["Query", "Update data", "SystemStatus"],
        },
      ],
    },
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
          ColumnSorts: [
            {
              ColumnId: "athlete",
              SortOrder: "Asc",
            },
          ],
          Columns: [
            "athlete",
            "gold",
            "silver",
            "bronze",
            "totalMedals",
            "country",
            "sport",
            "year",
          ],
        },
      ],
    },
    Query: {
      Revision: Date.now(),
      CurrentQuery: "[gold] > 1",
    },
    Alert: {
      Revision: Date.now(),
      AlertDefinitions: [
        {
          Scope: {
            ColumnIds: ["gold"],
          },
          Rule: {
            Predicate: {
              PredicateId: "Any",
            },
          },
          MessageType: "Success",
          AlertProperties: {
            DisplayNotification: true,
            JumpToCell: true,
            HighlightRow: true,
          },
          MessageText: "New Gold Win",
          AlertForm: {
            Buttons: [
              {
                Label: "Ok",
                ButtonStyle: {
                  variant: "raised",
                },
              },
            ],
          },
        },
        {
          Scope: {
            All: true,
          },
          Rule: {
            ObservableExpression:
              'GRID_CHANGE(COUNT([gold], 3), TIMEFRAME("24h"))',
          },
          MessageType: "Info",
          AlertProperties: {
            DisplayNotification: true,
            JumpToCell: true,
            HighlightRow: true,
          },
          MessageText: "Won 3 more Gold Medals",
          AlertForm: {
            Buttons: [
              {
                Label: "Ok",
                ButtonStyle: {
                  variant: "raised",
                },
              },
            ],
          },
        },
      ],
    },
    CalculatedColumn: {
      Revision: Date.now(),
      CalculatedColumns: [
        {
          ColumnId: "totalMedals",
          Query: {
            ScalarExpression: "[gold] + [silver] + [bronze] ",
          },
          CalculatedColumnSettings: {
            DataType: "Number",
          },
          FriendlyName: "Total Medals",
        },
      ],
    },
    FormatColumn: {
      Revision: Date.now(),
      FormatColumns: [
        {
          Scope: {
            ColumnIds: ["athlete"],
          },
          Style: {
            FontWeight: "Bold",
          },
        },
        {
          Scope: { All: true },
          Style: {
            BackColor: "#ffff00",
          },
          Rule: { BooleanExpression: "[gold] > 4" },
        },
      ],
    },
    StyledColumn: {
      Revision: Date.now(),
      StyledColumns: [
        {
          ColumnId: "gold",
          GradientStyle: {
            CellRanges: [{ Min: "Col-Min", Max: "Col-Max", Color: "#ffee2e" }],
          },
        },
        {
          ColumnId: "bronze",
          GradientStyle: {
            CellRanges: [{ Min: "Col-Min", Max: "Col-Max", Color: "#ff9500" }],
          },
        },
        {
          ColumnId: "silver",
          GradientStyle: {
            CellRanges: [{ Min: "Col-Min", Max: "Col-Max", Color: "#d3d3d3" }],
          },
        },
        {
          ColumnId: "totalMedals",
          PercentBarStyle: {
            CellRanges: [{ Min: "Col-Min", Max: "Col-Max", Color: "#006400" }],
            CellText: ["CellValue"],
            ToolTipText: ["CellValue"],
          },
        },
      ],
    },
  },
};

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
      />
      <div className="ag-theme-alpine" style={{ flex: 1 }}>
        <AgGridReact gridOptions={gridOptions} modules={modules} />
      </div>
    </div>
  );
};

export default App;
