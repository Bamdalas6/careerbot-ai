# Paystack Webhook - Supabase Edge Function

## Architecture Overview

`
User
  ↓
Paystack Checkout / Paystack Shop
  ↓
Payment completed
  ↓
Paystack webhook (POST with x-paystack-signature)
  ↓
Supabase Edge Function (/functions/v1/paystack-webhook)
  ↓
1. Timing-safe HMAC SHA512 signature verification
2. Paystack API direct transaction verification (GET /transaction/verify/:ref)
3. Transaction idempotency check (	ransactions table)
  ↓
Add credits
  ↓
- Atomically increments user balance in users (credits = credits + delta)
- Writes ledger audit record in 	ransactions
- Pre-creates account with welcome bonus + coins if user paid before signing up
`

---

## Deployment Steps

### Option A: Via Supabase CLI (Recommended)

1. **Login to Supabase CLI**:
   `ash
   npx supabase login
   `

2. **Link your project**:
   `ash
   npx supabase link --project-ref <your-supabase-project-id>
   `

3. **Set Paystack Secret Key in Supabase Secrets**:
   `ash
   npx supabase secrets set PAYSTACK_SECRET_KEY=sk_live_your_secret_key_here
   `

4. **Deploy the Edge Function**:
   `ash
   npx supabase functions deploy paystack-webhook --no-verify-jwt
   `
   *(Note: --no-verify-jwt is required because Paystack webhooks are called directly from Paystack servers, not from logged-in browser clients).*

---

### Option B: Via Supabase Web Dashboard

1. Open your Supabase Project Dashboard.
2. Go to **Edge Functions** in the left sidebar.
3. Click **New Function** and name it paystack-webhook.
4. Paste the code from [supabase/functions/paystack-webhook/index.ts](./index.ts).
5. Go to **Settings** -> **Secrets** (or **Edge Functions** -> **Manage Secrets**), and add:
   - Name: PAYSTACK_SECRET_KEY
   - Value: Your Paystack Secret Key (sk_live_... or sk_test_...)
6. Disable JWT Verification for this function under function settings (so Paystack's external webhook can call it).

---

### Set Webhook URL in Paystack

1. Log into your [Paystack Dashboard](https://dashboard.paystack.com/).
2. Navigate to **Settings** -> **API Keys & Webhooks**.
3. In the **Live Webhook URL** (or **Test Webhook URL**), paste:
   `
   https://<your-project-ref>.supabase.co/functions/v1/paystack-webhook
   `
4. Click **Save Changes**.

---

## Supported Credit Packages & Automatic Resolution

| Package Name | Coins Credited | Standard NGN Price |
| :--- | :--- | :--- |
| **Starter Pack** | **50 coins** | ₦5,000 |
| **Pro Job Hunter** | **150 coins** | ₦12,000 |
| **Career Accelerator** | **500 coins** | ₦29,000 |

*Pre-provisioning bonus: If a candidate purchases before creating an account, the Edge Function automatically provisions their profile with **5 welcome bonus credits + purchased credits** immediately ready upon registration.*
