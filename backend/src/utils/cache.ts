import { redisClient } from '../config/redis.js';
import { logger } from '../config/logger.js';

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redisClient.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      logger.error({ err, key }, 'Error retrieving item from Redis cache');
      return null;
    }
  }

  static async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await redisClient.set(key, serialized, 'EX', ttlSeconds);
    } catch (err) {
      logger.error({ err, key }, 'Error writing item to Redis cache');
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (err) {
      logger.error({ err, key }, 'Error invalidating Redis cache key');
    }
  }

  static async delPattern(pattern: string): Promise<void> {
    try {
      const stream = redisClient.scanStream({ match: pattern, count: 100 });
      stream.on('data', async (keys: string[]) => {
        if (keys.length > 0) {
          const pipeline = redisClient.pipeline();
          keys.forEach((k) => pipeline.del(k));
          await pipeline.exec();
        }
      });
    } catch (err) {
      logger.error({ err, pattern }, 'Error invalidating key pattern in Redis');
    }
  }
}