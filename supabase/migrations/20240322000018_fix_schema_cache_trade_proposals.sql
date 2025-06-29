-- Reset schema cache for trade_proposals table
DROP TRIGGER IF EXISTS update_trade_proposals_updated_at ON trade_proposals;
DROP TRIGGER IF EXISTS trigger_notify_trade_proposal ON trade_proposals;
DROP FUNCTION IF EXISTS update_trade_proposal_timestamp();
DROP FUNCTION IF EXISTS notify_trade_proposal();

-- Drop existing foreign key constraints if they exist
ALTER TABLE trade_proposals DROP CONSTRAINT IF EXISTS trade_proposals_sender_id_fkey;
ALTER TABLE trade_proposals DROP CONSTRAINT IF EXISTS trade_proposals_receiver_id_fkey;

-- Add missing foreign key constraints to users table
ALTER TABLE trade_proposals 
ADD CONSTRAINT trade_proposals_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE trade_proposals 
ADD CONSTRAINT trade_proposals_receiver_id_fkey 
FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;

-- Recreate functions and triggers
CREATE OR REPLACE FUNCTION update_trade_proposal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trade_proposals_updated_at
  BEFORE UPDATE ON trade_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_trade_proposal_timestamp();

CREATE OR REPLACE FUNCTION notify_trade_proposal()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  target_listing_title TEXT;
  offered_listing_title TEXT;
BEGIN
  SELECT name INTO sender_name FROM users WHERE id = NEW.sender_id;
  SELECT title INTO target_listing_title FROM listings WHERE id = NEW.target_listing_id;
  SELECT title INTO offered_listing_title FROM listings WHERE id = NEW.offered_listing_id;
  
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    related_listing_id,
    metadata,
    data
  ) VALUES (
    NEW.receiver_id,
    'New Trade Proposal! 🔄',
    COALESCE(sender_name, 'Someone') || ' wants to trade "' || COALESCE(offered_listing_title, 'their item') || '" for "' || COALESCE(target_listing_title, 'your item') || '"',
    'trade_proposal',
    NEW.target_listing_id,
    jsonb_build_object(
      'trade_proposal_id', NEW.id,
      'sender_id', NEW.sender_id,
      'sender_name', COALESCE(sender_name, 'Unknown User'),
      'target_listing_id', NEW.target_listing_id,
      'target_listing_title', COALESCE(target_listing_title, 'Unknown Item'),
      'offered_listing_id', NEW.offered_listing_id,
      'offered_listing_title', COALESCE(offered_listing_title, 'Unknown Item'),
      'message', NEW.message
    ),
    jsonb_build_object(
      'trade_proposal_id', NEW.id,
      'sender_id', NEW.sender_id,
      'target_listing_id', NEW.target_listing_id,
      'offered_listing_id', NEW.offered_listing_id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_trade_proposal
  AFTER INSERT ON trade_proposals
  FOR EACH ROW
  EXECUTE FUNCTION notify_trade_proposal();

-- Ensure the table is in the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public'
    AND tablename = 'trade_proposals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE trade_proposals;
  END IF;
END $$;