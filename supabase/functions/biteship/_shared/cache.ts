import { supabase } from "./supabase.ts";

export async function getCache(
  table: string,
  request: string
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq(table == "resi_cache" ? "cache_key" : "request", request)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function saveCache(
  table: string,
  payload: any
) {
  const { error } = await supabase
    .from(table)
    .upsert(payload, {
      // onConflict: "cache_key",
      onConflict: table == "resi_cache" ? "cache_key" : "request",
    });

  if (error) throw error;
}