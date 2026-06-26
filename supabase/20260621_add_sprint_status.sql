-- Add status column to sprints table
ALTER TABLE public.sprints ADD COLUMN IF NOT EXISTS status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'archived'));
