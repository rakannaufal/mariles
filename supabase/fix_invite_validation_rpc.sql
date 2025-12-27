-- =====================================================
-- FIX INVITE VALIDATION VIA RPC (SECURITY DEFINER)
-- =====================================================

-- Fungsi ini akan dijalankan dengan hak akses pembuat fungsi (bypassing RLS)
-- User anonim bisa memanggilnya tanpa masalah RLS pada tabel-tabel terkait.

CREATE OR REPLACE FUNCTION validate_invite_code(code_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_record RECORD;
  result JSONB;
BEGIN
  -- Cari invite code dan info terkait
  SELECT 
    tic.id,
    tic.code,
    tic.owner_id,
    tic.les_place_id,
    tic.expires_at,
    tic.is_used,
    lp.name as les_place_name,
    o.business_name as owner_business_name,
    u.name as owner_name
  INTO invite_record
  FROM teacher_invite_codes tic
  JOIN les_places lp ON tic.les_place_id = lp.id
  JOIN owners o ON tic.owner_id = o.id
  JOIN users u ON o.user_id = u.id
  WHERE tic.code = code_input AND tic.is_used = false;

  -- Jika tidak ditemukan
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Kode tidak valid atau tidak ditemukan');
  END IF;

  -- Cek expired
  IF invite_record.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Kode sudah kadaluarsa');
  END IF;

  -- Return data lengkap dalam format yang diharapkan frontend
  -- Kita bentuk struktur JSON yang mirip dengan hasil query supabase-js sebelumnya agar minim perubahan,
  -- TAPI lebih baik kita sesuaikan frontend untuk terima format simple ini.
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'id', invite_record.id,
      'code', invite_record.code,
      'owner_id', invite_record.owner_id,
      'les_place_id', invite_record.les_place_id,
      'expires_at', invite_record.expires_at,
      'les_places', jsonb_build_object('id', invite_record.les_place_id, 'name', invite_record.les_place_name),
      'owners', jsonb_build_object('id', invite_record.owner_id, 'business_name', invite_record.owner_business_name, 'users', jsonb_build_object('name', invite_record.owner_name))
    )
  );
END;
$$;

-- Grant execute ke public
GRANT EXECUTE ON FUNCTION validate_invite_code(text) TO anon, authenticated, service_role;

SELECT 'Function validate_invite_code created successfully' as status;
