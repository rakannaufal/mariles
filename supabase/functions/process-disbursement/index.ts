// Edge Function Supabase: Proses Pencairan via Midtrans Iris
// Deploy: supabase functions deploy process-disbursement
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Konfigurasi Midtrans Iris
const IRIS_API_KEY = Deno.env.get('MIDTRANS_IRIS_API_KEY') || 'IRIS-xxx'
const IS_PRODUCTION = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true'
const IRIS_BASE_URL = IS_PRODUCTION 
  ? 'https://app.midtrans.com/iris/api/v1'
  : 'https://app.sandbox.midtrans.com/iris/api/v1'

// Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { withdrawalId, action } = await req.json()

    if (!withdrawalId) {
      throw new Error('withdrawalId is required')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Dapatkan detail pencairan
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawals')
      .select('*, users:user_id(email, name)')
      .eq('id', withdrawalId)
      .single()

    if (fetchError || !withdrawal) {
      throw new Error('Withdrawal not found')
    }

    // Validasi status pencairan
    if (withdrawal.status !== 'pending' && action !== 'check_status') {
      throw new Error(`Cannot process withdrawal with status: ${withdrawal.status}`)
    }

    // ============================================================
    // AKSI: Buat Payout
    // ============================================================
    if (action === 'create_payout' || !action) {
      // Update status ke processing
      await supabase
        .from('withdrawals')
        .update({ 
          status: 'processing',
          processed_at: new Date().toISOString()
        })
        .eq('id', withdrawalId)

      // Bangun request payout Iris
      const payoutPayload = {
        payouts: [{
          beneficiary_name: withdrawal.bank_holder,
          beneficiary_account: withdrawal.bank_account,
          beneficiary_bank: mapBankCode(withdrawal.bank_name),
          beneficiary_email: withdrawal.users?.email || '',
          amount: Math.floor(withdrawal.net_amount),
          notes: `Mariles Withdrawal - ${withdrawalId.slice(0, 8)}`
        }]
      }

      // Panggil API Midtrans Iris
      const authString = btoa(`${IRIS_API_KEY}:`)
      const response = await fetch(`${IRIS_BASE_URL}/payouts`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`,
        },
        body: JSON.stringify(payoutPayload),
      })

      const result = await response.json()

      if (!response.ok) {
        // Update status kembali ke pending saat error
        await supabase
          .from('withdrawals')
          .update({ status: 'pending' })
          .eq('id', withdrawalId)
        
        throw new Error(result.errors?.[0] || 'Iris API error')
      }

      // Dapatkan referensi payout
      const payoutData = result.payouts?.[0]
      
      // Update pencairan dengan referensi Iris
      await supabase
        .from('withdrawals')
        .update({
          iris_reference_key: payoutData?.reference_no,
          iris_status: payoutData?.status,
          disbursement_response: result,
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawalId)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payout created successfully',
          reference: payoutData?.reference_no,
          status: payoutData?.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ============================================================
    // AKSI: Cek Status
    // ============================================================
    if (action === 'check_status') {
      if (!withdrawal.iris_reference_key) {
        throw new Error('No Iris reference key found')
      }

      const authString = btoa(`${IRIS_API_KEY}:`)
      const response = await fetch(
        `${IRIS_BASE_URL}/payouts/${withdrawal.iris_reference_key}`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Basic ${authString}`,
          },
        }
      )

      const result = await response.json()

      // Map status Iris ke status kita
      let newStatus = withdrawal.status
      if (result.status === 'completed') {
        newStatus = 'completed'
      } else if (result.status === 'failed') {
        newStatus = 'failed'
      }

      // Update status pencairan
      await supabase
        .from('withdrawals')
        .update({
          status: newStatus,
          iris_status: result.status,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawalId)

      return new Response(
        JSON.stringify({
          success: true,
          status: newStatus,
          iris_status: result.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('Disbursement error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

// Map nama bank ke kode bank Midtrans
function mapBankCode(bankName: string): string {
  const bankMap: Record<string, string> = {
    'bca': 'bca',
    'bni': 'bni',
    'bri': 'bri',
    'mandiri': 'mandiri',
    'permata': 'permata',
    'cimb': 'cimb',
    'danamon': 'danamon',
    'btn': 'btn',
    'bsi': 'bsi',
    'bank bca': 'bca',
    'bank bni': 'bni',
    'bank bri': 'bri',
    'bank mandiri': 'mandiri',
  }
  return bankMap[bankName.toLowerCase()] || bankName.toLowerCase()
}
