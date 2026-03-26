-- Delete unconfirmed users that are stuck (from failed email verification attempts)
-- Run this in Supabase SQL Editor

-- Show stuck users first (unconfirmed, no profile)
SELECT au.id, au.email, au.created_at, au.email_confirmed_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- Delete auth users that have no profile (stuck/unconfirmed)
-- Uncomment the line below after reviewing the SELECT results above
-- DELETE FROM auth.users WHERE id IN (
--   SELECT au.id FROM auth.users au
--   LEFT JOIN public.profiles p ON p.id = au.id
--   WHERE p.id IS NULL
-- );
