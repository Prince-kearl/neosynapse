
-- ============================================================
-- NEO SYNAPSE: Healthcare Platform Schema
-- Replaces marketplace schema with healthcare-native entities
-- ============================================================

-- STEP 1: Role enum
CREATE TYPE public.user_role AS ENUM ('patient', 'professional', 'admin');

-- STEP 2: Profiles table (replaces marketplace profiles)
-- We'll ADD role + status columns to existing profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'patient',
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- STEP 3: Patient profiles
CREATE TABLE IF NOT EXISTS public.patient_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  date_of_birth DATE,
  gender TEXT,
  preferred_language TEXT DEFAULT 'en',
  phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  insurance_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own profile"
  ON public.patient_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Patients can insert own profile"
  ON public.patient_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Patients can update own profile"
  ON public.patient_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- STEP 4: Professional profiles
CREATE TABLE IF NOT EXISTS public.professional_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  profession_type TEXT,
  license_number TEXT,
  specialty TEXT,
  facility_id UUID,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can view own profile"
  ON public.professional_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Professionals can insert own profile"
  ON public.professional_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Professionals can update own profile"
  ON public.professional_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- STEP 5: Facilities
CREATE TABLE IF NOT EXISTS public.facilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  facility_type TEXT,
  location TEXT,
  contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Facilities are publicly viewable"
  ON public.facilities FOR SELECT
  USING (true);

-- STEP 6: Invitations
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role public.user_role NOT NULL,
  facility_id UUID,
  invited_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view their own invitation by token"
  ON public.invitations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Invited_by user can update invitations"
  ON public.invitations FOR UPDATE
  USING (auth.uid() = invited_by);

-- STEP 7: Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  professional_id UUID,
  facility_id UUID,
  appointment_type TEXT NOT NULL DEFAULT 'telemedicine',
  reason_for_visit TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = patient_id OR auth.uid() = professional_id);

CREATE POLICY "Patients can create appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients and professionals can update appointments"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = patient_id OR auth.uid() = professional_id);

-- STEP 8: Encounters
CREATE TABLE IF NOT EXISTS public.encounters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID,
  patient_id UUID NOT NULL,
  professional_id UUID,
  encounter_type TEXT NOT NULL DEFAULT 'telemedicine',
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own encounters"
  ON public.encounters FOR SELECT
  USING (auth.uid() = patient_id OR auth.uid() = professional_id);

CREATE POLICY "Patients can create encounters"
  ON public.encounters FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients and professionals can update encounters"
  ON public.encounters FOR UPDATE
  USING (auth.uid() = patient_id OR auth.uid() = professional_id);

-- STEP 9: Triage sessions
CREATE TABLE IF NOT EXISTS public.triage_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  inputs_json JSONB,
  result_json JSONB,
  urgency_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.triage_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own triage sessions"
  ON public.triage_sessions FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can create triage sessions"
  ON public.triage_sessions FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- STEP 10: Consents
CREATE TABLE IF NOT EXISTS public.consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  encounter_id UUID,
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  version TEXT DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own consents"
  ON public.consents FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can create consents"
  ON public.consents FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- STEP 11: Transcripts
CREATE TABLE IF NOT EXISTS public.transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  encounter_id UUID NOT NULL,
  transcript_json JSONB,
  speaker_map JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Encounter participants can view transcripts"
  ON public.transcripts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.encounters e
      WHERE e.id = transcripts.encounter_id
        AND (e.patient_id = auth.uid() OR e.professional_id = auth.uid())
    )
  );

CREATE POLICY "Professionals can create transcripts"
  ON public.transcripts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.encounters e
      WHERE e.id = transcripts.encounter_id
        AND e.professional_id = auth.uid()
    )
  );

-- STEP 12: Clinical notes
CREATE TABLE IF NOT EXISTS public.clinical_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  encounter_id UUID NOT NULL,
  draft_json JSONB,
  final_json JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can manage their clinical notes"
  ON public.clinical_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.encounters e
      WHERE e.id = clinical_notes.encounter_id
        AND (e.professional_id = auth.uid() OR e.patient_id = auth.uid())
    )
  );

CREATE POLICY "Professionals can create clinical notes"
  ON public.clinical_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.encounters e
      WHERE e.id = clinical_notes.encounter_id
        AND e.professional_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can update their clinical notes"
  ON public.clinical_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.encounters e
      WHERE e.id = clinical_notes.encounter_id
        AND e.professional_id = auth.uid()
    )
  );

-- STEP 13: Medical reports
CREATE TABLE IF NOT EXISTS public.medical_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  encounter_id UUID,
  patient_id UUID NOT NULL,
  report_type TEXT NOT NULL,
  report_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own medical reports"
  ON public.medical_reports FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Professionals can create medical reports"
  ON public.medical_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.encounters e
      WHERE e.id = medical_reports.encounter_id
        AND e.professional_id = auth.uid()
    ) OR auth.uid() = patient_id
  );

-- STEP 14: Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = actor_id);

-- STEP 15: Triggers for updated_at columns
CREATE TRIGGER update_patient_profiles_updated_at
  BEFORE UPDATE ON public.patient_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_professional_profiles_updated_at
  BEFORE UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_facilities_updated_at
  BEFORE UPDATE ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_encounters_updated_at
  BEFORE UPDATE ON public.encounters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinical_notes_updated_at
  BEFORE UPDATE ON public.clinical_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STEP 16: Auto-create profile trigger on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'patient'),
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 17: Security definer function to get user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT FROM public.profiles WHERE user_id = user_uuid LIMIT 1;
$$;
