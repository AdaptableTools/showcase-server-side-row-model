import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createDatabaseContext } from '../src/db/client.js';
import { seedDatabase } from '../src/db/seed.js';
import { OlympicWinnersService } from '../src/services/olympicWinnersService.js';

describe('SQLite node server API', () => {
  let tempDir = '';
  let service: OlympicWinnersService;
  let app: ReturnType<typeof createApp>;

  before(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'adaptable-node-server-'));
    const dbPath = path.join(tempDir, 'test.sqlite');
    const context = createDatabaseContext(dbPath);
    seedDatabase(context.sqlite, { force: true });
    service = new OlympicWinnersService(context);
    app = createApp(service);
  });

  after(async () => {
    service.dispose();
    if (tempDir) {
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  it('returns permitted values for a known column', async () => {
    const response = await request(app).get('/athletes/api/permitted-values').query({ columnId: 'country' });

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body));
    assert.ok(response.body.some((value: { value: string }) => value.value === 'United States'));
  });

  it('supports leaf-row paging and SQL debug output', async () => {
    const response = await request(app)
      .post('/athletes/api')
      .send({
        adaptableFilters: [],
        endRow: 10,
        groupKeys: [],
        includeSQL: true,
        pivotCols: [],
        pivotMode: false,
        rowGroupCols: [],
        sortModel: [{ colId: 'gold', sort: 'desc' }],
        startRow: 0,
        valueCols: [],
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.rows.length, 10);
    assert.equal(response.body.lastRow, -1);
    assert.match(response.body.sql, /SELECT/);
  });

  it('supports grouping and aggregation', async () => {
    const response = await request(app)
      .post('/athletes/api/query')
      .send({
        adaptableFilters: [],
        endRow: 10,
        groupKeys: [],
        pivotCols: [],
        pivotMode: false,
        rowGroupCols: [{ id: 'country', field: 'country' }],
        sortModel: [{ colId: 'gold', sort: 'desc' }],
        startRow: 0,
        valueCols: [{ id: 'gold', field: 'gold', aggFunc: 'sum' }],
      });

    assert.equal(response.status, 200);
    assert.ok(response.body.rows.length > 0);
    assert.equal(response.body.rows[0].country, 'United States');
    assert.ok(response.body.rows[0].gold >= response.body.rows[1].gold);
  });

  it('supports cleaned-up compatibility for gridFilterAST aliasing', async () => {
    const response = await request(app)
      .post('/athletes/api')
      .send({
        adaptableFilters: [],
        endRow: 5,
        gridFilterAST: {
          type: 'EQ',
          args: [
            {
              type: 'COL',
              args: ['country'],
            },
            'United States',
          ],
        },
        groupKeys: [],
        pivotCols: [],
        pivotMode: false,
        rowGroupCols: [],
        sortModel: [{ colId: 'gold', sort: 'desc' }],
        startRow: 0,
        valueCols: [],
      });

    assert.equal(response.status, 200);
    assert.ok(response.body.rows.length > 0);
    assert.ok(
      response.body.rows.every((row: { country: string }) => row.country === 'United States')
    );
  });

  it('returns pivot data and pivot field metadata', async () => {
    const response = await request(app)
      .post('/athletes/api/query')
      .send({
        adaptableFilters: [],
        endRow: 10,
        groupKeys: [],
        includeCount: true,
        pivotCols: [{ id: 'year', field: 'year' }],
        pivotMode: true,
        rowGroupCols: [{ id: 'sport', field: 'sport' }],
        sortModel: [{ colId: 'sport', sort: 'asc' }],
        startRow: 0,
        valueCols: [{ id: 'gold', field: 'gold', aggFunc: 'sum' }],
      });

    assert.equal(response.status, 200);
    assert.ok(response.body.rows.length > 0);
    assert.equal(response.body.success, true);
    assert.ok(Array.isArray(response.body.pivotFields));

    const pf = response.body.pivotFields[0];
    assert.equal(typeof pf.field, 'string');
    assert.equal(typeof pf.pivotValues, 'object');
    assert.equal(typeof pf.valueColumn, 'string');
    assert.equal(typeof pf.aggFunc, 'string');
    assert.ok(response.body.pivotFields.some((f: any) => f.pivotValues.year === 2000));
    assert.ok(response.body.pivotFields.some((f: any) => f.valueColumn === 'gold'));

    assert.equal(typeof response.body.rows[0].sport, 'string');
    assert.equal(typeof response.body.rows[0].id, 'string');
    assert.equal(typeof response.body.count, 'number');
    assert.ok(Array.isArray(response.body.pivotResultFields));
    assert.ok(response.body.pivotResultFields.includes('2000'));
  });

  it('supports multiple value columns with a single pivot column', async () => {
    const response = await request(app)
      .post('/athletes/api/query')
      .send({
        adaptableFilters: [],
        endRow: 5,
        groupKeys: [],
        includeCount: true,
        pivotCols: [{ id: 'year', field: 'year' }],
        pivotMode: true,
        rowGroupCols: [{ id: 'country', field: 'country' }],
        sortModel: [],
        startRow: 0,
        valueCols: [
          { id: 'gold', field: 'gold', aggFunc: 'sum' },
          { id: 'silver', field: 'silver', aggFunc: 'sum' },
          { id: 'bronze', field: 'bronze', aggFunc: 'sum' },
        ],
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.ok(response.body.rows.length > 0);

    assert.ok(response.body.pivotResultFields.some((f: string) => f === '2000_gold'));
    assert.ok(response.body.pivotResultFields.some((f: string) => f === '2000_silver'));
    assert.ok(response.body.pivotResultFields.some((f: string) => f === '2000_bronze'));

    assert.ok(response.body.pivotFields.some((f: any) => f.pivotValues.year === 2000));
    assert.ok(response.body.pivotFields.some((f: any) => f.valueColumn === 'gold'));
    assert.ok(response.body.pivotFields.some((f: any) => f.valueColumn === 'silver'));
    assert.ok(response.body.pivotFields.some((f: any) => f.valueColumn === 'bronze'));
    assert.equal(response.body.pivotFields[0].aggFunc, 'sum');
  });

  it('supports multiple pivot columns', async () => {
    const yearFilter = {
      dataType: 'number',
      columnFilter: {
        ColumnId: 'year',
        Predicates: [{ PredicateId: 'Values', Inputs: [2000, 2004, 2008] }],
      },
    };
    const sportFilter = {
      dataType: 'text',
      columnFilter: {
        ColumnId: 'sport',
        Predicates: [{ PredicateId: 'In', Inputs: ['Swimming', 'Athletics', 'Gymnastics'] }],
      },
    };

    const response = await request(app)
      .post('/athletes/api/query')
      .send({
        adaptableFilters: [yearFilter, sportFilter],
        endRow: 5,
        groupKeys: [],
        includeCount: true,
        pivotCols: [
          { id: 'year', field: 'year' },
          { id: 'sport', field: 'sport' },
        ],
        pivotMode: true,
        rowGroupCols: [{ id: 'country', field: 'country' }],
        sortModel: [],
        startRow: 0,
        valueCols: [{ id: 'gold', field: 'gold', aggFunc: 'sum' }],
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.ok(response.body.rows.length > 0);

    assert.ok(
      response.body.pivotFields.some(
        (f: any) =>
          typeof f.pivotValues.year === 'number' && typeof f.pivotValues.sport === 'string'
      )
    );
    assert.ok(response.body.pivotFields.every((f: any) => f.valueColumn === 'gold'));

    assert.ok(
      response.body.pivotResultFields.some((f: string) => {
        const parts = f.split('_');
        return parts.length === 2 && !Number.isNaN(Number(parts[0]));
      })
    );

    const row = response.body.rows[0];
    assert.equal(typeof row.country, 'string');
    assert.equal(typeof row.id, 'string');
  });

  it('supports multiple pivot columns with multiple value columns', async () => {
    const yearFilter = {
      dataType: 'number',
      columnFilter: {
        ColumnId: 'year',
        Predicates: [{ PredicateId: 'Values', Inputs: [2000, 2008] }],
      },
    };
    const sportFilter = {
      dataType: 'text',
      columnFilter: {
        ColumnId: 'sport',
        Predicates: [{ PredicateId: 'In', Inputs: ['Swimming', 'Athletics'] }],
      },
    };

    const response = await request(app)
      .post('/athletes/api/query')
      .send({
        adaptableFilters: [yearFilter, sportFilter],
        endRow: 3,
        groupKeys: [],
        pivotCols: [
          { id: 'year', field: 'year' },
          { id: 'sport', field: 'sport' },
        ],
        pivotMode: true,
        rowGroupCols: [{ id: 'country', field: 'country' }],
        sortModel: [],
        startRow: 0,
        valueCols: [
          { id: 'gold', field: 'gold', aggFunc: 'sum' },
          { id: 'silver', field: 'silver', aggFunc: 'sum' },
        ],
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.ok(response.body.rows.length > 0);

    assert.ok(
      response.body.pivotResultFields.some((f: string) => {
        const parts = f.split('_');
        return parts.length === 3 && parts[2] === 'gold';
      })
    );
    assert.ok(
      response.body.pivotResultFields.some((f: string) => {
        const parts = f.split('_');
        return parts.length === 3 && parts[2] === 'silver';
      })
    );

    assert.ok(
      response.body.pivotFields.some(
        (f: any) => 'year' in f.pivotValues && 'sport' in f.pivotValues
      )
    );
    assert.ok(response.body.pivotFields.some((f: any) => f.valueColumn === 'gold'));
    assert.ok(response.body.pivotFields.some((f: any) => f.valueColumn === 'silver'));
  });
});
