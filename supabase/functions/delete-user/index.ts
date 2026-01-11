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
      throw new Error('Missing Authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 2. Verify Caller Identity
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Unauthorized: Invalid session')
    }

    // 3. Verify Admin Role (Strict Check)
    // Query public.users using the same client (respecting RLS)
    // If Admin RLS is set up correctly, this should work.
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError) {
       console.error('Error fetching user role:', userError)
       throw new Error('Failed to verify user role')
    }

    if (userData?.role !== 'admin') {
      throw new Error(`Forbidden: Role '${userData?.role}' cannot delete users`)
    }

    // 4. Initialize Admin Client (Service Role)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 5. Parse Request Body
    const { user_id } = await req.json()

    if (!user_id) {
      throw new Error('Missing user_id in request body')
    }

    if (user_id === user.id) {
        throw new Error('Cannot delete your own account')
    }

    console.log(`Attempting to delete user: ${user_id}`)

    // 6. Delete from Auth (Primary)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user_id)

    if (deleteAuthError) {
      // If user not found in Auth, it might be a zombie record in public.users
      console.warn('Auth deletion error (ignorable if user not in auth):', deleteAuthError)
    }

    // 7. Force Delete from Public Users (Cleanup)
    // This handles cases where Auth delete didn't cascade or user only exists in public
    const { error: deletePublicError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user_id)

    if (deletePublicError) {
      console.error('Public table deletion error:', deletePublicError)
      throw new Error(`Failed to delete from database: ${deletePublicError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
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
