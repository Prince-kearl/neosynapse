
-- Consultation rooms for WebRTC signaling
CREATE TABLE public.consultation_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  doctor_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  offer JSONB,
  answer JSONB,
  consent_recording BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ICE candidates table for WebRTC signaling
CREATE TABLE public.ice_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.consultation_rooms(id) ON DELETE CASCADE NOT NULL,
  sender TEXT NOT NULL,
  candidate JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consultation_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ice_candidates ENABLE ROW LEVEL SECURITY;

-- RLS policies for consultation_rooms
CREATE POLICY "Users can create their own rooms" ON public.consultation_rooms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view their own rooms" ON public.consultation_rooms
  FOR SELECT TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Users can update their own rooms" ON public.consultation_rooms
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- RLS policies for ice_candidates
CREATE POLICY "Users can insert candidates for their rooms" ON public.ice_candidates
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.consultation_rooms WHERE id = room_id AND created_by = auth.uid())
  );

CREATE POLICY "Users can view candidates for their rooms" ON public.ice_candidates
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.consultation_rooms WHERE id = room_id AND created_by = auth.uid())
  );

-- Enable realtime for signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ice_candidates;
