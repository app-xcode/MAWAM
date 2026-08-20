# Migrasi dari Midtrans ke Mayar

## Ringkasan Perubahan

Aplikasi ini telah dimigrasikan dari Midtrans ke Mayar untuk payment processing. Perubahan mencakup:

### 1. Edge Function Baru
- **File Baru**: `supabase/functions/mawam-mayar/index.ts`
  - Menggantikan fungsi dari `mawam-midtrans`
  - Menggunakan Mayar API untuk create checkout dan handle webhook
  - Mapping status dari Mayar ke format order internal

### 2. Database Changes
- **Field Baru di `mawam_payments`**:
  - `mayar_checkout_id`: Menyimpan checkout ID dari Mayar
  - `payment_url`: URL untuk pembayaran (jika Mayar menyediakan)
  - Status diubah dari `pending` menjadi `pending_payment` untuk consistency

- **Migration File**: `setting_supabase/mawam_mayar_migration.sql`
  - Jalankan untuk menambahkan field baru ke database

### 3. Frontend Updates
- `app/pembayaran/pembayaran.tsx`: Menggunakan edge function `mawam-mayar` bukan `mawam-midtrans`
- `app/checkout/*.tsx`: Status pembayaran diubah menjadi `pending_payment`

## Setup Environment Variables

Tambahkan environment variables berikut di Supabase Edge Function:

### Mayar Configuration
```env
MAYAR_API_KEY=your_mayar_api_key
MAYAR_API_URL=https://api.mayar.id/hl/v1  # atau https://api.mayar.io/hl/v1 untuk sandbox
MAYAR_WEBHOOK_SECRET=your_mayar_webhook_secret
```

### Existing Variables (tetap digunakan)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Cara Setup

### 1. Daftar di Mayar
- Buka https://mayar.id atau https://mayar.io (sandbox)
- Buat akun merchant
- Generate API Key dari dashboard

### 2. Set Environment Variables di Supabase
```bash
# Via Supabase CLI
supabase secrets set MAYAR_API_KEY your_api_key
supabase secrets set MAYAR_API_URL https://api.mayar.id/hl/v1
supabase secrets set MAYAR_WEBHOOK_SECRET your_webhook_secret
```

### 3. Deploy Edge Function
```bash
supabase functions deploy mawam-mayar
```

### 4. Setup Webhook
- Di Mayar dashboard, set webhook URL ke:
  ```
  https://[project-id].supabase.co/functions/v1/mawam-mayar
  ```
- Pastikan method POST
- Set secret key di Mayar sesuai dengan `MAYAR_WEBHOOK_SECRET`

### 5. Run Database Migration
```sql
-- Copy isi file: setting_supabase/mawam_mayar_migration.sql
-- Jalankan di Supabase SQL Editor
```

## Payment Flow

1. **User membuat pesanan** di checkout page
   - System membuat payment record dengan status `pending_payment`
   
2. **User navigasi ke pembayaran page**
   - Frontend invoke `mawam-mayar` edge function
   - Function buat checkout di Mayar API
   - Simpan `mayar_checkout_id` di database
   
3. **User transfer pembayaran**
   - Bank transfer, QRIS, atau metode lain sesuai pilihan
   
4. **Mayar kirim webhook**
   - Status payment diupdate di database
   - Order status berubah ke `paid`
   - Notifikasi dikirim ke buyer & seller
   - Shipping dibuat otomatis jika konfigurasi ada

## Status Mapping

| Mayar Status | Internal Status |
|---|---|
| pending, waiting_payment | pending_payment |
| paid, settlement, completed | paid |
| expired, cancelled, failed | cancelled |

## Response Format dari Mayar

Contoh response saat create checkout:

```json
{
  "id": "checkout_id_123",
  "reference_id": "PAY-1234567890",
  "amount": 100000,
  "status": "pending",
  "checkout_url": "https://mayar.id/pay/checkout_id_123",
  "expired_at": "2026-08-21T12:00:00Z",
  "payment_channels": [
    {
      "type": "bank_transfer",
      "bank_code": "bri",
      "account_number": "123456789",
      "account_holder": "MAWAM Store"
    }
  ],
  "qr_string": "00020126...",
  "created_at": "2026-08-20T12:00:00Z"
}
```

## Webhook Payload dari Mayar

```json
{
  "id": "webhook_id",
  "data": {
    "checkout_id": "checkout_id_123",
    "reference_id": "PAY-1234567890",
    "amount": 100000,
    "status": "paid",
    "paid_at": "2026-08-20T12:30:00Z",
    "payment_method": "bank_transfer"
  },
  "event": "checkout.updated"
}
```

## Troubleshooting

### Payment tidak muncul
- Cek apakah `MAYAR_API_KEY` benar di environment variables
- Verifikasi API endpoint yang digunakan (sandbox vs production)

### Webhook tidak masuk
- Pastikan webhook URL sudah di-register di Mayar dashboard
- Check event logs di Mayar dashboard untuk error details

### Status tidak update
- Verifikasi webhook secret key cocok
- Cek logs di Supabase untuk error message

## Rollback ke Midtrans

Jika perlu kembali ke Midtrans:

1. Kembalikan `app/pembayaran/pembayaran.tsx` line 86 dari `mawam-mayar` ke `mawam-midtrans`
2. Hapus field baru dari database atau biarkan tetap (tidak akan digunakan)
3. Re-deploy edge function lama
