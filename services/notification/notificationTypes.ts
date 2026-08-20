export type NotificationType =
  | 'order_created'
  | 'order_updated'
  | 'payment_received'
  | 'payment_verified'
  | 'order_ready_to_ship'
  | 'shipping_updated'
  | 'shipping_location_updated'
  | 'package_nearby'
  | 'order_completed'
  | 'order_cancelled'
  | 'chat_message'
  | 'login_success'
  | string;

export interface NotificationPayload {
  id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Record<string, any>;
  dedupeKey?: string | null;
}
