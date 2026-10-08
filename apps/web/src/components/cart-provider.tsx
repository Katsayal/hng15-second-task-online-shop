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
  updatingItemId: string | null;
  cartError: string | null;
  openCart: () => void;
  closeCart: () => void;
  clearCartError: () => void;
  addItem: (product: CartProduct, quantity?: number) => Promise<void> | void;
  setQuantity: (productId: string, quantity: number) => Promise<void> | void;
  removeItem: (productId: string) => Promise<void> | void;
  clearCart: () => Promise<void> | void;
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);

  useEffect(() => {
    let localItems: CartItem[] = [];
    try {
      const storedCart = window.localStorage.getItem(storageKey);
      if (storedCart) {
        const parsedCart: unknown = JSON.parse(storedCart);
        if (Array.isArray(parsedCart) && parsedCart.every(isCartItem)) {
          localItems = parsedCart;
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setItems(localItems);
        }
      }
    } catch (error) {
      console.error("Could not load saved cart from localStorage.", error);
      window.localStorage.removeItem(storageKey);
    } finally {
      setIsHydrated(true);
    }

    // Sync with server cart if authenticated
    fetch("/api/cart")
      .then(async (res) => {
        if (res.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        if (!res.ok) {
          setCartError("Could not sync your cart. Please try again.");
          return;
        }

        setIsAuthenticated(true);
        // User is authenticated: clear local storage so it never double-merges on reload
        window.localStorage.removeItem(storageKey);

        const data = await res.json();
        const serverItems: CartItem[] = Array.isArray(data.items) ? data.items : [];

        // If user had guest items from an anonymous session before signing in, merge them once
        if (localItems.length > 0 && serverItems.length === 0) {
          const mergeRes = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: localItems.map((item) => ({
                productId: item.id,
                quantity: item.quantity,
              })),
            }),
          });
          if (mergeRes.ok) {
            const mergedData = await mergeRes.json();
            const finalItems: CartItem[] = Array.isArray(mergedData.items)
              ? mergedData.items
              : serverItems;
            setItems(finalItems);
          }
        } else {
          setItems(serverItems);
        }
      })
      .catch((error) => {
        setCartError("Network error: Could not sync your cart. Please try again.");
        console.error("Could not sync cart with server:", error);
      });
  }, []);

  // Only persist to localStorage if user is NOT authenticated (guest cart)
  useEffect(() => {
    if (!isHydrated) return;
    if (isAuthenticated === true) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (error) {
      console.error("Could not save cart to localStorage.", error);
    }
  }, [isHydrated, items, isAuthenticated]);

  const checkOrGetAuth = useCallback(async (): Promise<boolean | null> => {
    if (isAuthenticated !== null) return isAuthenticated;
    try {
      const res = await fetch("/api/cart");
      if (res.status === 401) {
        setIsAuthenticated(false);
        return false;
      }
      if (!res.ok) {
        setCartError("Could not verify your session. Please try again.");
        return null;
      }

      const data = await res.json();
      setIsAuthenticated(true);
      window.localStorage.removeItem(storageKey);
      if (Array.isArray(data.items)) {
        setItems(data.items);
      }
      return true;
    } catch (error) {
      console.error("Could not verify cart authentication:", error);
      setCartError("Network error: Could not verify your session. Please try again.");
      return null;
    }
  }, [isAuthenticated]);

  const clearCartError = useCallback(() => {
    setCartError(null);
  }, []);

  const addItem = useCallback(
    async (product: CartProduct, quantity = 1) => {
      if (product.stockQuantity < 1) return;
      setCartError(null);

      const authed =
        isAuthenticated !== null ? isAuthenticated : await checkOrGetAuth();

      if (authed === null) {
        setIsOpen(true);
        return;
      }

      if (authed) {
        setUpdatingItemId(product.id);
        try {
          const res = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: product.id,
              quantity,
              mode: "increment",
            }),
          });

          if (res.status === 401) {
            setIsAuthenticated(false);
            setCartError("Your session has expired. Please sign in again.");
            setIsOpen(true);
            return;
          }

          const data = await res.json().catch(() => null);

          if (!res.ok) {
            const message =
              data &&
              typeof data === "object" &&
              "error" in data &&
              typeof data.error === "string"
                ? data.error
                : "Failed to add item to cart.";
            setCartError(message);
            setIsOpen(true);
            return;
          }

          if (data && Array.isArray(data.items)) {
            setItems(data.items);
            setIsOpen(true);
          }
        } catch {
          // Ambiguous network failure: fetch true cart state from server before presenting it.
          // Do NOT automatically retry increment, as the server may have processed it.
          try {
            const recoveryRes = await fetch("/api/cart");
            if (recoveryRes.ok) {
              const recoveryData = await recoveryRes.json();
              if (Array.isArray(recoveryData.items)) {
                setItems(recoveryData.items);
              }
            }
          } catch {
            // ignore network failure on recovery
          }
          setCartError(
            "Network error: Could not verify if item was added. Cart has been re-synced.",
          );
          setIsOpen(true);
        } finally {
          setUpdatingItemId(null);
        }
        return;
      }

      // Guest cart: update locally
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
    },
    [isAuthenticated, checkOrGetAuth],
  );

  const setQuantity = useCallback(
    async (productId: string, quantity: number) => {
      setCartError(null);

      const authed =
        isAuthenticated !== null ? isAuthenticated : await checkOrGetAuth();

      if (authed === null) return;

      if (authed) {
        setUpdatingItemId(productId);
        try {
          let res: Response;
          if (quantity < 1) {
            res = await fetch(
              `/api/cart?productId=${encodeURIComponent(productId)}`,
              { method: "DELETE" },
            );
          } else {
            res = await fetch("/api/cart", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId, quantity, mode: "set" }),
            });
          }

          if (res.status === 401) {
            setIsAuthenticated(false);
            setCartError("Your session has expired. Please sign in again.");
            return;
          }

          const data = await res.json().catch(() => null);

          if (!res.ok) {
            const message =
              data &&
              typeof data === "object" &&
              "error" in data &&
              typeof data.error === "string"
                ? data.error
                : "Failed to update item quantity.";
            setCartError(message);
            return;
          }

          if (data && Array.isArray(data.items)) {
            setItems(data.items);
          }
        } catch {
          // Ambiguous network failure: fetch cart again before presenting unchanged
          try {
            const recoveryRes = await fetch("/api/cart");
            if (recoveryRes.ok) {
              const recoveryData = await recoveryRes.json();
              if (Array.isArray(recoveryData.items)) {
                setItems(recoveryData.items);
              }
            }
          } catch {
            // ignore network failure on recovery
          }
          setCartError(
            "Network error: Could not save quantity. Cart has been re-synced.",
          );
        } finally {
          setUpdatingItemId(null);
        }
        return;
      }

      // Guest cart: update locally
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
    },
    [isAuthenticated, checkOrGetAuth],
  );

  const removeItem = useCallback(
    async (productId: string) => {
      setCartError(null);

      const authed =
        isAuthenticated !== null ? isAuthenticated : await checkOrGetAuth();

      if (authed === null) return;

      if (authed) {
        setUpdatingItemId(productId);
        try {
          const res = await fetch(
            `/api/cart?productId=${encodeURIComponent(productId)}`,
            { method: "DELETE" },
          );

          if (res.status === 401) {
            setIsAuthenticated(false);
            setCartError("Your session has expired. Please sign in again.");
            return;
          }

          const data = await res.json().catch(() => null);

          if (!res.ok) {
            const message =
              data &&
              typeof data === "object" &&
              "error" in data &&
              typeof data.error === "string"
                ? data.error
                : "Failed to remove item from cart.";
            setCartError(message);
            return;
          }

          if (data && Array.isArray(data.items)) {
            setItems(data.items);
          }
        } catch {
          try {
            const recoveryRes = await fetch("/api/cart");
            if (recoveryRes.ok) {
              const recoveryData = await recoveryRes.json();
              if (Array.isArray(recoveryData.items)) {
                setItems(recoveryData.items);
              }
            }
          } catch {}
          setCartError(
            "Network error: Could not remove item. Cart has been re-synced.",
          );
        } finally {
          setUpdatingItemId(null);
        }
        return;
      }

      // Guest cart:
      setItems((currentItems) =>
        currentItems.filter((item) => item.id !== productId),
      );
    },
    [isAuthenticated, checkOrGetAuth],
  );

  const clearCart = useCallback(async () => {
    setCartError(null);
    const authed =
      isAuthenticated !== null ? isAuthenticated : await checkOrGetAuth();

    if (authed === null) return;

    if (authed) {
      try {
        const res = await fetch("/api/cart", { method: "DELETE" });
        if (res.ok) {
          setItems([]);
          setIsOpen(false);
        } else {
          setCartError(
            res.status === 401
              ? "Your session has expired. Please sign in again."
              : "Failed to clear cart.",
          );
          if (res.status === 401) setIsAuthenticated(false);
        }
      } catch {
        setCartError("Network error: Could not clear cart.");
      }
      return;
    }

    setItems([]);
    setIsOpen(false);
  }, [isAuthenticated, checkOrGetAuth]);

  const openCart = useCallback(() => {
    setIsOpen(true);
    if (isAuthenticated === true) {
      fetch("/api/cart")
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.items)) {
              setItems(data.items);
            }
          } else if (res.status === 401) {
            setIsAuthenticated(false);
            setCartError("Your session has expired. Please sign in again.");
          } else {
            setCartError("Could not refresh your cart. Please try again.");
          }
        })
        .catch((error) => {
          console.error("Could not refresh cart:", error);
          setCartError("Network error: Could not refresh your cart.");
        });
    }
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      items,
      itemCount: items.reduce((count, item) => count + item.quantity, 0),
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      isOpen,
      isHydrated,
      updatingItemId,
      cartError,
      openCart,
      closeCart: () => setIsOpen(false),
      clearCartError,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    }),
    [
      items,
      isOpen,
      isHydrated,
      updatingItemId,
      cartError,
      openCart,
      clearCartError,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    ],
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
