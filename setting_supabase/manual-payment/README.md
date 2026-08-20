# Manual payment Edge Function

Deploy this directory as the `manual-payment` Supabase Edge Function after
running `../mawam_manual_payments.sql`.

Configure these Supabase secrets (the values must never be bundled into the
Expo app):

- `MANUAL_PAYMENT_BANK_NAME`
- `MANUAL_PAYMENT_ACCOUNT_NUMBER`
- `MANUAL_PAYMENT_ACCOUNT_HOLDER`
- `QRIS_MERCHANT_PAYLOAD` — the merchant's original EMVCo QRIS payload.
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` — optional; when missing, proof is safely routed to manual review.
- `OPENAI_VISION_MODEL` — optional, defaults to `gpt-4.1-mini`.
- `MANUAL_PAYMENT_ADMIN_USER_IDS` — comma-separated Supabase user UUIDs allowed to call the `admin-review` action.

The function converts the static merchant QRIS payload to a dynamic QRIS with
the order amount and recalculates its CRC. It does not expose a payment-provider
secret to the client. AI output is stored as preliminary evidence only; the
`admin-review` action is the only action that sets the payment/order to paid.
