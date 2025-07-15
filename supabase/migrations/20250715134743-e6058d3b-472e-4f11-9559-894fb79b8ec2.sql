-- Update the ensure_first_user_is_admin function to set new users as inactive by default
-- except for the very first user who becomes admin
CREATE OR REPLACE FUNCTION public.ensure_first_user_is_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- If this is the first user, make them admin and active
  IF user_count = 0 THEN
    NEW.role = 'admin';
    NEW.is_active = true;
  ELSE
    -- All other users start as inactive and need admin approval
    NEW.is_active = false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically set user status on profile creation
DROP TRIGGER IF EXISTS ensure_first_user_is_admin ON public.profiles;
CREATE TRIGGER ensure_first_user_is_admin
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_first_user_is_admin();