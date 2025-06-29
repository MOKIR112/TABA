import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { notifications } from "@/lib/notifications";

export function useRealtimeMessages(
  conversationId: string | null,
  userId: string | null,
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    console.log("Setting up realtime messages for user:", userId);

    const messageChannel = supabase
      .channel(`messages:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`,
        },
        (payload) => {
          console.log("Received new message via realtime:", payload);
          // Handle new message
          window.dispatchEvent(
            new CustomEvent("newMessage", { detail: payload.new }),
          );

          // Show browser notification for new messages
          if (payload.new.receiver_id === userId) {
            const notificationBody = payload.new.content
              ? payload.new.content
              : payload.new.image_url
                ? "📷 Sent you an image"
                : "You have a new message";

            notifications.showBrowserNotification("New Message", {
              body: notificationBody,
              tag: `message-${payload.new.id}`,
              icon: payload.new.image_url || undefined,
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`,
        },
        (payload) => {
          console.log("Received message update via realtime:", payload);
          // Handle message updates (read status, etc.)
          window.dispatchEvent(
            new CustomEvent("messageUpdate", { detail: payload.new }),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
          filter: `or(user1_id.eq.${userId},user2_id.eq.${userId})`,
        },
        (payload) => {
          console.log("New conversation created:", payload);
          // Handle new conversation
          window.dispatchEvent(
            new CustomEvent("newConversation", { detail: payload.new }),
          );
        },
      )

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_reviews",
          filter: `target_user_id.eq.${userId}`,
        },
        (payload) => {
          // Handle new review
          window.dispatchEvent(
            new CustomEvent("newReview", { detail: payload.new }),
          );

          // Show notification
          notifications.showBrowserNotification("New Review", {
            body: "You received a new review!",
            tag: `review-${payload.new.id}`,
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "review_replies",
          filter: `user_id.neq.${userId}`,
        },
        (payload) => {
          // Handle new review reply
          window.dispatchEvent(
            new CustomEvent("newReviewReply", { detail: payload.new }),
          );
        },
      )
      .subscribe((status) => {
        console.log("Messages channel status:", status);
      });

    setChannel(messageChannel);

    return () => {
      console.log("Unsubscribing from messages channel");
      messageChannel.unsubscribe();
    };
  }, [userId]);

  return channel;
}

export function useRealtimeListings() {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const listingsChannel = supabase
      .channel("listings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listings",
        },
        (payload) => {
          // Handle listing changes
          window.dispatchEvent(
            new CustomEvent("listingUpdate", { detail: payload }),
          );
        },
      )
      .subscribe();

    setChannel(listingsChannel);

    return () => {
      listingsChannel.unsubscribe();
    };
  }, []);

  return channel;
}

export function useRealtimeTrades(userId: string | null) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    const tradesChannel = supabase
      .channel(`trades:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trades",
          filter: `or(initiator_id.eq.${userId},receiver_id.eq.${userId})`,
        },
        (payload) => {
          // Handle trade updates
          window.dispatchEvent(
            new CustomEvent("tradeUpdate", { detail: payload }),
          );
        },
      )
      .subscribe();

    setChannel(tradesChannel);

    return () => {
      tradesChannel.unsubscribe();
    };
  }, [userId]);

  return channel;
}

export function useRealtimeNotifications(userId: string | null) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    console.log("Setting up realtime notifications for user:", userId);

    const notificationsChannel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Received notification via realtime:", payload);
          const notification = payload.new as any;

          // Show browser notification with enhanced messaging for exchange requests
          let notificationBody = notification.message;
          let notificationIcon = undefined;

          if (notification.type === "trade_request") {
            const senderName = notification.metadata?.sender_name || "Someone";
            const targetItem =
              notification.metadata?.target_listing_title || "your item";
            const offeredItem =
              notification.metadata?.offered_listing_title || "their item";

            notificationBody = `${senderName} wants to exchange "${offeredItem}" for "${targetItem}"`;
            notificationIcon = "/logo.png";
          } else if (notification.type === "exchange_started") {
            const otherUserName =
              notification.metadata?.other_user_name || "Someone";
            notificationBody = `${otherUserName} accepted your exchange request! Chat is now active.`;
            notificationIcon = "/logo.png";
          } else if (notification.type === "exchange_declined") {
            const otherUserName =
              notification.metadata?.other_user_name || "Someone";
            const targetItem =
              notification.metadata?.target_listing_title || "the item";
            notificationBody = `${otherUserName} declined your exchange request for "${targetItem}"`;
          }

          notifications.showBrowserNotification(notification.title, {
            body: notificationBody,
            tag: notification.id,
            data: notification.data,
            icon: notificationIcon,
          });

          // Dispatch custom event for UI updates
          window.dispatchEvent(
            new CustomEvent("newNotification", { detail: notification }),
          );
        },
      )
      .subscribe((status) => {
        console.log("Notifications channel status:", status);
      });

    setChannel(notificationsChannel);

    return () => {
      console.log("Unsubscribing from notifications channel");
      notificationsChannel.unsubscribe();
    };
  }, [userId]);

  return channel;
}

export function useRealtimeUserActivity(userId: string | null) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    const activityChannel = supabase
      .channel(`user-activity:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trade_proposals",
          filter: `or(initiator_id.eq.${userId},receiver_id.eq.${userId})`,
        },
        (payload) => {
          // Handle trade proposal updates
          window.dispatchEvent(
            new CustomEvent("tradeProposalUpdate", { detail: payload }),
          );
        },
      )
      .subscribe();

    setChannel(activityChannel);

    return () => {
      activityChannel.unsubscribe();
    };
  }, [userId]);

  return channel;
}
