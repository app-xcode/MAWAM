## Checklist Deployment Mayar Integration

### Pre-Deployment
- [ ] Daftar akun di Mayar (https://mayar.id atau https://mayar.io untuk sandbox)
- [ ] Generate API Key dari Mayar dashboard
- [ ] Catat API Key dan Webhook Secret

### Environment Setup
- [ ] Tambahkan environment variables ke Supabase:
  - `MAYAR_API_KEY` = [API key dari Mayar]
  - `MAYAR_API_URL` = https://api.mayar.id/hl/v2 (production) atau https://api.mayar.io/hl/v2 (sandbox)
  - `MAYAR_WEBHOOK_SECRET` = [Webhook secret dari Mayar]

### Database Setup
- [ ] Run migration SQL: `setting_supabase/mawam_mayar_migration.sql`
  - Ini menambahkan field `mayar_checkout_id` dan `payment_url` ke tabel `mawam_payments`

### Deployment
- [ ] Deploy edge function:
  ```bash
  supabase functions deploy mawam-mayar
  ```

### Mayar Webhook Configuration
- [ ] Login ke Mayar dashboard
- [ ] Buka Settings > Webhooks
- [ ] Tambah webhook baru dengan:
  - **URL**: https://[project-ref].supabase.co/functions/v1/mawam-mayar
  - **Events**: payment.paid, payment.updated
  - **Secret**: [MAYAR_WEBHOOK_SECRET yang sudah disimpan di Supabase]

### Testing
- [ ] Test payment flow di sandbox:
  - Buat pesanan baru
  - Pilih metode pembayaran (bank transfer atau QRIS)
  - Verifikasi checkout page muncul dengan nominal dan nomor VA/QRIS
  - Simulasikan pembayaran di Mayar sandbox
  - Verifikasi status payment terupdate ke "paid" di database
  - Verifikasi order status berubah ke "paid"
  - Verifikasi notifikasi terkirim ke buyer & seller

### Production Deployment
- [ ] Update `MAYAR_API_URL` ke production URL
- [ ] Verifikasi certificate SSL dengan benar
- [ ] Monitor webhook delivery di Mayar dashboard
- [ ] Setup monitoring alerts untuk payment failures

### Rollback Plan
- Jika ada issue, revert `app/pembayaran/pembayaran.tsx` line 86 dari `mawam-mayar` ke `mawam-midtrans` dan re-deploy

### Post-Launch
- [ ] Monitor payment success rate
- [ ] Check Mayar webhook logs untuk error
- [ ] Pastikan semua payment notifications terproses dengan benar
- [ ] Document any custom configurations atau adjustments yang diperlukan
