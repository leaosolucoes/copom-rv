-- CRITICAL SECURITY FIX: Re-enable RLS on system_settings and create proper policies
-- This table currently has RLS completely disabled which is a major security risk

-- Re-enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create secure RLS policies for system_settings
-- Public settings can be read by authenticated users
CREATE POLICY "Public settings readable by authenticated users" 
ON public.system_settings 
FOR SELECT 
TO authenticated
USING (key LIKE 'public_%');

-- Private settings only accessible by super admin role (not hardcoded UUID)
CREATE POLICY "Private settings admin access" 
ON public.system_settings 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
);

-- Create proper user roles enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'atendente', 'user');
  END IF;
END $$;

-- Create user_roles table for proper role management
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_by uuid REFERENCES public.users(id),
  assigned_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles without recursion
CREATE OR REPLACE FUNCTION public.user_has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Create function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY 
    CASE role
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'atendente' THEN 3
      WHEN 'user' THEN 4
    END
  LIMIT 1
$$;

-- Update user_roles policies
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admin can manage all roles" 
ON public.user_roles 
FOR ALL 
TO authenticated
USING (public.user_has_role(auth.uid(), 'super_admin'));

-- Migrate existing super admin to new role system
INSERT INTO public.user_roles (user_id, role, assigned_by, assigned_at)
SELECT 
  id,
  'super_admin'::app_role,
  id,
  now()
FROM public.users 
WHERE id = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid
  AND role = 'super_admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- Add input validation triggers for complaints
CREATE OR REPLACE FUNCTION public.validate_complaint_input()
RETURNS TRIGGER AS $$
BEGIN
  -- Sanitize and validate phone number
  NEW.complainant_phone = regexp_replace(NEW.complainant_phone, '[^0-9+()-\s]', '', 'g');
  
  -- Validate email format if provided
  IF NEW.complainant_phone ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    -- It's an email, validate email format
    IF NOT NEW.complainant_phone ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
  END IF;
  
  -- Validate required fields are not empty after trimming
  IF trim(NEW.complainant_name) = '' THEN
    RAISE EXCEPTION 'Complainant name cannot be empty';
  END IF;
  
  IF trim(NEW.narrative) = '' THEN
    RAISE EXCEPTION 'Narrative cannot be empty';
  END IF;
  
  -- Trim whitespace from text fields
  NEW.complainant_name = trim(NEW.complainant_name);
  NEW.complainant_address = trim(NEW.complainant_address);
  NEW.occurrence_address = trim(NEW.occurrence_address);
  NEW.narrative = trim(NEW.narrative);
  
  -- Limit narrative length
  IF length(NEW.narrative) > 5000 THEN
    RAISE EXCEPTION 'Narrative too long (max 5000 characters)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply validation trigger to complaints
DROP TRIGGER IF EXISTS validate_complaint_trigger ON public.complaints;
CREATE TRIGGER validate_complaint_trigger
  BEFORE INSERT OR UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.validate_complaint_input();

-- Add rate limiting table for public form submissions
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  endpoint text NOT NULL,
  attempts integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
CREATE POLICY "System manages rate limits" 
ON public.rate_limits 
FOR ALL 
USING (false); -- No user access, only system functions