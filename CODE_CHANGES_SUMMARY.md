# Struktur Perubahan Kode - Migrasi Midtrans ke Mayar

## Files yang Diubah

### 1. Frontend - Payment Page
**File**: `app/pembayaran/pembayaran.tsx`

**Perubahan**:
- Line 86: `supabase.functions.invoke("mawam-midtrans", ...)` → `supabase.functions.invoke("mawam-mayar", ...)`
- Line 380: Hapus reference ke Midtrans URL untuk QR code, ganti dengan `dataPayment?.va_number` langsung

**Reason**: Switch ke Mayar API gateway

---

### 2. Checkout Pages
**Files**: 
- `app/checkout/checkout.tsx`
- `app/checkout/checkout-lama.tsx`
- `app/checkout/checkout-binder.tsx`

**Perubahan**:
- Ubah `status: "pending"` → `status: "pending_payment"` saat insert payment
- Line ~408-418 di setiap file

**Reason**: Konsistensi dengan edge function Mayar yang menggunakan "pending_payment"

---

### 3. Edge Function (NEW)
**File**: `supabase/functions/mawam-mayar/index.ts` (BARU)

**Fitur**:
- `handleCreatePayment()`: Create checkout di Mayar API
- `cekStatus()`: Check payment status
- `handleWebhook()`: Handle webhook dari Mayar
- `getMayarOrderStatus()`: Map Mayar status ke internal status

**Database Operations**:
- Read: `mawam_payments`, `mawam_orders`, `mawam_order_items`, user auth
- Write: `mawam_payments` (status, va_number, bank, paid_at), `mawam_orders` (status), `mawam_pengiriman` (shipping details)

**API Endpoints**:
- POST `/v1/mawam-mayar` - Create/Check payment
- POST `/v1/mawam-mayar` (webhook) - Handle payment notification

---

### 4. Database Migration (NEW)
**File**: `setting_supabase/mawam_mayar_migration.sql`

**Schema Changes**:
```sql
ALTER TABLE mawam_payments ADD mayar_checkout_id TEXT;
ALTER TABLE mawam_payments ADD payment_url TEXT;
CREATE INDEX idx_mawam_payments_mayar_checkout_id ON mawam_payments(mayar_checkout_id);
```

---

## Key Differences: Midtrans vs Mayar

| Aspek | Midtrans | Mayar |
|-------|----------|-------|
| Field ID | `midtrans_order_id` | `mayar_checkout_id` |
| Status Model | `pending`, `settlement`, `cancel` | `waiting_payment`, `paid`, `cancelled` |
| Internal Status | - | `pending_payment` (baru) |
| Auth | Basic Auth (Server Key + `:`) | Bearer Token (API Key) |
| API Base URL | `api.sandbox.midtrans.com/v2` | `api.mayar.id/hl/v2` |
| Charge Endpoint | `/charge` | `/checkouts` |
| Status Endpoint | `/{order_id}/status` | `/checkouts/{checkout_id}` |
| VA Numbers | `result.va_numbers[0]` | `result.payment_channels[0]` |
| QRIS | `result.qr_string` | `result.qr_string` atau `qr_image_url` |

---

## Data Flow

### Sebelum (Midtrans)
```
1. User checkout
   ↓
2. Create mawam_payments (status: "pending")
   ↓
3. Call mawam-midtrans edge function
   → Send to api.midtrans.com/v2/charge
   → Get midtrans_order_id, va_number, expiry_time
   ↓
4. User lihat payment page
   → Display VA number atau QRIS
   ↓
5. Webhook dari Midtrans
   → Update payment status
   → Update order status
```

### Setelah (Mayar)
```
1. User checkout
   ↓
2. Create mawam_payments (status: "pending_payment")
   ↓
3. Call mawam-mayar edge function
   → Send to api.mayar.id/hl/v2/checkouts
   → Get mayar_checkout_id, payment_channels, expiry
   ↓
4. User lihat payment page
   → Display VA number atau QRIS dari response
   ↓
5. Webhook dari Mayar
   → Update payment status
   → Update order status
   → Trigger shipping creation
```

---

## Environment Variables Required

```env
# Mayar Configuration
MAYAR_API_KEY=<your_mayar_api_key>
MAYAR_API_URL=https://api.mayar.id/hl/v2  # atau .io untuk sandbox
MAYAR_WEBHOOK_SECRET=<your_webhook_secret>

# Existing (unchanged)
SUPABASE_URL=<your_supabase_url>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
```

---

## Testing Checklist

- [ ] Create payment → verify mayar_checkout_id di database
- [ ] Verify va_number / qris muncul di payment page
- [ ] Simulate payment → webhook trigger
- [ ] Verify order status change to "paid"
- [ ] Verify shipping dibuat otomatis
- [ ] Verify notifications sent
- [ ] Test error handling (invalid payment, expired)

---

## Rollback Steps

Jika perlu rollback ke Midtrans:

1. Ubah `app/pembayaran/pembayaran.tsx` line 86
2. Revert edge function call ke `mawam-midtrans`
3. Run: `supabase functions deploy mawam-midtrans`
4. Database tetap ada (field Midtrans masih bisa dipakai)

---

## Notes

- Edge function lama (`mawam-midtrans`) tetap ada, tidak dihapus
- Database field Midtrans tetap ada untuk backward compatibility
- Untuk payment lama (menggunakan Midtrans), field `mayar_checkout_id` akan NULL
- New payment akan populate field `mayar_checkout_id` dan tidak populate `midtrans_order_id`
