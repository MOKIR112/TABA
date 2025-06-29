import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Bell,
  MessageCircle,
  Star,
  Package,
  Heart,
  CheckCircle,
  X,
  Clock,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeNotifications } from "@/hooks/useRealtime";
import { useToast } from "@/components/ui/use-toast";
import NotificationItem from "./NotificationItem";

interface NotificationsPanelProps {
  trigger?: React.ReactNode;
}

export default function NotificationsPanel({
  trigger,
}: NotificationsPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => api.notifications.getByUserId(user!.id),
    enabled: !!user,
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-count", user?.id],
    queryFn: () => api.notifications.getUnreadCount(user!.id),
    enabled: !!user,
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 3000, // Consider data stale after 3 seconds
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      api.notifications.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  // Real-time notifications
  useRealtimeNotifications(user?.id || null);

  // Listen for real-time notification events
  useEffect(() => {
    const handleNewNotification = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
    };

    window.addEventListener("newNotification", handleNewNotification);
    return () =>
      window.removeEventListener("newNotification", handleNewNotification);
  }, [queryClient]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "trade_request":
      case "trade_proposal":
        return <Package className="w-5 h-5 text-blue-500" />;
      case "trade_proposal_accepted":
      case "exchange_started":
        return <MessageCircle className="w-5 h-5 text-green-500" />;
      case "trade_proposal_declined":
      case "exchange_declined":
        return <X className="w-5 h-5 text-red-500" />;
      case "message":
        return <MessageCircle className="w-5 h-5 text-purple-500" />;
      case "review":
        return <Star className="w-5 h-5 text-yellow-500" />;
      case "listing":
        return <Heart className="w-5 h-5 text-pink-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Handle navigation based on notification type
    if (notification.type === "message" && notification.data?.senderId) {
      window.location.href = `/inbox?user=${notification.data.senderId}`;
    } else if (notification.type === "trade" && notification.data?.tradeId) {
      window.location.href = `/trade-history`;
    } else if (
      notification.type === "trade_request" ||
      notification.type === "trade_proposal"
    ) {
      // Navigate to the listing where they can see the exchange request
      if (notification.related_listing_id) {
        window.location.href = `/listing/${notification.related_listing_id}`;
      }
      setIsOpen(false);
      return;
    } else if (
      (notification.type === "exchange_started" ||
        notification.type === "trade_proposal_accepted") &&
      notification.data?.conversation_id
    ) {
      window.location.href = `/inbox?conversation=${notification.data.conversation_id}`;
    } else if (
      notification.type === "exchange_declined" ||
      notification.type === "trade_proposal_declined"
    ) {
      // For declined requests, navigate to inbox or listings
      window.location.href = `/inbox`;
    } else if (notification.type === "review" && notification.data?.reviewId) {
      window.location.href = `/profile`;
    } else if (
      notification.type === "listing" &&
      notification.data?.listingId
    ) {
      window.location.href = `/listing/${notification.data.listingId}`;
    } else if (notification.related_listing_id) {
      window.location.href = `/listing/${notification.related_listing_id}`;
    }

    setIsOpen(false);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - notificationTime.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="relative">
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{trigger || defaultTrigger}</SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {unreadCount} new
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Stay updated with your latest activity
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tabadol-purple"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">Failed to load notifications</p>
              <Button
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["notifications"] })
                }
                size="sm"
              >
                Try Again
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No notifications yet
              </h3>
              <p className="text-gray-600">
                You'll see notifications for messages, trades, and reviews here
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-2">
                {notifications.map((notification) => {
                  if (
                    notification.type === "trade_request" ||
                    notification.type === "trade_proposal"
                  ) {
                    return (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
                      />
                    );
                  }

                  return (
                    <Card
                      key={notification.id}
                      className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                        !notification.read
                          ? "border-l-4 border-l-tabadol-purple bg-blue-50/50"
                          : ""
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h4
                                  className={`text-sm font-medium ${
                                    !notification.read
                                      ? "text-gray-900"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {notification.title}
                                </h4>
                                <p
                                  className={`text-sm mt-1 ${
                                    !notification.read
                                      ? "text-gray-700"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {formatTimeAgo(notification.created_at)}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-tabadol-purple rounded-full flex-shrink-0 mt-2" />
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                // Mark all as read
                notifications
                  .filter((n) => !n.read)
                  .forEach((n) => markAsReadMutation.mutate(n.id));
              }}
              disabled={unreadCount === 0 || markAsReadMutation.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark all as read
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
