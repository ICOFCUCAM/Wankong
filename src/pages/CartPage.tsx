import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex flex-col items-center justify-center text-center px-4">
        <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
        <p className="text-gray-400 mb-6">Browse our marketplace to find amazing content</p>
        <Link to="/" className="px-6 py-3 bg-[#9D4EDD] hover:bg-[#7C3AED] text-white font-medium rounded-xl transition-colors">Browse Content</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0814] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Shopping Cart</h1>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => (
              <div key={item.id} className="flex gap-4 bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                {item.image && <img src={item.image} alt={item.title} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">{item.title}</h3>
                  {item.variant && <p className="text-sm text-gray-400">{item.variant}</p>}
                  <p className="text-[#B794F4] font-semibold mt-1">${item.price.toFixed(2)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button onClick={() => removeFromCart(item.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center justify-center transition-colors">−</button>
                    <span className="text-white text-sm w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center justify-center transition-colors">+</button>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={clearCart} className="text-sm text-gray-400 hover:text-red-400 transition-colors">Clear cart</button>
          </div>

          {/* Summary */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 h-fit">
            <h3 className="text-white font-semibold mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>${cartTotal.toFixed(2)}</span></div>
              <div className="border-t border-gray-800 pt-2 flex justify-between text-white font-bold"><span>Total</span><span>${cartTotal.toFixed(2)}</span></div>
            </div>
            <button onClick={() => navigate('/checkout')} className="w-full bg-[#9D4EDD] hover:bg-[#7C3AED] text-white font-semibold py-3 rounded-xl transition-colors">
              Proceed to Checkout
            </button>
            <Link to="/" className="block text-center text-sm text-gray-400 hover:text-white mt-3 transition-colors">Continue Shopping</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
