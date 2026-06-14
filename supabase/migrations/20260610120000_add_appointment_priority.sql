-- Adds priority categories to scheduled appointments so patients can request routine, priority, urgent, or emergency consultations.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'routine';
