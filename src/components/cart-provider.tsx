"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem, CartProduct } from "@/lib/cart/types";

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  total: number;
  isOpen: boolean;
  isHydrated: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: CartProduct, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const storageKey = "hng-shop-cart";
const CartContext = createContext<CartContextValue | null>(null);

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    (typeof item.imageUrl === "string" || item.imageUrl === null) &&
    typeof item.stockQuantity === "number" &&
    Number.isInteger(item.stockQuantity) &&
    item.stockQuantity >= 0 &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedCart = window.localStorage.getItem(storageKey);
      if (storedCart) {
        const parsedCart: unknown = JSON.parse(storedCart);
        if (!Array.isArray(parsedCart) || !parsedCart.every(isCartItem)) {
          throw new Error("Saved cart contains invalid data");
        }

        // localStorage is only available after hydration, so sync its data into client state here.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(parsedCart);
      }
    } catch (error) {
      console.error("Could not load saved cart from localStorage.", error);
      window.localStorage.removeItem(storageKey);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (error) {
      console.error("Could not save cart to localStorage.", error);
    }
  }, [isHydrated, items]);

  const addItem = useCallback((product: CartProduct, quantity = 1) => {
    if (product.stockQuantity < 1) return;

    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id);

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id
            ? {
                ...item,
                ...product,
                quantity: Math.min(
                  product.stockQuantity,
                  item.quantity + quantity,
                ),
              }
            : item,
        );
      }

      return [
        ...currentItems,
        { ...product, quantity: Math.min(product.stockQuantity, quantity) },
      ];
    });
    setIsOpen(true);
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) {
      setItems((currentItems) =>
        currentItems.filter((item) => item.id !== productId),
      );
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === productId
          ? { ...item, quantity: Math.min(item.stockQuantity, quantity) }
          : item,
      ),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== productId),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setIsOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      items,
      itemCount: items.reduce((count, item) => count + item.quantity, 0),
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      isOpen,
      isHydrated,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    }),
    [items, isOpen, isHydrated, addItem, setQuantity, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
