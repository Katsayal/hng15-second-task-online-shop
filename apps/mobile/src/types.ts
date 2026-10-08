export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  imageUrl: string | null;
};

export type CartItem = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  stockQuantity: number;
  quantity: number;
};
