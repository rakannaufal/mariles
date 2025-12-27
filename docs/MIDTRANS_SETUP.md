# ⚙️ Midtrans Setup Guide

Panduan setup Midtrans untuk Mariles (Snap + Iris).

---

## 1. Daftar Akun

### Sandbox (Testing)

1. Buka https://dashboard.sandbox.midtrans.com
2. Daftar akun baru
3. Verifikasi email

### Production

1. Buka https://dashboard.midtrans.com
2. Submit dokumen verifikasi:
   - KTP pemilik
   - NPWP
   - SIUP/NIB
   - Rekening bank

---

## 2. Dapatkan API Keys

### Dari Dashboard

1. Login ke dashboard
2. **Settings > Access Keys**
3. Copy:
   - **Client Key** (untuk frontend)
   - **Server Key** (untuk backend/Edge Function)

### Key Format

| Key Type | Sandbox | Production |
|----------|---------|------------|
| Client Key | `SB-Mid-client-xxx` | `Mid-client-xxx` |
| Server Key | `SB-Mid-server-xxx` | `Mid-server-xxx` |
| Iris Key | `IRIS-xxx` | `IRIS-xxx` |

---

## 3. Environment Variables

### Frontend (.env)

```bash
VITE_MIDTRANS_IS_PRODUCTION="false"
VITE_MIDTRANS_CLIENT_KEY="SB-Mid-client-XXXXXXXX"
```

### Supabase Edge Functions

```bash
# Set secrets
supabase secrets set MIDTRANS_SERVER_KEY=SB-Mid-server-XXXXXXXX
supabase secrets set MIDTRANS_IRIS_API_KEY=IRIS-XXXXXXXX
supabase secrets set MIDTRANS_IS_PRODUCTION=false
supabase secrets set FRONTEND_URL=http://localhost:5173
```

---

## 4. Deploy Edge Functions

```bash
cd /path/to/mariles

# Deploy semua functions
supabase functions deploy create-snap-token
supabase functions deploy payment-notification
supabase functions deploy process-disbursement
```

---

## 5. Setup Webhook

1. Login ke Midtrans Dashboard
2. **Settings > Configuration**
3. Set **Payment Notification URL**:
   ```
   https://YOUR_PROJECT.supabase.co/functions/v1/payment-notification
   ```

---

## 6. Setup Iris (Disbursement)

1. Buka https://iris.sandbox.midtrans.com
2. Daftar/login
3. Top up balance (sandbox: gratis)
4. Get Iris API Key

---

## 7. Dummy Mode

Untuk testing tanpa Midtrans, set di `dummyConfig.js`:

```javascript
export const DUMMY_CONFIG = {
  modules: {
    payment: true,  // true = simulasi, false = real
    finance: true,
  }
}
```

---

## 8. Go Live Checklist

- [ ] Dokumen verifikasi approved
- [ ] Production API keys
- [ ] Update .env ke production
- [ ] Update Supabase secrets
- [ ] Set webhook URL production
- [ ] Test end-to-end
- [ ] Monitor dashboard

---

## Files

| File | Keterangan |
|------|-----------|
| `.env` | Environment variables |
| `src/lib/midtrans.js` | Midtrans config |
| `src/config/dummyConfig.js` | Dummy mode toggle |
| `supabase/functions/*/` | Edge Functions |

---

## Dashboard Links

| Service | Sandbox | Production |
|---------|---------|------------|
| Snap | https://dashboard.sandbox.midtrans.com | https://dashboard.midtrans.com |
| Iris | https://iris.sandbox.midtrans.com | https://iris.midtrans.com |

---

## Support

- Email: support@midtrans.com
- Tel: 021-80600288
- Docs: https://docs.midtrans.com
