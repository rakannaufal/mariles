// Supabase Edge Function: Payment Notification (Webhook)
// Deploy: supabase functions deploy payment-notification
// ======================================================
// Configure webhook URL in Midtrans Dashboard:
// https://<project-ref>.supabase.co/functions/v1/payment-notification

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Midtrans Server Key for signature verification
const MIDTRANS_SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY') || 'SB-Mid-server-xxx'

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const notification = await req.json()
    
    console.log('Received notification:', JSON.stringify(notification))

    // Extract notification data
    const {
      order_id,
      transaction_id,
      transaction_status,
      fraud_status,
      payment_type,
      status_code,
      gross_amount,
      signature_key,
    } = notification

    // Verify signature (Midtrans sends: SHA512(order_id + status_code + gross_amount + server_key))
    const signatureInput = `${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`
    const encoder = new TextEncoder()
    const data = encoder.encode(signatureInput)
    const hashBuffer = await crypto.subtle.digest('SHA-512', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    if (signature_key && calculatedSignature !== signature_key) {
      console.error('Invalid signature')
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid signature' }),
        { headers: corsHeaders, status: 401 }
      )
    }

    // Determine payment status
    let paymentStatus = 'pending'
    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      if (fraud_status === 'accept' || !fraud_status) {
        paymentStatus = 'completed'
      }
    } else if (transaction_status === 'pending') {
      paymentStatus = 'pending'
    } else if (['deny', 'cancel', 'expire', 'failure'].includes(transaction_status)) {
      paymentStatus = 'failed'
    } else if (transaction_status === 'refund' || transaction_status === 'partial_refund') {
      paymentStatus = 'refunded'
    }

    // Update database
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        payment_status: paymentStatus,
        midtrans_transaction_id: transaction_id,
        midtrans_payment_type: payment_type,
        midtrans_status_code: status_code,
        payment_date: paymentStatus === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('midtrans_order_id', order_id)

    if (updateError) {
      console.error('Database update error:', updateError)
      throw new Error('Failed to update transaction')
    }

    // If payment completed, update owner balance
    if (paymentStatus === 'completed') {
      // Get transaction details
      const { data: txn } = await supabase
        .from('transactions')
        .select('les_place_id, net_amount, les_places(owner_id)')
        .eq('midtrans_order_id', order_id)
        .single()

      if (txn?.les_places?.owner_id) {
        const ownerId = txn.les_places.owner_id

        // Update or insert balance
        const { data: existingBalance } = await supabase
          .from('balances')
          .select('*')
          .eq('user_id', ownerId)
          .single()

        if (existingBalance) {
          await supabase
            .from('balances')
            .update({
              total_balance: existingBalance.total_balance + txn.net_amount,
              available_balance: existingBalance.available_balance + txn.net_amount,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', ownerId)
        } else {
          await supabase
            .from('balances')
            .insert({
              user_id: ownerId,
              les_place_id: txn.les_place_id,
              total_balance: txn.net_amount,
              available_balance: txn.net_amount,
              pending_balance: 0,
            })
        }

        // Update booking status to confirmed
        await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', txn.booking_id)
      }
    }

    return new Response(
      JSON.stringify({ success: true, status: paymentStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Webhook error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
