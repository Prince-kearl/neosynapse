-- Stores a point-in-time copy of the patient's saved medical history on appointment requests.
-- Doctors can review the context that was available when the patient booked, even if
-- the patient later edits their live medical history.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS medical_history_snapshot jsonb;
