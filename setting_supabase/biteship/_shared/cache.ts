import { supabase } from "./supabase.ts";

export async function getCache(
  table: string,
  request: string
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("request", request)
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
      onConflict: "request",
    });

  if (error) throw error;
}