#!/bin/bash
# Script untuk test edge function Mayar

# Environment variables yang diperlukan
SUPABASE_URL="${SUPABASE_URL}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
MAYAR_API_KEY="${MAYAR_API_KEY}"
PAYMENT_ID="test-payment-$(date +%s)"

# Test 1: Create Payment via Edge Function
echo "=== Test 1: Create Payment ==="
curl -X POST \
  "${SUPABASE_URL}/functions/v1/mawam-mayar" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "'${PAYMENT_ID}'",
    "payment_type": "bank_transfer",
    "bank": "bri"
  }' | jq .

# Test 2: Check Status
echo ""
echo "=== Test 2: Check Payment Status ==="
# Catatan: Ganti checkout_id dengan ID yang didapat dari Test 1
curl -X POST \
  "${SUPABASE_URL}/functions/v1/mawam-mayar" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "'${PAYMENT_ID}'",
    "action": "check_status"
  }' | jq .

# Test 3: Simulate Webhook
echo ""
echo "=== Test 3: Simulate Webhook ==="
curl -X POST \
  "${SUPABASE_URL}/functions/v1/mawam-mayar" \
  -H "User-Agent: Mayar-Webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "reference_id": "'PAY-$(date +%s)'",
    "status": "paid",
    "paid_at": "'$(date -Iseconds)'",
    "data": {
      "checkout_id": "checkout_test_123",
      "amount": 50000
    }
  }' | jq .

echo ""
echo "=== Testing Complete ==="
echo "Note: Ganti values sesuai dengan data actual dari database"
