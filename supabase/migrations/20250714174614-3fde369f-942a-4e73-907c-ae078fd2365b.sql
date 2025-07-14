-- First, let's create a function to make the first user an admin
CREATE OR REPLACE FUNCTION public.ensure_first_user_is_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- If this is the first user, make them admin
  IF user_count = 0 THEN
    NEW.role = 'admin';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically make first user admin
CREATE TRIGGER ensure_first_user_admin
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_first_user_is_admin();