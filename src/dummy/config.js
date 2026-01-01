// Dummy Data Configuration
// Config ini membaca nilai dari localStorage agar bisa diubah dari admin panel
// Nilai default adalah true jika belum diset

export const getUseDummyData = () => {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('USE_DUMMY_DATA')
    // Default true jika null, jika ada string 'false' return false, selain itu true
    return stored === null ? true : stored === 'true'
  }
  return true
}

export const USE_DUMMY_DATA = getUseDummyData()

// Fungsi helper untuk mengubah nilai (harus reload page agar efek terjadi pada constants lain yang sudah terimport)
export const setUseDummyData = (value) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('USE_DUMMY_DATA', value)
  }
}
