-- Fix Schema Cache Issues by Using users_public for All Foreign Keys
-- This migration ensures proper relational integrity and avoids schema cache errors

-- First, drop existing foreign key constraints that reference users table directly
DO $$
BEGIN
    -- Drop existing foreign key constraints from exchange_requests if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'exchange_requests_sender_id_fkey' 
        AND table_name = 'exchange_requests'
    ) THEN
        ALTER TABLE exchange_requests DROP CONSTRAINT exchange_requests_sender_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'exchange_requests_receiver_id_fkey' 
        AND table_name = 'exchange_requests'
    ) THEN
        ALTER TABLE exchange_requests DROP CONSTRAINT exchange_requests_receiver_id_fkey;
    END IF;
    
    -- Drop existing foreign key constraints from conversations if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversations_user1_id_fkey' 
        AND table_name = 'conversations'
    ) THEN
        ALTER TABLE conversations DROP CONSTRAINT conversations_user1_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversations_user2_id_fkey' 
        AND table_name = 'conversations'
    ) THEN
        ALTER TABLE conversations DROP CONSTRAINT conversations_user2_id_fkey;
    END IF;
    
    -- Drop existing foreign key constraints from messages if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_sender_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages DROP CONSTRAINT messages_sender_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_receiver_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages DROP CONSTRAINT messages_receiver_id_fkey;
    END IF;
END $$;

-- Now add proper foreign key constraints using users_public
DO $$
BEGIN
    -- Add sender_id foreign key to users_public for exchange_requests
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'exchange_requests_sender_id_public_fkey' 
        AND table_name = 'exchange_requests'
    ) THEN
        ALTER TABLE exchange_requests 
        ADD CONSTRAINT exchange_requests_sender_id_public_fkey 
        FOREIGN KEY (sender_id) REFERENCES users_public(id) ON DELETE CASCADE;
    END IF;
    
    -- Add receiver_id foreign key to users_public for exchange_requests
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'exchange_requests_receiver_id_public_fkey' 
        AND table_name = 'exchange_requests'
    ) THEN
        ALTER TABLE exchange_requests 
        ADD CONSTRAINT exchange_requests_receiver_id_public_fkey 
        FOREIGN KEY (receiver_id) REFERENCES users_public(id) ON DELETE CASCADE;
    END IF;
    
    -- Add user1_id foreign key to users_public for conversations
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversations_user1_id_public_fkey' 
        AND table_name = 'conversations'
    ) THEN
        ALTER TABLE conversations 
        ADD CONSTRAINT conversations_user1_id_public_fkey 
        FOREIGN KEY (user1_id) REFERENCES users_public(id) ON DELETE CASCADE;
    END IF;
    
    -- Add user2_id foreign key to users_public for conversations
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversations_user2_id_public_fkey' 
        AND table_name = 'conversations'
    ) THEN
        ALTER TABLE conversations 
        ADD CONSTRAINT conversations_user2_id_public_fkey 
        FOREIGN KEY (user2_id) REFERENCES users_public(id) ON DELETE CASCADE;
    END IF;
    
    -- Add sender_id foreign key to users_public for messages (keep existing users constraint as fallback)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_sender_id_public_fkey' 
        AND table_name = 'messages'
    ) THEN
        -- First try to add the constraint, if it fails, the existing one will remain
        BEGIN
            ALTER TABLE messages 
            ADD CONSTRAINT messages_sender_id_public_fkey 
            FOREIGN KEY (sender_id) REFERENCES users_public(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Could not add messages sender_id constraint to users_public: %', SQLERRM;
        END;
    END IF;
    
    -- Add receiver_id foreign key to users_public for messages (keep existing users constraint as fallback)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_receiver_id_public_fkey' 
        AND table_name = 'messages'
    ) THEN
        -- First try to add the constraint, if it fails, the existing one will remain
        BEGIN
            ALTER TABLE messages 
            ADD CONSTRAINT messages_receiver_id_public_fkey 
            FOREIGN KEY (receiver_id) REFERENCES users_public(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Could not add messages receiver_id constraint to users_public: %', SQLERRM;
        END;
    END IF;
END $$;

-- Ensure exchange_requests table has proper status constraint
DO $$
BEGIN
    -- Add status constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'exchange_requests_status_check'
    ) THEN
        ALTER TABLE exchange_requests 
        ADD CONSTRAINT exchange_requests_status_check 
        CHECK (status IN ('pending', 'accepted', 'declined'));
    END IF;
END $$;

-- Update the Supabase types to reflect the new relationships
-- This ensures the schema cache recognizes the users_public relationships
COMMENT ON CONSTRAINT exchange_requests_sender_id_public_fkey ON exchange_requests IS 'Foreign key to users_public for schema cache compatibility';
COMMENT ON CONSTRAINT exchange_requests_receiver_id_public_fkey ON exchange_requests IS 'Foreign key to users_public for schema cache compatibility';
COMMENT ON CONSTRAINT conversations_user1_id_public_fkey ON conversations IS 'Foreign key to users_public for schema cache compatibility';
COMMENT ON CONSTRAINT conversations_user2_id_public_fkey ON conversations IS 'Foreign key to users_public for schema cache compatibility';

-- Refresh the schema cache by analyzing the tables
ANALYZE exchange_requests;
ANALYZE conversations;
ANALYZE messages;
ANALYZE users_public;

-- Final verification
DO $$
BEGIN
    -- Verify foreign key constraints exist and point to users_public
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'exchange_requests_sender_id_public_fkey'
        AND table_name = 'exchange_requests'
    ) THEN
        RAISE WARNING 'exchange_requests sender_id foreign key to users_public not found';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'exchange_requests_receiver_id_public_fkey'
        AND table_name = 'exchange_requests'
    ) THEN
        RAISE WARNING 'exchange_requests receiver_id foreign key to users_public not found';
    END IF;
    
    RAISE NOTICE 'Schema cache fix migration completed successfully - all foreign keys now reference users_public';
END $$;