-- Add Mayar payment fields to mawam_payments table
-- Migration untuk migrasi dari Midtrans ke Mayar

-- Tambah kolom mayar_checkout_id jika belum ada
ALTER TABLE public.mawam_payments
ADD COLUMN IF NOT EXISTS mayar_checkout_id TEXT;

-- Tambah kolom payment_url untuk Mayar checkout URL
ALTER TABLE public.mawam_payments
ADD COLUMN IF NOT EXISTS payment_url TEXT;

-- Create index untuk mayar_checkout_id
CREATE INDEX IF NOT EXISTS idx_mawam_payments_mayar_checkout_id 
ON public.mawam_payments(mayar_checkout_id);

-- Notes:
-- Field lama (midtrans_order_id, etc) tetap ada untuk backward compatibility
-- Jangan hapus field lama sampai semua payment lama sudah fully migrated
