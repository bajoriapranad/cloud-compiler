import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  COMPILE_TIMEOUT_MS: parseInt(process.env.COMPILE_TIMEOUT_MS || '15000', 10),
  EXECUTION_TIMEOUT_MS: parseInt(process.env.EXECUTION_TIMEOUT_MS || '3000', 10),
  MAX_SOURCE_SIZE: parseInt(process.env.MAX_SOURCE_SIZE || '102400', 10),
  MAX_STDIN_SIZE: parseInt(process.env.MAX_STDIN_SIZE || '32768', 10),
  MAX_OUTPUT_SIZE: parseInt(process.env.MAX_OUTPUT_SIZE || '65536', 10),
  
  DOCKER_IMAGE: process.env.DOCKER_SANDBOX_IMAGE || 'cloud-compiler-sandbox:latest',
  MEMORY_LIMIT: process.env.DOCKER_MEMORY_LIMIT || '128m',
  CPU_LIMIT: process.env.DOCKER_CPU_LIMIT || '0.5',
  PIDS_LIMIT: parseInt(process.env.DOCKER_PIDS_LIMIT || '64', 10),
  
  WORKSPACE_BASE_DIR: process.env.WORKSPACE_BASE_DIR || path.join(process.cwd(), 'tmp-workspaces'),
};
