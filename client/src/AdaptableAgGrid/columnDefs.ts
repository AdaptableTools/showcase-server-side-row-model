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
  { field: 'country', cellDataType: 'text' },
  { field: 'sport', cellDataType: 'text' },
  { field: 'year', cellDataType: 'number' },
  { field: 'gold', aggFunc: 'sum', cellDataType: 'number' },
  { field: 'silver', aggFunc: 'sum', cellDataType: 'number' },
  { field: 'bronze', aggFunc: 'sum', cellDataType: 'number' },
];
