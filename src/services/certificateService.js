/**
 * Certificate Service
 * ===================
 * 
 * Generates digital certificates for course completion
 */

/**
 * Generate a completion certificate
 * @param {Object} params - Certificate parameters
 * @returns {string} HTML content for the certificate
 */
export function generateCertificate({
  studentName,
  courseName,
  lesPlaceName,
  completionDate,
  instructorName,
  certificateId,
  grade = null
}) {
  const formattedDate = new Date(completionDate).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Sertifikat - ${studentName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Poppins:wght@400;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #f1f5f9;
          padding: 20px;
        }
        
        .certificate {
          width: 1000px;
          height: 700px;
          background: white;
          border: 3px solid #1e293b;
          position: relative;
          padding: 50px;
        }
        
        .border-inner {
          border: 2px solid #d4af37;
          height: 100%;
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        
        .corner {
          position: absolute;
          width: 60px;
          height: 60px;
          border: 3px solid #d4af37;
        }
        
        .corner-tl { top: 30px; left: 30px; border-right: none; border-bottom: none; }
        .corner-tr { top: 30px; right: 30px; border-left: none; border-bottom: none; }
        .corner-bl { bottom: 30px; left: 30px; border-right: none; border-top: none; }
        .corner-br { bottom: 30px; right: 30px; border-left: none; border-top: none; }
        
        .logo {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          font-family: 'Poppins', sans-serif;
          margin-bottom: 10px;
        }
        
        .header-text {
          font-size: 14px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 4px;
          margin-bottom: 20px;
        }
        
        .main-title {
          font-family: 'Great Vibes', cursive;
          font-size: 56px;
          color: #1e293b;
          margin-bottom: 10px;
        }
        
        .subtitle {
          font-size: 16px;
          color: #475569;
          margin-bottom: 30px;
        }
        
        .recipient-name {
          font-size: 42px;
          font-weight: 700;
          color: #1e293b;
          font-family: 'Poppins', sans-serif;
          border-bottom: 3px solid #d4af37;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        
        .description {
          font-size: 16px;
          color: #475569;
          line-height: 1.8;
          max-width: 700px;
          margin-bottom: 30px;
        }
        
        .course-name {
          font-size: 22px;
          font-weight: 600;
          color: #1e293b;
        }
        
        .grade-badge {
          display: inline-block;
          padding: 8px 24px;
          background: #d4af37;
          color: white;
          font-weight: 700;
          border-radius: 30px;
          margin-top: 10px;
          font-size: 14px;
        }
        
        .footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          width: 100%;
          gap: 100px;
        }
        
        .signature {
          text-align: center;
        }
        
        .signature-line {
          width: 200px;
          border-top: 2px solid #1e293b;
          margin-bottom: 8px;
        }
        
        .signature-name {
          font-weight: 600;
          color: #1e293b;
        }
        
        .signature-title {
          font-size: 12px;
          color: #64748b;
        }
        
        .date-section {
          text-align: center;
        }
        
        .date-label {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 4px;
        }
        
        .date-value {
          font-weight: 600;
          color: #1e293b;
        }
        
        .certificate-id {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          color: #94a3b8;
        }
        
        .print-btn {
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 12px 24px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        }
        
        .print-btn:hover {
          background: #1d4ed8;
        }
        
        @media print {
          body {
            background: white;
            padding: 0;
          }
          
          .print-btn {
            display: none;
          }
          
          .certificate {
            border: 3px solid #1e293b !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="certificate">
        <div class="corner corner-tl"></div>
        <div class="corner corner-tr"></div>
        <div class="corner corner-bl"></div>
        <div class="corner corner-br"></div>
        
        <div class="border-inner">
          <div class="logo">Mariles</div>
          <div class="header-text">Sertifikat Penyelesaian</div>
          
          <div class="main-title">Certificate of Completion</div>
          <div class="subtitle">Dengan bangga kami berikan kepada</div>
          
          <div class="recipient-name">${studentName}</div>
          
          <div class="description">
            Yang telah berhasil menyelesaikan program pembelajaran di
            <strong>${lesPlaceName}</strong> dengan program:
          </div>
          
          <div class="course-name">${courseName}</div>
          
          ${grade ? `<div class="grade-badge">Nilai: ${grade}</div>` : ''}
          
          <div class="footer">
            <div class="date-section">
              <div class="date-label">Tanggal Penyelesaian</div>
              <div class="date-value">${formattedDate}</div>
            </div>
            
            <div class="signature">
              <div class="signature-line"></div>
              <div class="signature-name">${instructorName || 'Instruktur'}</div>
              <div class="signature-title">Pengajar / Pemilik</div>
            </div>
          </div>
          
          <div class="certificate-id">ID: ${certificateId}</div>
        </div>
      </div>
      
      <button class="print-btn" onclick="window.print()">🖨️ Cetak Sertifikat</button>
    </body>
    </html>
  `

  return html
}

/**
 * Open certificate in new window
 * @param {Object} params - Certificate parameters
 */
export function openCertificate(params) {
  const html = generateCertificate(params)
  const newWindow = window.open('', '_blank')
  newWindow.document.write(html)
  newWindow.document.close()
}

/**
 * Generate unique certificate ID
 * @param {string} studentId
 * @param {string} programId
 */
export function generateCertificateId(studentId, programId) {
  const timestamp = Date.now().toString(36).toUpperCase()
  const studentPrefix = studentId.slice(0, 4).toUpperCase()
  const programPrefix = programId.slice(0, 4).toUpperCase()
  return `MRL-${studentPrefix}-${programPrefix}-${timestamp}`
}
