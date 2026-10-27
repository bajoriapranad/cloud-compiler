import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const errorMessage = err instanceof Error ? err.message : String(err);
  logger.error('Unhandled server error during request processing', err, {
    path: req.path,
    method: req.method,
  });

  const sanitizedMessage = errorMessage
    .replace(/[a-zA-Z]:\\[^:\n]+/g, '[internal-path]')
    .replace(/\/tmp\/[^:\n]+/g, '[tmp-path]');

  res.status(500).json({
    status: 'DOCKER_ERROR',
    stdout: '',
    stderr: `[Internal Server Error]: ${sanitizedMessage}`,
    executionTime: 0,
    error: 'Internal execution error occurred',
  });
}
