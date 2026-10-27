import { Router } from 'express';
import { executeRouter } from './execute.routes.js';
import { executeController } from '../controllers/execute.controller.js';

export const apiRouter = Router();

apiRouter.get('/health', executeController.handleHealth);

apiRouter.use('/execute', executeRouter);

apiRouter.get('/history', executeController.handleGetHistory);
apiRouter.get('/history/:id', executeController.handleGetHistoryById);
apiRouter.delete('/history', executeController.handleClearHistory);
