-- Simplified plant diagnosis table (no auth dependency for development)
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/kdxdvqlezegfkajwheuf/sql

CREATE TABLE IF NOT EXISTS public.plant_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  image_url TEXT NOT NULL,
  disease_name TEXT,
  confidence NUMERIC,
  symptoms TEXT,
  treatment_recommendation TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  crop_type TEXT,
  diagnosed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for development (enable in production!)
ALTER TABLE public.plant_diagnoses DISABLE ROW LEVEL SECURITY;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_plant_diagnoses_user_id ON public.plant_diagnoses(user_id);
CREATE INDEX IF NOT EXISTS idx_plant_diagnoses_created_at ON public.plant_diagnoses(created_at DESC);
