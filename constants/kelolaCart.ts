import { supabase } from "@/lib/supabase";

export async function addToCart(produkId: string, qty: number = 1, add:boolean=true) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("User belum login.");
  }

  // Cek apakah produk sudah ada di cart
  const { data: cart, error: cartError } = await supabase
    .from("mawam_cart")
    .select("id, qty")
    .eq("user_id", user.id)
    .eq("produk_id", produkId)
    .maybeSingle();

  if (cartError) throw cartError;

  if (cart) {
    // Update qty
    const { error } = await supabase
      .from("mawam_cart")
      .update({
        qty: add ? cart.qty + qty : qty,
      })
      .eq("id", cart.id);

    if (error) throw error;
  } else {
    // Insert baru
    const { error } = await supabase
      .from("mawam_cart")
      .insert({
        user_id: user.id,
        produk_id: produkId,
        qty,
      });

    if (error) throw error;
  }

  return true;
}

export async function addCart(cartId: string, qty: number) {
  const { error } = await supabase
    .from("mawam_cart")
    .update({ qty: qty + 1 })
    .eq("id", cartId);

  if (error){
    throw error;
  }
  return true;
}
export async function minCart(cartId: string, qty: number) {
  if (qty <= 1) {
    const { error } = await supabase
      .from("mawam_cart")
      .delete()
      .eq("id", cartId);

    if (error) throw error;

    return true;
  }

  const { error } = await supabase
    .from("mawam_cart")
    .update({ qty: qty - 1 })
    .eq("id", cartId);

  if (error) throw error;
  return true;
}

export async function removeCart(cartId: string) {
  const { error } = await supabase
    .from("mawam_cart")
    .delete()
    .eq("id", cartId);

  if (error) throw error;
  return true;
}