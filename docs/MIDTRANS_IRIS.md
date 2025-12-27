# 💸 Midtrans Iris - Disbursement

Dokumentasi untuk pencairan dana (withdrawal) ke rekening bank Owner dan Teacher menggunakan Midtrans Iris.

---

## Overview

Iris adalah layanan disbursement Midtrans untuk transfer uang dari rekening Mariles ke rekening bank penerima secara otomatis.

```
Owner/Teacher Request → Edge Function → Iris API → Bank Transfer → Completed
```

---

## Flow

```
1. User isi form pencairan (jumlah + data bank)
2. Submit → requestWithdrawal()
3. Database: withdrawals (status: pending)
4. processWithdrawal() → Edge Function
5. Edge Function → Midtrans Iris API
6. Iris proses transfer ke bank
7. Status: pending → processing → completed
```

---

## Edge Function: process-disbursement

**Location**: `supabase/functions/process-disbursement/index.ts`

### Create Payout

```json
POST /process-disbursement
{
  "withdrawalId": "uuid",
  "action": "create_payout"
}
```

**Response**:
```json
{
  "success": true,
  "reference": "IRIS-xxx",
  "status": "queued"
}
```

### Check Status

```json
POST /process-disbursement
{
  "withdrawalId": "uuid",
  "action": "check_status"
}
```

---

## Database Fields

```sql
-- withdrawals table
iris_reference_key TEXT  -- Iris payout reference number
iris_status TEXT         -- queued, processing, completed, failed
```

---

## Supported Banks

| Bank | Code |
|------|------|
| BCA | `bca` |
| BNI | `bni` |
| BRI | `bri` |
| Mandiri | `mandiri` |
| CIMB Niaga | `cimb` |
| Danamon | `danamon` |
| Permata | `permata` |
| BSI | `bsi` |

---

## Frontend Implementation

### OwnerFinance.vue / TeacherFinance.vue

Form fields:
- Jumlah pencairan
- Nama Bank (dropdown)
- Nomor Rekening
- Nama Pemilik Rekening

```javascript
// Submit withdrawal
const result = await requestWithdrawal({
  userId: user.id,
  lesPlaceId: lesPlace.id,
  amount: 1000000,
  bankName: 'bca',
  bankAccount: '1234567890',
  bankHolder: 'John Doe'
})

// Trigger Iris processing
if (result.withdrawal?.id) {
  await processWithdrawal(result.withdrawal.id)
}
```

---

## Iris API (Reference)

### Create Payout

```bash
POST https://app.sandbox.midtrans.com/iris/api/v1/payouts
Authorization: Basic {base64(IRIS_API_KEY:)}

{
  "payouts": [{
    "beneficiary_name": "John Doe",
    "beneficiary_account": "1234567890",
    "beneficiary_bank": "bca",
    "beneficiary_email": "john@email.com",
    "amount": 1000000,
    "notes": "Withdrawal"
  }]
}
```

---

## Biaya

- Transfer fee: ~Rp 5.000 - 7.500 per transaksi
- Fee dipotong dari amount withdrawal

---

## Files

| File | Keterangan |
|------|-----------|
| `src/views/owner/OwnerFinance.vue` | Owner withdrawal UI |
| `src/views/teacher/TeacherFinance.vue` | Teacher withdrawal UI |
| `src/services/paymentService.js` | processWithdrawal(), checkWithdrawalStatus() |
| `supabase/functions/process-disbursement/` | Edge Function |

---

## Troubleshooting

| Error | Solusi |
|-------|--------|
| Invalid bank code | Cek mapping di Edge Function |
| Iris API error | Cek IRIS_API_KEY |
| Status stuck processing | Cek Iris dashboard |
| Insufficient balance | Cek saldo Iris |

---

## Iris Dashboard

- Sandbox: https://iris.sandbox.midtrans.com
- Production: https://iris.midtrans.com

Di dashboard bisa:
- Monitor payouts
- Top up balance
- View transaction history
- Download reports
