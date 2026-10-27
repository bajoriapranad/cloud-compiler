import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { ExecutionStatus, SupportedLanguage } from '../types/execution.types.js';

export interface SubmissionRecord {
  id: string;
  language: SupportedLanguage;
  code: string;
  stdin?: string;
  stdout: string;
  stderr: string;
  status: ExecutionStatus;
  compileTime?: number | null;
  executionTime: number;
  exitCode?: number | null;
  createdAt: string;
}

export class DbService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    const dbDir = path.resolve(process.cwd(), 'database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.dbPath = path.join(dbDir, 'compiler.db');
    this.init();
  }

  private init(): void {
    try {
      this.db = new Database(this.dbPath, { timeout: 5000 });
      this.db.pragma('journal_mode = WAL');
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS submissions (
          id TEXT PRIMARY KEY,
          language TEXT NOT NULL,
          code TEXT NOT NULL,
          stdin TEXT,
          stdout TEXT,
          stderr TEXT,
          status TEXT NOT NULL,
          compile_time INTEGER,
          execution_time INTEGER,
          exit_code INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      logger.info(`SQLite database initialized at ${this.dbPath}`);
    } catch (err) {
      logger.error('Failed to initialize SQLite database', err);
      this.db = null;
    }
  }

  public saveSubmission(data: {
    language: SupportedLanguage;
    code: string;
    stdin?: string;
    stdout: string;
    stderr: string;
    status: ExecutionStatus;
    compileTime?: number;
    executionTime: number;
    exitCode?: number;
  }): SubmissionRecord | null {
    if (!this.db) return null;

    const id = `sub_${uuidv4().substring(0, 8)}`;
    const createdAt = new Date().toISOString();

    try {
      const stmt = this.db.prepare(`
        INSERT INTO submissions (
          id, language, code, stdin, stdout, stderr, status, compile_time, execution_time, exit_code, created_at
        ) VALUES (
          @id, @language, @code, @stdin, @stdout, @stderr, @status, @compileTime, @executionTime, @exitCode, @createdAt
        )
      `);

      stmt.run({
        id,
        language: data.language,
        code: data.code,
        stdin: data.stdin || '',
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        status: data.status,
        compileTime: data.compileTime ?? null,
        executionTime: data.executionTime,
        exitCode: data.exitCode ?? null,
        createdAt,
      });

      return {
        id,
        language: data.language,
        code: data.code,
        stdin: data.stdin,
        stdout: data.stdout,
        stderr: data.stderr,
        status: data.status,
        compileTime: data.compileTime,
        executionTime: data.executionTime,
        exitCode: data.exitCode,
        createdAt,
      };
    } catch (err) {
      logger.error('Failed to save submission to SQLite', err);
      return null;
    }
  }

  public getRecentSubmissions(limit = 30): Omit<SubmissionRecord, 'code'>[] {
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare(`
        SELECT id, language, stdin, stdout, stderr, status, compile_time as compileTime, execution_time as executionTime, exit_code as exitCode, created_at as createdAt
        FROM submissions
        ORDER BY created_at DESC
        LIMIT ?
      `);

      return stmt.all(limit) as Omit<SubmissionRecord, 'code'>[];
    } catch (err) {
      logger.error('Failed to query submissions from SQLite', err);
      return [];
    }
  }

  public getSubmissionById(id: string): SubmissionRecord | null {
    if (!this.db) return null;

    try {
      const stmt = this.db.prepare(`
        SELECT id, language, code, stdin, stdout, stderr, status, compile_time as compileTime, execution_time as executionTime, exit_code as exitCode, created_at as createdAt
        FROM submissions
        WHERE id = ?
      `);

      const row = stmt.get(id) as SubmissionRecord | undefined;
      return row || null;
    } catch (err) {
      logger.error(`Failed to fetch submission ${id} from SQLite`, err);
      return null;
    }
  }

  public clearHistory(): boolean {
    if (!this.db) return false;

    try {
      this.db.exec('DELETE FROM submissions');
      this.db.pragma('wal_checkpoint(TRUNCATE)');
      logger.info('Submission history cleared');
      return true;
    } catch (err) {
      logger.error('Failed to clear submission history', err);
      return false;
    }
  }
}

export const dbService = new DbService();
