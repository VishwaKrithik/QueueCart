import { ConsumeMessage } from 'amqplib';
import { getRabbitChannel, RABBIT_CONFIG } from '../config/rabbitmq.js';
import { logger } from '../config/logger.js';
import { OrderCreatedPayload } from '../modules/orders/order.publisher.js';

const processOrderBusinessLogic = async (data: OrderCreatedPayload): Promise<void> => {
  logger.info({ orderNumber: data.orderNumber }, 'Worker processing order fulfillment...');
  // Simulated processing delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Simulating random downstream failure for verification if quantity === 99
  if (data.items.some((i) => i.quantity === 99)) {
    throw new Error('Downstream payment gateway timeout simulation');
  }

  logger.info({ orderNumber: data.orderNumber }, 'Order fulfillment & notification succeeded');
};

export const startOrderWorker = async (): Promise<void> => {
  const channel = await getRabbitChannel();
  await channel.prefetch(5); // Fair dispatch

  logger.info(`Worker listening on queue: ${RABBIT_CONFIG.QUEUE_MAIN}`);

  channel.consume(
    RABBIT_CONFIG.QUEUE_MAIN,
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const rawPayload = msg.content.toString();
      const orderData: OrderCreatedPayload = JSON.parse(rawPayload);

      // Read retry count from custom header or fallback to x-death
      const headers = msg.properties.headers || {};
      const currentRetries = Number(headers['x-retry-count'] || 0);

      try {
        await processOrderBusinessLogic(orderData);
        channel.ack(msg);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        logger.error(
          { orderNumber: orderData.orderNumber, attempt: currentRetries + 1, error: errorMsg },
          'Error processing order event'
        );

        if (currentRetries < RABBIT_CONFIG.MAX_RETRIES) {
          logger.warn(
            { orderNumber: orderData.orderNumber, nextAttempt: currentRetries + 1 },
            'Forwarding to retry exchange with TTL'
          );

          // Route to retry exchange with incremented retry count
          channel.publish(
            RABBIT_CONFIG.RETRY_EXCHANGE,
            RABBIT_CONFIG.ROUTING_KEY_ORDER_CREATED,
            msg.content,
            {
              persistent: true,
              headers: {
                ...headers,
                'x-retry-count': currentRetries + 1,
              },
            }
          );
          channel.ack(msg);
        } else {
          logger.error(
            { orderNumber: orderData.orderNumber, attempts: currentRetries },
            'Max retry limit exhausted. Routing directly to Dead Letter Queue (DLQ).'
          );

          channel.publish(
            RABBIT_CONFIG.DLX_EXCHANGE,
            'dlq.exhausted',
            msg.content,
            {
              persistent: true,
              headers: {
                ...headers,
                'x-dlq-reason': errorMsg,
                'x-failed-at': new Date().toISOString(),
              },
            }
          );
          channel.ack(msg);
        }
      }
    },
    { noAck: false }
  );
};