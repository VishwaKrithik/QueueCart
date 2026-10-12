import React from 'react';
import { ShoppingBag, User as UserIcon, LogOut } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const totalItems = useCartStore((state) => state.getTotalCount());
  const toggleCart = useCartStore((state) => state.toggleCart);
  const { isAuthenticated, user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black">
            N
          </span>
          NextGen Store
        </Link>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700 hidden sm:inline">
                {user?.email}
              </span>
              <button
                onClick={() => logout()}
                className="p-2 text-slate-600 hover:text-red-600 transition"
                title="Log Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-blue-600"
            >
              <UserIcon className="w-4 h-4" />
              Sign In
            </Link>
          )}

          <button
            onClick={toggleCart}
            className="relative p-2 text-slate-700 hover:text-blue-600 transition rounded-full hover:bg-slate-100"
            aria-label="View Shopping Cart"
          >
            <ShoppingBag className="w-6 h-6" />
            {totalItems > 0 && (
              <span className="absolute top-1 right-1 bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};