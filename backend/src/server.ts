import { createApp } from './app.js';
import { config } from './utils/config.js';
import { logger } from './utils/logger.js';
import { dockerService } from './services/docker.service.js';
import { setupInteractiveWebSocket } from './services/interactive.service.js';

const app = createApp();

const server = app.listen(config.PORT, async () => {
  logger.info(`=======================================================`);
  logger.info(`🚀 Cloud Compiler Backend API running on port ${config.PORT}`);
  logger.info(`   Environment: ${config.NODE_ENV}`);
  logger.info(`   Sandbox Image: ${config.DOCKER_IMAGE}`);
  logger.info(`   Health Endpoint: http://localhost:${config.PORT}/api/health`);
  logger.info(`   Execute Endpoint: http://localhost:${config.PORT}/api/execute`);
  logger.info(`   WebSocket Endpoint: ws://localhost:${config.PORT}/ws/execute`);
  logger.info(`=======================================================`);

  setupInteractiveWebSocket(server);

  const dockerStatus = await dockerService.checkDockerAvailability();
  if (dockerStatus.available) {
    logger.info(`🐳 Docker Engine Connected: ${dockerStatus.info}`);
  } else {
    logger.warn(`Docker Daemon is not running: ${dockerStatus.error}`);
  }
});

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
