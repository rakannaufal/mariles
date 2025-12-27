# 🛒 Midtrans Snap - Student Payment

Dokumentasi untuk pembayaran siswa menggunakan Midtrans Snap.

---

## Overview

Snap adalah payment gateway Midtrans untuk menerima pembayaran dari siswa. Menampilkan popup dengan semua metode pembayaran dan logo resmi.

```
Student → Pilih Program → Bayar → Snap Popup → Pembayaran Selesai
```

---

## Payment Methods

Snap mendukung:
- **QRIS** - Scan QR dari aplikasi apapun
- **E-Wallet** - GoPay, ShopeePay, Dana, OVO
- **Virtual Account** - BCA, BNI, BRI, Mandiri, Permata
- **Credit Card** - Visa, Mastercard
- **Convenience Store** - Alfamart, Indomaret

---

## Flow

```
1. Student klik "Bayar"
2. Frontend → Edge Function (create-snap-token)
3. Edge Function → Midtrans API → Get Snap Token
4. Open Snap Popup
5. Student pilih metode & bayar
6. Midtrans kirim webhook
7. Update transaction status di database
8. Owner balance += amount
```

---

## Edge Function: create-snap-token

**Location**: `supabase/functions/create-snap-token/index.ts`

**Request**:
```json
POST /create-snap-token
{
  "lesPlaceId": "uuid",
  "studentId": "uuid",
  "bookingId": "uuid",
  "programId": "uuid",
  "amount": 500000,
  "description": "Matematika Dasar"
}
```

**Response**:
```json
{
  "success": true,
  "snapToken": "xxxxxxxx-xxxx-xxxx-xxxx",
  "orderId": "PAY-1702xxx",
  "redirectUrl": "https://app.sandbox.midtrans.com/snap/..."
}
```

---

## Frontend Implementation

### StudentPayment.vue

```javascript
// Trigger Snap popup
window.snap.pay(snapToken, {
  onSuccess: (result) => {
    // Payment successful
  },
  onPending: (result) => {
    // Waiting for payment
  },
  onError: (result) => {
    // Payment failed
  },
  onClose: () => {
    // User closed popup
  }
})
```

---

## Webhook

**Edge Function**: `supabase/functions/payment-notification/index.ts`

**Setup di Midtrans Dashboard**:
1. Settings > Configuration
2. Set Payment Notification URL:
   ```
   https://YOUR_PROJECT.supabase.co/functions/v1/payment-notification
   ```

**Webhook Handler**:
- Verifikasi signature
- Update transaction status
- Tambah owner balance

---

## Test Credentials (Sandbox)

**Credit Card Success**:
| Card Number | CVV | Exp Date |
|-------------|-----|----------|
| 4811 1111 1111 1114 | 123 | Any future |

**Credit Card Declined**:
| Card Number | CVV | Exp Date |
|-------------|-----|----------|
| 4911 1111 1111 1113 | 123 | Any future |

**Virtual Account**:
- Gunakan nomor apapun di sandbox

---

## Files

| File | Keterangan |
|------|-----------|
| `src/views/student/StudentPayment.vue` | Payment page UI |
| `src/services/paymentService.js` | Payment service |
| `src/lib/midtrans.js` | Midtrans config |
| `supabase/functions/create-snap-token/` | Edge Function |
| `supabase/functions/payment-notification/` | Webhook |

---

## Troubleshooting

| Error | Solusi |
|-------|--------|
| Snap tidak muncul | Cek Client Key |
| Token invalid | Cek Server Key |
| Webhook tidak jalan | Cek URL di dashboard |
