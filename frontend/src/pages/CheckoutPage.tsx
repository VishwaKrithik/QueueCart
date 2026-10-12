import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { createCheckoutOrder } from '../api/orders.js';
import { useCartStore } from '../store/cartStore.js';
import { formatCurrency } from '../lib/utils.js';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';

const CheckoutSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  street: z.string().min(3, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(4, 'Postal code is required'),
  country: z.string().min(2, 'Country is required'),
});

type CheckoutFormData = z.infer<typeof CheckoutSchema>;

export const CheckoutPage: React.FC = () => {
  const { items, getTotalAmount, clearCart } = useCartStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(CheckoutSchema),
  });

  const checkoutMutation = useMutation({
    mutationFn: createCheckoutOrder,
    onSuccess: (data) => {
      clearCart();
      alert(`Order confirmed! Order Number: ${data.orderNumber}`);
      navigate('/');
    },
    onError: (err: any) => {
      alert(`Checkout failed: ${err.response?.data?.message || err.message}`);
    },
  });

  const onSubmit = (formData: CheckoutFormData) => {
    checkoutMutation.mutate({
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      shippingAddress: formData,
      billingAddress: formData,
    });
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-16 text-center">
        <h2 className="text-xl font-bold">Your cart is empty</h2>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Secure Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Shipping Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
        >
          <h2 className="text-lg font-semibold text-slate-800">Shipping Details</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
            <input
              {...register('fullName')}
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
            />
            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Street Address</label>
            <input
              {...register('street')}
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
            />
            {errors.street && <p className="text-red-500 text-xs mt-1">{errors.street.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">City</label>
              <input
                {...register('city')}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
              />
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">State</label>
              <input
                {...register('state')}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
              />
              {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Postal Code</label>
              <input
                {...register('postalCode')}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
              />
              {errors.postalCode && (
                <p className="text-red-500 text-xs mt-1">{errors.postalCode.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Country</label>
              <input
                {...register('country')}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
              />
              {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country.message}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={checkoutMutation.isPending}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {checkoutMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Place Order (Atomically Locked)
              </>
            )}
          </button>
        </form>

        {/* Order Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Order Summary</h2>
          <div className="divide-y divide-slate-100">
            {items.map((it) => (
              <div key={it.productId} className="py-2.5 flex justify-between text-sm">
                <span className="text-slate-600 truncate max-w-[180px]">
                  {it.name} <strong className="text-slate-900">× {it.quantity}</strong>
                </span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(it.price * it.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 pt-3 flex justify-between font-bold text-slate-900 text-base">
            <span>Total</span>
            <span>{formatCurrency(getTotalAmount())}</span>
          </div>
        </div>
      </div>
    </div>
  );
};