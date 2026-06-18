-- Adds reminder_sent flag to appointments so due reminders can be tracked
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false;
