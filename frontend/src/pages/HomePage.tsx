import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '../api/products.js';
import { useCartStore } from '../store/cartStore.js';
import { formatCurrency } from '../lib/utils.js';
import { ShoppingCart } from 'lucide-react';

export const HomePage: React.FC = () => {
  const addItem = useCartStore((state) => state.addItem);

  // Fetch product catalog using TanStack Query cache
  const { data: products, isLoading, isError, error } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 60 * 1000, // 1 minute fresh cache
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse bg-white p-4 rounded-2xl border border-slate-200 h-72" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-red-600">
        Failed to load catalog: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Catalog</h1>
        <p className="text-sm text-slate-500 mt-1">High concurrency distributed inventory store</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products?.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col"
          >
            <div className="h-48 bg-slate-100 border-b border-slate-100 relative overflow-hidden flex items-center justify-center">
              {product.images?.[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-slate-400 font-medium">No Image</span>
              )}
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 text-base">{product.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.description}</p>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Price</span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatCurrency(product.basePrice)}
                  </span>
                </div>

                <button
                  onClick={() =>
                    addItem({
                      productId: product.id,
                      name: product.name,
                      price: parseFloat(product.basePrice),
                      imageUrl: product.images?.[0],
                    })
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl shadow-sm transition"
                  title="Add to Cart"
                >
                  <ShoppingCart className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};