import type { NotificationType } from './notificationTypes';

export type NotificationRole = 'buyer' | 'seller' | 'system';

export interface NotificationTemplate {
  key: string;
  type: NotificationType;
  role: NotificationRole;
  title: string;
  message: string;
  path: string;
  trigger: string;
  dedupeKey?: string;
}

export const NOTIFICATION_CATALOG: NotificationTemplate[] = [
  {
    key: 'order_created_buyer',
    type: 'order_created',
    role: 'buyer',
    title: 'Pesanan berhasil dibuat',
    message: 'Pesanan Anda telah diterima dan sedang diproses.',
    path: '/pesanan/pesanan',
    trigger: 'Checkout berhasil dan order dibuat',
    dedupeKey: 'order_created',
  },
  {
    key: 'new_order_seller',
    type: 'order_created',
    role: 'seller',
    title: 'Pesanan baru masuk',
    message: 'Ada pesanan baru yang perlu Anda proses.',
    path: '/toko/penjualan',
    trigger: 'Order baru dibuat oleh buyer',
    dedupeKey: 'new_order',
  },
  {
    key: 'payment_received_buyer',
    type: 'payment_received',
    role: 'buyer',
    title: 'Pembayaran diterima',
    message: 'Pembayaran Anda berhasil diterima dan sedang diproses.',
    path: '/pesanan/pesanan',
    trigger: 'Pembayaran berhasil diproses',
    dedupeKey: 'payment_received',
  },
  {
    key: 'payment_verified_seller',
    type: 'payment_verified',
    role: 'seller',
    title: 'Pembayaran menunggu konfirmasi',
    message: 'Ada pembayaran baru yang perlu Anda cek dan konfirmasi.',
    path: '/toko/penjualan',
    trigger: 'Buyer melakukan pembayaran',
    dedupeKey: 'payment_verified',
  },
  {
    key: 'order_ready_to_ship_seller',
    type: 'order_ready_to_ship',
    role: 'seller',
    title: 'Pesanan siap dikirim',
    message: 'Pesanan sudah siap untuk dikirim ke buyer.',
    path: '/toko/penjualan',
    trigger: 'Seller menandai pesanan siap dikirim',
    dedupeKey: 'order_ready_to_ship',
  },
  {
    key: 'shipping_updated_buyer',
    type: 'shipping_updated',
    role: 'buyer',
    title: 'Pesanan dikirim',
    message: 'Pesanan Anda sedang dalam proses pengiriman.',
    path: '/pesanan/pesanan',
    trigger: 'Seller mengubah status pengiriman menjadi dikirim',
    dedupeKey: 'shipping_updated',
  },
  {
    key: 'shipping_location_updated_buyer',
    type: 'shipping_location_updated',
    role: 'buyer',
    title: 'Lokasi pengiriman diperbarui',
    message: 'Status pengiriman Anda sudah diperbarui.',
    path: '/pesanan/lacak',
    trigger: 'Tracking atau lokasi pengiriman diperbarui',
    dedupeKey: 'shipping_location_updated',
  },
  {
    key: 'order_completed_buyer',
    type: 'order_completed',
    role: 'buyer',
    title: 'Pesanan selesai',
    message: 'Pesanan Anda telah selesai dan diterima.',
    path: '/pesanan/pesanan',
    trigger: 'Buyer menandai pesanan selesai',
    dedupeKey: 'order_completed',
  },
  {
    key: 'order_cancelled_buyer',
    type: 'order_cancelled',
    role: 'buyer',
    title: 'Pembatalan diajukan',
    message: 'Permintaan pembatalan Anda sedang diproses.',
    path: '/pesanan/pesanan',
    trigger: 'Buyer mengajukan pembatalan',
    dedupeKey: 'order_cancelled_buyer',
  },
  {
    key: 'order_cancelled_seller',
    type: 'order_cancelled',
    role: 'seller',
    title: 'Permintaan pembatalan baru',
    message: 'Ada permintaan pembatalan yang menunggu keputusan Anda.',
    path: '/toko/penjualan',
    trigger: 'Buyer mengajukan pembatalan',
    dedupeKey: 'order_cancelled_seller',
  },
  {
    key: 'cancel_decision_buyer',
    type: 'order_cancelled',
    role: 'buyer',
    title: 'Keputusan pembatalan',
    message: 'Permintaan pembatalan Anda sudah ditanggapi oleh penjual.',
    path: '/pesanan/pesanan',
    trigger: 'Seller menyetujui atau menolak pembatalan',
    dedupeKey: 'cancel_decision_buyer',
  },
  {
    key: 'new_review_seller',
    type: 'order_completed',
    role: 'seller',
    title: 'Ada review baru',
    message: 'Pembeli baru saja memberi penilaian pada produk Anda.',
    path: '/toko/penjualan',
    trigger: 'Buyer mengirim review produk',
    dedupeKey: 'new_review_seller',
  },
  {
    key: 'login_new_device_system',
    type: 'order_updated',
    role: 'system',
    title: 'Login baru terdeteksi',
    message: 'Akun Anda berhasil login dari perangkat baru.',
    path: '/akun',
    trigger: 'User login dari perangkat baru',
    dedupeKey: 'login_new_device',
  },
  {
    key: 'login_success_system',
    type: 'login_success',
    role: 'system',
    title: 'Login berhasil',
    message: 'Anda berhasil masuk ke akun MAWAM.',
    path: '/akun',
    trigger: 'User berhasil login',
    dedupeKey: 'login_success',
  },
  {
    key: 'password_changed_system',
    type: 'order_updated',
    role: 'system',
    title: 'Password berhasil diperbarui',
    message: 'Password akun Anda berhasil diubah.',
    path: '/akun',
    trigger: 'User mengubah password',
    dedupeKey: 'password_changed',
  },
];

export function getNotificationTemplate(key: string) {
  return NOTIFICATION_CATALOG.find((item) => item.key === key) ?? null;
}

export function getNotificationsByRole(role: NotificationRole) {
  return NOTIFICATION_CATALOG.filter((item) => item.role === role);
}
