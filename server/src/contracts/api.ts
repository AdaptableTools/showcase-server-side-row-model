import { z } from 'zod';

const primitiveValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const inputValueSchema: z.ZodType = z.union([
  primitiveValueSchema,
  z.array(primitiveValueSchema),
]);

const predicateSchema = z.object({
  PredicateId: z.string().min(1),
  Inputs: z.array(inputValueSchema).optional(),
});

const columnFilterSchema = z.object({
  ColumnId: z.string().min(1),
  Predicates: z.array(predicateSchema).optional(),
});

export const adaptableFilterSchema = z.object({
  dataType: z.enum(['text', 'number', 'date', 'boolean', 'groupColumn']),
  columnFilter: columnFilterSchema,
});

const columnReferenceSchema = z.object({
  id: z.string().min(1),
  field: z.string().optional(),
});

const valueColumnSchema = columnReferenceSchema.extend({
  aggFunc: z.string().optional(),
});

const sortModelSchema = z.object({
  colId: z.string().min(1),
  sort: z.enum(['asc', 'desc']),
  sortedValues: z.array(z.string()).optional(),
});

export const queryRequestSchema = z
  .object({
    startRow: z.number().int().nonnegative().default(0),
    endRow: z.number().int().nonnegative().optional(),
    rowGroupCols: z.array(columnReferenceSchema).default([]),
    valueCols: z.array(valueColumnSchema).default([]),
    pivotCols: z.array(columnReferenceSchema).default([]),
    pivotMode: z.boolean().default(false),
    groupKeys: z.array(z.string()).default([]),
    sortModel: z.array(sortModelSchema).default([]),
    adaptableFilters: z.array(adaptableFilterSchema).default([]),
    gridFilterAST: z.unknown().optional(),
    includeCount: z.boolean().default(false),
    includeSQL: z.boolean().default(false),
  })
  .transform((input) => ({
    ...input,
  }));

const reportColumnSchema = z
  .object({
    field: z.string().optional(),
    columnId: z.string().optional(),
  })
  .refine((value) => Boolean(value.field || value.columnId), {
    message: 'Each report column must include a field or columnId.',
  });

export const reportRequestSchema = z.object({
  report: z.record(z.string(), z.unknown()),
  reportColumns: z.array(reportColumnSchema).default([]),
  reportQueryAST: z.unknown().optional(),
});

export const permittedValuesQuerySchema = z.object({
  columnId: z.string().min(1),
});

export type AdaptableFilter = z.infer<typeof adaptableFilterSchema>;
export type NormalizedQueryRequest = z.output<typeof queryRequestSchema>;
export type ReportRequest = z.infer<typeof reportRequestSchema>;

export interface PermittedValue {
  label: string;
  value: string | number | boolean | null;
}

export interface PivotFieldDefinition {
  field: string;
  headerName: string;
  pivotValues: Record<string, string>;
  valueColumn: string;
  aggFunc: string;
}

export interface PivotFieldEntry {
  field: string;
  pivotValues: Record<string, string | number>;
  valueColumn: string;
  aggFunc: string;
}

export interface QueryResponse {
  success: boolean;
  rows: Record<string, unknown>[];
  lastRow: number;
  count?: number;
  sql?: string;
  pivotFields?: PivotFieldEntry[];
  pivotResultFields?: string[];
}

export interface ReportResponse {
  type: 'json';
  data: {
    rows: Record<string, unknown>[];
    columns: Array<{ field?: string | undefined; columnId?: string | undefined }>;
    sql: string;
  };
}
