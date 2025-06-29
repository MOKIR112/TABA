import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  MessageCircle,
  Send,
  Image,
  Paperclip,
  MoreVertical,
  Star,
  Flag,
  ArrowRightLeft,
  User,
  Clock,
  Users,
  Plus,
  X,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useRealtimeMessages } from "@/hooks/useRealtime";
import { storage } from "@/lib/storage";

export default function Inbox() {
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUsersList, setShowUsersList] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set up real-time message updates
  useRealtimeMessages(selectedConversation, user?.id);

  // Fetch all users for starting new conversations
  const { data: allUsers = [] } = useQuery({
    queryKey: ["users", "all"],
    queryFn: () => api.users.getAllUsers(),
    enabled: showUsersList,
  });

  // Fetch conversations
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      console.log("Inbox: Fetching conversations for user:", user?.id);
      const result = await api.conversations.getByUserId(user!.id);
      console.log("Inbox: Conversations fetched:", result);
      return result;
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    retry: 3,
    retryDelay: 1000,
  });

  // Start a conversation with a real user (kept for potential future use)
  const startConversationWithUser = async (otherUserId: string) => {
    if (!user) return;

    try {
      const conversation = await api.conversations.findOrCreateConversation(
        user.id,
        otherUserId,
      );
      queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
      setSelectedConversation(conversation.id);
      setShowUsersList(false);
      toast({
        title: "Conversation started",
        description: "You can now start chatting!",
      });
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Auto-select conversation from URL params
  useEffect(() => {
    const conversationId = searchParams.get("conversation");
    if (conversationId) {
      console.log("Auto-selecting conversation from URL:", conversationId);
      setSelectedConversation(conversationId);
    }
  }, [searchParams]);

  // Debug effect for selected conversation changes
  useEffect(() => {
    console.log("Selected conversation changed:", selectedConversation);
    if (selectedConversation) {
      // Force refresh messages when conversation changes
      queryClient.invalidateQueries({
        queryKey: ["messages", selectedConversation],
      });
    }
  }, [selectedConversation, queryClient]);

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading, error: messagesError } = useQuery({
    queryKey: ["messages", selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) {
        console.log("No conversation selected, returning empty array");
        return [];
      }
      console.log("Fetching messages for conversation:", selectedConversation);
      try {
        const result = await api.messages.getConversation(selectedConversation);
        console.log("Messages fetched successfully:", {
          conversationId: selectedConversation,
          messageCount: result?.length || 0,
          messages: result,
          resultType: typeof result,
          isArray: Array.isArray(result)
        });
        if (!Array.isArray(result)) {
          console.warn("API returned non-array result:", result);
          return [];
        }
        return result;
      } catch (error) {
        console.error("Error fetching messages:", error);
        return [];
      }
    },
    enabled: !!selectedConversation,
    refetchInterval: 3000, // Refetch every 3 seconds for real-time messages
    retry: 2,
    retryDelay: 1500,
  });

  // Debug messages state
  useEffect(() => {
    console.log("Messages state:", {
      selectedConversation,
      messagesCount: messages?.length || 0,
      messagesLoading,
      messagesError,
      messagesType: typeof messages,
      isArray: Array.isArray(messages),
      firstMessage: messages?.[0] || null
    });
  }, [messages, messagesLoading, messagesError, selectedConversation]);

  // Auto-scroll to selected conversation when conversations load
  useEffect(() => {
    if (selectedConversation && conversations && conversations.length > 0) {
      const conversationExists = conversations.some(
        (conv: any) => conv.id === selectedConversation,
      );
      if (!conversationExists) {
        console.log("Selected conversation not found in list, refreshing...");
        // If the conversation doesn't exist in the list, refresh conversations
        queryClient.invalidateQueries({
          queryKey: ["conversations", user?.id],
        });
      }
    }
  }, [selectedConversation, conversations, queryClient, user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages && Array.isArray(messages) && messages.length > 0) {
      console.log("Auto-scrolling to bottom, messages count:", messages.length);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages]);

  // Debug effect to log messages state
  useEffect(() => {
    console.log("Messages state updated:", {
      selectedConversation,
      messagesCount: messages?.length || 0,
      messagesType: typeof messages,
      isArray: Array.isArray(messages),
      messagesLoading,
      messages: messages,
    });

    // Additional debug for empty messages
    if (
      selectedConversation &&
      (!messages || messages.length === 0) &&
      !messagesLoading
    ) {
      console.warn("No messages found for conversation:", selectedConversation);
      console.log("Attempting to manually fetch messages...");

      // Manual fetch for debugging
      api.messages
        .getConversation(selectedConversation)
        .then((result) => {
          console.log("Manual fetch result:", result);
        })
        .catch((error) => {
          console.error("Manual fetch error:", error);
        });
    }
  }, [messages, selectedConversation, messagesLoading]);

  // Listen for real-time message updates
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      const newMessage = event.detail;
      console.log("Real-time new message received:", newMessage);
      if (newMessage.conversation_id === selectedConversation) {
        console.log(
          "Invalidating messages query for conversation:",
          selectedConversation,
        );
        queryClient.invalidateQueries({
          queryKey: ["messages", selectedConversation],
        });
      }
      // Always refresh conversations to update last message
      queryClient.invalidateQueries({
        queryKey: ["conversations", user?.id],
      });
    };

    const handleMessageUpdate = (event: CustomEvent) => {
      const updatedMessage = event.detail;
      console.log("Real-time message update received:", updatedMessage);
      if (updatedMessage.conversation_id === selectedConversation) {
        queryClient.invalidateQueries({
          queryKey: ["messages", selectedConversation],
        });
      }
    };

    window.addEventListener("newMessage", handleNewMessage as EventListener);
    window.addEventListener(
      "messageUpdate",
      handleMessageUpdate as EventListener,
    );

    return () => {
      window.removeEventListener(
        "newMessage",
        handleNewMessage as EventListener,
      );
      window.removeEventListener(
        "messageUpdate",
        handleMessageUpdate as EventListener,
      );
    };
  }, [selectedConversation, queryClient, user?.id]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      content,
      imageUrls,
    }: {
      content: string;
      imageUrls?: string[];
    }) => {
      if (!user || !selectedConversation) {
        throw new Error("User not authenticated or no conversation selected");
      }

      console.log("Sending message:", {
        senderId: user.id,
        conversationId: selectedConversation,
        content: content.trim(),
        imageUrls,
      });

      return api.messages.send({
        senderId: user.id,
        conversationId: selectedConversation,
        content: content.trim(),
        imageUrls,
      });
    },
    onSuccess: (data) => {
      console.log("Message sent successfully:", data);
      setNewMessage("");
      setSelectedImages([]);
      queryClient.invalidateQueries({
        queryKey: ["messages", selectedConversation],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });

      // Show success toast
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
      });
    },
    onError: (error: any) => {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length !== files.length) {
      toast({
        title: "Warning",
        description: "Only image files are allowed",
        variant: "destructive",
      });
    }

    // Validate file sizes (max 5MB per image)
    const validFiles = imageFiles.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 5MB. Please choose a smaller image.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    setSelectedImages((prev) => [...prev, ...validFiles]);
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const messageContent = newMessage.trim();
    const hasImages = selectedImages.length > 0;

    if (!messageContent && !hasImages) {
      toast({
        title: "Error",
        description: "Please enter a message or select an image",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to send messages",
        variant: "destructive",
      });
      return;
    }

    if (!selectedConversation) {
      toast({
        title: "Error",
        description: "Please select a conversation first",
        variant: "destructive",
      });
      return;
    }

    console.log("Attempting to send message:", {
      user: user?.id,
      conversation: selectedConversation,
      message: messageContent,
      images: selectedImages.length,
    });

    // Upload images first if any
    let imageUrls: string[] = [];
    if (hasImages) {
      setIsUploading(true);
      try {
        // Ensure message-images bucket exists
        await storage.ensureBucketExists("message-images");

        imageUrls = await Promise.all(
          selectedImages.map((file) =>
            storage.uploadImage(file, "message-images"),
          ),
        );
        console.log("Images uploaded successfully:", imageUrls);
      } catch (error) {
        console.error("Error uploading images:", error);
        toast({
          title: "Error",
          description: "Failed to upload images. Please try again.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    // Send message with images
    sendMessageMutation.mutate({ content: messageContent, imageUrls });
  };

  // Generate consistent colors for conversations
  const getConversationColor = (conversationId: string) => {
    const colors = [
      "bg-blue-50 border-l-blue-500",
      "bg-green-50 border-l-green-500",
      "bg-purple-50 border-l-purple-500",
      "bg-orange-50 border-l-orange-500",
      "bg-pink-50 border-l-pink-500",
      "bg-indigo-50 border-l-indigo-500",
      "bg-teal-50 border-l-teal-500",
      "bg-red-50 border-l-red-500",
    ];
    const hash = conversationId.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const filteredConversations = (conversations || []).filter((conv: any) => {
    if (!searchQuery) return true;

    const otherUser = conv.user1_id === user?.id ? conv.user2 : conv.user1;
    const searchLower = searchQuery.toLowerCase();

    return (
      otherUser?.name?.toLowerCase().includes(searchLower) ||
      otherUser?.email?.toLowerCase().includes(searchLower) ||
      conv.exchange_request?.target_listing?.title
        ?.toLowerCase()
        .includes(searchLower) ||
      conv.exchange_request?.offered_listing?.title
        ?.toLowerCase()
        .includes(searchLower)
    );
  });

  // Debug logging
  useEffect(() => {
    console.log("Inbox: Conversations state:", {
      total: conversations?.length || 0,
      filtered: filteredConversations?.length || 0,
      isLoading,
      user: user?.id,
      searchQuery,
      conversations: conversations,
    });
  }, [conversations, filteredConversations, isLoading, user?.id, searchQuery]);

  const selectedConversationData = (conversations || []).find(
    (c: any) => c.id === selectedConversation,
  );
  const otherUser = selectedConversationData
    ? selectedConversationData.user1_id === user?.id
      ? selectedConversationData.user2
      : selectedConversationData.user1
    : null;

  if (!user) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">Please sign in</h3>
            <p className="text-gray-600">
              You need to be signed in to access your inbox.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5" />
                  <span>Messages</span>
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  {isLoading ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                      Loading conversations...
                    </div>
                  ) : !conversations || conversations.length === 0 ? (
                    <div className="p-6 text-center">
                      <div className="bg-gray-50 rounded-lg p-4 border">
                        <h3 className="text-gray-700 font-medium mb-2">
                          No conversations yet
                        </h3>
                        <p className="text-sm text-gray-600">
                          Start a conversation by clicking "Send Message" on any
                          listing
                        </p>
                        <div className="mt-4 text-xs text-gray-500">
                          Debug: User ID: {user?.id || "Not set"}
                        </div>
                      </div>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="p-6 text-center">
                      <div className="bg-gray-50 rounded-lg p-4 border">
                        <h3 className="text-gray-700 font-medium mb-2">
                          No conversations match your search
                        </h3>
                        <p className="text-sm text-gray-600">
                          Try a different search term
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredConversations.map((conversation: any) => {
                        const otherUser =
                          conversation.user1_id === user.id
                            ? conversation.user2
                            : conversation.user1;
                        const lastMessage =
                          conversation.messages?.[
                            conversation.messages.length - 1
                          ];
                        const isSelected =
                          selectedConversation === conversation.id;

                        return (
                          <button
                            key={conversation.id}
                            onClick={() =>
                              setSelectedConversation(conversation.id)
                            }
                            className={`w-full p-4 text-left hover:opacity-80 transition-all border-l-4 ${
                              isSelected
                                ? `${getConversationColor(conversation.id)} shadow-md`
                                : `${getConversationColor(conversation.id)} opacity-70`
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <Avatar className="w-12 h-12">
                                <AvatarImage src={otherUser?.avatar_url} />
                                <AvatarFallback>
                                  {otherUser?.name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-semibold text-sm truncate text-gray-800">
                                    {otherUser?.name ||
                                      otherUser?.email?.split("@")[0] ||
                                      "User"}
                                  </h4>
                                  {lastMessage && (
                                    <span className="text-xs text-gray-600 font-medium">
                                      {new Date(
                                        lastMessage.created_at,
                                      ).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                {conversation.exchange_request && (
                                  <div className="flex items-center space-x-2 mb-2">
                                    <ArrowRightLeft className="w-3 h-3 text-primary" />
                                    <span className="text-xs text-primary font-semibold">
                                      {
                                        conversation.exchange_request
                                          .target_listing?.title
                                      }
                                    </span>
                                  </div>
                                )}
                                <p className="text-sm text-gray-700 truncate font-medium">
                                  {lastMessage?.content || "No messages yet"}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            {selectedConversation ? (
              <Card className="h-full flex flex-col bg-gradient-to-br from-eco-soft/5 to-eco-soft/0">
                {/* Chat Header */}
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={otherUser?.avatar_url} />
                        <AvatarFallback>
                          {otherUser?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-black">
                          {otherUser?.name ||
                            otherUser?.email?.split("@")[0] ||
                            "User"}
                        </h3>
                        {selectedConversationData?.exchange_request && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>
                              Trading:{" "}
                              {
                                selectedConversationData.exchange_request
                                  .offered_listing?.title
                              }{" "}
                              ↔{" "}
                              {
                                selectedConversationData.exchange_request
                                  .target_listing?.title
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 p-0 bg-gradient-to-br from-eco-soft/5 to-eco-soft/0">
                  <ScrollArea className="h-[calc(100vh-20rem)] p-6">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500">
                          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-sm">Loading messages...</p>
                        </div>
                      </div>
                    ) : !messages ||
                      !Array.isArray(messages) ||
                      messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500">
                          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium mb-2">
                            No messages yet
                          </p>
                          <p className="text-sm text-gray-400">
                            Start the conversation by sending a message!
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 pb-4">
                        {Array.isArray(messages) &&
                          messages.map((message: any, index: number) => {
                            const isOwn = message.sender_id === user?.id;
                            const showAvatar =
                              index === 0 ||
                              messages[index - 1]?.sender_id !==
                                message.sender_id;
                            const isLastInGroup =
                              index === messages.length - 1 ||
                              messages[index + 1]?.sender_id !==
                                message.sender_id;

                            // Check if we need to show date separator
                            const currentDate = new Date(
                              message.created_at,
                            ).toDateString();
                            const previousDate =
                              index > 0
                                ? new Date(
                                    messages[index - 1].created_at,
                                  ).toDateString()
                                : null;
                            const showDateSeparator =
                              currentDate !== previousDate;

                            return (
                              <div key={message.id}>
                                {/* Date separator */}
                                {showDateSeparator && (
                                  <div className="flex justify-center my-4">
                                    <div className="bg-gray-100 text-gray-700 text-xs font-medium px-4 py-2 rounded-full shadow-sm">
                                      {new Date(
                                        message.created_at,
                                      ).toLocaleDateString([], {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                        year:
                                          new Date(
                                            message.created_at,
                                          ).getFullYear() !==
                                          new Date().getFullYear()
                                            ? "numeric"
                                            : undefined,
                                      })}
                                    </div>
                                  </div>
                                )}

                                <div
                                  className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"} ${isLastInGroup ? "mb-3" : "mb-0.5"}`}
                                >
                                  {/* Avatar for received messages */}
                                  {!isOwn && (
                                    <div className="w-8 h-8 flex-shrink-0">
                                      {showAvatar ? (
                                        <Avatar className="w-8 h-8 shadow-sm">
                                          <AvatarImage
                                            src={message.sender?.avatar_url}
                                          />
                                          <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                                            {message.sender?.name?.charAt(0) ||
                                              "U"}
                                          </AvatarFallback>
                                        </Avatar>
                                      ) : (
                                        <div className="w-8 h-8" />
                                      )}
                                    </div>
                                  )}

                                  {/* Message bubble */}
                                  <div
                                    className={`max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg ${isOwn ? "order-first" : ""}`}
                                  >
                                    <div
                                      className={`px-3 py-2 rounded-2xl shadow-sm relative hover:shadow-md transition-shadow ${
                                        isOwn
                                          ? "bg-gradient-to-r from-green-500 to-green-600 text-white ml-auto"
                                          : "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-300"
                                      } ${isOwn && showAvatar ? "rounded-br-md" : ""} ${!isOwn && showAvatar ? "rounded-bl-md" : ""}`}
                                    >
                                      {/* Message content */}
                                      {message.content && (
                                        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                                          {message.content}
                                        </p>
                                      )}

                                      {/* Image content */}
                                      {message.image_url && (
                                        <div
                                          className={
                                            message.content ? "mt-2" : ""
                                          }
                                        >
                                          <img
                                            src={message.image_url}
                                            alt="Shared image"
                                            className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity max-h-64 object-cover"
                                            onClick={() =>
                                              window.open(
                                                message.image_url,
                                                "_blank",
                                              )
                                            }
                                            onError={(e) => {
                                              console.error(
                                                "Image failed to load:",
                                                message.image_url,
                                              );
                                              e.currentTarget.style.display =
                                                "none";
                                            }}
                                          />
                                        </div>
                                      )}

                                      {/* Timestamp in bubble */}
                                      <div
                                        className={`flex items-center justify-end mt-1 ${message.content || message.image_url ? "mt-1" : ""}`}
                                      >
                                        <span
                                          className={`text-xs font-medium ${isOwn ? "text-green-100" : "text-gray-500"}`}
                                        >
                                          {new Date(
                                            message.created_at,
                                          ).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                        {isOwn && (
                                          <div className="flex items-center space-x-0.5 ml-1">
                                            <div className="w-1 h-1 bg-green-100 rounded-full opacity-60"></div>
                                            <div className="w-1 h-1 bg-green-100 rounded-full opacity-60"></div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Spacer for sent messages */}
                                  {isOwn && (
                                    <div className="w-8 h-8 flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>

                {/* Message Input */}
                <div className="border-t p-3 bg-gradient-to-br from-eco-soft/5 to-eco-soft/0">
                  {/* Image Preview */}
                  {selectedImages.length > 0 && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {selectedImages.length} image
                          {selectedImages.length > 1 ? "s" : ""} selected
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedImages([])}
                          className="h-6 w-6 p-0 hover:bg-gray-200"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {selectedImages.map((file, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 group-hover:border-gray-300 transition-colors"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-1 -right-1 w-5 h-5 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeSelectedImage(index)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                              {file.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-end space-x-2"
                  >
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        className="pr-12 py-3 rounded-full border-gray-300 bg-gray-50 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 focus:outline-none resize-none transition-all duration-200"
                        disabled={sendMessageMutation.isPending || isUploading}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={
                            isUploading || sendMessageMutation.isPending
                          }
                          className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                          title="Attach image"
                        >
                          {isUploading ? (
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Paperclip className="w-4 h-4 text-gray-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={
                        (!newMessage.trim() && selectedImages.length === 0) ||
                        sendMessageMutation.isPending ||
                        isUploading
                      }
                      className="h-10 w-10 p-0 rounded-full bg-green-500 hover:bg-green-600 border-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      title="Send message"
                    >
                      {sendMessageMutation.isPending || isUploading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 text-white" />
                      )}
                    </Button>
                  </form>
                </div>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-semibold mb-2">
                    {conversations.length === 0
                      ? "No conversations yet"
                      : "Select a conversation to start chatting"}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {conversations.length === 0
                      ? 'Start a conversation by clicking "Send Message" on any listing'
                      : "Choose a conversation from the left to continue chatting"}
                  </p>
                  {conversations.length === 0 && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-center space-x-2 text-blue-600 mb-2">
                        <MessageCircle className="w-5 h-5" />
                        <span className="font-medium">Get Started</span>
                      </div>
                      <p className="text-sm text-blue-700">
                        Browse listings and click "Send Message" to start your
                        first conversation!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
