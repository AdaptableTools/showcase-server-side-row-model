import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { dataDir } from './config.js';

const orders10k = JSON.parse(readFileSync(path.join(dataDir, 'orders10k.json'), 'utf-8')).orders;
const orders50k = JSON.parse(readFileSync(path.join(dataDir, 'orders50k.json'), 'utf-8')).orders;
const orders100k = [
  ...orders50k,
  ...orders50k.map((item: Record<string, unknown>, index: number) => ({
    ...item,
    id: index + 50_001,
  })),
];

export const ordersRouter = Router();

ordersRouter.get('/10k', (_req, res) => {
  res.json(orders10k);
});

ordersRouter.get('/50k', (_req, res) => {
  res.json(orders50k);
});

ordersRouter.get('/100k', (_req, res) => {
  res.json(orders100k);
});
