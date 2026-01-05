# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).
# mariles
# mariles

# https://simulator.sandbox.midtrans.com/

<!-- lalu untuk sistem latihan ni,teacher mengupload latihan lalu muncul distudentdan student mengerjakannya dan di bagian latihannya ada upload jawaban lalu masuk ke teacher jawabannya dan teacher melihat dan memberi nilai dari latihannya dan nilai muncul di student dan di halaman nilai dan siswa pada teacher ikut berubah  -->

🔑 Step 1: Ambil API Keys Production
Login ke dashboard.midtrans.com
Pastikan Environment = Production (bukan Sandbox)
Klik Settings → Access Keys
Copy Client Key dan Server Key
📝 Step 2: Update File .env di Project
Buka file .env di project Mariles dan update:

env
# Midtrans Production Keys
VITE_MIDTRANS_IS_PRODUCTION=true
VITE_MIDTRANS_CLIENT_KEY=Mid-client-XXXXXX  # Ganti dengan Client Key production
VITE_MIDTRANS_SERVER_KEY=Mid-server-XXXXXX  # Ganti dengan Server Key production
🚀 Step 3: Deploy Ulang
bash
# Jika pakai Vercel
vercel --prod
# Atau push ke GitHub (auto deploy)
git add .
git commit -m "Switch to Midtrans production"
git push
✅ Step 4: Test Pembayaran
Buka website Mariles
Coba daftar ke program les
Pilih pembayaran GoPay/QRIS
Test dengan nominal kecil dulu
⚠️ Catatan Penting
Mode	Kegunaan
Sandbox	Testing (uang tidak real)
Production	Live (uang real)
Setelah approved, jangan lupa ganti ke Production keys agar pembayaran beneran masuk ke rekening Anda!