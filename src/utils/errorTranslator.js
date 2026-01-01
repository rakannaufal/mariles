export const translateError = (errorMessage) => {
  if (!errorMessage) return 'Terjadi kesalahan tidak diketahui.'
  
  const msg = errorMessage.toLowerCase()

  // Login Errors
  if (msg.includes('invalid login credentials')) return 'Email atau password salah.'
  if (msg.includes('email not confirmed')) return 'Email belum dikonfirmasi. Silakan cek inbox Anda.'
  if (msg.includes('user not found')) return 'Pengguna tidak ditemukan.'
  
  // Register Errors
  if (msg.includes('user already registered') || msg.includes('already registered')) return 'Email sudah terdaftar. Silakan login.'
  if (msg.includes('password should be at least')) return 'Password minimal 6 karakter.'
  if (msg.includes('invalid email') || msg.includes('validation failed')) return 'Format email tidak valid.'
  
  // Rate Limits / Network
  if (msg.includes('rate limit exceeded') || msg.includes('too many requests')) return 'Terlalu banyak percobaan. Silakan coba lagi nanti.'
  if (msg.includes('network error') || msg.includes('fetch failed')) return 'Gagal terhubung ke server. Periksa koneksi internet Anda.'

  // Default fallback
  return errorMessage
}
