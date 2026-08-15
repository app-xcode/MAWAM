import { createContext, useContext, useState } from "react";
import { supabase } from "@/lib/supabase";

type CartItem = {
  id_produk: string;
  qty: number;
  [key: string]: any;
};

type CartContextType = {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  loadCart: (user: any) => Promise<void>;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: any) {
  const [cart, setCart] = useState<CartItem[]>([]);

  async function loadCart(user: any) {
    if (!user) return;

    const { data } = await supabase
      .from("mawam_cart")
      .select("*")
      .eq("user_id", user.id);

    if (data) {
      setCart(data);
    }
  }

  return (
    <CartContext.Provider value={{ cart, setCart, loadCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}