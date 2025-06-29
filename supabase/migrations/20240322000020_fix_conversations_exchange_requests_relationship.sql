-- Fix Multiple Relationships Between Conversations and Exchange Requests
-- This migration ensures only one foreign key relationship exists between the two tables

-- First, identify and drop the redundant relationship from exchange_requests to conversations
DO $$
BEGIN
    -- Drop the conversation_id column from exchange_requests table if it exists
    -- This removes the circular relationship that's causing the embedding error
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exchange_requests' 
        AND column_name = 'conversation_id'
        AND table_schema = 'public'
    ) THEN
        -- First drop the foreign key constraint
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'exchange_requests_conversation_id_fkey' 
            AND table_name = 'exchange_requests'
        ) THEN
            ALTER TABLE exchange_requests DROP CONSTRAINT exchange_requests_conversation_id_fkey;
        END IF;
        
        -- Then drop the column
        ALTER TABLE exchange_requests DROP COLUMN conversation_id;
        
        RAISE NOTICE 'Removed conversation_id column from exchange_requests table';
    END IF;
END $$;

-- Ensure the primary relationship exists: conversations.exchange_request_id -> exchange_requests.id
DO $$
BEGIN
    -- Verify the exchange_request_id column exists in conversations
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' 
        AND column_name = 'exchange_request_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE conversations ADD COLUMN exchange_request_id UUID;
        RAISE NOTICE 'Added exchange_request_id column to conversations table';
    END IF;
    
    -- Ensure the foreign key constraint exists with the correct name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversations_exchange_request_id_fkey' 
        AND table_name = 'conversations'
    ) THEN
        -- Drop any existing constraint with different name first
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'conversations'
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%exchange_request%'
            AND constraint_name != 'conversations_exchange_request_id_fkey'
        ) THEN
            -- Get the constraint name and drop it
            DECLARE
                constraint_name_to_drop TEXT;
            BEGIN
                SELECT constraint_name INTO constraint_name_to_drop
                FROM information_schema.table_constraints 
                WHERE table_name = 'conversations'
                AND constraint_type = 'FOREIGN KEY'
                AND constraint_name LIKE '%exchange_request%'
                AND constraint_name != 'conversations_exchange_request_id_fkey'
                LIMIT 1;
                
                IF constraint_name_to_drop IS NOT NULL THEN
                    EXECUTE 'ALTER TABLE conversations DROP CONSTRAINT ' || constraint_name_to_drop;
                    RAISE NOTICE 'Dropped existing constraint: %', constraint_name_to_drop;
                END IF;
            END;
        END IF;
        
        -- Add the correctly named foreign key constraint
        ALTER TABLE conversations 
        ADD CONSTRAINT conversations_exchange_request_id_fkey 
        FOREIGN KEY (exchange_request_id) REFERENCES exchange_requests(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added conversations_exchange_request_id_fkey constraint';
    END IF;
END $$;

-- Clean up any other potential duplicate constraints
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Find and drop any duplicate foreign key constraints between conversations and exchange_requests
    FOR constraint_record IN
        SELECT constraint_name, table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (
            (tc.table_name = 'conversations' AND ccu.table_name = 'exchange_requests' AND tc.constraint_name != 'conversations_exchange_request_id_fkey')
            OR
            (tc.table_name = 'exchange_requests' AND ccu.table_name = 'conversations')
        )
    LOOP
        EXECUTE 'ALTER TABLE ' || constraint_record.table_name || ' DROP CONSTRAINT ' || constraint_record.constraint_name;
        RAISE NOTICE 'Dropped duplicate constraint: % from table %', constraint_record.constraint_name, constraint_record.table_name;
    END LOOP;
END $$;

-- Update the trigger function to handle the single relationship correctly
CREATE OR REPLACE FUNCTION create_conversation_on_exchange_accept()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only create conversation when status changes to 'accepted'
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        -- Check if conversation already exists for this exchange request
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
            
            RAISE NOTICE 'Created conversation for exchange request: %', NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in create_conversation_on_exchange_accept trigger: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS exchange_request_accepted_trigger ON exchange_requests;
CREATE TRIGGER exchange_request_accepted_trigger
    AFTER UPDATE ON exchange_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_conversation_on_exchange_accept();

-- Refresh schema cache by analyzing tables
ANALYZE conversations;
ANALYZE exchange_requests;

-- Add comments to document the relationship
COMMENT ON CONSTRAINT conversations_exchange_request_id_fkey ON conversations IS 'Primary relationship: conversations reference exchange_requests that created them';
COMMENT ON COLUMN conversations.exchange_request_id IS 'References the exchange request that created this conversation (nullable for direct conversations)';

-- Final verification
DO $$
BEGIN
    -- Verify only one relationship exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'exchange_requests'
        AND ccu.table_name = 'conversations'
    ) THEN
        RAISE WARNING 'Still found foreign key from exchange_requests to conversations - manual cleanup may be needed';
    END IF;
    
    -- Verify the primary relationship exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversations_exchange_request_id_fkey'
        AND table_name = 'conversations'
    ) THEN
        RAISE WARNING 'Primary relationship conversations_exchange_request_id_fkey not found';
    ELSE
        RAISE NOTICE 'Schema fix completed successfully - only one relationship exists: conversations.exchange_request_id -> exchange_requests.id';
    END IF;
END $$;
