import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import {
  permittedValuesQuerySchema,
  queryRequestSchema,
  reportRequestSchema,
} from './contracts/api.js';
import { OlympicWinnersService } from './services/olympicWinnersService.js';
import { dataDir } from './config.js';
import { ordersRouter } from './ordersRouter.js';
import { carsRouter } from './carsRouter.js';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function asyncHandler(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

export function createApp(service: OlympicWinnersService = new OlympicWinnersService()) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/data', express.static(dataDir));

  app.use('/orders', ordersRouter);
  app.use('/cars', carsRouter);

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post(
    '/athletes/api/query',
    asyncHandler(async (req, res) => {
      const request = queryRequestSchema.parse(req.body);
      res.json(service.getData(request));
    })
  );

  app.post(
    '/athletes/api',
    asyncHandler(async (req, res) => {
      const request = queryRequestSchema.parse(req.body);
      res.json(service.getData(request));
    })
  );

  app.get(
    '/athletes/api/permitted-values',
    asyncHandler(async (req, res) => {
      const query = permittedValuesQuerySchema.parse(req.query);
      res.json(service.getPermittedValues(query.columnId));
    })
  );

  app.post(
    '/athletes/api/report',
    asyncHandler(async (req, res) => {
      const request = reportRequestSchema.parse(req.body);
      res.json(service.getReportData(request));
    })
  );

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Invalid request payload',
        issues: error.issues,
      });
      return;
    }

    if (error instanceof Error) {
      res.status(400).json({
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Unexpected server error',
    });
  });

  return app;
}
