import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { SupportedLanguage, WorkspaceMetadata } from '../types/execution.types.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

const LANGUAGE_FILE_MAP: Record<SupportedLanguage, string> = {
  c: 'main.c',
  cpp: 'main.cpp',
  python: 'main.py',
  java: 'Main.java',
  javascript: 'main.js',
};

export class WorkspaceService {
  private baseDir: string;

  constructor() {
    this.baseDir = config.WORKSPACE_BASE_DIR || path.join(os.tmpdir(), 'cloud-compiler-workspaces');
    this.ensureBaseDir();
  }

  private ensureBaseDir(): void {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch (err) {
      logger.error('Failed to create workspace base directory, using OS tmpdir fallback', err);
      this.baseDir = path.join(os.tmpdir(), 'cloud-compiler-workspaces');
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  public async createWorkspace(
    language: SupportedLanguage,
    code: string,
    stdin?: string
  ): Promise<WorkspaceMetadata> {
    const executionId = `exec-${uuidv4()}`;
    const workspacePath = path.join(this.baseDir, executionId);
    
    await fs.promises.mkdir(workspacePath, { recursive: true });

    const sourceFileName = LANGUAGE_FILE_MAP[language];
    const sourceFilePath = path.join(workspacePath, sourceFileName);
    const stdinFilePath = path.join(workspacePath, 'input.txt');

    await fs.promises.writeFile(sourceFilePath, code, 'utf8');
    await fs.promises.writeFile(stdinFilePath, stdin || '', 'utf8');

    logger.debug(`Created ephemeral workspace for ${executionId}`, {
      language,
      workspacePath,
    });

    return {
      executionId,
      workspacePath,
      sourceFileName,
      sourceFilePath,
      stdinFilePath,
    };
  }

  public async cleanupWorkspace(workspacePath: string): Promise<void> {
    if (!workspacePath) return;

    try {
      if (fs.existsSync(workspacePath)) {
        await fs.promises.rm(workspacePath, { recursive: true, force: true });
        logger.debug(`Successfully cleaned up workspace ${workspacePath}`);
      }
    } catch (err) {
      logger.error(`Error during workspace cleanup for ${workspacePath}`, err);
    }
  }
}

export const workspaceService = new WorkspaceService();
