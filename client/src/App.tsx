import * as React from "react";

import AdaptableReact, {
  AdaptableButton,
  AdaptableOptions,
  BooleanFunctionName,
  CustomToolbarButtonContext,
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

const DescriptionComponent = () => {
  return (
    <div style={{ fontSize: "smaller" }}>
      <h3>About this Demo</h3>
      <ul>
        <li>
          This example shows AdapTable using the AG Grid{" "}
          <b>Serverside Row Model</b>
        </li>
        <li>
          The data is the same as which AG Grid uses for its{" "}
          <a
            href="https://www.ag-grid.com/react-data-grid/server-side-operations-nodejs/"
            target="_blank"
          >
            nodejs demo
          </a>
        </li>
        <li>
          This allows us to illustrate what is and is not available when using
          this RowModel
        </li>
        <li>
          In particular it demonstrates how when using Server-Side Row Model you
          can:
          <ul>
            <li>Evaluate Predicates</li>
            <li>
              Evaluate Expressions (used in Queries, Alerts and Calculated
              Columns)
            </li>
            <li>Create Pivot Layouts</li>
            <li>Provide Custom Sorts</li>
            <li>Get Distinct Column Values</li>
          </ul>
        </li>
      </ul>

      <h3>Source Code</h3>
      <ul>
        <li>
          The full source code for this demo is available{" "}
          <a
            href="https://github.com/AdaptableTools/showcase-server-side-row-model"
            target="_blank"
          >
            here
          </a>
        </li>
        <li>
          We create a mock{" "}
          <a
            href="https://github.com/AdaptableTools/showcase-server-side-row-model/blob/master/server/SqlService.ts"
            target="_blank"
          >
            SQLService
          </a>{" "}
          to mimic how AdapTableQL works{" "}
        </li>
        <li>
          We use this service to evaluate both{" "}
          <a
            href="https://github.com/AdaptableTools/showcase-server-side-row-model/blob/master/server/SqlService.ts#L128"
            target="_blank"
          >
            Filters
          </a>{" "}
          and{" "}
          <a
            href="https://github.com/AdaptableTools/showcase-server-side-row-model/blob/master/server/SqlService.ts#L508"
            target="_blank"
          >
            Expressions
          </a>
        </li>
        <li>
          We also use ExpressionOptions to limit which Expression Functions are
          available
        </li>
      </ul>
      <p>
        Note: The code provided here is "rough and ready" for demonstration
        purposes only - it should <b>not</b> be used in a production system
      </p>

      <h4>Predefined Config</h4>
      <p>
        Many AdapTable Objects have been provided in Predefined Config
        including:
      </p>
      <ul>
        <li>
          <b>Dashboard</b>: 2 Tabs:
          <ul>
            <li>
              <i>Main</i>: Layout and Query Toolbars
            </li>
            <li>
              <i>Data</i>: Alert, System Status, and a Custom (
              <code>Data Loading</code>) Toolbar
            </li>
            <li>
              The Custom Toolbar allows you to mimic data changes (so that
              Alerts can be triggered)
            </li>
          </ul>
        </li>
      </ul>
    </div>
  );
};

const adaptableOptions: AdaptableOptions = {
  primaryKey: "id",
  licenseKey: LICENSE_KEY,
  userName: "Server-side Demo User",
  adaptableId: "AdapTable using Server-Side Row Model",
  settingsPanelOptions: {
    customSettingsPanels: [
      {
        name: "Using Serverside Row Model",
        frameworkComponent: DescriptionComponent,
      },
    ],
    navigation: {
      items: [
        "Using Serverside Row Model",
        "-",
        "Dashboard",
        "ToolPanel",
        "StateManagement",
        "-",
        "Alert",
        "CalculatedColumn",
        "CustomSort",
        "DataSet",
        "Export",
        "Filter",
        "FlashingCell",
        "FormatColumn",
        "FreeTextColumn",
        "Layout",
        "PlusMinus",
        "Query",
        "QuickSearch",
        "Schedule",
        "Shortcut",
        "StyledColumn",
        "-",
        "GridInfo",
        "SystemStatus",
        "Theme",
      ],
    },
  },
  dashboardOptions: {
    customToolbars: [
      {
        name: "About",
        toolbarButtons: [
          {
            label: "READ ME",
            buttonStyle: {
              variant: "outlined",
              tone: "neutral",
            },
            onClick: (
              button: AdaptableButton<CustomToolbarButtonContext>,
              context: CustomToolbarButtonContext
            ) => {
              context.adaptableApi.settingsPanelApi.showCustomSettingsPanel(
                "Using Serverside Row Model"
              );
            },
          },
        ],
      },
      {
        name: "UpdateData",
        toolbarButtons: [
          {
            label: "Update Data",
            onClick: (button, context) => {
              const allRows = context.adaptableApi.gridApi.getAllRowNodes();
              const randomInt: number =
                0 + Math.ceil(Math.random() * (allRows.length - 1 + 1));
              const row = allRows[randomInt];
              if (!row || !row.data) {
                return;
              }
              const data = { ...row.data };
              data.gold += 1;
              // only way to prevent filtering on edit
              row.setData(data);
            },
          },
        ],
      },
    ],
  },
  layoutOptions: {
    autoSizeColumnsInPivotLayout: true,
    layoutTagOptions: {
      autoGenerateTagsForLayouts: true,
      autoCheckTagsForLayouts: true,
    },
  },
  adaptableQLOptions: {
    customPredicateDefs: [
      // The custom predicate is transformed in a query in index.ts -> getRows().
      {
        id: "superstar",
        label: "Superstar",
        columnScope: { ColumnIds: ["athlete"] },
        moduleScope: ["filter"],
        handler: () => true,
      },
    ],

    expressionOptions: {
      moduleExpressionFunctions: (
        context: ModuleExpressionFunctionsContext
      ) => {
        if (context.module === "Query") {
          return {
            systemBooleanFunctions: supportedQueryBooleanOperators,
            systemScalarFunctions: ["COL"],
            customBooleanFunctions: {
              FROM_EUROPE: {
                // handled on the server
                handler: () => null,
                isPredicate: true,
                description: "Returns true if the athlete is from Europe",
                signatures: ["FROM_EUROPE"],
              },
            },
            systemAggregatedBooleanFunctions: ["COL"],
            systemAggregatedScalarFunctions: ["COL"],
            systemObservableFunctions: ["COL"],
          };
        }
        return;
      },
    },
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
          Toolbars: ["About", "Layout", "Query"],
        },
        {
          Name: "Data",
          Toolbars: ["Alert", "SystemStatus", "UpdateData"],
        },
      ],
    },
    Layout: {
      Revision: Date.now(),
      CurrentLayout: "Standard Layout",
      Layouts: [
        {
          Name: "Standard Layout",
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
          ColumnWidthMap: {
            athlete: 175,
            bronze: 85,
            country: 125,
            gold: 100,
            id: 50,
            silver: 100,
            sport: 175,
            totalMedals: 100,
            year: 115,
          },
        },
        {
          Name: "Sorted Layout",
          Columns: [
            "athlete",
            "sport",
            "country",
            "gold",
            "silver",
            "bronze",
            "year",
          ],
          ColumnSorts: [
            {
              ColumnId: "sport",
              SortOrder: "Asc",
            },
          ],
        },
        // {
        //   Name: 'Pivot Layout',
        //   EnablePivot: true,
        //   Columns: [],
        //   RowGroupedColumns: ['country', 'sport'],
        //   // PivotColumns: ['year'], we will need to handle this ourselves I think
        //   // see:  https://www.ag-grid.com/javascript-data-grid/server-side-model-pivoting/#pivoting-on-the-server
        //   AggregationColumns: {
        //     gold: 'sum',
        //     silver: 'sum',
        //     bronze: 'sum',
        //   },
        // },
        {
          Name: "Pivot Layout",
          EnablePivot: true,
          Columns: [],
          PivotColumns: ["year"],
          RowGroupedColumns: ["country"],
          AggregationColumns: {
            gold: "sum",
          },
        },
      ],
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
          },
          MessageText: "New Gold Win",
          AlertForm: {
            Buttons: [
              {
                Label: "Show Me",
                Action: ["jump-to-cell", "highlight-cell"],
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
              'GRID_CHANGE(COUNT([gold], 3), TIMEFRAME("1h"))',
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
            Filterable: true,
            Resizable: true,
            Sortable: true,
          },
          FriendlyName: "Total",
        },
      ],
    },
    FormatColumn: {
      Revision: Date.now(),
      FormatColumns: [
        {
          Scope: {
            ColumnIds: ["gold", "silver", "bronze"],
          },
          CellAlignment: "Right",
        },
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
            BackColor: "#87cefa",
            ForeColor: "#ffffff",
          },
          Rule: { BooleanExpression: '[gold] > 1 AND [sport]="Swimming" ' },
        },
      ],
    },
    Query: {
      Revision: Date.now(),
      NamedQueries: [
        {
          Name: "US Golds",
          BooleanExpression: '[country]="United States" AND [gold] > 1',
        },
      ],
    },
    CustomSort: {
      Revision: Date.now(),
      CustomSorts: [
        {
          ColumnId: "athlete",
          SortedValues: ["Zou Kai", "Natalie Coughlin", "Missy Franklin"],
        },
      ],
    },
    StyledColumn: {
      Revision: Date.now(),

      StyledColumns: [
        {
          ColumnId: "gold",
          GradientStyle: {
            CellRanges: [{ Min: 0, Max: 10, Color: "#ffee2e" }],
          },
          Tags: ["Standard Layout", "Sorted Layout"],
        },
        {
          ColumnId: "bronze",
          GradientStyle: {
            CellRanges: [{ Min: 0, Max: 10, Color: "#ff9500" }],
          },
          Tags: ["Standard Layout", "Sorted Layout"],
        },
        {
          ColumnId: "silver",
          GradientStyle: {
            CellRanges: [{ Min: 0, Max: 10, Color: "#d3d3d3" }],
          },
          Tags: ["Standard Layout", "Sorted Layout"],
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
