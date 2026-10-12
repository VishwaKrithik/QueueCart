import { apiClient } from '../lib/axios.js';

export interface CheckoutPayload {
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  billingAddress: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  totalAmount: string;
  status: string;
}

export const createCheckoutOrder = async (payload: CheckoutPayload): Promise<OrderResponse> => {
  const { data } = await apiClient.post('/orders/checkout', payload);
  return data.data;
};