-- Force delete a stuck user by email
-- Replace the email below with the actual email you want to delete
-- Run in Supabase SQL Editor

DO $$
DECLARE
  target_email TEXT := '20221055@nbsc.edu.ph';
  target_id UUID;
BEGIN
  SELECT id INTO target_id FROM auth.users WHERE email = target_email;
  
  IF target_id IS NULL THEN
    RAISE NOTICE 'User not found: %', target_email;
    RETURN;
  END IF;

  -- Delete from all related tables first
  DELETE FROM public.profiles WHERE id = target_id;
  DELETE FROM public.inventory_submissions WHERE user_id = target_id;
  DELETE FROM public.mental_health_assessments WHERE user_id = target_id;
  DELETE FROM public.counseling_sessions WHERE student_id = target_id;
  DELETE FROM public.consent_records WHERE student_id = target_id;
  DELETE FROM public.follow_up_records WHERE student_id = target_id;
  DELETE FROM public.password_reset_requests WHERE user_id = target_id;
  
  -- Now delete from auth
  DELETE FROM auth.users WHERE id = target_id;
  
  RAISE NOTICE 'User deleted: % (%)', target_email, target_id;
END $$;
