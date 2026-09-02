import { supabase } from '../../lib/supabase';
import { listActiveTokens } from './notificationToken';
import type { NotificationPayload } from './notificationTypes';

export async function createNotification(payload: NotificationPayload) {
  const { userId, type, title, message, data, dedupeKey } = payload;

  try {
    const insertPayload: any = {
      user_id: userId,
      type,
      title,
      message,
      data: data || null,
      dedupe_key: dedupeKey || null,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('notifikasi')
      .insert(insertPayload)
      .select();

    let notificationRow = Array.isArray(inserted) && inserted.length ? inserted[0] : null;

    // Server-side cancellation flows may already have created the row.
    // In that case, reuse it so a legitimate client-side trigger can still
    // attempt its normal FCM delivery without creating a duplicate row.
    if (insertError) {
      if (insertError.code !== '23505') {
        console.error('createNotification insert error', insertError);
        return null;
      }

      if (!dedupeKey) {
        return null;
      }

      const { data: existing, error: existingError } = await supabase
        .from('notifikasi')
        .select('*')
        .eq('user_id', userId)
        .eq('dedupe_key', dedupeKey)
        .maybeSingle();

      if (existingError || !existing) {
        if (existingError) console.error('createNotification existing row error', existingError);
        return null;
      }

      notificationRow = existing;
    }

    if (!notificationRow) {
      return null;
    }

    const tokens = await listActiveTokens(userId);

    if (tokens && tokens.length) {
      try {
        await supabase.functions.invoke('send-fcm', {
          body: JSON.stringify({
            tokens,
            notification: { title, body: message },
            data: { ...data, notification_id: notificationRow.id },
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

export async function getUnreadNotificationCount(userId: string) {
  const { count, error } = await supabase
    .from('notifikasi')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('getUnreadNotificationCount error', error);
    return 0;
  }

  return count ?? 0;
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

export async function deleteNotification(notificationId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('notifikasi')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('deleteNotification error', err);
    return false;
  }
}

export async function deleteReadNotifications(userId: string) {
  try {
    const { error } = await supabase
      .from('notifikasi')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('deleteReadNotifications error', err);
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
