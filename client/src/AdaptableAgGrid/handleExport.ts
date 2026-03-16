import type {
  ProcessExportContext,
  Report,
  ReportColumn,
  SystemReportName,
} from '@adaptabletools/adaptable-react-aggrid';
import type { ExportResultData } from '@adaptabletools/adaptable/src/AdaptableOptions/ExportOptions';
import { API_URL } from './environment';

const REPORTS_HANDLED_CLIENT_SIDE: (SystemReportName | string)[] = [
  'Current Layout',
  'Selected Data',
];

interface RequestReportConfig {
  report: Report;
  reportColumns: ReportColumn[];
  reportQueryAST?: any;
}

export async function handleExport(
  context: ProcessExportContext
): Promise<ExportResultData | boolean> {
  const { report, reportFormat } = context;

  const isPivot = context.adaptableApi.layoutApi.isCurrentLayoutPivot();
  if (isPivot) {
    return handlePivotExport(context);
  }

  if (REPORTS_HANDLED_CLIENT_SIDE.includes(report.Name)) {
    return true;
  }

  // everything else ('All Data' or any other custom Reports) will be handled server-side

  const reportColumns = context.getReportColumns().filter((column: ReportColumn) => {
    // for simplicity's sake, we're only going to filter out the special (synthetic) columns (Calculated, FreeText, Action)
    // otherwise we would have to evaluate them on the server as well
    return !context.adaptableApi.columnApi.isCalculatedColumn(column.columnId);
  });

  const reportConfig: RequestReportConfig = {
    report,
    reportColumns,
  };

  if (report.Query?.BooleanExpression) {
    reportConfig.reportQueryAST = context.adaptableApi.expressionApi.getASTForExpression(
      report.Query.BooleanExpression
    );
  }

  const serverSideResponse = await fetch(`${API_URL}/report`, {
    method: 'post',
    body: JSON.stringify(reportConfig),
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
  const serverSideResultData: ExportResultData = await serverSideResponse.json();

  if (serverSideResultData.type !== 'json') {
    console.log(
      'In this showcase we always return JSON from the server, so this should never happen'
    );
    return serverSideResultData;
  }

  if (reportFormat === 'CSV') {
    const csvContent = context.convertToCsv(serverSideResultData.data);
    return {
      type: 'csv',
      data: csvContent,
    };
  }
  if (reportFormat === 'Excel' || reportFormat === 'VisualExcel') {
    const excelBLob = context.convertToExcel(serverSideResultData.data);
    return {
      type: 'excel',
      data: excelBLob,
    };
  }

  return serverSideResultData;
}

async function handlePivotExport(context: ProcessExportContext): Promise<ExportResultData> {
  const { reportFormat } = context;
  const adaptableApi = context.adaptableApi;
  const filterState = adaptableApi.stateApi.getAdaptableFilterState();
  const layout = adaptableApi.layoutApi.getCurrentLayout() as any;

  const pivotCols = (layout.PivotColumns ?? []).map((id: string) => ({ id, field: id }));
  const rowGroupCols = (layout.PivotGroupedColumns ?? []).map((id: string) => ({ id, field: id }));
  const valueCols = (layout.PivotAggregationColumns ?? []).map(
    (col: { ColumnId: string; AggFunc: string }) => ({
      id: col.ColumnId,
      field: col.ColumnId,
      aggFunc: col.AggFunc,
    })
  );

  const queryRequest = {
    startRow: 0,
    pivotMode: true,
    pivotCols,
    rowGroupCols,
    valueCols,
    groupKeys: [],
    sortModel: [],
    adaptableFilters: filterState.columnFilterDefs,
    gridFilterAST: filterState.gridFilterAST,
    includeSQL: true,
  };

  const httpResponse = await fetch(API_URL, {
    method: 'post',
    body: JSON.stringify(queryRequest),
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
  const response = await httpResponse.json();

  const groupColumns: ReportColumn[] = rowGroupCols.map((col: { id: string; field: string }) => ({
    columnId: col.id,
    field: col.field,
    friendlyName: col.field.charAt(0).toUpperCase() + col.field.slice(1),
    dataType: 'text' as const,
  }));

  const pivotResultColumns: ReportColumn[] = (response.pivotFields ?? []).map(
    (pf: { field: string; pivotValues: Record<string, string | number>; valueColumn: string }) => ({
      columnId: pf.field,
      field: pf.field,
      friendlyName: pf.field.replace(/_/g, ' '),
      dataType: 'number' as const,
    })
  );

  const columns = [...groupColumns, ...pivotResultColumns];
  const allFieldIds = columns.map((c) => c.field ?? c.columnId);

  const rows = (response.rows ?? []).map((row: Record<string, unknown>) => {
    const completeRow: Record<string, unknown> = {};
    for (const field of allFieldIds) {
      completeRow[field] = row[field] ?? null;
    }
    return completeRow;
  });

  const resultData: ExportResultData = {
    type: 'json',
    data: {
      columns,
      rows,
      groupColumnIds: rowGroupCols.map((c: { id: string }) => c.id),
      pivotColumnIds: pivotCols.map((c: { id: string }) => c.id),
    },
  };

  if (reportFormat === 'CSV') {
    return {
      type: 'csv',
      data: context.convertToCsv(resultData.data),
    };
  }
  if (reportFormat === 'Excel' || reportFormat === 'VisualExcel') {
    return {
      type: 'excel',
      data: context.convertToExcel(resultData.data),
    };
  }

  return resultData;
}
