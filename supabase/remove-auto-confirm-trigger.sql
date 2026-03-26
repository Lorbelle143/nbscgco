-- Remove auto-confirm trigger so email verification works properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

SELECT 'Auto-confirm trigger removed. Email verification now active.' as status;
