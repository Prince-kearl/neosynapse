-- Capture patient profile fields from auth signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'patient');

  INSERT INTO public.profiles (user_id, display_name, role, status)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    v_role,
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Persist extra patient details provided during signup.
  IF v_role = 'patient' THEN
    INSERT INTO public.patient_profiles (
      user_id,
      date_of_birth,
      gender,
      phone,
      emergency_contact_name,
      emergency_contact_phone,
      preferred_language
    )
    VALUES (
      NEW.id,
      NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '')::date,
      NULLIF(NEW.raw_user_meta_data->>'gender', ''),
      NULLIF(NEW.raw_user_meta_data->>'phone', ''),
      NULLIF(NEW.raw_user_meta_data->>'emergency_contact_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'emergency_contact_phone', ''),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'preferred_language', ''), 'en')
    )
    ON CONFLICT (user_id) DO UPDATE SET
      date_of_birth = COALESCE(EXCLUDED.date_of_birth, patient_profiles.date_of_birth),
      gender = COALESCE(EXCLUDED.gender, patient_profiles.gender),
      phone = COALESCE(EXCLUDED.phone, patient_profiles.phone),
      emergency_contact_name = COALESCE(EXCLUDED.emergency_contact_name, patient_profiles.emergency_contact_name),
      emergency_contact_phone = COALESCE(EXCLUDED.emergency_contact_phone, patient_profiles.emergency_contact_phone),
      preferred_language = COALESCE(EXCLUDED.preferred_language, patient_profiles.preferred_language),
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;