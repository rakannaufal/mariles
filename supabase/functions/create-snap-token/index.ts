// Edge Function Supabase: Buat Snap Token
// Deploy: supabase functions deploy create-snap-token
// ================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Header CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Konfigurasi Midtrans
const MIDTRANS_SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY') || 'SB-Mid-server-xxx'
const IS_PRODUCTION = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true'
const MIDTRANS_API_URL = IS_PRODUCTION 
  ? 'https://app.midtrans.com/snap/v1/transactions'
  : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

serve(async (req) => {
  // Tangani preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, amount, customerDetails, itemDetails, preferredPayment } = await req.json()

    // Validasi field yang diperlukan
    if (!orderId || !amount) {
      throw new Error('Missing required fields: orderId, amount')
    }

    // Map ID metode pembayaran frontend ke tipe pembayaran Midtrans
    // Gunakan nama tipe pembayaran Midtrans yang tepat
    const paymentMethodMap: Record<string, string[]> = {
      'qris': ['gopay'], // QRIS is under GoPay in Midtrans
      'gopay': ['gopay'],
      'shopeepay': ['shopeepay'],
      'bca_va': ['bca_va'],
      'bni_va': ['bni_va'],
      'bri_va': ['bri_va'],
      'mandiri_va': ['echannel'],
    }

    // Tentukan pembayaran yang diaktifkan - jika preferredPayment diset, hanya tampilkan metode itu
    const enabledPayments = preferredPayment && paymentMethodMap[preferredPayment]
      ? paymentMethodMap[preferredPayment]
      : [
          'credit_card',
          'bca_va', 'bni_va', 'bri_va', 'permata_va', 'echannel', 'other_va',
          'gopay', 'shopeepay',
          'akulaku', 'kredivo',
        ]

    // Bangun payload request Midtrans
    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: customerDetails || {},
      item_details: itemDetails || [
        {
          id: 'program-1',
          price: amount,
          quantity: 1,
          name: 'Pembayaran Program Les',
        },
      ],
      // Aktifkan hanya metode pembayaran yang dipilih untuk akses langsung
      enabled_payments: enabledPayments,
      callbacks: {
        finish: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}/student/payment/success`,
      },
    }

    // Panggil API Midtrans
    const authString = btoa(`${MIDTRANS_SERVER_KEY}:`)
    const response = await fetch(MIDTRANS_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error_messages?.join(', ') || 'Midtrans API error')
    }

    // Kembalikan snap token dan URL redirect
    return new Response(
      JSON.stringify({
        success: true,
        token: result.token,
        redirect_url: result.redirect_url,
        order_id: orderId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
