/**
 * Midtrans Payment Gateway Configuration
 * ======================================
 * 
 * This module provides Midtrans integration for:
 * - Snap (Payment collection from students)
 * - Disbursement/Iris (Payout to owner/teacher bank accounts)
 * 
 * Currently configured for SANDBOX mode.
 * For production, uncomment the production keys and update .env
 */

// ============================================================
// CONFIGURATION
// ============================================================

// Sandbox Keys (for testing)
const MIDTRANS_CONFIG = {
  isProduction: import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true',
  
  // Sandbox Keys (default for development)
  clientKey: import.meta.env.VITE_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-XXXXXXXXXXXXXXXX',
  serverKey: import.meta.env.VITE_MIDTRANS_SERVER_KEY || 'SB-Mid-server-XXXXXXXXXXXXXXXX',
  
  // Production Keys (uncomment when going live)
  // clientKey: import.meta.env.VITE_MIDTRANS_CLIENT_KEY || 'Mid-client-XXXXXXXXXXXXXXXX',
  // serverKey: import.meta.env.VITE_MIDTRANS_SERVER_KEY || 'Mid-server-XXXXXXXXXXXXXXXX',
  
  // API URLs
  snapUrl: import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true' 
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js',
  
  apiUrl: import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://api.midtrans.com/v2'
    : 'https://api.sandbox.midtrans.com/v2',
  
  // Iris (Disbursement) URLs
  irisUrl: import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://app.midtrans.com/iris'
    : 'https://app.sandbox.midtrans.com/iris',
}

// ============================================================
// SNAP (PAYMENT COLLECTION)
// ============================================================

/**
 * Load Midtrans Snap script dynamically
 */
export function loadSnapScript() {
  return new Promise((resolve, reject) => {
    if (window.snap) {
      resolve(window.snap)
      return
    }
    
    const script = document.createElement('script')
    script.src = MIDTRANS_CONFIG.snapUrl
    script.setAttribute('data-client-key', MIDTRANS_CONFIG.clientKey)
    script.onload = () => resolve(window.snap)
    script.onerror = () => reject(new Error('Failed to load Midtrans Snap'))
    document.head.appendChild(script)
  })
}

/**
 * Open Snap payment popup
 * @param {string} snapToken - Token from backend
 * @param {Object} callbacks - Callback functions
 */
export async function openSnapPayment(snapToken, callbacks = {}) {
  const snap = await loadSnapScript()
  
  snap.pay(snapToken, {
    onSuccess: (result) => {
      console.log('Payment success:', result)
      callbacks.onSuccess?.(result)
    },
    onPending: (result) => {
      console.log('Payment pending:', result)
      callbacks.onPending?.(result)
    },
    onError: (result) => {
      console.log('Payment error:', result)
      callbacks.onError?.(result)
    },
    onClose: () => {
      console.log('Payment popup closed')
      callbacks.onClose?.()
    }
  })
}

// ============================================================
// HELPER: Generate Order ID
// ============================================================

/**
 * Generate unique order ID for Midtrans
 * @param {string} prefix - Order prefix (e.g., 'TXN', 'WD')
 */
export function generateOrderId(prefix = 'MARILES') {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

// ============================================================
// PAYMENT METHODS INFO
// ============================================================

export const PAYMENT_METHODS = {
  bank_transfer: {
    code: 'bank_transfer',
    name: 'Transfer Bank',
    description: 'BCA, BNI, BRI, Mandiri, Permata',
    icon: '🏦'
  },
  gopay: {
    code: 'gopay',
    name: 'GoPay',
    description: 'Bayar dengan GoPay',
    icon: '💚'
  },
  shopeepay: {
    code: 'shopeepay',
    name: 'ShopeePay',
    description: 'Bayar dengan ShopeePay',
    icon: '🧡'
  },
  qris: {
    code: 'qris',
    name: 'QRIS',
    description: 'Scan QR dari aplikasi apapun',
    icon: '📱'
  },
  credit_card: {
    code: 'credit_card',
    name: 'Kartu Kredit',
    description: 'Visa, Mastercard, JCB',
    icon: '💳'
  }
}

// ============================================================
// BANK LIST FOR DISBURSEMENT
// ============================================================

export const BANK_LIST = [
  { code: 'bca', name: 'BCA' },
  { code: 'bni', name: 'BNI' },
  { code: 'bri', name: 'BRI' },
  { code: 'mandiri', name: 'Mandiri' },
  { code: 'permata', name: 'Permata' },
  { code: 'cimb', name: 'CIMB Niaga' },
  { code: 'danamon', name: 'Danamon' },
  { code: 'bsi', name: 'BSI' },
  { code: 'btn', name: 'BTN' },
  { code: 'mega', name: 'Bank Mega' },
  { code: 'ocbc', name: 'OCBC NISP' },
  { code: 'panin', name: 'Panin' },
]

// ============================================================
// EXPORTS
// ============================================================

export default MIDTRANS_CONFIG
