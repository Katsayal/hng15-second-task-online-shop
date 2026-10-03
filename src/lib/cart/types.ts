export type CartProduct = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  stockQuantity: number;
}

export type CartItem = CartProduct & {
  quantity: number;
};
