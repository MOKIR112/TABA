-- Enhanced Exchange Request Flow for Secure Messaging
-- This migration ensures proper relational integrity and secure messaging flow

-- First, ensure exchange_requests table has all required fields
ALTER TABLE exchange_requests 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add foreign key constraints to exchange_requests table if they don't exist
DO $$
BEGIN
    -- Add sender_id foreign key to users_public
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'exchange_requests_sender_id_public_fkey' 
        AND table_name = 'exchange_requests'
    ) THEN
        ALTER TABLE exchange_requests 
        ADD CONSTRAINT exchange_requests_sender_id_public_fkey 
        FOREIGN KEY (sender_id) REFERENCES users_public(id) ON DELETE CASCADE;
    END IF;
    
    -- Add receiver_id foreign key to users_public
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'exchange_requests_receiver_id_public_fkey' 
        AND table_name = 'exchange_requests'
    ) THEN
        ALTER TABLE exchange_requests 
        ADD CONSTRAINT exchange_requests_receiver_id_public_fkey 
        FOREIGN KEY (receiver_id) REFERENCES users_public(id) ON DELETE CASCADE;
    END IF;
    
    -- Add offered_listing_id foreign key to listings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'exchange_requests_offered_listing_id_fkey' 
        AND table_name = 'exchange_requests'
    ) THEN
        ALTER TABLE exchange_requests 
        ADD CONSTRAINT exchange_requests_offered_listing_id_fkey 
        FOREIGN KEY (offered_listing_id) REFERENCES listings(id) ON DELETE CASCADE;
    END IF;
    
    -- Add target_listing_id foreign key to listings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'exchange_requests_target_listing_id_fkey' 
        AND table_name = 'exchange_requests'
    ) THEN
        ALTER TABLE exchange_requests 
        ADD CONSTRAINT exchange_requests_target_listing_id_fkey 
        FOREIGN KEY (target_listing_id) REFERENCES listings(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure conversations table exists with proper structure
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES users_public(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users_public(id) ON DELETE CASCADE,
  exchange_request_id UUID REFERENCES exchange_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update messages table to reference conversations
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_users ON conversations(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_exchange_request ON conversations(exchange_request_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_exchange_requests_status ON exchange_requests(status);
CREATE INDEX IF NOT EXISTS idx_exchange_requests_sender ON exchange_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_exchange_requests_receiver ON exchange_requests(receiver_id);

-- Enable RLS on conversations table
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "conversations_select_policy" ON conversations;
DROP POLICY IF EXISTS "conversations_insert_policy" ON conversations;
DROP POLICY IF EXISTS "conversations_update_policy" ON conversations;
DROP POLICY IF EXISTS "conversations_delete_policy" ON conversations;

-- Create RLS policies for conversations
CREATE POLICY "conversations_select_policy" ON conversations
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id OR auth.role() = 'service_role');

CREATE POLICY "conversations_insert_policy" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id OR auth.role() = 'service_role');

CREATE POLICY "conversations_update_policy" ON conversations
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id OR auth.role() = 'service_role');

CREATE POLICY "conversations_delete_policy" ON conversations
  FOR DELETE USING (auth.uid() = user1_id OR auth.uid() = user2_id OR auth.role() = 'service_role');

-- Update exchange_requests RLS policies to be more permissive for the flow
DROP POLICY IF EXISTS "exchange_requests_select_policy" ON exchange_requests;
DROP POLICY IF EXISTS "exchange_requests_insert_policy" ON exchange_requests;
DROP POLICY IF EXISTS "exchange_requests_update_policy" ON exchange_requests;
DROP POLICY IF EXISTS "exchange_requests_delete_policy" ON exchange_requests;

CREATE POLICY "exchange_requests_select_policy" ON exchange_requests
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR auth.role() = 'service_role');

CREATE POLICY "exchange_requests_insert_policy" ON exchange_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id OR auth.role() = 'service_role');

CREATE POLICY "exchange_requests_update_policy" ON exchange_requests
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR auth.role() = 'service_role');

CREATE POLICY "exchange_requests_delete_policy" ON exchange_requests
  FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR auth.role() = 'service_role');

-- Enable realtime for conversations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public'
        AND tablename = 'conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Could not add conversations to realtime publication: %', SQLERRM;
END $$;

-- Enable realtime for exchange_requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public'
        AND tablename = 'exchange_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE exchange_requests;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Could not add exchange_requests to realtime publication: %', SQLERRM;
END $$;

-- Grant necessary permissions
GRANT ALL ON conversations TO authenticated, service_role;
GRANT SELECT ON conversations TO anon;
GRANT ALL ON exchange_requests TO authenticated, service_role;
GRANT SELECT ON exchange_requests TO anon;

-- Create function to automatically create conversation when exchange request is accepted
CREATE OR REPLACE FUNCTION create_conversation_on_exchange_accept()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only create conversation when status changes to 'accepted'
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        -- Check if conversation already exists
        IF NOT EXISTS (
            SELECT 1 FROM conversations 
            WHERE exchange_request_id = NEW.id
        ) THEN
            INSERT INTO conversations (
                user1_id,
                user2_id,
                exchange_request_id,
                created_at
            )
            VALUES (
                NEW.sender_id,
                NEW.receiver_id,
                NEW.id,
                NOW()
            );
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in create_conversation_on_exchange_accept trigger: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Create trigger for automatic conversation creation
DROP TRIGGER IF EXISTS exchange_request_accepted_trigger ON exchange_requests;
CREATE TRIGGER exchange_request_accepted_trigger
    AFTER UPDATE ON exchange_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_conversation_on_exchange_accept();

-- Final verification
DO $$
BEGIN
    -- Verify tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Conversations table was not created properly';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exchange_requests' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Exchange_requests table does not exist';
    END IF;
    
    -- Verify trigger exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'exchange_request_accepted_trigger') THEN
        RAISE WARNING 'Exchange request trigger was not created properly';
    END IF;
    
    RAISE NOTICE 'Enhanced exchange request flow migration completed successfully';
END $$;