import { Request, Response, NextFunction } from 'express';
import { SupportedLanguage } from '../types/execution.types.js';
import { config } from '../utils/config.js';

const SUPPORTED_LANGUAGES: ReadonlySet<string> = new Set<SupportedLanguage>([
  'c',
  'cpp',
  'python',
  'java',
  'javascript',
]);

export function validateExecutionRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { language, code, stdin } = req.body;

  if (!language || typeof language !== 'string') {
    res.status(400).json({
      status: 'VALIDATION_ERROR',
      stdout: '',
      stderr: 'Validation Error: "language" field is required and must be a string.',
      executionTime: 0,
      error: 'Invalid or missing language field',
    });
    return;
  }

  const normalizedLanguage = language.toLowerCase().trim();
  if (!SUPPORTED_LANGUAGES.has(normalizedLanguage)) {
    res.status(400).json({
      status: 'VALIDATION_ERROR',
      stdout: '',
      stderr: `Validation Error: Unsupported language "${language}". Supported languages are: ${Array.from(
        SUPPORTED_LANGUAGES
      ).join(', ')}.`,
      executionTime: 0,
      error: 'Unsupported language',
    });
    return;
  }

  if (code === undefined || code === null || typeof code !== 'string') {
    res.status(400).json({
      status: 'VALIDATION_ERROR',
      stdout: '',
      stderr: 'Validation Error: "code" field is required and must be a string.',
      executionTime: 0,
      error: 'Missing or invalid code field',
    });
    return;
  }

  if (code.trim().length === 0) {
    res.status(400).json({
      status: 'VALIDATION_ERROR',
      stdout: '',
      stderr: 'Validation Error: Source code cannot be empty.',
      executionTime: 0,
      error: 'Empty code submission',
    });
    return;
  }

  const codeBufferLength = Buffer.byteLength(code, 'utf8');
  if (codeBufferLength > config.MAX_SOURCE_SIZE) {
    res.status(400).json({
      status: 'VALIDATION_ERROR',
      stdout: '',
      stderr: `Validation Error: Source code size (${(codeBufferLength / 1024).toFixed(
        1
      )} KB) exceeds the maximum allowed limit of ${(config.MAX_SOURCE_SIZE / 1024).toFixed(0)} KB.`,
      executionTime: 0,
      error: 'Source code payload too large',
    });
    return;
  }

  if (stdin !== undefined && stdin !== null) {
    if (typeof stdin !== 'string') {
      res.status(400).json({
        status: 'VALIDATION_ERROR',
        stdout: '',
        stderr: 'Validation Error: "stdin" must be a string if provided.',
        executionTime: 0,
        error: 'Invalid stdin field',
      });
      return;
    }

    const stdinBufferLength = Buffer.byteLength(stdin, 'utf8');
    if (stdinBufferLength > config.MAX_STDIN_SIZE) {
      res.status(400).json({
        status: 'VALIDATION_ERROR',
        stdout: '',
        stderr: `Validation Error: Stdin size (${(stdinBufferLength / 1024).toFixed(
          1
        )} KB) exceeds the maximum allowed limit of ${(config.MAX_STDIN_SIZE / 1024).toFixed(0)} KB.`,
        executionTime: 0,
        error: 'Stdin payload too large',
      });
      return;
    }
  }

  req.body.language = normalizedLanguage;
  next();
}
