import {
  ProcessExportContext,
  Report,
  ReportColumn,
  SystemReportName,
} from '@adaptabletools/adaptable-react-aggrid';
import { API_URL } from './environment';
import { ExportResultData } from '@adaptabletools/adaptable/src/AdaptableOptions/ExportOptions';

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
  if (REPORTS_HANDLED_CLIENT_SIDE.includes(report.Name)) {
    //  these reports are client-side specific and will be handled by the default behaviour (which is to export the client-side data)
    return true;
  }

  // everything else ('All Data' or any other custom Reports) will be handled server-side

  const reportColumns =
    report.Name === 'All Data'
      ? // sending an empty array will cause the server to use all columns
        []
      : context.getReportColumns().filter((column) => {
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
