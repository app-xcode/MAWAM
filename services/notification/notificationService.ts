import { supabase } from '../../lib/supabase';
import { listActiveTokens } from './notificationToken';
import type { NotificationPayload } from './notificationTypes';

export async function createNotification(payload: NotificationPayload) {
  const { userId, type, title, message, data, dedupeKey } = payload;

  try {
    // insert into DB; avoid duplicates if dedupeKey provided
    const insertPayload: any = {
      user_id: userId,
      type,
      title,
      message,
      data: data || null,
      dedupe_key: dedupeKey || null,
    };

    let insertQuery = supabase.from('notifikasi').insert(insertPayload).select();
    if (dedupeKey) {
      // use onConflict to ignore duplicate dedupe_key for same user
      insertQuery = (insertQuery as any).onConflict('user_id,dedupe_key').ignore();
    }

    const { data: inserted, error: insertError } = await insertQuery;
    if (insertError) {
      console.error('createNotification insert error', insertError);
      // still continue to try sending push if appropriate
    }

    const notificationRow = Array.isArray(inserted) && inserted.length ? inserted[0] : null;

    // fetch active tokens
    const tokens = await listActiveTokens(userId);

    if (tokens && tokens.length) {
      // invoke Supabase Edge Function 'send-fcm' (keeps Firebase credentials server-side)
      try {
        await supabase.functions.invoke('send-fcm', {
          body: JSON.stringify({
            tokens,
            notification: { title, body: message },
            data: { ...data, notification_id: notificationRow?.id },
          }),
        });
      } catch (err) {
        console.error('createNotification send-fcm error', err);
      }
    }

    return notificationRow;
  } catch (err) {
    console.error('createNotification error', err);
    return null;
  }
}

export async function markAsRead(notificationId: string, userId: string) {
  try {
    const { error } = await supabase.from('notifikasi').update({ is_read: true }).eq('id', notificationId).eq('user_id', userId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('markAsRead error', err);
    return false;
  }
}

export async function markAllAsRead(userId: string) {
  try {
    const { error } = await supabase.from('notifikasi').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('markAllAsRead error', err);
    return false;
  }
}

export async function fetchNotifications(userId: string, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('notifikasi')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) {
    console.error('fetchNotifications error', error);
    return [];
  }
  return data || [];
}
