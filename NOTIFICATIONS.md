Notification system implementation

Files added:
- setting_supabase/notifikasi.sql : SQL migration to create `notifikasi` and `notification_tokens` tables with RLS and dedupe index.
- services/notification/notificationTypes.ts : types and payload shape.
- services/notification/notificationToken.ts : helpers to add/remove/list tokens.
- services/notification/notificationService.ts : central service to create notifications, fetch, mark as read.
- Supabase Edge Function `supabase/functions/send-fcm/index.ts`: server-side sender using Firebase HTTP v1 and service account. Deactivates invalid tokens.
- app/notifikasi/page.tsx : Notifikasi page (list, realtime subscribe, mark read/all, navigate on click).

Secrets to set for Supabase Edge Function deployment:
- `FIREBASE_SERVICE_ACCOUNT` : the JSON string of Firebase service account (kept secret in Supabase Functions).
- `SUPABASE_URL` : your Supabase URL (https://<project>.supabase.co).
- `SUPABASE_SERVICE_ROLE_KEY` : Supabase `service_role` key to allow the function to deactivate invalid tokens.

Supabase:
- Run `setting_supabase/notifikasi.sql` in Supabase SQL editor to create tables and RLS policies.
- Use service role key on backend operations if needed.

Notes and next steps:
- The Supabase Edge Function `send-fcm` must be deployed with the secrets above. Firebase service account and Supabase service_role key must remain server-side and not be exposed to clients.
- Mobile/web clients should call `services/notification/notificationToken.addToken` to register FCM tokens into `notification_tokens` table.
- Event producers should call `createNotification(...)` from `services/notification/notificationService.ts`.
