import { createApp } from './app.js';
import { logger } from './config/logger.js';
import { prisma } from './utils/prisma.js';
import { redisClient } from './config/redis.js';
import { getRabbitChannel } from './config/rabbitmq.js';
import { startOrderWorker } from './workers/orderConsumer.js';

const PORT = Number(process.env.PORT) || 5000;
const app = createApp();

let rabbitConnection: any = null;
let rabbitChannel: any = null;

const server = app.listen(PORT, async () => {
  try {
    // 1. Connect to PostgreSQL via Prisma
    await prisma.$connect();
    logger.info('PostgreSQL connected successfully via Prisma');

    // 2. Validate Redis connectivity
    await redisClient.ping();
    logger.info('Redis cache and lock store connected successfully');

    // 3. Initialize RabbitMQ topology & start background worker
    rabbitChannel = await getRabbitChannel();
    rabbitConnection = rabbitChannel.connection;
    await startOrderWorker();
    logger.info('RabbitMQ background worker initialized and consuming');

    logger.info(`Server operational and listening on http://localhost:${PORT}`);
  } catch (error) {
    logger.error({ error }, 'Failed to bootstrap server components:');
    process.exit(1);
  }
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Initiating graceful termination...`);

  // Force close fallback if connections hang
  const forceKillTimeout = setTimeout(() => {
    logger.error('Forceful shutdown executed: termination timed out after 10s.');
    process.exit(1);
  }, 10000);

  server.close(async () => {
    logger.info('HTTP server closed. Releasing active connections...');

    try {
      // 1. Close RabbitMQ channel & connection
      if (rabbitChannel) {
        await rabbitChannel.close();
      }
      if (rabbitConnection) {
        await rabbitConnection.close();
      }
      logger.info('RabbitMQ connections closed.');

      // 2. Disconnect Redis
      await redisClient.quit();
      logger.info('Redis connection closed.');

      // 3. Disconnect Prisma
      await prisma.$disconnect();
      logger.info('Prisma disconnected.');

      clearTimeout(forceKillTimeout);
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error occurred during graceful teardown');
      clearTimeout(forceKillTimeout);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));