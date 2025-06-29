import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRightLeft,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  User,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface NotificationItemProps {
  notification: any;
  onMarkAsRead: (id: string) => void;
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Handle exchange/trade request response
  const exchangeResponseMutation = useMutation({
    mutationFn: async (action: "accepted" | "declined") => {
      const exchangeRequestId = notification.metadata?.exchange_request_id;
      const tradeProposalId = notification.metadata?.trade_proposal_id;

      if (exchangeRequestId) {
        return api.exchangeRequests.updateStatus(
          exchangeRequestId,
          action,
          notification.user_id,
        );
      } else if (tradeProposalId) {
        return api.tradeProposals.updateStatus(
          tradeProposalId,
          action,
          notification.user_id,
        );
      } else {
        throw new Error("No request ID found");
      }
    },
    onSuccess: (data, action) => {
      const actionText = action === "accepted" ? "accepted" : "declined";
      const senderName = notification.metadata?.sender_name || "the user";

      toast({
        title:
          action === "accepted" ? "Request Accepted! 🎉" : "Request Declined",
        description:
          action === "accepted"
            ? `Exchange request ${actionText}! Opening chat with ${senderName}...`
            : `Exchange request ${actionText}.`,
      });

      // Mark notification as read
      onMarkAsRead(notification.id);
      setShowExchangeModal(false);

      // Refresh notifications and conversations
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["exchangeRequest"] });

      // If accepted, navigate to conversation
      if (action === "accepted") {
        // Try multiple ways to get conversation ID
        const conversationId = data.conversation_id || data.conversation?.id;

        if (conversationId) {
          // Navigate to the specific conversation
          setTimeout(() => {
            navigate(`/inbox?conversation=${conversationId}`);
          }, 1000);
        } else {
          // Fallback: navigate to inbox and refresh to show new conversation
          setTimeout(() => {
            navigate("/inbox");
            // Force refresh conversations
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
          }, 1000);
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to respond to exchange request",
        variant: "destructive",
      });
    },
  });

  const handleNotificationClick = () => {
    if (
      notification.type === "trade_request" ||
      notification.type === "trade_proposal"
    ) {
      setShowExchangeModal(true);
    } else if (
      notification.type === "exchange_started" &&
      notification.data?.conversation_id
    ) {
      navigate(`/inbox?conversation=${notification.data.conversation_id}`);
    } else if (
      notification.type === "trade_proposal_accepted" &&
      notification.data?.conversation_id
    ) {
      navigate(`/inbox?conversation=${notification.data.conversation_id}`);
    } else if (notification.related_listing_id) {
      navigate(`/listing/${notification.related_listing_id}`);
    }

    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case "trade_request":
        return <Package className="w-5 h-5 text-blue-500" />;
      case "exchange_started":
        return <MessageCircle className="w-5 h-5 text-green-500" />;
      case "exchange_declined":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "message":
        return <MessageCircle className="w-5 h-5 text-purple-500" />;
      case "review":
        return <User className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <>
      <Card
        className={`cursor-pointer transition-all hover:shadow-md ${
          !notification.read ? "border-l-4 border-l-blue-500 bg-blue-50/50" : ""
        }`}
        onClick={handleNotificationClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">{getNotificationIcon()}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-sm">{notification.title}</h4>
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(notification.created_at)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {notification.message}
              </p>

              {(notification.type === "trade_request" ||
                notification.type === "trade_proposal") && (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {notification.type === "trade_proposal"
                      ? "Trade Proposal"
                      : "Exchange Request"}
                  </Badge>
                  {notification.related_listing && (
                    <span className="text-xs text-gray-500">
                      for "{notification.related_listing.title}"
                    </span>
                  )}
                </div>
              )}

              {!notification.read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exchange Request Modal */}
      <Dialog open={showExchangeModal} onOpenChange={setShowExchangeModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-500" />
              <span>
                {notification.type === "trade_proposal"
                  ? "Trade Proposal"
                  : "Exchange Request"}
              </span>
            </DialogTitle>
            <DialogDescription>
              Someone wants to trade with you!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Sender Info */}
            <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {notification.metadata?.sender_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">
                  {notification.metadata?.sender_name || "Unknown User"}
                </p>
                <p className="text-xs text-gray-500">
                  wants to exchange with you
                </p>
              </div>
            </div>

            {/* Trade Preview */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-center space-x-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600">They offer</div>
                  <div className="font-medium text-blue-600">
                    {notification.metadata?.offered_listing_title ||
                      "Their Item"}
                  </div>
                </div>
                <ArrowRightLeft className="w-6 h-6 text-blue-500" />
                <div className="text-center">
                  <div className="text-sm text-gray-600">You give</div>
                  <div className="font-medium text-blue-600">
                    {notification.metadata?.target_listing_title || "Your Item"}
                  </div>
                </div>
              </div>
            </div>

            {notification.metadata?.message && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Their message:</strong>{" "}
                  {notification.metadata.message}
                </p>
              </div>
            )}

            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                💬 <strong>Next Steps:</strong> If you accept, a secure chat
                will open where you can coordinate the exchange details.
              </p>
            </div>

            {/* Exchange Benefits */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center space-x-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Secure messaging</span>
              </div>
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Safe exchange</span>
              </div>
              <div className="flex items-center space-x-2 text-purple-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>No fees</span>
              </div>
              <div className="flex items-center space-x-2 text-orange-600">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>Eco-friendly</span>
              </div>
            </div>
          </div>

          <DialogFooter className="space-x-2">
            <Button
              variant="outline"
              onClick={() => exchangeResponseMutation.mutate("declined")}
              disabled={exchangeResponseMutation.isPending}
              className="flex items-center space-x-2"
            >
              <XCircle className="w-4 h-4" />
              <span>Decline</span>
            </Button>
            <Button
              onClick={() => exchangeResponseMutation.mutate("accepted")}
              disabled={exchangeResponseMutation.isPending}
              className="btn-gradient flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>
                {exchangeResponseMutation.isPending
                  ? "Accepting..."
                  : "Accept & Chat"}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
