import * as React from 'react';
import { useMemo } from 'react';
import { LicenseManager, GridOptions, themeQuartz } from 'ag-grid-enterprise';
import type {
  AdaptableApi,
  AdaptableOptions,
  BooleanFunctionName,
  AdaptableButton,
  CustomToolbarButtonContext,
  ModuleExpressionFunctionsContext,
  CustomInFilterValuesContext,
} from '@adaptabletools/adaptable-react-aggrid';
import { Adaptable } from '@adaptabletools/adaptable-react-aggrid';
import { columnDefs, defaultColDef } from './columnDefs';
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
  const gridOptions = useMemo<GridOptions<any>>(
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
  const adaptableOptions = useMemo<AdaptableOptions<any>>(
    () => ({
      licenseKey: import.meta.env.VITE_ADAPTABLE_LICENSE_KEY,
      primaryKey: 'id',
      userName: 'Server-side Demo User',
      adaptableId: 'AdapTable using Server-Side Row Model!',
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
                  category: 'Custom',
                  isPredicate: true,
                  returnType: 'boolean',
                  description: 'Returns true if country is in Europe',
                  signatures: ['FROM_EUROPE([country]'],
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
        customInFilterValues: async (context: CustomInFilterValuesContext) => {
          let columnId = context.column.columnId;
          if (columnId === 'ag-Grid-AutoColumn') {
            columnId = context.adaptableApi.layoutApi.getCurrentLayout().RowGroupedColumns?.[0] || '';
          }
          const permittedValues = await getPermittedValues(columnId);
          return {
            values: permittedValues,
          };
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
              GridFilter: { Expression: '[gold]=8' },
              TableColumns: [
                'athlete',
                'gold',
                'silver',
                'bronze',
                'totalMedals',
                'country',
                'sport',
                'year',
                'date_iso'
              ],
              ColumnHeaders: {
                date_iso: 'Date',
              },
              ColumnSizing: {
                athlete: { Width: 175 },
                bronze: { Width: 85 },
                country: { Width: 125 },
                gold: { Width: 100 },
                id: { Width: 50 },
                silver: { Width: 100 },
                sport: { Width: 175 },
                totalMedals: { Width: 100 },
                year: { Width: 115 },
              },
            },
            {
              Name: 'Grouped By Country',
              TableColumns: [
                'athlete',
                'gold',
                'silver',
                'bronze',
                'totalMedals',
                'country',
                'sport',
                'year',
                'date_iso'
              ],
              RowGroupedColumns: ['country'],
              ColumnHeaders: {
                date_iso: 'Date',
              },
              ColumnSizing: {
                athlete: { Width: 175 },
                bronze: { Width: 85 },
                country: { Width: 125 },
                gold: { Width: 100 },
                id: { Width: 50 },
                silver: { Width: 100 },
                sport: { Width: 175 },
                totalMedals: { Width: 100 },
                year: { Width: 115 },
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
                {
                  ColumnId: 'silver',
                  AggFunc: 'sum',
                },
                {
                  ColumnId: 'bronze',
                  AggFunc: 'sum',
                }
              ],
            },
          ],
        },
        Alert: {
          Revision: Date.now(),
          AlertDefinitions: [
            {
              Name: 'New Gold Win',
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
                    Command: ['jump-to-cell', 'highlight-cell'],
                    ButtonStyle: {
                      variant: 'raised',
                    },
                  },
                ],
              },
            },
            {
              Name: 'Won 3 more Gold Medals',
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
                Groupable: false,
              },
              FriendlyName: 'Total',
            },
          ],
        },
        FormatColumn: {
          Revision: Date.now(),
          FormatColumns: [
            {
              Name: 'Gold, Silver, Bronze',
              Scope: {
                ColumnIds: ['gold', 'silver', 'bronze'],
              },
              Style: {
                Alignment: 'Right',
              }
            },
            {
              Name: 'Athlete',
              Scope: {
                ColumnIds: ['athlete'],
              },
              Style: {
                FontWeight: 'Bold',
              },
            },
            {
              Name: 'Gold > 1 and Swimming',
              Scope: { All: true },
              // Style: {
              //   BackColor: '#87cefa',
              //   ForeColor: '#ffffff',
              // },
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
              Name: 'Athlete',
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
