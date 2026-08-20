# Quick Reference - Mayar Integration Commands

## Deploy Edge Function

```bash
# Deploy Mayar edge function
supabase functions deploy mawam-mayar

# Deploy dengan environment variables
supabase secrets set MAYAR_API_KEY "your_api_key"
supabase secrets set MAYAR_API_URL "https://api.mayar.id/hl/v1"
supabase secrets set MAYAR_WEBHOOK_SECRET "your_webhook_secret"
supabase functions deploy mawam-mayar

# View logs
supabase functions logs mawam-mayar
```

## Database Operations

```bash
# Run migration
supabase db push

# Atau manual via SQL editor
# Copy & paste isi: setting_supabase/mawam_mayar_migration.sql

# Check columns di mawam_payments
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'mawam_payments' 
ORDER BY column_name;

# Check payments yang pake Mayar
SELECT id, reference, amount, status, mayar_checkout_id 
FROM mawam_payments 
WHERE mayar_checkout_id IS NOT NULL
ORDER BY created_at DESC;

# Check failed payments
SELECT id, reference, status, updated_at 
FROM mawam_payments 
WHERE status = 'cancelled'
ORDER BY updated_at DESC;
```

## Testing via curl

```bash
# Test create payment
curl -X POST \
  https://[project-ref].supabase.co/functions/v1/mawam-mayar \
  -H "Authorization: Bearer [service_role_key]" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "test-123",
    "payment_type": "bank_transfer",
    "bank": "bri"
  }'

# Test webhook
curl -X POST \
  https://[project-ref].supabase.co/functions/v1/mawam-mayar \
  -H "User-Agent: Mayar-Webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "reference_id": "PAY-123456",
    "status": "paid",
    "paid_at": "2026-08-20T12:00:00Z"
  }'
```

## Monitoring

```bash
# Check recent payment transactions
SELECT 
  p.id, 
  p.reference, 
  p.status, 
  p.amount,
  p.payment_method,
  p.created_at,
  p.paid_at
FROM mawam_payments p
ORDER BY p.created_at DESC
LIMIT 10;

# Check payment status timeline
SELECT 
  id, 
  status, 
  updated_at,
  LAG(status) OVER (ORDER BY updated_at) as prev_status
FROM mawam_payments 
WHERE id = '[payment-id]'
ORDER BY updated_at;

# Payment success rate (last 24 hours)
SELECT 
  COUNT(CASE WHEN status = 'paid' THEN 1 END) * 100.0 / COUNT(*) as success_rate,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
FROM mawam_payments
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

## Debugging

```bash
# Check edge function logs
supabase functions logs mawam-mayar --tail

# Check Mayar API response in logs
# Look for "Mayar Create Checkout Response:" or "Mayar Status Check Result:"

# Check payment record
SELECT * FROM mawam_payments WHERE reference = 'PAY-12345';

# Check webhook delivery status di Mayar dashboard
# Settings > Webhooks > View logs

# Test Mayar API directly (replace with your credentials)
curl -X POST https://api.mayar.id/hl/v1/checkouts \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "reference_id": "test-123",
    "amount": 50000,
    "email": "test@example.com",
    "line_items": [{"name": "Test Item", "price": 50000, "quantity": 1}]
  }'
```

## Troubleshooting

```bash
# 1. Check if environment variables are set
supabase secrets list

# 2. Check edge function deployment status
supabase functions info mawam-mayar

# 3. Verify Mayar API is reachable
curl https://api.mayar.id/hl/v1/health

# 4. Check database connection in logs
supabase functions logs mawam-mayar

# 5. Verify webhook configuration
# - Go to Mayar dashboard > Settings > Webhooks
# - Check if URL is correct
# - Check if recent webhook deliveries show in log

# 6. Test payment flow end-to-end
# - Create order in app
# - Check mawam_payments record created with pending_payment status
# - Check mayar_checkout_id populated
# - Check va_number populated
# - Manually trigger webhook to test status update
```

## Common Issues

### Payment tidak muncul di payment page
```bash
# Check payment record exists
SELECT * FROM mawam_payments WHERE id = 'PAYMENT_ID';

# Check edge function logs
supabase functions logs mawam-mayar | grep 'PAYMENT_ID'

# Check Mayar API response
# Look for error in "Mayar Create Checkout Response:"
```

### Webhook tidak masuk
```bash
# 1. Verify webhook URL di Mayar dashboard
# Should be: https://[project-ref].supabase.co/functions/v1/mawam-mayar

# 2. Check Mayar webhook logs
# Dashboard > Settings > Webhooks > View recent deliveries

# 3. Check edge function logs
supabase functions logs mawam-mayar | grep -i webhook

# 4. Test webhook manually
curl -X POST \
  https://[project-ref].supabase.co/functions/v1/mawam-mayar \
  -H "User-Agent: Mayar-Webhook" \
  -H "Content-Type: application/json" \
  -d '{"reference_id": "PAY-TEST", "status": "paid"}'
```

### Status tidak update
```bash
# Check mawam_payments status
SELECT id, status, updated_at FROM mawam_payments 
WHERE reference = 'PAY-XXXXX';

# Check if order status updated
SELECT id, status, updated_at FROM mawam_orders 
WHERE payment_id = 'PAYMENT_ID';

# Check edge function logs for error
supabase functions logs mawam-mayar | tail -50
```

## Useful Links

- Mayar API Docs: https://docs.mayar.id/api-reference/introduction
- Mayar Dashboard: https://web.mayar.id
- Mayar Sandbox: https://web.mayar.io
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
