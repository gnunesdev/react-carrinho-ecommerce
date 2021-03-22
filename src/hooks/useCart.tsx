import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";

import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyExistsInCart = cart.some(
        (product) => product.id === productId
      );
      const { data: stockData } = await api.get(`/stock/${productId}`);

      if (productAlreadyExistsInCart) {
        const product = cart.filter((product) => product.id === productId)[0];

        if (stockData.amount === product.amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        const cartToUpdate = cart.map((product) => {
          if (product.id === productId) {
            product.amount += 1;
          }
          return product;
        });

        setCart(cartToUpdate);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartToUpdate));
      } else {
        if (stockData.amount === 0) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        const { data: product } = await api.get(`/products/${productId}`);

        if (!product) {
          throw new Error();
        }

        const cartToUpdate = [
          ...cart,
          {
            ...product,
            amount: 1,
          },
        ];

        setCart(cartToUpdate);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartToUpdate));
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productAlreadyExists = cart.some(
        (product) => product.id === productId
      );

      if (!productAlreadyExists) throw Error();

      const cartToUpdate = cart.filter((product) => product.id !== productId);

      setCart(cartToUpdate);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartToUpdate));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { data: stockData } = await api.get(`/stock/${productId}`);

      if (amount > stockData.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const cartToUpdate = cart.map((product) =>
        product.id === productId ? { ...product, amount } : product
      );

      setCart(cartToUpdate);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartToUpdate));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
