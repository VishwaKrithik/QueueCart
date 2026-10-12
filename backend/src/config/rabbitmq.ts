import amqplib, { Channel, ChannelModel } from 'amqplib';
import { logger } from './logger.js';

export const RABBIT_CONFIG = {
  EXCHANGE: 'ecommerce.events',
  RETRY_EXCHANGE: 'ecommerce.retry.exchange',
  DLX_EXCHANGE: 'ecommerce.dlx',

  QUEUE_MAIN: 'order.process.queue',
  QUEUE_RETRY: 'order.retry.queue',
  QUEUE_DLQ: 'order.dlq',

  ROUTING_KEY_ORDER_CREATED: 'order.created',
  MAX_RETRIES: 3,
  RETRY_TTL: 5000, // 5 seconds exponential baseline
};

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export const getRabbitChannel = async (): Promise<Channel> => {
  if (channel) return channel;

  const url = process.env.RABBITMQ_URL || 'amqp://rabbit_user:rabbit_secure_password@localhost:5672';
  try {
    connection = await amqplib.connect(url);
    console.log("hello");
    channel = await connection.createChannel();


    connection.on('error', (err) => {
      logger.error({ err }, 'RabbitMQ connection dropped');
      channel = null;
      connection = null;
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      channel = null;
      connection = null;
    });

    await initializeTopology(channel);
    return channel;
  } catch (error) {
    logger.error({ error }, 'Failed to connect to RabbitMQ');
    throw error;
  }
};

const initializeTopology = async (ch: Channel) => {
  // 1. Declare Primary Exchanges
  await ch.assertExchange(RABBIT_CONFIG.EXCHANGE, 'topic', { durable: true });
  await ch.assertExchange(RABBIT_CONFIG.RETRY_EXCHANGE, 'topic', { durable: true });
  await ch.assertExchange(RABBIT_CONFIG.DLX_EXCHANGE, 'topic', { durable: true });

  // 2. Declare Dead Letter Queue (DLQ)
  await ch.assertQueue(RABBIT_CONFIG.QUEUE_DLQ, { durable: true });
  await ch.bindQueue(RABBIT_CONFIG.QUEUE_DLQ, RABBIT_CONFIG.DLX_EXCHANGE, '#');

  // 3. Declare Retry Queue with message TTL forwarding back to main exchange
  await ch.assertQueue(RABBIT_CONFIG.QUEUE_RETRY, {
    durable: true,
    deadLetterExchange: RABBIT_CONFIG.EXCHANGE,
    messageTtl: RABBIT_CONFIG.RETRY_TTL,
  });
  await ch.bindQueue(RABBIT_CONFIG.QUEUE_RETRY, RABBIT_CONFIG.RETRY_EXCHANGE, '#');

  // 4. Declare Main Order Queue with DLX fallback
  await ch.assertQueue(RABBIT_CONFIG.QUEUE_MAIN, {
    durable: true,
    deadLetterExchange: RABBIT_CONFIG.DLX_EXCHANGE,
  });
  await ch.bindQueue(
    RABBIT_CONFIG.QUEUE_MAIN,
    RABBIT_CONFIG.EXCHANGE,
    RABBIT_CONFIG.ROUTING_KEY_ORDER_CREATED
  );

  logger.info('RabbitMQ DLQ and Retry Topology provisioned successfully');
};