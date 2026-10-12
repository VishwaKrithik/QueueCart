import { apiClient } from '../lib/axios.js';

export interface ProductCatalogItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: string;
  images: string[];
  inventory?: {
    quantity: number;
    reserved: number;
  };
}

export const fetchProducts = async (): Promise<ProductCatalogItem[]> => {
  // Uses catalog endpoint or falls back to public product API
  const { data } = await apiClient.get('/products');
  return data.data;
};