import { supabase } from '../../lib/supabase';

export async function addToken(userId: string, token: string, platform: string | null = null) {
  try {
    const payload = { user_id: userId, token, platform };
    const { data, error } = await supabase
      .from('notification_tokens')
      .upsert(payload, { onConflict: ['user_id', 'token'] })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('addToken error', err);
    return null;
  }
}

export async function removeToken(userId: string, token: string) {
  try {
    const { error } = await supabase.from('notification_tokens').update({ is_active: false }).eq('user_id', userId).eq('token', token);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('removeToken error', err);
    return false;
  }
}

export async function listActiveTokens(userId: string) {
  const { data, error } = await supabase.from('notification_tokens').select('token').eq('user_id', userId).eq('is_active', true);
  if (error) {
    console.error('listActiveTokens error', error);
    return [];
  }
  return (data || []).map((r: any) => r.token);
}
