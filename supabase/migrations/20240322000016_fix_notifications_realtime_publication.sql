-- Fix notifications table realtime publication issue
-- Update notifications table to support new notification types
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check,
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('message', 'trade', 'listing', 'system', 'exchange_request', 'review', 'review_reply', 'trade_request', 'exchange_started', 'exchange_declined', 'trade_proposal', 'trade_proposal_accepted', 'trade_proposal_declined'));

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE exchange_requests;

-- Add related_listing_id column to notifications if it doesn't exist
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS related_listing_id UUID REFERENCES listings(id) ON DELETE CASCADE;

-- Add metadata column to notifications if it doesn't exist
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for related_listing_id
CREATE INDEX IF NOT EXISTS idx_notifications_related_listing_id ON notifications(related_listing_id);

-- Update exchange_requests table to ensure proper status handling
ALTER TABLE exchange_requests 
ALTER COLUMN status SET DEFAULT 'pending';

-- Add constraint to ensure valid status values
ALTER TABLE exchange_requests
  DROP CONSTRAINT IF EXISTS exchange_requests_status_check,
  ADD CONSTRAINT exchange_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled'));

-- Create function to handle exchange request notifications
CREATE OR REPLACE FUNCTION create_exchange_request_notification()
RETURNS TRIGGER AS $$
DECLARE
  target_listing_title TEXT;
  offered_listing_title TEXT;
BEGIN
  -- Get listing titles for the notification
  SELECT title INTO target_listing_title FROM listings WHERE id = NEW.target_listing_id;
  SELECT title INTO offered_listing_title FROM listings WHERE id = NEW.offered_listing_id;
  
  -- Create notification for new exchange request
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      related_listing_id,
      metadata,
      data,
      read
    ) VALUES (
      NEW.receiver_id,
      'New Exchange Request',
      'You have a new exchange request for "' || COALESCE(target_listing_title, 'your listing') || '"',
      'trade_request',
      NEW.target_listing_id,
      jsonb_build_object(
        'exchange_request_id', NEW.id,
        'offered_listing_id', NEW.offered_listing_id,
        'offered_listing_title', COALESCE(offered_listing_title, 'Unknown Item'),
        'target_listing_title', COALESCE(target_listing_title, 'Unknown Item'),
        'sender_id', NEW.sender_id,
        'message', NEW.message
      ),
      jsonb_build_object(
        'exchange_request_id', NEW.id,
        'offered_listing_id', NEW.offered_listing_id,
        'target_listing_id', NEW.target_listing_id
      ),
      false
    );
  END IF;
  
  -- Handle status updates
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- Notify sender when request is accepted or declined
    IF NEW.status = 'accepted' THEN
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        related_listing_id,
        metadata,
        data,
        read
      ) VALUES (
        NEW.sender_id,
        'Exchange Request Accepted! 🎉',
        'Your exchange request for "' || COALESCE(target_listing_title, 'the listing') || '" has been accepted! You can now start messaging.',
        'exchange_started',
        NEW.target_listing_id,
        jsonb_build_object(
          'exchange_request_id', NEW.id,
          'offered_listing_id', NEW.offered_listing_id,
          'target_listing_id', NEW.target_listing_id,
          'status', NEW.status
        ),
        jsonb_build_object(
          'exchange_request_id', NEW.id,
          'conversation_id', NEW.conversation_id
        ),
        false
      );
    ELSIF NEW.status = 'declined' THEN
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        related_listing_id,
        metadata,
        data,
        read
      ) VALUES (
        NEW.sender_id,
        'Exchange Request Declined',
        'Your exchange request for "' || COALESCE(target_listing_title, 'the listing') || '" has been declined.',
        'exchange_request',
        NEW.target_listing_id,
        jsonb_build_object(
          'exchange_request_id', NEW.id,
          'status', NEW.status
        ),
        jsonb_build_object(
          'exchange_request_id', NEW.id
        ),
        false
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for exchange request notifications
DROP TRIGGER IF EXISTS exchange_request_notification_trigger ON exchange_requests;
CREATE TRIGGER exchange_request_notification_trigger
  AFTER INSERT OR UPDATE ON exchange_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_exchange_request_notification();

-- Add conversation_id to exchange_requests if it doesn't exist
ALTER TABLE exchange_requests 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;

-- Create function to auto-create conversation when exchange request is accepted
CREATE OR REPLACE FUNCTION create_conversation_on_accept()
RETURNS TRIGGER AS $$
DECLARE
  new_conversation_id UUID;
BEGIN
  -- Only create conversation when status changes to accepted
  IF TG_OP = 'UPDATE' AND OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
    -- Create new conversation
    INSERT INTO conversations (user1_id, user2_id, exchange_request_id)
    VALUES (NEW.sender_id, NEW.receiver_id, NEW.id)
    RETURNING id INTO new_conversation_id;
    
    -- Update the exchange request with the conversation ID
    UPDATE exchange_requests 
    SET conversation_id = new_conversation_id 
    WHERE id = NEW.id;
    
    -- Update NEW record for the trigger chain
    NEW.conversation_id = new_conversation_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-creating conversations
DROP TRIGGER IF EXISTS create_conversation_trigger ON exchange_requests;
CREATE TRIGGER create_conversation_trigger
  BEFORE UPDATE ON exchange_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_conversation_on_accept();