import { ColDef } from '@ag-grid-community/core';

export const defaultColDef: ColDef = {
  sortable: true,
  filter: true,
  floatingFilter: true,
  enableRowGroup: true,
};

export const columnDefs: ColDef[] = [
  { field: 'id', hide: true, type: 'abColDefString' },
  { field: 'athlete', type: 'abColDefString' },
  { field: 'country', type: 'abColDefString' },
  { field: 'sport', type: 'abColDefString' },
  { field: 'year', type: 'abColDefNumber' },
  { field: 'gold', aggFunc: 'sum', type: 'abColDefNumber' },
  { field: 'silver', aggFunc: 'sum', type: 'abColDefNumber' },
  { field: 'bronze', aggFunc: 'sum', type: 'abColDefNumber' },
];
