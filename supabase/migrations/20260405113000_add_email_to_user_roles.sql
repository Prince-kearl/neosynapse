-- Add email to user_roles for admin visibility and easier role auditing.
-- Safe/idempotent migration.

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill existing rows from auth.users.
UPDATE public.user_roles ur
SET email = au.email
FROM auth.users au
WHERE ur.user_id = au.id
  AND (ur.email IS NULL OR ur.email = '');

-- Helper trigger to auto-populate email on future inserts/updates.
CREATE OR REPLACE FUNCTION public.sync_user_roles_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF NEW.email IS NULL OR NEW.email = '' THEN
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = NEW.user_id;

    NEW.email := v_email;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_roles_email ON public.user_roles;

CREATE TRIGGER trg_sync_user_roles_email
BEFORE INSERT OR UPDATE OF user_id, email
ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_roles_email();
