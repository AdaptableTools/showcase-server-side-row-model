import * as React from 'react';
import { useMemo } from 'react';
import { LicenseManager, GridOptions, themeQuartz } from 'ag-grid-enterprise';
import {
  AdaptableApi,
  AdaptableOptions,
  Adaptable,
  BooleanFunctionName,
  AdaptableButton,
  CustomToolbarButtonContext,
  ModuleExpressionFunctionsContext,
  CustomInFilterValuesContext,
} from '@adaptabletools/adaptable-react-aggrid';
import { columnDefs, defaultColDef } from './columnDefs';
import { WebFramework } from './rowData';
import { agGridModules } from './agGridModules';
import { handleExport } from './handleExport.ts';
import { DescriptionComponent } from './DescriptionComponent.tsx';
import { createDataSource, getPermittedValues } from './DataSource.ts';

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE_KEY);

const supportedQueryBooleanOperators: BooleanFunctionName[] = [
  'EQ',
  'NEQ',
  'GT',
  'LT',
  'GTE',
  'LTE',
  'AND',
  'OR',
  'NOT',
  'BETWEEN',
  'IN',
  'CONTAINS',
  'STARTS_WITH',
  'ENDS_WITH',
];

export const AdaptableAgGrid = () => {
  const gridOptions = useMemo<GridOptions<WebFramework>>(
    () => ({
      theme: themeQuartz,
      defaultColDef,
      columnDefs,
      sideBar: ['adaptable', 'columns', 'filters'],
      statusBar: {
        statusPanels: [
          {
            key: 'Center Panel',
            statusPanel: 'AdaptableStatusPanel',
            align: 'center',
          },
        ],
      },
      cellSelection: true,
      // server side props
      rowModelType: 'serverSide',
      pagination: true,
    }),
    []
  );
  const adaptableOptions = useMemo<AdaptableOptions<WebFramework>>(
    () => ({
      licenseKey: import.meta.env.VITE_ADAPTABLE_LICENSE_KEY,
      primaryKey: 'id',
      userName: 'Server-side Demo User',
      adaptableId: 'AdapTable using Server-Side Row Model',
      exportOptions: {
        processExport: handleExport,
        systemReportFormats: ['Excel', 'CSV', 'JSON'],
      },
      settingsPanelOptions: {
        customSettingsPanels: [
          {
            name: 'Using Serverside Row Model',
            frameworkComponent: DescriptionComponent,
          },
        ],
        navigation: {
          items: [
            'Using Serverside Row Model',
            '-',
            'Dashboard',
            'ToolPanel',
            'StateManagement',
            '-',
            'Alert',
            'CalculatedColumn',
            'CustomSort',
            'DataSet',
            'Export',
            'Filter',
            'FlashingCell',
            'FormatColumn',
            'FreeTextColumn',
            'Layout',
            'PlusMinus',
            'Query',
            'QuickSearch',
            'Schedule',
            'Shortcut',
            'StyledColumn',
            '-',
            'GridInfo',
            'SystemStatus',
            'Theme',
          ],
        },
      },
      dashboardOptions: {
        customToolbars: [
          {
            name: 'About',
            toolbarButtons: [
              {
                label: 'READ ME',
                buttonStyle: {
                  variant: 'outlined',
                  tone: 'info',
                },
                onClick: (
                  _button: AdaptableButton<CustomToolbarButtonContext>,
                  context: CustomToolbarButtonContext
                ) => {
                  context.adaptableApi.settingsPanelApi.openCustomSettingsPanel(
                    'Using Serverside Row Model'
                  );
                },
              },
            ],
          },
          {
            name: 'UpdateData',
            toolbarButtons: [
              {
                label: 'Update Data',
                onClick: (_button, context) => {
                  const allRows = context.adaptableApi.gridApi.getAllRowNodes();
                  const randomInt: number = 0 + Math.ceil(Math.random() * (allRows.length - 1 + 1));
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
      predicateOptions: {
        customPredicateDefs: [
          // The custom predicate is transformed in a query in index.ts -> getRows().
          {
            id: 'superstar',
            label: 'Superstar',
            columnScope: { ColumnIds: ['athlete'] },
            moduleScope: ['columnFilter'],
            handler: () => true,
          },
        ],
      },
      expressionOptions: {
        moduleExpressionFunctions: (context: ModuleExpressionFunctionsContext) => {
          if (context.module === 'GridFilter') {
            return {
              systemBooleanFunctions: supportedQueryBooleanOperators,
              systemScalarFunctions: ['COL', 'IS_BLANK'],

              customBooleanFunctions: {
                FROM_EUROPE: {
                  // handled on the server
                  handler: () => true,
                  category: 'customAFL',
                  isPredicate: true,
                  returnType: 'boolean',
                  description: 'Returns true if the country is from Europe',
                  signatures: ['FROM_EUROPE'],
                },
              },
              systemAggregatedBooleanFunctions: ['COL'],
              systemAggregatedScalarFunctions: ['COL'],
              systemObservableFunctions: ['COL'],
            };
          }
          return;
        },
      },
      filterOptions: {
        customInFilterValues: (context: CustomInFilterValuesContext) => {
          const columnId = context.column.columnId;
          return getPermittedValues(columnId);
        },
      },
      initialState: {
        Dashboard: {
          Revision: Date.now(),
          Tabs: [
            {
              Name: 'Main',
              Toolbars: ['About', 'Layout', 'Export', 'Query'],
            },
            {
              Name: 'Data',
              Toolbars: ['Alert', 'SystemStatus', 'UpdateData'],
            },
          ],
          PinnedToolbars: ['GridFilter'],
        },
        Export: {
          Revision: Date.now(),
          Reports: [
            {
              Name: 'US Golden Athletes',
              ReportColumnScope: 'ScopeColumns',
              Scope: {
                ColumnIds: ['athlete', 'gold', 'sport', 'year'],
              },
              ReportRowScope: 'ExpressionRows',
              Query: {
                BooleanExpression: '[country]="United States" AND [gold]>0',
              },
            },
          ],
        },
        Layout: {
          Revision: Date.now(),
          CurrentLayout: 'Standard Layout',
          Layouts: [
            {
              Name: 'Standard Layout',
              TableColumns: [
                'athlete',
                'gold',
                'silver',
                'bronze',
                'totalMedals',
                'country',
                'sport',
                'year',
              ],
              ColumnWidths: {
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
              Name: 'Sorted Layout',
              TableColumns: ['athlete', 'sport', 'country', 'gold', 'silver', 'bronze', 'year'],
              ColumnSorts: [
                {
                  ColumnId: 'sport',
                  SortOrder: 'Asc',
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
              Name: 'Pivot Layout',
              PivotColumns: ['year'],
              PivotGroupedColumns: ['country'],
              PivotAggregationColumns: [
                {
                  ColumnId: 'gold',
                  AggFunc: 'sum',
                },
              ],
            },
          ],
        },
        Alert: {
          Revision: Date.now(),
          AlertDefinitions: [
            {
              Scope: {
                ColumnIds: ['gold'],
              },
              Rule: {
                Predicates: [
                  {
                    PredicateId: 'Any',
                  },
                ],
              },
              MessageType: 'Success',
              AlertProperties: {
                DisplayNotification: true,
              },
              MessageText: 'New Gold Win',
              AlertForm: {
                Buttons: [
                  {
                    Label: 'Show Me',
                    Action: ['jump-to-cell', 'highlight-cell'],
                    ButtonStyle: {
                      variant: 'raised',
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
                ObservableExpression: 'GRID_CHANGE(COUNT([gold], 3), TIMEFRAME("1h"))',
              },
              MessageType: 'Info',
              AlertProperties: {
                DisplayNotification: true,
                JumpToCell: true,
                HighlightRow: true,
              },
              MessageText: 'Won 3 more Gold Medals',
              AlertForm: {
                Buttons: [
                  {
                    Label: 'Ok',
                    ButtonStyle: {
                      variant: 'raised',
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
              ColumnId: 'totalMedals',
              Query: {
                ScalarExpression: '[gold] + [silver] + [bronze] ',
              },
              CalculatedColumnSettings: {
                DataType: 'number',
                Filterable: true,
                Resizable: true,
                Sortable: true,
              },
              FriendlyName: 'Total',
            },
          ],
        },
        FormatColumn: {
          Revision: Date.now(),
          FormatColumns: [
            {
              Scope: {
                ColumnIds: ['gold', 'silver', 'bronze'],
              },
              CellAlignment: 'Right',
            },
            {
              Scope: {
                ColumnIds: ['athlete'],
              },
              Style: {
                FontWeight: 'Bold',
              },
            },
            {
              Scope: { All: true },
              Style: {
                BackColor: '#87cefa',
                ForeColor: '#ffffff',
              },
              Rule: { BooleanExpression: '[gold] > 1 AND [sport]="Swimming" ' },
            },
          ],
        },
        NamedQuery: {
          Revision: Date.now(),
          NamedQueries: [
            {
              Name: 'US Golds',
              BooleanExpression: '[country]="United States" AND [gold] > 1',
            },
          ],
        },
        CustomSort: {
          Revision: Date.now(),
          CustomSorts: [
            {
              ColumnId: 'athlete',
              SortedValues: ['Zou Kai', 'Natalie Coughlin', 'Missy Franklin'],
            },
          ],
        },
        StyledColumn: {
          Revision: Date.now(),

          StyledColumns: [
            {
              ColumnId: 'gold',
              GradientStyle: {
                CellRanges: [{ Min: 0, Max: 10, Color: '#ffee2e' }],
              },
            },
            {
              ColumnId: 'bronze',
              GradientStyle: {
                CellRanges: [{ Min: 0, Max: 10, Color: '#ff9500' }],
              },
            },
            {
              ColumnId: 'silver',
              GradientStyle: {
                CellRanges: [{ Min: 0, Max: 10, Color: '#d3d3d3' }],
              },
            },
          ],
        },
      },
    }),
    []
  );

  const adaptableApiRef = React.useRef<AdaptableApi>(null);

  return (
    <Adaptable.Provider
      gridOptions={gridOptions}
      adaptableOptions={adaptableOptions}
      onAdaptableReady={({ adaptableApi, agGridApi }) => {
        // save a reference to adaptable api
        adaptableApiRef.current = adaptableApi;

        agGridApi.setGridOption('serverSideDatasource', createDataSource(adaptableApi));
      }}
      modules={agGridModules}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Adaptable.UI />
        <div style={{ flex: 1 }}>
          <Adaptable.AgGridReact />
        </div>
      </div>
    </Adaptable.Provider>
  );
};
