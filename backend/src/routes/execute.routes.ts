import { Router } from 'express';
import { executeController } from '../controllers/execute.controller.js';
import { validateExecutionRequest } from '../middleware/validation.middleware.js';

export const executeRouter = Router();

executeRouter.post('/', validateExecutionRequest, executeController.handleExecute);
executeRouter.post('/batch', executeController.handleBatchExecute);
executeRouter.post('/optimize', executeController.handleOptimizeBenchmark);
