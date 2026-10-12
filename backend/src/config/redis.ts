import Redis from 'ioredis';
import Redlock from 'redlock';
import { logger } from './logger.js';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'redis_secure_password';

export const redisClient = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 100, 3000);
    logger.warn(`Redis reconnect attempt #${times} in ${delay}ms`);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis server successfully');
});

redisClient.on('error', (err) => {
  logger.error({ err }, 'Redis connection error encountered');
});

// Initialize Redlock on single/multi node configurations
export const redlock = new Redlock([redisClient], {
  driftFactor: 0.01,
  retryCount: 5,
  retryDelay: 200, // ms between attempts
  retryJitter: 100, // random jitter to reduce contention
  automaticExtensionThreshold: 500, // ms
});

redlock.on('error', (error) => {
  // Ignore resource locked failures; log actual hardware/network failures
  logger.warn({ error: error.message }, 'Redlock contention or failure noticed');
});