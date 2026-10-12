import { getRabbitChannel, RABBIT_CONFIG } from '../../config/rabbitmq.js';
import { logger } from '../../config/logger.js';

export interface OrderCreatedPayload {
  orderId: string;
  orderNumber: string;
  userId: string;
  totalAmount: string;
  items: Array<{ productId: string; quantity: number; unitPrice: string }>;
}

export class OrderPublisher {
  static async publishOrderCreated(payload: OrderCreatedPayload): Promise<boolean> {
    const channel = await getRabbitChannel();
    const content = Buffer.from(JSON.stringify(payload));

    const published = channel.publish(
      RABBIT_CONFIG.EXCHANGE,
      RABBIT_CONFIG.ROUTING_KEY_ORDER_CREATED,
      content,
      {
        persistent: true,
        contentType: 'application/json',
        headers: {
          'x-retry-count': 0,
        },
      }
    );

    logger.info({ orderNumber: payload.orderNumber }, 'Dispatched order.created event');
    return published;
  }
}