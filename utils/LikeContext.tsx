import { createContext, useContext, useState } from "react";
import { supabase } from "@/lib/supabase";

type LikeContextType = {
  likes: Set<string>;
  setLikes: React.Dispatch<React.SetStateAction<Set<string>>>;
  loadLikes: (user: any) => Promise<void>;
};

const LikeContext = createContext<LikeContextType | null>(null);

export function LikeProvider({ children }: any) {
  const [likes, setLikes] = useState<Set<string>>(new Set());

  async function loadLikes(user: any) {
    if (!user) return;

    const { data } = await supabase
      .from("mawam_favorit")
      .select("id_produk")
      .eq("id_user", user.id);

    if (data) {
      setLikes(new Set(data.map((item) => item.id_produk)));
    }
  }

  return (
    <LikeContext.Provider value={{ likes, setLikes, loadLikes }}>
      {children}
    </LikeContext.Provider>
  );
}

export function useLikes() {
  const context = useContext(LikeContext);
  if (!context) throw new Error("useLikes must be used inside LikeProvider");
  return context;
}