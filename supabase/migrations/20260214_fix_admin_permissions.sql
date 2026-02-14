-- MIGRATION: PROMOTE ADMIN USER
-- This script explicitly sets the 'admin' role for the target user to ensure RLS policies allow access.

-- 1. Update Public Profile (if exists)
UPDATE public.profiles
SET role = 'admin', status = 'active'
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'mansurmuquissirimaregulo13@gmail.com'
);

-- 2. Update Auth User Metadata (Crucial for RLS 'auth.jwt() -> role')
-- We use a secure function to update auth.users because direct update might be restricted restricted in some contexts,
-- but usually typical migrations run as superuser/postgres.
UPDATE auth.users
SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'mansurmuquissirimaregulo13@gmail.com';

-- 3. Ensure the user exists (If not, we can't create it here easily without password hash, 
-- but we assume the user will Sign Up or we rely on the client to handle creation if missing).
-- For safety, let's create a trigger that auto-promotes this specific email if they sign up later.

CREATE OR REPLACE FUNCTION public.auto_promote_admin()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email = 'mansurmuquissirimaregulo13@gmail.com' THEN
        NEW.raw_user_meta_data := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_promote_admin();

-- 4. Also promote in profiles on insert
CREATE OR REPLACE FUNCTION public.handle_admin_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Check email from auth.users via the ID
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.id AND email = 'mansurmuquissirimaregulo13@gmail.com') THEN
        NEW.role := 'admin';
        NEW.status := 'active';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_insert_admin ON public.profiles;
CREATE TRIGGER on_profile_insert_admin
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_admin_profile();
