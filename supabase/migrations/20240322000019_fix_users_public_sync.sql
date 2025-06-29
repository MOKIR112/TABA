-- Ensure users_public table is properly synced with users table
-- This migration fixes the sync between users and users_public tables

-- First, let's make sure all users from auth.users are in the users table
INSERT INTO public.users (id, email, name, avatar_url, email_verified, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name') as name,
  au.raw_user_meta_data->>'avatar_url' as avatar_url,
  au.email_confirmed_at IS NOT NULL as email_verified,
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- Now sync users_public with users table
INSERT INTO public.users_public (id, email, name, avatar_url, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  u.name,
  u.avatar_url,
  u.created_at,
  u.updated_at
FROM public.users u
WHERE u.id NOT IN (SELECT id FROM public.users_public)
ON CONFLICT (id) DO NOTHING;

-- Update existing records in users_public to match users table
UPDATE public.users_public 
SET 
  name = u.name,
  avatar_url = u.avatar_url,
  updated_at = u.updated_at
FROM public.users u
WHERE public.users_public.id = u.id
AND (
  public.users_public.name IS DISTINCT FROM u.name OR
  public.users_public.avatar_url IS DISTINCT FROM u.avatar_url
);

-- Create or replace the trigger function to keep users_public in sync
CREATE OR REPLACE FUNCTION sync_users_public()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.users_public (id, email, name, avatar_url, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NEW.name, NEW.avatar_url, NEW.created_at, NEW.updated_at)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = EXCLUDED.updated_at;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.users_public SET
      email = NEW.email,
      name = NEW.name,
      avatar_url = NEW.avatar_url,
      updated_at = NEW.updated_at
    WHERE id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.users_public WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_users_public_trigger ON public.users;

-- Create the trigger
CREATE TRIGGER sync_users_public_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION sync_users_public();

-- Enable realtime for conversations and messages tables (only if not already added)
DO $$
BEGIN
    -- Add conversations table to realtime publication if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
    END IF;
    
    -- Add messages table to realtime publication if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;
    
    -- Add users_public table to realtime publication if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'users_public'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE users_public;
    END IF;
END $$;