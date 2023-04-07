import { PreProcessExportContext, ReportData } from '@adaptabletools/adaptable-react-aggrid';
import { API_URL } from './environment';

export async function preProcessExport(context: PreProcessExportContext) {
  return true;
}
