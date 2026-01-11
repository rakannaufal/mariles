// Supabase Edge Function: Delete User
// Deploy: supabase functions deploy delete-user --no-verify-jwt
// ================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Initialize Client with User Auth Context
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Header otorisasi tidak ditemukan')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 2. Verify Caller Identity
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Tidak terotorisasi: Sesi tidak valid')
    }

    // Parse Request Body early
    const { user_id } = await req.json()
    if (!user_id) {
      throw new Error('User ID tidak ditemukan dalam permintaan')
    }

    // 3. Determine if this is a Self-Deletion or Admin Action
    const isSelfDelete = user.id === user_id

    if (!isSelfDelete) {
        // If not deleting self, must be Admin
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

    // 6. Delete from Auth (Primary)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user_id)

    if (deleteAuthError) {
      console.warn('Auth deletion error (ignorable if user not in auth):', deleteAuthError)
    }

    // 7. Force Delete from Public Users (Cleanup)
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

  } catch (error) {
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
