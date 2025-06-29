-- Complete fix for user creation and authentication issues

-- First, ensure the users table exists with proper structure
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  avatar_url TEXT,
  location TEXT,
  bio TEXT,
  phone TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user',
  banned_until TIMESTAMPTZ,
  ban_reason TEXT,
  identity_verified BOOLEAN DEFAULT FALSE,
  verification_score INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users_public table for public access
CREATE TABLE IF NOT EXISTS users_public (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop all existing policies and constraints to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on users table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON users';
    END LOOP;
    
    -- Drop all policies on users_public table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users_public' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON users_public';
    END LOOP;
END $$;

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS sync_user_to_public_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_to_public() CASCADE;

-- Enable RLS on both tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_public ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for users table
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (true);

CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY "users_delete_policy" ON users
  FOR DELETE USING (auth.uid() = id OR auth.role() = 'service_role');

-- Create comprehensive RLS policies for users_public table
CREATE POLICY "users_public_select_policy" ON users_public
  FOR SELECT USING (true);

CREATE POLICY "users_public_insert_policy" ON users_public
  FOR INSERT WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY "users_public_update_policy" ON users_public
  FOR UPDATE USING (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY "users_public_delete_policy" ON users_public
  FOR DELETE USING (auth.uid() = id OR auth.role() = 'service_role');

-- Create the user sync function with comprehensive error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_name TEXT;
    user_avatar TEXT;
BEGIN
    -- Extract user metadata safely
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );
    
    user_avatar := NEW.raw_user_meta_data->>'avatar_url';
    
    -- Insert into users_public first (simpler table)
    INSERT INTO public.users_public (
        id,
        email,
        name,
        avatar_url,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        user_name,
        user_avatar,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, users_public.name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users_public.avatar_url),
        updated_at = NOW();
    
    -- Insert into main users table
    INSERT INTO public.users (
        id,
        email,
        name,
        avatar_url,
        email_verified,
        role,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        user_name,
        user_avatar,
        CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN TRUE ELSE FALSE END,
        'user',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, users.name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        email_verified = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN TRUE ELSE users.email_verified END,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth process
        RAISE WARNING 'Error in handle_new_user trigger for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Create trigger on auth.users for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT ALL ON public.users_public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users_public TO authenticated;
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.users_public TO anon;

-- Handle unique constraints safely
DO $$
BEGIN
    -- Drop existing email constraints if they exist
    BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique;
        ALTER TABLE users_public DROP CONSTRAINT IF EXISTS users_public_email_key;
        ALTER TABLE users_public DROP CONSTRAINT IF EXISTS users_public_email_unique;
    EXCEPTION
        WHEN OTHERS THEN
            -- Ignore errors if constraints don't exist
            NULL;
    END;
    
    -- Create unique email constraints
    BEGIN
        ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
    EXCEPTION
        WHEN duplicate_table THEN
            -- Constraint already exists, ignore
            NULL;
    END;
    
    BEGIN
        ALTER TABLE users_public ADD CONSTRAINT users_public_email_unique UNIQUE (email);
    EXCEPTION
        WHEN duplicate_table THEN
            -- Constraint already exists, ignore
            NULL;
    END;
END $$;

-- Enable realtime for users_public (check if not already added)
DO $$
BEGIN
    -- Check if table is already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public'
        AND tablename = 'users_public'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE users_public;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if publication doesn't exist or other issues
        RAISE WARNING 'Could not add users_public to realtime publication: %', SQLERRM;
END $$;

-- Create function to increment listing views (if not exists)
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE listings 
    SET views = COALESCE(views, 0) + 1,
        updated_at = NOW()
    WHERE id = listing_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION increment_listing_views(UUID) TO authenticated, anon;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_public_email ON users_public(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_public_created_at ON users_public(created_at);

-- Final verification and cleanup
DO $$
BEGIN
    -- Ensure both tables have the required structure
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Users table was not created properly';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users_public' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Users_public table was not created properly';
    END IF;
    
    -- Verify trigger exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') THEN
        RAISE WARNING 'Auth trigger was not created properly';
    END IF;
    
    RAISE NOTICE 'User creation migration completed successfully';
END $$;
