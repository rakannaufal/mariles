/**
 * Layanan Ekspor
 * ==============
 * 
 * Utilitas untuk mengekspor data ke format PDF dan Excel
 */

/**
 * Ekspor data ke CSV (kompatibel Excel)
 * @param {Array} data - Array objek untuk diekspor
 * @param {string} filename - Nama file tanpa ekstensi
 * @param {Array} columns - Array { key, label } untuk pemetaan kolom
 */
export function exportToCSV(data, filename, columns) {
  if (!data || data.length === 0) {
    alert('Tidak ada data untuk diexport')
    return
  }

  // Buat header CSV
  const headers = columns.map(col => `"${col.label}"`).join(',')
  
  // Buat baris CSV
  const rows = data.map(item => {
    return columns.map(col => {
      let value = item[col.key]
      
      // Tangani properti bersarang
      if (col.key.includes('.')) {
        const keys = col.key.split('.')
        value = keys.reduce((obj, key) => obj?.[key], item)
      }
      
      // Format nilai
      if (value === null || value === undefined) {
        value = ''
      } else if (typeof value === 'number') {
        value = value.toString()
      } else if (typeof value === 'boolean') {
        value = value ? 'Ya' : 'Tidak'
      } else if (value instanceof Date) {
        value = value.toLocaleDateString('id-ID')
      }
      
      // Escape tanda kutip
      value = String(value).replace(/"/g, '""')
      
      return `"${value}"`
    }).join(',')
  })

  // Gabungkan header dan baris
  const csv = [headers, ...rows].join('\n')
  
  // Tambahkan BOM untuk kompatibilitas UTF-8 Excel
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  
  // Unduh
  downloadBlob(blob, `${filename}.csv`)
}

/**
 * Ekspor data ke tabel HTML sederhana (PDF yang bisa dicetak)
 * Buka di tab baru untuk pencetakan
 * @param {Array} data - Array objek
 * @param {string} title - Judul dokumen
 * @param {Array} columns - Array { key, label }
 */
export function exportToPrintablePDF(data, title, columns) {
  if (!data || data.length === 0) {
    alert('Tidak ada data untuk diexport')
    return
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: 'Poppins', -apple-system, sans-serif; padding: 20px; }
        h1 { text-align: center; color: #1e293b; margin-bottom: 8px; }
        .subtitle { text-align: center; color: #64748b; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #1e293b; color: white; padding: 10px 8px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) { background: #f8fafc; }
        .footer { text-align: center; margin-top: 24px; color: #94a3b8; font-size: 11px; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="subtitle">Diekspor pada ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      
      <button class="no-print" onclick="window.print()" style="margin-bottom: 16px; padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer;">
        🖨️ Cetak / Simpan PDF
      </button>
      
      <table>
        <thead>
          <tr>
            ${columns.map(col => `<th>${col.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              ${columns.map(col => {
                let value = item[col.key]
                if (col.key.includes('.')) {
                  value = col.key.split('.').reduce((obj, key) => obj?.[key], item)
                }
                if (col.format) value = col.format(value)
                return `<td>${value ?? '-'}</td>`
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <p class="footer">Mariles - Platform Marketplace Bimbingan Belajar</p>
    </body>
    </html>
  `

  // Buka di tab baru
  const newWindow = window.open('', '_blank')
  newWindow.document.write(html)
  newWindow.document.close()
}

/**
 * Format mata uang untuk ekspor
 * @param {number} amount
 */
export function formatCurrency(amount) {
  return `Rp ${new Intl.NumberFormat('id-ID').format(amount || 0)}`
}

/**
 * Format tanggal untuk ekspor
 * @param {string} date
 */
export function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Unduh blob sebagai file
 * @param {Blob} blob
 * @param {string} filename
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================================
// EKSPOR PRESET
// ============================================================

/**
 * Ekspor laporan keuangan
 * @param {Array} transactions
 * @param {string} format - 'csv' atau 'pdf'
 */
export function exportFinanceReport(transactions, format = 'csv') {
  const columns = [
    { key: 'midtrans_order_id', label: 'Order ID' },
    { key: 'les_places.name', label: 'Tempat Les' },
    { key: 'amount', label: 'Jumlah', format: formatCurrency },
    { key: 'platform_fee', label: 'Platform Fee', format: formatCurrency },
    { key: 'net_amount', label: 'Net', format: formatCurrency },
    { key: 'payment_status', label: 'Status' },
    { key: 'created_at', label: 'Tanggal', format: formatDate }
  ]

  if (format === 'csv') {
    exportToCSV(transactions, `laporan-keuangan-${Date.now()}`, columns)
  } else {
    exportToPrintablePDF(transactions, 'Laporan Keuangan', columns)
  }
}

/**
 * Ekspor daftar siswa
 * @param {Array} students
 * @param {string} format
 */
export function exportStudentList(students, format = 'csv') {
  const columns = [
    { key: 'users.name', label: 'Nama' },
    { key: 'users.email', label: 'Email' },
    { key: 'users.phone', label: 'Telepon' },
    { key: 'programs.name', label: 'Program' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Terdaftar', format: formatDate }
  ]

  if (format === 'csv') {
    exportToCSV(students, `daftar-siswa-${Date.now()}`, columns)
  } else {
    exportToPrintablePDF(students, 'Daftar Siswa', columns)
  }
}

/**
 * Ekspor laporan kehadiran
 * @param {Array} attendance
 * @param {string} format
 */
export function exportAttendanceReport(attendance, format = 'csv') {
  const columns = [
    { key: 'student_name', label: 'Nama Siswa' },
    { key: 'date', label: 'Tanggal', format: formatDate },
    { key: 'status', label: 'Status' },
    { key: 'note', label: 'Catatan' }
  ]

  if (format === 'csv') {
    exportToCSV(attendance, `laporan-kehadiran-${Date.now()}`, columns)
  } else {
    exportToPrintablePDF(attendance, 'Laporan Kehadiran', columns)
  }
}
