import { ColDef } from 'ag-grid-enterprise';

export const defaultColDef: ColDef = {
  sortable: true,
  filter: true,
  floatingFilter: true,
  enableRowGroup: true,
};

export const columnDefs: ColDef[] = [
  { field: 'id', hide: true, cellDataType: 'text' },
  { field: 'athlete', cellDataType: 'text' },
  { field: 'country', cellDataType: 'text', enablePivot: true },
  { field: 'sport', cellDataType: 'text', enablePivot: true },
  { field: 'year', cellDataType: 'number', enablePivot: true },
  { field: 'gold', aggFunc: 'sum', cellDataType: 'number', enableValue: true },
  { field: 'silver', aggFunc: 'sum', cellDataType: 'number', enableValue: true },
  { field: 'bronze', aggFunc: 'sum', cellDataType: 'number', enableValue: true },
];
