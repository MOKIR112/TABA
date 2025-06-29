-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('message', 'trade', 'listing', 'system', 'exchange_request', 'review', 'review_reply')),
  read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Enable realtime for notifications (only if not already added)
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $;

-- Create function to automatically create notifications for new messages
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    NEW.receiver_id,
    'New Message',
    'You have received a new message',
    'message',
    jsonb_build_object(
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'listing_id', NEW.listing_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for message notifications
CREATE TRIGGER message_notification_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();

-- Create function to automatically create notifications for trade updates
CREATE OR REPLACE FUNCTION create_trade_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify the receiver when a new trade is created
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.receiver_id,
      'New Trade Proposal',
      'You have received a new trade proposal',
      'trade',
      jsonb_build_object(
        'trade_id', NEW.id,
        'initiator_id', NEW.initiator_id,
        'listing_id', NEW.listing_id
      )
    );
  END IF;
  
  -- Notify both parties when trade status changes
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- Notify initiator
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.initiator_id,
      'Trade Status Updated',
      'Your trade status has been updated to: ' || NEW.status,
      'trade',
      jsonb_build_object(
        'trade_id', NEW.id,
        'status', NEW.status,
        'listing_id', NEW.listing_id
      )
    );
    
    -- Notify receiver (if different from initiator)
    IF NEW.receiver_id != NEW.initiator_id THEN
      INSERT INTO notifications (user_id, title, message, type, data)
      VALUES (
        NEW.receiver_id,
        'Trade Status Updated',
        'Trade status has been updated to: ' || NEW.status,
        'trade',
        jsonb_build_object(
          'trade_id', NEW.id,
          'status', NEW.status,
          'listing_id', NEW.listing_id
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for trade notifications
CREATE TRIGGER trade_notification_trigger
  AFTER INSERT OR UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION create_trade_notification();
