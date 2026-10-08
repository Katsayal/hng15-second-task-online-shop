import { Platform } from "react-native";
import { supabase } from "./supabase";
import type { CartItem, Product } from "../types";

import Constants from "expo-constants";

function getBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured && configured.trim().length > 0) {
    if (Platform.OS !== "web" && configured.includes("localhost")) {
      const host = Constants.expoConfig?.hostUri?.split(":")[0];
      if (host) {
        return configured.replace("localhost", host);
      }
    }
    return configured;
  }

  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host) {
    return `http://${host}:3000`;
  }

  return Platform.select({
    android: "http://10.0.2.2:3000",
    default: "http://localhost:3000",
  }) || "http://localhost:3000";
}

export const API_BASE_URL = getBaseUrl();

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function fetchProducts(): Promise<Product[]> {
  const url = `${API_BASE_URL.replace(/\/$/, "")}/api/products`;
  console.log(`[API] Fetching products from: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`[API] fetchProducts failed: HTTP ${response.status} from ${url}`);
    throw new Error(`Failed to fetch products: HTTP ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data.products) ? data.products : [];
}

export async function fetchCart(): Promise<CartItem[]> {
  const headers = await getAuthHeaders();
  const sep = API_BASE_URL.includes("?") ? "&" : "?";
  const url = `${API_BASE_URL.replace(/\/$/, "")}/api/cart${sep}_t=${Date.now()}`;
  console.log(`[API] Fetching cart from: ${url} (hasAuthToken: ${Boolean(headers.Authorization)})`);
  const response = await fetch(url, {
    headers,
    cache: "no-store",
  });
  if (response.status === 401) {
    console.warn("[API] fetchCart received 401 Unauthorized (session may be missing or expired)");
    return [];
  }
  if (!response.ok) {
    console.error(`[API] fetchCart failed: HTTP ${response.status} from ${url}`);
    throw new Error(`Failed to fetch cart: HTTP ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data.items) ? data.items : [];
}

export async function updateCartItem(
  productId: string,
  quantity: number,
): Promise<CartItem[]> {
  const headers = await getAuthHeaders();
  const url = `${API_BASE_URL.replace(/\/$/, "")}/api/cart`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ productId, quantity }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to update cart: ${response.statusText}`);
  }
  const data = await response.json();
  return Array.isArray(data.items) ? data.items : [];
}

export async function removeCartItem(productId: string): Promise<CartItem[]> {
  const headers = await getAuthHeaders();
  const url = `${API_BASE_URL.replace(/\/$/, "")}/api/cart?productId=${encodeURIComponent(productId)}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers,
  });
  if (!response.ok) {
    throw new Error(`Failed to remove item: ${response.statusText}`);
  }
  const data = await response.json();
  return Array.isArray(data.items) ? data.items : [];
}

export async function clearServerCart(): Promise<CartItem[]> {
  const headers = await getAuthHeaders();
  const url = `${API_BASE_URL.replace(/\/$/, "")}/api/cart`;
  const response = await fetch(url, {
    method: "DELETE",
    headers,
  });
  if (!response.ok) {
    throw new Error(`Failed to clear cart: ${response.statusText}`);
  }
  const data = await response.json();
  return Array.isArray(data.items) ? data.items : [];
}

export async function createCheckoutSession(
  items: { productId: string; quantity: number }[],
  returnUrl?: string,
): Promise<string> {
  const headers = await getAuthHeaders();
  const url = `${API_BASE_URL.replace(/\/$/, "")}/api/checkout`;
  console.log(`[API] Creating checkout session at: ${url}`);
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ items, returnUrl }),
  });
  const data = await response.json();
  if (!response.ok || !data.url) {
    throw new Error(data.error || "Failed to create checkout session");
  }
  return data.url;
}
