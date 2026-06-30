import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '@/contexts/CartContext';

// sonner renders into a portal that isn't mounted in unit tests
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));

const wrapper = ({ children }: { children: React.ReactNode }) => <CartProvider>{children}</CartProvider>;
const item = (id: string, price: number) => ({ id, title: id.toUpperCase(), price, image: '' });

beforeEach(() => localStorage.clear());

describe('CartContext', () => {
  it('adds distinct items and computes count + total', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(item('a', 10)));
    act(() => result.current.addToCart(item('b', 5)));
    expect(result.current.cartCount).toBe(2);
    expect(result.current.cartTotal).toBe(15);
  });

  it('increments quantity when the same item is added twice', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(item('a', 10)));
    act(() => result.current.addToCart(item('a', 10)));
    expect(result.current.cartCount).toBe(2);
    expect(result.current.cartTotal).toBe(20);
  });

  it('removes an item when its quantity drops to 0', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(item('a', 10)));
    act(() => result.current.updateQuantity('a', 0));
    expect(result.current.cartCount).toBe(0);
    expect(result.current.items).toEqual([]);
  });

  it('clearCart empties the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(item('a', 10)));
    act(() => result.current.clearCart());
    expect(result.current.items).toEqual([]);
  });

  it('persists items to localStorage', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(item('a', 10)));
    expect(JSON.parse(localStorage.getItem('wankong_cart') || '[]')).toHaveLength(1);
  });
});
