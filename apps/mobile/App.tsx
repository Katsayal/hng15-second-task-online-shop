import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  Platform,
  TextInput,
  AppState,
} from "react-native";
import type { User, Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./src/lib/supabase";
import {
  fetchProducts,
  fetchCart,
  updateCartItem,
  removeCartItem,
  clearServerCart,
  createCheckoutSession,
  API_BASE_URL,
} from "./src/lib/api";
import type { Product, CartItem } from "./src/types";

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const [activeTab, setActiveTab] = useState<"shop" | "cart" | "account">("shop");
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Shop state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(false);
  const [cartActionId, setCartActionId] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Auth state
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  // Refreshing state for pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  // Initialize Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle mobile web checkout redirect return
  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("checkout") === "success") {
        clearServerCart().then((updated) => setCartItems(updated));
        showAlert("Order Confirmed", "Thank you for your order! Your payment was successful.");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Load products
  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const data = await fetchProducts();
      setProducts(data);
    } catch (err: unknown) {
      console.error("Error loading products:", err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // Load cart from server
  const loadCart = useCallback(async () => {
    if (!user) {
      setCartItems([]);
      return;
    }
    try {
      setLoadingCart(true);
      const items = await fetchCart();
      setCartItems(items);
    } catch (err: unknown) {
      console.error("Error loading cart:", err);
    } finally {
      setLoadingCart(false);
    }
  }, [user]);

  // Load initial data
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (user) {
      loadCart();
    } else {
      setCartItems([]);
    }
  }, [user, loadCart]);

  // Re-fetch cart whenever activeTab changes to "cart"
  useEffect(() => {
    if (activeTab === "cart" && user) {
      loadCart();
    }
  }, [activeTab, user, loadCart]);

  // Re-fetch cart when app or window returns to foreground/focus
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && user) {
        loadCart();
      }
    });

    const handleFocus = () => {
      if (user) {
        loadCart();
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);
    }

    return () => {
      subscription.remove();
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
      }
    };
  }, [user, loadCart]);

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProducts(), user ? loadCart() : Promise.resolve()]);
    setRefreshing(false);
  };

  // Cart actions
  const handleAddToCart = async (product: Product) => {
    if (!user) {
      setActiveTab("account");
      showAlert("Sign in required", "Please sign in to add items to your shared cart.");
      return;
    }
    try {
      setCartActionId(product.id);
      const existing = cartItems.find((i) => i.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      const targetQty = currentQty + 1;
      const updated = await updateCartItem(product.id, targetQty);
      setCartItems(updated);
      showAlert("Added to Cart", `${product.name} was added to your cart.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not add to cart.";
      showAlert("Error", msg);
    } finally {
      setCartActionId(null);
    }
  };

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    try {
      setCartActionId(productId);
      if (quantity <= 0) {
        const updated = await removeCartItem(productId);
        setCartItems(updated);
      } else {
        const updated = await updateCartItem(productId, quantity);
        setCartItems(updated);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not update quantity.";
      showAlert("Error", msg);
    } finally {
      setCartActionId(null);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    try {
      setCartActionId(productId);
      const updated = await removeCartItem(productId);
      setCartItems(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not remove item.";
      showAlert("Error", msg);
    } finally {
      setCartActionId(null);
    }
  };

  const handleClearCart = async () => {
    try {
      setLoadingCart(true);
      const updated = await clearServerCart();
      setCartItems(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not clear cart.";
      showAlert("Error", msg);
    } finally {
      setLoadingCart(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      setActiveTab("account");
      showAlert("Sign in required", "Please sign in to proceed to checkout.");
      return;
    }
    if (cartItems.length === 0) {
      showAlert("Cart is empty", "Add items to your cart before proceeding to checkout.");
      return;
    }
    try {
      setCheckoutLoading(true);
      const isWeb = Platform.OS === "web" && typeof window !== "undefined";
      const mobileReturnUrl = isWeb
        ? `${window.location.origin}/?checkout=success`
        : `${API_BASE_URL.replace(/\/$/, "")}/checkout/success?source=mobile`;

      const url = await createCheckoutSession(
        cartItems.map((item) => ({ productId: item.id, quantity: item.quantity })),
        mobileReturnUrl,
      );

      if (isWeb) {
        window.location.assign(url);
      } else {
        const redirectUrl = `${API_BASE_URL.replace(/\/$/, "")}/checkout/success`;
        const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);
        if (
          result.type === "success" &&
          result.url &&
          result.url.includes("checkout/success") &&
          !result.url.includes("canceled=1")
        ) {
          await clearServerCart();
          setCartItems([]);
          showAlert("Order Confirmed", "Thank you for your order! Your payment was successful.");
        } else {
          await loadCart();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout could not be started.";
      showAlert("Checkout Error", msg);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Email & Password authentication
  const handleEmailAuth = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setAuthError("Please enter both email and password.");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    try {
      if (isSignUp) {
        const regUrl = `${API_BASE_URL.replace(/\/$/, "")}/api/auth/register`;
        const regRes = await fetch(regUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmedEmail,
            password: trimmedPassword,
          }),
        });
        if (!regRes.ok) {
          const errData = await regRes.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to create account.");
        }
      }

      let { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (error && !isSignUp) {
        // Auto register fallback via server admin API to bypass email rate limits
        try {
          const regUrl = `${API_BASE_URL.replace(/\/$/, "")}/api/auth/register`;
          const regRes = await fetch(regUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: trimmedEmail,
              password: trimmedPassword,
            }),
          });
          if (regRes.ok) {
            const retry = await supabase.auth.signInWithPassword({
              email: trimmedEmail,
              password: trimmedPassword,
            });
            if (!retry.error) {
              data = retry.data;
              error = null;
            }
          }
        } catch {
          // ignore network error on reg fallback
        }
      }

      if (error) {
        throw error;
      }

      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
        setActiveTab("shop");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCartItems([]);
    setAuthError(null);
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const cartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);
  const cartTotal = cartItems.reduce((acc, i) => acc + i.price * i.quantity, 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f9f5" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>g</Text>
          </View>
          <Text style={styles.brandTitle}>
            goodthings<Text style={styles.brandDot}>.</Text>
          </Text>
        </View>
        <Text style={styles.userStatusText}>
          {user ? `👤 ${user.email?.split("@")[0]}` : "Guest"}
        </Text>
      </View>

      {/* Tab Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "shop" && styles.tabItemActive]}
          onPress={() => setActiveTab("shop")}
        >
          <Text style={[styles.tabText, activeTab === "shop" && styles.tabTextActive]}>
            Catalog
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "cart" && styles.tabItemActive]}
          onPress={() => {
            setActiveTab("cart");
            if (user) loadCart();
          }}
        >
          <Text style={[styles.tabText, activeTab === "cart" && styles.tabTextActive]}>
            Cart {cartCount > 0 ? `(${cartCount})` : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "account" && styles.tabItemActive]}
          onPress={() => setActiveTab("account")}
        >
          <Text style={[styles.tabText, activeTab === "account" && styles.tabTextActive]}>
            {user ? "Account" : "Sign In"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {/* TAB 1: SHOP / CATALOG */}
        {activeTab === "shop" && (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              loadingProducts ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color="#245b43" />
                  <Text style={styles.loadingText}>Loading products…</Text>
                </View>
              ) : (
                <View style={styles.centered}>
                  <Text style={styles.emptyTitle}>No products available</Text>
                  <Text style={styles.emptySubtitle}>
                    Pull down to refresh the collection.
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => (
              <View style={styles.productCard}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.productDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  <View style={styles.productMeta}>
                    <Text style={styles.productPrice}>
                      ${item.price.toFixed(2)}
                    </Text>
                    <Text style={styles.productStock}>
                      {item.stockQuantity > 0
                        ? `${item.stockQuantity} in stock`
                        : "Out of stock"}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (item.stockQuantity < 1 || cartActionId === item.id) &&
                      styles.disabledButton,
                  ]}
                  disabled={item.stockQuantity < 1 || cartActionId === item.id}
                  onPress={() => handleAddToCart(item)}
                >
                  {cartActionId === item.id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {item.stockQuantity < 1 ? "Out of Stock" : "Add to Cart"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={styles.listContainer}
          />
        )}

        {/* TAB 2: CART */}
        {activeTab === "cart" && (
          <View style={styles.cartContainer}>
            {!user ? (
              <View style={styles.centered}>
                <Text style={styles.emptyTitle}>Sign in to view your cart</Text>
                <Text style={styles.emptySubtitle}>
                  Your cart is linked to your Google account and synchronizes
                  between web and mobile.
                </Text>
                <TouchableOpacity
                  style={[styles.primaryButton, { marginTop: 16 }]}
                  onPress={() => setActiveTab("account")}
                >
                  <Text style={styles.primaryButtonText}>Sign In with Google</Text>
                </TouchableOpacity>
              </View>
            ) : loadingCart ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#245b43" />
                <Text style={styles.loadingText}>Syncing server cart…</Text>
              </View>
            ) : cartItems.length === 0 ? (
              <ScrollView
                contentContainerStyle={styles.centered}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
              >
                <Text style={styles.emptyTitle}>Your cart is empty</Text>
                <Text style={styles.emptySubtitle}>
                  Explore the catalog to add items, or sync with your web cart.
                </Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 1 }]}
                    onPress={() => setActiveTab("shop")}
                  >
                    <Text style={styles.primaryButtonText}>Browse Catalog</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { flex: 1 }]}
                    onPress={loadCart}
                    disabled={loadingCart}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {loadingCart ? "Syncing…" : "↻ Sync Cart"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <View style={{ flex: 1 }}>
                <FlatList
                  data={cartItems}
                  keyExtractor={(item) => item.id}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                  }
                  renderItem={({ item }) => (
                    <View style={styles.cartCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cartItemName}>{item.name}</Text>
                        <Text style={styles.cartItemPrice}>
                          ${item.price.toFixed(2)} each
                        </Text>
                        <Text style={styles.cartItemStock}>
                          {item.stockQuantity} available
                        </Text>
                      </View>

                      <View style={styles.cartControls}>
                        <TouchableOpacity
                          style={styles.qtyButton}
                          onPress={() =>
                            handleUpdateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={cartActionId === item.id}
                        >
                          <Text style={styles.qtyButtonText}>−</Text>
                        </TouchableOpacity>

                        <Text style={styles.qtyText}>{item.quantity}</Text>

                        <TouchableOpacity
                          style={[
                            styles.qtyButton,
                            item.quantity >= item.stockQuantity &&
                              styles.disabledButton,
                          ]}
                          disabled={
                            item.quantity >= item.stockQuantity ||
                            cartActionId === item.id
                          }
                          onPress={() =>
                            handleUpdateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          <Text style={styles.qtyButtonText}>+</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => handleRemoveItem(item.id)}
                          disabled={cartActionId === item.id}
                        >
                          <Text style={styles.removeButtonText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  contentContainerStyle={styles.listContainer}
                />

                <View style={styles.cartFooter}>
                  <View style={styles.subtotalRow}>
                    <Text style={styles.subtotalLabel}>Subtotal</Text>
                    <Text style={styles.subtotalAmount}>
                      ${cartTotal.toFixed(2)}
                    </Text>
                  </View>
                  <Text style={styles.cartFooterNote}>
                    Prices and inventory are server-authoritative.
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      { marginTop: 14 },
                      checkoutLoading && styles.disabledButton,
                    ]}
                    onPress={handleCheckout}
                    disabled={checkoutLoading}
                  >
                    {checkoutLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        Proceed to Checkout
                      </Text>
                    )}
                  </TouchableOpacity>
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                    <TouchableOpacity
                      style={[styles.secondaryButton, { flex: 1 }]}
                      onPress={loadCart}
                    >
                      <Text style={styles.secondaryButtonText}>↻ Refresh</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.secondaryButton, { flex: 1 }]}
                      onPress={handleClearCart}
                    >
                      <Text style={styles.secondaryButtonText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* TAB 3: ACCOUNT / AUTH */}
        {activeTab === "account" && (
          <ScrollView contentContainerStyle={styles.authContainer}>
            {user ? (
              <View style={styles.accountCard}>
                <Text style={styles.accountTitle}>Account Details</Text>
                <Text style={styles.accountLabel}>Signed in as:</Text>
                <Text style={styles.accountValue}>{user.email}</Text>

                <Text style={[styles.accountLabel, { marginTop: 12 }]}>
                  User ID:
                </Text>
                <Text style={styles.accountSmallValue}>{user.id}</Text>

                <View style={styles.syncBadge}>
                  <Text style={styles.syncBadgeText}>
                    ✓ Shared cart active with Next.js backend
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, { marginTop: 24 }]}
                  onPress={handleSignOut}
                >
                  <Text style={styles.primaryButtonText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.authCard}>
                <Text style={styles.authTitle}>
                  {isSignUp ? "Create Account" : "Sign In"}
                </Text>
                <Text style={styles.authSubtitle}>
                  Sign in with the same email used on the web store to access your
                  synchronized cart.
                </Text>

                {authError ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{authError}</Text>
                  </View>
                ) : null}

                <View style={{ width: "100%", marginTop: 12 }}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="you@example.com"
                    placeholderTextColor="#9ca3af"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      authLoading && styles.disabledButton,
                      { marginTop: 6 },
                    ]}
                    onPress={handleEmailAuth}
                    disabled={authLoading}
                  >
                    {authLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        {isSignUp ? "Create Account" : "Sign In with Email"}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.toggleAuthMode}
                    onPress={() => {
                      setIsSignUp(!isSignUp);
                      setAuthError(null);
                    }}
                  >
                    <Text style={styles.toggleAuthText}>
                      {isSignUp
                        ? "Already have an account? Sign in"
                        : "Don't have an account? Sign up"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f9f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5ebe2",
    backgroundColor: "#f7f9f5",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#245b43",
    alignItems: "center",
    justifyContent: "center",
  },
  logoBadgeText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#244535",
    letterSpacing: -0.5,
  },
  brandDot: {
    color: "#83a087",
  },
  userStatusText: {
    fontSize: 13,
    color: "#65766a",
    fontWeight: "500",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5ebe2",
    backgroundColor: "#ffffff",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: "#245b43",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#65766a",
  },
  tabTextActive: {
    color: "#245b43",
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    gap: 14,
  },
  productCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e3eae1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  productInfo: {
    marginBottom: 14,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#193a2c",
  },
  productDescription: {
    fontSize: 13,
    color: "#607366",
    marginTop: 4,
    lineHeight: 18,
  },
  productMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#245b43",
  },
  productStock: {
    fontSize: 12,
    color: "#849087",
  },
  primaryButton: {
    backgroundColor: "#245b43",
    borderRadius: 50,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#edf4ec",
    borderRadius: 50,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cbdac9",
  },
  secondaryButtonText: {
    color: "#244535",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    marginTop: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#607366",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#193a2c",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#718077",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },
  cartContainer: {
    flex: 1,
  },
  cartCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e3eae1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cartItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#244535",
  },
  cartItemPrice: {
    fontSize: 13,
    color: "#65766a",
    marginTop: 2,
  },
  cartItemStock: {
    fontSize: 11,
    color: "#849087",
    marginTop: 2,
  },
  cartControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#edf4ec",
    borderWidth: 1,
    borderColor: "#cbdac9",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#244535",
  },
  qtyText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#244535",
    minWidth: 20,
    textAlign: "center",
  },
  removeButton: {
    padding: 6,
    marginLeft: 6,
  },
  removeButtonText: {
    color: "#9ca3af",
    fontSize: 14,
  },
  cartFooter: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5ebe2",
    padding: 18,
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subtotalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#244535",
  },
  subtotalAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#245b43",
  },
  cartFooterNote: {
    fontSize: 11,
    color: "#849087",
    marginTop: 4,
  },
  authContainer: {
    padding: 20,
  },
  authCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e3eae1",
    alignItems: "center",
  },
  authTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#193a2c",
  },
  authSubtitle: {
    fontSize: 14,
    color: "#607366",
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  accountCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#e3eae1",
  },
  accountTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#193a2c",
    marginBottom: 14,
  },
  accountLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6b7280",
  },
  accountValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#193a2c",
    marginTop: 2,
  },
  accountSmallValue: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  syncBadge: {
    marginTop: 16,
    padding: 10,
    backgroundColor: "#e8f0e5",
    borderRadius: 10,
  },
  syncBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#245b43",
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
    width: "100%",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2d4438",
    marginBottom: 6,
  },
  inputField: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d6dfd4",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#193a2c",
    marginBottom: 14,
  },
  toggleAuthMode: {
    marginTop: 14,
    alignItems: "center",
  },
  toggleAuthText: {
    fontSize: 13,
    color: "#245b43",
    fontWeight: "500",
  },
});
