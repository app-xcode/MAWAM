import { createNotification } from './notificationService';

export type NotificationTriggerInput = {
  userId: string;
  title: string;
  message: string;
  type: 'order_created' | 'payment_received' | 'payment_verified' | 'order_ready_to_ship' | 'shipping_updated' | 'shipping_location_updated' | 'order_completed' | 'order_cancelled' | 'order_updated' | 'login_success';
  path: string;
  orderId?: string;
  dedupeKey?: string;
  data?: Record<string, any>;
};

async function sendNotification(input: NotificationTriggerInput) {
  const { userId, title, message, type, path, orderId, dedupeKey, data } = input;

  const extraData = {
    ...(data || {}),
    ...(orderId ? { orderId } : {}),
    path,
  };

  return createNotification({
    userId,
    type,
    title,
    message,
    data: extraData,
    dedupeKey: dedupeKey || `${type}:${orderId || userId}`,
  });
}

export async function notifyOrderCreatedToBuyer(userId: string, orderId: string) {
  return sendNotification({
    userId,
    type: 'order_created',
    title: 'Pesanan berhasil dibuat',
    message: 'Pesanan Anda telah diterima dan sedang diproses.',
    path: '/pesanan/pesanan',
    orderId,
    dedupeKey: `order_created:${orderId}`,
  });
}

export async function notifyOrderCreatedToSeller(sellerId: string, orderId: string) {
  return sendNotification({
    userId: sellerId,
    type: 'order_created',
    title: 'Pesanan baru masuk',
    message: 'Ada pesanan baru yang perlu Anda proses.',
    path: '/toko/penjualan',
    orderId,
    dedupeKey: `new_order:${orderId}`,
  });
}

export async function notifyPaymentReceivedToBuyer(userId: string, orderId: string) {
  return sendNotification({
    userId,
    type: 'payment_received',
    title: 'Pembayaran diterima',
    message: 'Pembayaran Anda berhasil diterima dan sedang diproses.',
    path: '/pesanan/pesanan',
    orderId,
    dedupeKey: `payment_received:${orderId}`,
  });
}

export async function notifyPaymentVerificationToSeller(sellerId: string, orderId: string) {
  return sendNotification({
    userId: sellerId,
    type: 'payment_verified',
    title: 'Pembayaran menunggu konfirmasi',
    message: 'Ada pembayaran baru yang perlu Anda cek dan konfirmasi.',
    path: '/toko/penjualan',
    orderId,
    dedupeKey: `payment_verified:${orderId}`,
  });
}

export async function notifyOrderReadyToShipToSeller(sellerId: string, orderId: string) {
  return sendNotification({
    userId: sellerId,
    type: 'order_ready_to_ship',
    title: 'Pesanan siap dikirim',
    message: 'Pesanan sudah siap untuk dikirim ke buyer.',
    path: '/toko/penjualan',
    orderId,
    dedupeKey: `order_ready_to_ship:${orderId}`,
  });
}

export async function notifyOrderShippedToBuyer(userId: string, orderId: string) {
  return sendNotification({
    userId,
    type: 'shipping_updated',
    title: 'Pesanan dikirim',
    message: 'Pesanan Anda sedang dalam proses pengiriman.',
    path: '/pesanan/pesanan',
    orderId,
    dedupeKey: `shipping_updated:${orderId}`,
  });
}

export async function notifyShippingLocationUpdatedToBuyer(userId: string, orderId: string, pengirimanId?: string) {
  return sendNotification({
    userId,
    type: 'shipping_location_updated',
    title: 'Lokasi pengiriman diperbarui',
    message: 'Status pengiriman Anda sudah diperbarui.',
    path: '/pesanan/lacak',
    orderId,
    dedupeKey: `shipping_location_updated:${pengirimanId || orderId}`,
    data: pengirimanId ? { pengirimanId } : undefined,
  });
}

export async function notifyOrderCompletedToBuyer(userId: string, orderId: string) {
  return sendNotification({
    userId,
    type: 'order_completed',
    title: 'Pesanan selesai',
    message: 'Pesanan Anda telah selesai dan diterima.',
    path: '/pesanan/pesanan',
    orderId,
    dedupeKey: `order_completed:${orderId}`,
  });
}

export async function notifyCancellationRequestedToBuyer(userId: string, orderId: string) {
  return sendNotification({
    userId,
    type: 'order_cancelled',
    title: 'Pembatalan diajukan',
    message: 'Permintaan pembatalan Anda sedang diproses.',
    path: '/pesanan/pesanan',
    orderId,
    dedupeKey: `order_cancelled_buyer:${orderId}`,
  });
}

export async function notifyCancellationRequestedToSeller(sellerId: string, orderId: string) {
  return sendNotification({
    userId: sellerId,
    type: 'order_cancelled',
    title: 'Permintaan pembatalan baru',
    message: 'Ada permintaan pembatalan yang menunggu keputusan Anda.',
    path: '/toko/penjualan',
    orderId,
    dedupeKey: `order_cancelled_seller:${orderId}`,
  });
}

export async function notifyCancellationDecisionToBuyer(userId: string, orderId: string, approved: boolean) {
  return sendNotification({
    userId,
    type: 'order_cancelled',
    title: approved ? 'Pembatalan disetujui' : 'Pembatalan ditolak',
    message: approved
      ? 'Permintaan pembatalan Anda telah disetujui.'
      : 'Penjual menolak permintaan pembatalan Anda. Silakan cek alasan dari penjual.',
    path: '/pesanan/pesanan',
    orderId,
    dedupeKey: `cancel_decision:${orderId}:${approved ? 'approved' : 'rejected'}`,
  });
}

export async function notifyNewReviewToSeller(sellerId: string, orderId: string) {
  return sendNotification({
    userId: sellerId,
    type: 'order_completed',
    title: 'Ada review baru',
    message: 'Pembeli baru saja memberi penilaian pada produk Anda.',
    path: '/toko/penjualan',
    orderId,
    dedupeKey: `new_review:${orderId}`,
  });
}

export async function notifyPasswordChanged(userId: string) {
  return sendNotification({
    userId,
    type: 'order_updated',
    title: 'Password berhasil diperbarui',
    message: 'Password akun Anda berhasil diubah.',
    path: '/akun',
    dedupeKey: `password_changed:${userId}`,
  });
}

export async function notifyLoginFromNewDevice(userId: string) {
  return sendNotification({
    userId,
    type: 'order_updated',
    title: 'Login baru terdeteksi',
    message: 'Akun Anda berhasil login dari perangkat baru.',
    path: '/akun',
    dedupeKey: `new_device_login:${userId}`,
  });
}

export async function notifyLoginSuccess(userId: string) {
  return sendNotification({
    userId,
    type: 'login_success',
    title: 'Login berhasil',
    message: 'Anda berhasil masuk ke akun MAWAM.',
    path: '/akun',
    dedupeKey: `login_success:${userId}:${Date.now()}`,
  });
}

export async function notifyOrderStatusUpdateToBuyer(userId: string, orderId: string, status: string) {
  const statusMap: Record<string, { title: string; message: string }> = {
    paid: {
      title: 'Pembayaran diterima',
      message: 'Pembayaran Anda berhasil diterima dan sedang diproses.',
    },
    processed: {
      title: 'Pesanan diproses',
      message: 'Pesanan Anda sedang diproses oleh penjual.',
    },
    shipped: {
      title: 'Pesanan dikirim',
      message: 'Pesanan Anda sedang dalam proses pengiriman.',
    },
    completed: {
      title: 'Pesanan selesai',
      message: 'Pesanan Anda telah selesai dan diterima.',
    },
  };

  const config = statusMap[status] || statusMap.processed;

  return sendNotification({
    userId,
    type: 'order_updated',
    title: config.title,
    message: config.message,
    path: '/pesanan/pesanan',
    orderId,
    dedupeKey: `order_status:${orderId}:${status}`,
  });
}

export async function notifyOrderStatusUpdateToSeller(sellerId: string, orderId: string, status: string) {
  const statusMap: Record<string, { title: string; message: string }> = {
    pending_payment: {
      title: 'Pembayaran menunggu konfirmasi',
      message: 'Ada pembayaran baru yang perlu Anda cek dan konfirmasi.',
    },
    paid: {
      title: 'Pesanan baru siap diproses',
      message: 'Pesanan telah dibayar dan siap untuk diproses.',
    },
    shipped: {
      title: 'Pesanan dikirim',
      message: 'Pesanan Anda sudah dikirim ke buyer.',
    },
    completed: {
      title: 'Pesanan selesai',
      message: 'Pesanan telah selesai dan buyer sudah menerima pesanan.',
    },
  };

  const config = statusMap[status] || statusMap.pending_payment;

  return sendNotification({
    userId: sellerId,
    type: 'order_updated',
    title: config.title,
    message: config.message,
    path: '/toko/penjualan',
    orderId,
    dedupeKey: `seller_order_status:${orderId}:${status}`,
  });
}
