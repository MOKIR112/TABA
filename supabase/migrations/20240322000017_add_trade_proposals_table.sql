CREATE TABLE IF NOT EXISTS trade_proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  offered_listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_trade_proposals_sender ON trade_proposals(sender_id);
CREATE INDEX IF NOT EXISTS idx_trade_proposals_receiver ON trade_proposals(receiver_id);
CREATE INDEX IF NOT EXISTS idx_trade_proposals_target_listing ON trade_proposals(target_listing_id);
CREATE INDEX IF NOT EXISTS idx_trade_proposals_status ON trade_proposals(status);

CREATE OR REPLACE FUNCTION update_trade_proposal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_trade_proposals_updated_at ON trade_proposals;
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

DROP TRIGGER IF EXISTS trigger_notify_trade_proposal ON trade_proposals;
CREATE TRIGGER trigger_notify_trade_proposal
  AFTER INSERT ON trade_proposals
  FOR EACH ROW
  EXECUTE FUNCTION notify_trade_proposal();

DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'trade_proposals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE trade_proposals;
  END IF;
END $;