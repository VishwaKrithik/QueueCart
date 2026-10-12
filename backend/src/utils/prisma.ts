import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import { logger } from '../config/logger.js';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Type alias preserving the custom event log subscriptions
type ExtendedPrismaClient = PrismaClient<
  Prisma.PrismaClientOptions,
  'query' | 'error' | 'warn'
>;

declare global {
  // eslint-disable-next-line no-var
  var prismaClientGlobal: ExtendedPrismaClient | undefined;
}

export const prisma: ExtendedPrismaClient =
  globalThis.prismaClientGlobal ??
  (new PrismaClient({
    adapter,
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  }) as ExtendedPrismaClient);

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaClientGlobal = prisma;
}

// Strictly typed query profiling
prisma.$on('query', (e: Prisma.QueryEvent) => {
  if (e.duration > 100) {
    logger.warn(
      {
        duration: `${e.duration}ms`,
        query: e.query,
        params: e.params,
      },
      'Slow Query Detected'
    );
  }
});

prisma.$on('error', (e: Prisma.LogEvent) => {
  logger.error({ target: e.target, message: e.message }, 'Prisma Engine Error');
});

prisma.$on('warn', (e: Prisma.LogEvent) => {
  logger.warn({ target: e.target, message: e.message }, 'Prisma Warning');
});

export { pool };