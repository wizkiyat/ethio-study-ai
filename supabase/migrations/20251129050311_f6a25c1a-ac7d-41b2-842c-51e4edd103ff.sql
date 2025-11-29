-- Add is_premium and premium_expires_at to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_expires_at timestamp with time zone;

-- Create premium_requests table for payment verification
CREATE TABLE public.premium_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  username text NOT NULL,
  screenshot_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on premium_requests
ALTER TABLE public.premium_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own premium requests"
ON public.premium_requests FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create premium requests"
ON public.premium_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all premium requests
CREATE POLICY "Admins can view all premium requests"
ON public.premium_requests FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update premium requests
CREATE POLICY "Admins can update premium requests"
ON public.premium_requests FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-screenshots', 'payment-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payment screenshots
CREATE POLICY "Users can upload their own payment screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own payment screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all payment screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-screenshots' AND public.has_role(auth.uid(), 'admin'));

-- Create quizzes table
CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  questions jsonb NOT NULL DEFAULT '[]',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on quizzes
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Users can view quizzes for their flashcard sets
CREATE POLICY "Users can view quizzes for their sets"
ON public.quizzes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM flashcard_sets 
  WHERE flashcard_sets.id = quizzes.set_id 
  AND flashcard_sets.user_id = auth.uid()
));

-- Users can create quizzes for their sets
CREATE POLICY "Users can create quizzes for their sets"
ON public.quizzes FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM flashcard_sets 
  WHERE flashcard_sets.id = quizzes.set_id 
  AND flashcard_sets.user_id = auth.uid()
));

-- Users can delete quizzes for their sets
CREATE POLICY "Users can delete quizzes for their sets"
ON public.quizzes FOR DELETE
USING (EXISTS (
  SELECT 1 FROM flashcard_sets 
  WHERE flashcard_sets.id = quizzes.set_id 
  AND flashcard_sets.user_id = auth.uid()
));