-- Create study_sessions table for tracking study time
CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  total_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for study_sessions
CREATE POLICY "Study sessions: read own or staff" 
ON public.study_sessions 
FOR SELECT 
USING (
  (user_id = auth.uid()) OR 
  (
    tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()) AND 
    (has_role_in_tenant(auth.uid(), 'teacher'::app_role, tenant_id) OR has_role_in_tenant(auth.uid(), 'admin'::app_role, tenant_id))
  )
);

CREATE POLICY "Study sessions: write own" 
ON public.study_sessions 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND 
  tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid())
);

CREATE POLICY "Study sessions: update own" 
ON public.study_sessions 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Trigger for updating updated_at
CREATE TRIGGER update_study_sessions_updated_at
BEFORE UPDATE ON public.study_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update countdowns table to include colors for the visual design
ALTER TABLE public.countdowns 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'blue',
ADD COLUMN IF NOT EXISTS description TEXT;