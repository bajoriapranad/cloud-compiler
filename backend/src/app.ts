import express, { Express } from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json({ limit: '200kb' }));

  app.use('/api', apiRouter);

  app.use((_req, res) => {
    res.status(404).json({
      status: 'VALIDATION_ERROR',
      stdout: '',
      stderr: 'Endpoint not found. Use /api/health or /api/execute.',
      executionTime: 0,
      error: 'Not Found',
    });
  });

  app.use(errorHandler);

  return app;
}
