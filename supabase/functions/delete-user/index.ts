// Edge Function Supabase: Hapus Pengguna
// Deploy: supabase functions deploy delete-user --no-verify-jwt
// ================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Header CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

  serve(async (req) => {
  // Tangani preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Function 'delete-user' v1.1 started") // Log versi untuk debugging

    // 1. Inisialisasi Client dengan Konteks Auth Pengguna
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Header otorisasi tidak ditemukan')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Inisialisasi Admin Client (Service Role) untuk penghapusan
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Verifikasi Identitas Pemanggil
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Tidak terotorisasi: Sesi tidak valid')
    }

    // Parse Body Request lebih awal
    const { user_id } = await req.json()
    if (!user_id) {
      throw new Error('User ID tidak ditemukan dalam permintaan')
    }

    // 3. Tentukan apakah ini Hapus Mandiri atau Aksi Admin
    const isSelfDelete = user.id === user_id

    if (!isSelfDelete) {
        // Jika bukan menghapus diri sendiri, harus Admin
        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (userError) {
             console.error('Error fetching user role:', userError)
             throw new Error('Gagal memverifikasi peran pengguna')
        }

        if (userData?.role !== 'admin') {
            throw new Error(`Dilarang: Peran '${userData?.role}' tidak dapat menghapus pengguna lain`)
        }
    }

    if (isSelfDelete) {
        console.log(`User ${user.id} is deleting their own account.`)
    } else {
        console.log(`Admin ${user.id} is deleting user ${user_id}`)
    }

    console.log(`Attempting to delete user: ${user_id}`)

    // 6. Hapus dari Auth (Utama)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user_id)

    if (deleteAuthError) {
      console.warn('Auth deletion error (ignorable if user not in auth):', deleteAuthError)
    }

    // 7. Paksa Hapus dari Public Users (Pembersihan)
    const { error: deletePublicError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user_id)

    if (deletePublicError) {
      console.error('Public table deletion error:', deletePublicError)
      throw new Error(`Gagal menghapus dari database: ${deletePublicError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Pengguna berhasil dihapus' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (err) {
    const error = err as Error
    console.error('Edge Function Error:', error.message)
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
