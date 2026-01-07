-- =============================================================
-- RPC Function: process_withdrawal
-- =============================================================
-- Fungsi ini menangani withdrawal secara ATOMIK untuk mencegah
-- race condition (double spending).
-- 
-- Cara kerja:
-- 1. SELECT FOR UPDATE untuk lock row balance
-- 2. Validasi saldo mencukupi
-- 3. Insert withdrawal record
-- 4. Deduct balance dalam 1 transaction
-- =============================================================

CREATE OR REPLACE FUNCTION process_withdrawal(
  p_user_id UUID,
  p_amount NUMERIC,
  p_les_place_id UUID DEFAULT NULL,
  p_bank_name TEXT DEFAULT '',
  p_bank_account TEXT DEFAULT '',
  p_bank_holder TEXT DEFAULT '',
  p_fee NUMERIC DEFAULT 5000
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance RECORD;
  v_withdrawal_id UUID;
  v_net_amount NUMERIC;
BEGIN
  -- Lock the row to prevent race condition
  SELECT * INTO v_balance 
  FROM balances 
  WHERE user_id = p_user_id 
  FOR UPDATE;
  
  -- Check if balance exists
  IF v_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Saldo tidak ditemukan');
  END IF;
  
  -- Check sufficient balance
  IF v_balance.available_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Saldo tidak mencukupi');
  END IF;
  
  -- Calculate net amount
  v_net_amount := p_amount - p_fee;
  
  -- Validate net amount is positive
  IF v_net_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Jumlah pencairan terlalu kecil');
  END IF;
  
  -- Insert withdrawal record
  INSERT INTO withdrawals (
    user_id, 
    les_place_id, 
    amount, 
    fee, 
    net_amount, 
    bank_name, 
    bank_account, 
    bank_holder, 
    status,
    created_at
  )
  VALUES (
    p_user_id, 
    p_les_place_id, 
    p_amount, 
    p_fee, 
    v_net_amount, 
    p_bank_name, 
    p_bank_account, 
    p_bank_holder, 
    'pending',
    NOW()
  )
  RETURNING id INTO v_withdrawal_id;
  
  -- Deduct balance atomically (this happens in same transaction as insert)
  UPDATE balances 
  SET 
    available_balance = available_balance - p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Return success with withdrawal ID
  RETURN json_build_object(
    'success', true, 
    'withdrawal_id', v_withdrawal_id,
    'net_amount', v_net_amount,
    'message', 'Permintaan pencairan berhasil. Dana akan ditransfer dalam 1-3 hari kerja.'
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Return error if something goes wrong
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_withdrawal TO authenticated;

-- =============================================================
-- RPC Function: pay_teacher_salary_atomic
-- =============================================================
-- Fungsi untuk membayar gaji teacher dari saldo owner secara atomik
-- =============================================================

CREATE OR REPLACE FUNCTION pay_teacher_salary_atomic(
  p_owner_id UUID,
  p_teacher_id UUID,
  p_les_place_id UUID,
  p_amount NUMERIC,
  p_payment_period TEXT DEFAULT '',
  p_bank_name TEXT DEFAULT '',
  p_bank_account TEXT DEFAULT '',
  p_bank_holder TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_balance RECORD;
  v_teacher_balance RECORD;
  v_payment_id UUID;
BEGIN
  -- Lock owner balance
  SELECT * INTO v_owner_balance 
  FROM balances 
  WHERE user_id = p_owner_id 
  FOR UPDATE;
  
  -- Check owner balance
  IF v_owner_balance IS NULL OR v_owner_balance.available_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Saldo owner tidak mencukupi');
  END IF;
  
  -- Create payment record
  INSERT INTO teacher_payments (
    les_place_id,
    teacher_id,
    owner_id,
    amount,
    payment_type,
    payment_period,
    payment_status,
    scheduled_date,
    bank_name,
    bank_account,
    bank_holder
  )
  VALUES (
    p_les_place_id,
    p_teacher_id,
    p_owner_id,
    p_amount,
    'salary',
    p_payment_period,
    'completed',
    CURRENT_DATE,
    p_bank_name,
    p_bank_account,
    p_bank_holder
  )
  RETURNING id INTO v_payment_id;
  
  -- Deduct from owner's balance
  UPDATE balances 
  SET 
    available_balance = available_balance - p_amount,
    updated_at = NOW()
  WHERE user_id = p_owner_id;
  
  -- Get or create teacher balance
  SELECT * INTO v_teacher_balance 
  FROM balances 
  WHERE user_id = p_teacher_id 
  FOR UPDATE;
  
  IF v_teacher_balance IS NULL THEN
    -- Create new balance for teacher
    INSERT INTO balances (user_id, les_place_id, total_balance, available_balance, pending_balance)
    VALUES (p_teacher_id, p_les_place_id, p_amount, p_amount, 0);
  ELSE
    -- Update existing balance
    UPDATE balances 
    SET 
      total_balance = total_balance + p_amount,
      available_balance = available_balance + p_amount,
      updated_at = NOW()
    WHERE user_id = p_teacher_id;
  END IF;
  
  -- Update payment as completed
  UPDATE teacher_payments
  SET paid_date = NOW()
  WHERE id = v_payment_id;
  
  RETURN json_build_object(
    'success', true, 
    'payment_id', v_payment_id,
    'message', 'Pembayaran gaji berhasil'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION pay_teacher_salary_atomic TO authenticated;
