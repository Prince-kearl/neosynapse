-- Create tables for admin-configurable reminder schedules and per-appointment reminders

-- 1) schedules table: admin-configurable reminder stages (minutes before appointment)
CREATE TABLE IF NOT EXISTS public.appointment_reminder_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  minutes_before INTEGER NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert defaults if not present
INSERT INTO public.appointment_reminder_schedules (label, minutes_before, enabled)
SELECT '24 hours before', 1440, true
WHERE NOT EXISTS (SELECT 1 FROM public.appointment_reminder_schedules WHERE minutes_before = 1440);

INSERT INTO public.appointment_reminder_schedules (label, minutes_before, enabled)
SELECT '1 hour before', 60, true
WHERE NOT EXISTS (SELECT 1 FROM public.appointment_reminder_schedules WHERE minutes_before = 60);

INSERT INTO public.appointment_reminder_schedules (label, minutes_before, enabled)
SELECT 'At time of appointment', 0, true
WHERE NOT EXISTS (SELECT 1 FROM public.appointment_reminder_schedules WHERE minutes_before = 0);

-- 2) per-appointment reminders table
CREATE TABLE IF NOT EXISTS public.appointment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL,
  schedule_id UUID NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (schedule_id) REFERENCES public.appointment_reminder_schedules(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS appointment_reminders_scheduled_idx ON public.appointment_reminders (scheduled_for, sent);

-- 3) trigger function: populate appointment_reminders when a new appointment is created
CREATE OR REPLACE FUNCTION public.create_reminders_for_new_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sch RECORD;
  reminder_time TIMESTAMP WITH TIME ZONE;
BEGIN
  FOR sch IN SELECT id, minutes_before, enabled FROM public.appointment_reminder_schedules WHERE enabled = true LOOP
    reminder_time := (NEW.scheduled_at - (sch.minutes_before || ' minutes')::interval);
    INSERT INTO public.appointment_reminders (appointment_id, schedule_id, scheduled_for)
    VALUES (NEW.id, sch.id, reminder_time);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_reminders_on_appointment_insert ON public.appointments;
CREATE TRIGGER trg_create_reminders_on_appointment_insert
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.create_reminders_for_new_appointment();

-- 4) enable RLS for appointment_reminders and allow admin to access
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select their own reminders (patient or professional)
CREATE POLICY "Users view own appointment reminders"
  ON public.appointment_reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a WHERE a.id = appointment_reminders.appointment_id AND (auth.uid() = a.patient_id OR auth.uid() = a.professional_id)
    )
  );

-- Admin full access handled elsewhere by admin policies

