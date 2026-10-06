"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart-provider";

export function ClearCartOnSuccess() {
  const { clearCart, isHydrated } = useCart();

  useEffect(() => {
    if (!isHydrated) return;
    clearCart();
  }, [clearCart, isHydrated]);

  return null;
}
