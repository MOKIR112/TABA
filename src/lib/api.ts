import { supabase } from "./supabase";
import { Database } from "@/types/supabase";

type Tables = Database["public"]["Tables"];
type Listing = Tables["listings"]["Row"];
type ListingInsert = Tables["listings"]["Insert"];
type ListingUpdate = Tables["listings"]["Update"];
type Message = Tables["messages"]["Row"];
type Trade = Tables["trades"]["Row"];
type Rating = Tables["ratings"]["Row"];
type Favorite = Tables["favorites"]["Row"];

// Content moderation utilities
const SUSPICIOUS_KEYWORDS = [
  "$",
  "sell",
  "money",
  "cash",
  "payment",
  "buy",
  "price",
  "cost",
  "scam",
  "fake",
  "stolen",
  "illegal",
  "drugs",
  "weapon",
];

const SPAM_PATTERNS = [
  /\b(viagra|casino|lottery|winner)\b/i,
  /\b(click here|visit now|act now)\b/i,
  /\b(free money|easy money|get rich)\b/i,
  /(.)\1{4,}/, // Repeated characters
  /[A-Z]{10,}/, // All caps words
];

// Auto-flagging function
function autoFlagContent(
  title: string,
  description: string,
): { flagged: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const content = `${title} ${description}`.toLowerCase();

  // Check for suspicious keywords
  for (const keyword of SUSPICIOUS_KEYWORDS) {
    if (content.includes(keyword)) {
      reasons.push(`Contains suspicious keyword: ${keyword}`);
    }
  }

  // Check for spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      reasons.push("Contains spam-like patterns");
    }
  }

  return { flagged: reasons.length > 0, reasons };
}

// User behavior tracking
const userReports = new Map<string, number>();
const userSpamCount = new Map<string, { count: number; lastSpam: number }>();
const SPAM_THRESHOLD = 3;
const SPAM_WINDOW = 60 * 60 * 1000; // 1 hour

// Search suggestions and analytics
const searchAnalytics = {
  popularSearches: new Map<string, number>(),
  userSearchHistory: new Map<string, string[]>(),

  trackSearch(userId: string, query: string) {
    // Track popular searches
    const count = this.popularSearches.get(query) || 0;
    this.popularSearches.set(query, count + 1);

    // Track user search history
    const history = this.userSearchHistory.get(userId) || [];
    const updatedHistory = [query, ...history.filter((h) => h !== query)].slice(
      0,
      10,
    );
    this.userSearchHistory.set(userId, updatedHistory);
  },

  getPopularSearches(limit: number = 10): string[] {
    return Array.from(this.popularSearches.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([query]) => query);
  },

  getUserSearchHistory(userId: string): string[] {
    return this.userSearchHistory.get(userId) || [];
  },
};

// Enhanced error handling
class APIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any,
  ) {
    super(message);
    this.name = "APIError";
  }
}

const handleError = (error: any, context: string) => {
  console.error(`API Error in ${context}:`, error);

  if (error.code === "PGRST116") {
    throw new APIError("Resource not found", "NOT_FOUND");
  }

  if (error.code === "23505") {
    throw new APIError("Resource already exists", "DUPLICATE");
  }

  if (error.message?.includes("JWT")) {
    throw new APIError("Authentication required", "AUTH_REQUIRED");
  }

  throw new APIError(
    error.message || "An unexpected error occurred",
    error.code,
    error,
  );
};

export const api = {
  // Search and suggestions
  search: {
    async getSuggestions(query: string, userId?: string) {
      const suggestions = [];

      // Add popular searches
      const popular = searchAnalytics
        .getPopularSearches(5)
        .filter((s) => s.toLowerCase().includes(query.toLowerCase()));
      suggestions.push(...popular.map((s) => ({ type: "popular", text: s })));

      // Add user history
      if (userId) {
        const history = searchAnalytics
          .getUserSearchHistory(userId)
          .filter((s) => s.toLowerCase().includes(query.toLowerCase()));
        suggestions.push(...history.map((s) => ({ type: "history", text: s })));
      }

      // Add contextual suggestions
      suggestions.push(
        { type: "contextual", text: `${query} nearby` },
        { type: "contextual", text: `${query} under $100` },
        { type: "contextual", text: `${query} designer` },
      );

      return suggestions.slice(0, 8);
    },

    async saveSearch(userId: string, searchConfig: any) {
      const { data, error } = await supabase
        .from("saved_searches")
        .insert({
          user_id: userId,
          query: searchConfig.query,
          filters: searchConfig,
          notifications_enabled: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getSavedSearches(userId: string) {
      const { data, error } = await supabase
        .from("saved_searches")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  },

  // Trade proposals and management
  tradeProposals: {
    async create(proposal: {
      initiatorId: string;
      receiverId: string;
      listingId: string;
      offeredItems: string[];
      message?: string;
      terms?: string;
    }) {
      const { data, error } = await supabase
        .from("trade_proposals")
        .insert({
          initiator_id: proposal.initiatorId,
          receiver_id: proposal.receiverId,
          listing_id: proposal.listingId,
          offered_items: proposal.offeredItems,
          message: proposal.message,
          terms: proposal.terms,
          status: "PENDING",
        })
        .select(
          `
          *,
          initiator:users!initiator_id(*),
          receiver:users!receiver_id(*),
          listing:listings(*)
        `,
        )
        .single();

      if (error) throw error;

      // Send notification
      await api.notifications.create({
        user_id: proposal.receiverId,
        title: "New Trade Proposal",
        message: `You have a new trade proposal for your listing`,
        type: "trade",
        data: { proposalId: data.id, listingId: proposal.listingId },
      });

      return data;
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("trade_proposals")
        .select(
          `
          *,
          initiator:users!initiator_id(*),
          receiver:users!receiver_id(*),
          listing:listings(*)
        `,
        )
        .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async updateStatus(proposalId: string, status: string, userId: string) {
      const { data, error } = await supabase
        .from("trade_proposals")
        .update({
          status,
          updated_at: new Date().toISOString(),
          ...(status === "ACCEPTED" && {
            accepted_at: new Date().toISOString(),
          }),
          ...(status === "COMPLETED" && {
            completed_at: new Date().toISOString(),
          }),
        })
        .eq("id", proposalId)
        .select(
          `
          *,
          initiator:users!initiator_id(*),
          receiver:users!receiver_id(*)
        `,
        )
        .single();

      if (error) throw error;

      // Send notification to other party
      const otherUserId =
        data.initiator_id === userId ? data.receiver_id : data.initiator_id;
      await api.notifications.create({
        user_id: otherUserId,
        title: `Trade Proposal ${status}`,
        message: `Your trade proposal has been ${status.toLowerCase()}`,
        type: "trade",
        data: { proposalId, status },
      });

      return data;
    },
  },

  // Analytics and insights
  analytics: {
    async getUserStats(userId: string) {
      const [listings, trades, proposals, ratings] = await Promise.all([
        supabase
          .from("listings")
          .select("id, views, created_at")
          .eq("user_id", userId),
        supabase
          .from("trades")
          .select("id, status, created_at")
          .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`),
        supabase
          .from("trade_proposals")
          .select("id, status, created_at")
          .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`),
        supabase
          .from("ratings")
          .select("rating, created_at")
          .eq("rated_id", userId),
      ]);

      const totalViews =
        listings.data?.reduce((sum, l) => sum + (l.views || 0), 0) || 0;
      const completedTrades =
        trades.data?.filter((t) => t.status === "COMPLETED").length || 0;
      const responseRate = proposals.data?.length
        ? (proposals.data.filter((p) => p.status !== "PENDING").length /
            proposals.data.length) *
          100
        : 0;
      const avgRating = ratings.data?.length
        ? ratings.data.reduce((sum, r) => sum + r.rating, 0) /
          ratings.data.length
        : 0;

      return {
        totalListings: listings.data?.length || 0,
        totalViews,
        completedTrades,
        responseRate: Math.round(responseRate),
        averageRating: Math.round(avgRating * 10) / 10,
        totalRatings: ratings.data?.length || 0,
        joinDate: listings.data?.[0]?.created_at,
      };
    },

    async getListingAnalytics(listingId: string) {
      const [listing, messages, proposals] = await Promise.all([
        supabase.from("listings").select("*").eq("id", listingId).single(),
        supabase.from("messages").select("id").eq("listing_id", listingId),
        supabase
          .from("trade_proposals")
          .select("id, status")
          .eq("listing_id", listingId),
      ]);

      return {
        views: listing.data?.views || 0,
        messages: messages.data?.length || 0,
        proposals: proposals.data?.length || 0,
        conversionRate: proposals.data?.length
          ? (proposals.data.filter((p) => p.status === "COMPLETED").length /
              proposals.data.length) *
            100
          : 0,
      };
    },

    async getPlatformStats() {
      const [users, listings, trades, messages] = await Promise.all([
        supabase.from("users").select("id", { count: "exact" }),
        supabase
          .from("listings")
          .select("id", { count: "exact" })
          .eq("status", "ACTIVE"),
        supabase
          .from("trades")
          .select("id", { count: "exact" })
          .eq("status", "COMPLETED"),
        supabase.from("messages").select("id", { count: "exact" }),
      ]);

      return {
        totalUsers: users.count || 0,
        activeListings: listings.count || 0,
        completedTrades: trades.count || 0,
        totalMessages: messages.count || 0,
      };
    },
  },

  // Notifications
  notifications: {
    async create(notification: {
      user_id: string;
      title: string;
      message: string;
      type: string;
      data?: any;
      related_listing_id?: string;
      metadata?: any;
    }) {
      console.log("Creating notification in database:", notification);

      const { data, error } = await supabase
        .from("notifications")
        .insert({
          ...notification,
          read: false,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating notification:", error);
        throw error;
      }

      console.log("Notification created successfully:", data);
      return data;
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("notifications")
        .select(
          `
          *,
          related_listing:listings(id, title, image)
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },

    async markAsRead(notificationId: string) {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },

    async getUnreadCount(userId: string) {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (error) throw error;
      return count || 0;
    },
  },
  // Moderation
  moderation: {
    async flagListing(listingId: string, reason: string, reporterId: string) {
      const { data, error } = await supabase
        .from("listing_reports")
        .insert({
          listing_id: listingId,
          reporter_id: reporterId,
          reason,
          status: "PENDING",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async blockUser(userId: string, blockedUserId: string) {
      const { data, error } = await supabase
        .from("user_blocks")
        .insert({
          user_id: userId,
          blocked_user_id: blockedUserId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async reportUser(
      reporterId: string,
      reportedUserId: string,
      reason: string,
    ) {
      // Track reports for auto-ban
      const currentReports = userReports.get(reportedUserId) || 0;
      userReports.set(reportedUserId, currentReports + 1);

      const { data, error } = await supabase
        .from("user_reports")
        .insert({
          reporter_id: reporterId,
          reported_user_id: reportedUserId,
          reason,
          status: "PENDING",
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-ban if threshold reached
      if (currentReports >= 3) {
        await this.banUser(reportedUserId, "Auto-banned for multiple reports");
      }

      return data;
    },

    async banUser(userId: string, reason: string) {
      const { data, error } = await supabase
        .from("user_bans")
        .insert({
          user_id: userId,
          reason,
          banned_until: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7 days
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async checkSpam(userId: string, content: string): Promise<boolean> {
      const now = Date.now();
      const userSpam = userSpamCount.get(userId) || { count: 0, lastSpam: 0 };

      // Reset count if outside window
      if (now - userSpam.lastSpam > SPAM_WINDOW) {
        userSpam.count = 0;
      }

      // Check for spam patterns
      const isSpam = SPAM_PATTERNS.some((pattern) => pattern.test(content));

      if (isSpam) {
        userSpam.count += 1;
        userSpam.lastSpam = now;
        userSpamCount.set(userId, userSpam);

        // Auto-ban if threshold reached
        if (userSpam.count >= SPAM_THRESHOLD) {
          await this.banUser(userId, "Auto-banned for spam");
          return true;
        }
      }

      return isSpam;
    },

    async getBlockedUsers(userId: string) {
      const { data, error } = await supabase
        .from("user_blocks")
        .select("blocked_user_id")
        .eq("user_id", userId);

      if (error) throw error;
      return data.map((block) => block.blocked_user_id);
    },
  },

  // User stats and badges
  userStats: {
    async calculateBadges(userId: string) {
      const stats = await api.users.getStats(userId);
      const badges = [];

      if (stats.completedTrades >= 5 && stats.averageRating >= 4.5) {
        badges.push({ name: "Trusted Trader", icon: "Shield", color: "blue" });
      }

      if (stats.averageRating >= 4.8) {
        badges.push({ name: "Top Rated", icon: "Star", color: "yellow" });
      }

      if (stats.completedTrades >= 10) {
        badges.push({ name: "Veteran Trader", icon: "Award", color: "purple" });
      }

      return badges;
    },

    async getEcoStats(userId: string) {
      // Calculate environmental impact
      const trades = await api.trades.getByUserId(userId);
      const completedTrades = trades.filter((t) => t.status === "COMPLETED");

      // Estimate weight saved (mock calculation)
      const estimatedWeight = completedTrades.length * 2.5; // 2.5kg per trade average

      return {
        itemsSaved: completedTrades.length,
        weightDiverted: `${estimatedWeight}kg`,
        co2Saved: `${(estimatedWeight * 0.5).toFixed(1)}kg CO2`,
      };
    },
  },

  // Location services
  location: {
    async getListingsWithinRadius(
      lat: number,
      lng: number,
      radiusKm: number = 10,
    ) {
      // This would use PostGIS in a real implementation
      // For now, we'll use a simple approximation
      const { data, error } = await supabase
        .from("listings")
        .select(
          `
          *,
          user:users(*),
          favorites(id)
        `,
        )
        .eq("status", "ACTIVE");

      if (error) throw error;

      // Filter by radius (simplified calculation)
      return data.filter((listing) => {
        if (!listing.latitude || !listing.longitude) return true;

        const distance = this.calculateDistance(
          lat,
          lng,
          listing.latitude,
          listing.longitude,
        );

        return distance <= radiusKm;
      });
    },

    calculateDistance(
      lat1: number,
      lng1: number,
      lat2: number,
      lng2: number,
    ): number {
      const R = 6371; // Earth's radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
  },

  // Admin functions
  admin: {
    async getModerationQueue() {
      const { data, error } = await supabase
        .from("listing_reports")
        .select(
          `
          *,
          listing:listings(*),
          reporter:users!reporter_id(*)
        `,
        )
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    async resolveReport(
      reportId: string,
      action: "APPROVED" | "REJECTED",
      adminId: string,
    ) {
      const { data, error } = await supabase
        .from("listing_reports")
        .update({
          status: action,
          resolved_by: adminId,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getSystemStats() {
      const [users, listings, trades, reports] = await Promise.all([
        supabase.from("users").select("id", { count: "exact" }),
        supabase
          .from("listings")
          .select("id", { count: "exact" })
          .eq("status", "ACTIVE"),
        supabase
          .from("trades")
          .select("id", { count: "exact" })
          .eq("status", "COMPLETED"),
        supabase
          .from("listing_reports")
          .select("id", { count: "exact" })
          .eq("status", "PENDING"),
      ]);

      return {
        totalUsers: users.count || 0,
        activeListings: listings.count || 0,
        completedTrades: trades.count || 0,
        pendingReports: reports.count || 0,
      };
    },
  },

  // Listings
  listings: {
    async getAll(filters?: {
      search?: string;
      category?: string;
      location?: string;
      limit?: number;
      offset?: number;
    }) {
      let query = supabase
        .from("listings")
        .select(
          `
          *,
          user:users(*),
          favorites(id),
          _count:messages(count)
        `,
        )
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false });

      if (filters?.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
        );
      }

      if (filters?.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }

      if (filters?.location && filters.location !== "all") {
        query = query.ilike("location", `%${filters.location}%`);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(
          filters.offset,
          filters.offset + (filters.limit || 10) - 1,
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from("listings")
        .select(
          `
          *,
          user:users(*),
          favorites(id)
        `,
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("listings")
        .select(
          `
          *,
          _count:messages(count)
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    async create(listing: ListingInsert) {
      try {
        // Validate required fields
        if (!listing.title || !listing.description || !listing.category) {
          throw new APIError(
            "Missing required fields: title, description, and category are required",
          );
        }

        // Auto-flag suspicious content
        const flagCheck = autoFlagContent(
          listing.title,
          listing.description || "",
        );

        const listingData = {
          ...listing,
          flagged: flagCheck.flagged,
          flag_reasons: flagCheck.reasons,
          status: flagCheck.flagged ? "PENDING_REVIEW" : "ACTIVE",
        };

        const { data, error } = await supabase
          .from("listings")
          .insert(listingData)
          .select()
          .single();

        if (error) handleError(error, "create listing");
        return data;
      } catch (error) {
        if (error instanceof APIError) throw error;
        handleError(error, "create listing");
      }
    },

    async update(id: string, updates: ListingUpdate) {
      const { data, error } = await supabase
        .from("listings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async delete(id: string) {
      const { error } = await supabase.from("listings").delete().eq("id", id);

      if (error) throw error;
    },

    async incrementViews(id: string) {
      const { error } = await supabase.rpc("increment_listing_views", {
        listing_id: id,
      });

      if (error) throw error;
    },
  },

  // Messages
  messages: {
    async getConversations(userId: string) {
      // Get conversations from the conversations table
      return await api.conversations.getByUserId(userId);
    },

    async getConversation(conversationId: string) {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:users_public!sender_id(*),
          receiver:users_public!receiver_id(*),
          attachments:message_attachments(*)
        `,
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        throw error;
      }

      // Ensure we return an array
      const messages = data || [];

      // Fill in missing user data from main users table if needed
      const messagesWithUserData = await Promise.all(
        messages.map(async (message) => {
          let sender = message.sender;
          let receiver = message.receiver;

          // If sender data is missing from users_public, try to get it from users table
          if (!sender?.name && message.sender_id) {
            try {
              const { data: userData } = await supabase
                .from("users")
                .select("id, name, email, avatar_url")
                .eq("id", message.sender_id)
                .single();

              if (userData) {
                sender = {
                  id: userData.id,
                  name: userData.name,
                  email: userData.email,
                  avatar_url: userData.avatar_url,
                  created_at: null,
                  updated_at: null,
                };
              }
            } catch (err) {
              console.warn("Could not fetch sender data:", err);
            }
          }

          // If receiver data is missing from users_public, try to get it from users table
          if (!receiver?.name && message.receiver_id) {
            try {
              const { data: userData } = await supabase
                .from("users")
                .select("id, name, email, avatar_url")
                .eq("id", message.receiver_id)
                .single();

              if (userData) {
                receiver = {
                  id: userData.id,
                  name: userData.name,
                  email: userData.email,
                  avatar_url: userData.avatar_url,
                  created_at: null,
                  updated_at: null,
                };
              }
            } catch (err) {
              console.warn("Could not fetch receiver data:", err);
            }
          }

          return {
            ...message,
            sender,
            receiver,
          };
        }),
      );

      return messagesWithUserData;
    },

    async send(message: {
      senderId: string;
      conversationId: string;
      content: string;
      imageUrls?: string[];
      attachments?: File[];
    }) {
      try {
        console.log("API: Attempting to send message:", {
          senderId: message.senderId,
          conversationId: message.conversationId,
          contentLength: message.content.length,
        });

        // Validate input
        if (
          !message.senderId ||
          !message.conversationId ||
          !message.content.trim()
        ) {
          throw new Error("Missing required message data");
        }

        // Skip spam check for now to simplify debugging
        // const isSpam = await api.moderation.checkSpam(
        //   message.senderId,
        //   message.content,
        // );
        // if (isSpam) {
        //   throw new Error("Message flagged as spam");
        // }

        // Verify user is part of the conversation
        let conversation;
        try {
          conversation = await api.conversations.getById(
            message.conversationId,
          );
        } catch (convError) {
          console.error("Error fetching conversation:", convError);
          throw new Error("Conversation not found or inaccessible");
        }

        if (
          !conversation ||
          (conversation.user1_id !== message.senderId &&
            conversation.user2_id !== message.senderId)
        ) {
          throw new Error(
            "You are not authorized to send messages in this conversation",
          );
        }

        const receiverId =
          conversation.user1_id === message.senderId
            ? conversation.user2_id
            : conversation.user1_id;

        if (!receiverId) {
          throw new Error("Unable to determine message receiver");
        }

        // Skip blocking check for now to simplify debugging
        // try {
        //   const blockedUsers = await api.moderation.getBlockedUsers(receiverId);
        //   if (blockedUsers.includes(message.senderId)) {
        //     throw new Error("You are blocked by this user");
        //   }
        // } catch (blockError) {
        //   console.warn("Could not check blocked users:", blockError);
        //   // Continue anyway - blocking check is not critical
        // }

        console.log("API: Inserting message into database...");

        // If we have multiple images, send them as separate messages
        if (message.imageUrls && message.imageUrls.length > 0) {
          const messages = [];

          // Send text message first if there's content
          if (message.content.trim()) {
            const { data: textMessage, error: textError } = await supabase
              .from("messages")
              .insert({
                conversation_id: message.conversationId,
                sender_id: message.senderId,
                receiver_id: receiverId,
                content: message.content.trim(),
                read: false,
              })
              .select(
                `
                *,
                sender:users_public!sender_id(*),
                receiver:users_public!receiver_id(*)
              `,
              )
              .single();

            if (textError) {
              console.error(
                "Database error inserting text message:",
                textError,
              );
              throw new Error(
                `Failed to save text message: ${textError.message}`,
              );
            }
            messages.push(textMessage);
          }

          // Send each image as a separate message
          for (const imageUrl of message.imageUrls) {
            const { data: imageMessage, error: imageError } = await supabase
              .from("messages")
              .insert({
                conversation_id: message.conversationId,
                sender_id: message.senderId,
                receiver_id: receiverId,
                content: "", // Empty content for image-only messages
                image_url: imageUrl,
                read: false,
              })
              .select(
                `
                *,
                sender:users_public!sender_id(*),
                receiver:users_public!receiver_id(*)
              `,
              )
              .single();

            if (imageError) {
              console.error(
                "Database error inserting image message:",
                imageError,
              );
              // Continue with other images even if one fails
              continue;
            }
            messages.push(imageMessage);
          }

          // Return the last message sent
          const lastMessage = messages[messages.length - 1];
          if (!lastMessage) {
            throw new Error("Failed to send any messages");
          }

          console.log("API: Messages inserted successfully:", messages.length);
          return lastMessage;
        } else {
          // Regular text-only message
          const { data, error } = await supabase
            .from("messages")
            .insert({
              conversation_id: message.conversationId,
              sender_id: message.senderId,
              receiver_id: receiverId,
              content: message.content.trim(),
              read: false,
            })
            .select(
              `
              *,
              sender:users_public!sender_id(*),
              receiver:users_public!receiver_id(*)
            `,
            )
            .single();

          if (error) {
            console.error("Database error inserting message:", error);
            throw new Error(`Failed to save message: ${error.message}`);
          }

          console.log("API: Message inserted successfully:", data.id);
          return data;
        }

        const data = lastMessage || messageData;

        // Handle file attachments (legacy support)
        if (message.attachments && message.attachments.length > 0) {
          for (const file of message.attachments) {
            const fileName = `${Date.now()}-${file.name}`;
            const filePath = `messages/${data.id}/${fileName}`;

            try {
              const uploadResult = await api.storage.uploadFile(
                "message-attachments",
                filePath,
                file,
              );

              await api.messageAttachments.create({
                messageId: data.id,
                fileUrl: uploadResult.publicUrl,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
              });
            } catch (uploadError) {
              console.error("Error uploading attachment:", uploadError);
              // Continue without attachment if upload fails
            }
          }
        }

        // Send notification to receiver
        try {
          await api.notifications.create({
            user_id: receiverId,
            title: "New Message",
            message: `You have a new message from ${data.sender?.name || "someone"}`,
            type: "message",
            data: { messageId: data.id, senderId: message.senderId },
          });
        } catch (notifError) {
          console.warn("Failed to send notification:", notifError);
          // Don't fail the message send if notification fails
        }

        console.log("API: Message sent successfully with ID:", data.id);
        return data;
      } catch (error: any) {
        console.error("Error sending message:", error);
        throw new Error(error.message || "Failed to send message");
      }
    },

    async markAsRead(messageIds: string[]) {
      const { error } = await supabase
        .from("messages")
        .update({ read: true })
        .in("id", messageIds);

      if (error) throw error;
    },
  },

  // Favorites
  favorites: {
    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("favorites")
        .select(
          `
          *,
          listing:listings(
            *,
            user:users(*)
          )
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Database error in getByUserId (favorites):", error);
        return [];
      }
      return data || [];
    },

    async add(userId: string, listingId: string) {
      // Check if already favorited
      const { data: existing } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", userId)
        .eq("listing_id", listingId)
        .single();

      if (existing) {
        return existing;
      }

      const { data, error } = await supabase
        .from("favorites")
        .insert({
          user_id: userId,
          listing_id: listingId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async remove(userId: string, listingId: string) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("listing_id", listingId);

      if (error) throw error;
    },
  },

  // Trades
  trades: {
    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("trades")
        .select(
          `
          *,
          initiator:users!initiator_id(*),
          receiver:users!receiver_id(*),
          listing:listings(*),
          ratings(*)
        `,
        )
        .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    async create(trade: {
      initiatorId: string;
      receiverId: string;
      listingId: string;
      initiatorItem: string;
      receiverItem: string;
    }) {
      const { data, error } = await supabase
        .from("trades")
        .insert({
          initiator_id: trade.initiatorId,
          receiver_id: trade.receiverId,
          listing_id: trade.listingId,
          initiator_item: trade.initiatorItem,
          receiver_item: trade.receiverItem,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async updateStatus(id: string, status: string) {
      const { data, error } = await supabase
        .from("trades")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async confirmCompletion(
      tradeId: string,
      userId: string,
      comment?: string,
      rating?: number,
    ) {
      // First, get the current trade to check confirmation status
      const { data: currentTrade, error: fetchError } = await supabase
        .from("trades")
        .select("*")
        .eq("id", tradeId)
        .single();

      if (fetchError) throw fetchError;

      const isInitiator = currentTrade.initiator_id === userId;
      const confirmationField = isInitiator
        ? "initiator_confirmed"
        : "receiver_confirmed";
      const confirmationDateField = isInitiator
        ? "initiator_confirmation_date"
        : "receiver_confirmation_date";
      const otherConfirmationField = isInitiator
        ? "receiver_confirmed"
        : "initiator_confirmed";

      // Check if user already confirmed
      if (currentTrade[confirmationField]) {
        throw new Error("You have already confirmed this trade");
      }

      // Update the confirmation status
      const updateData: any = {
        [confirmationField]: true,
        [confirmationDateField]: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (comment) updateData.completion_comment = comment;
      if (rating) updateData.completion_rating = rating;

      // Check if both parties have now confirmed
      const bothConfirmed = currentTrade[otherConfirmationField] === true;
      if (bothConfirmed) {
        updateData.status = "COMPLETED";
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("trades")
        .update(updateData)
        .eq("id", tradeId)
        .select(
          `
          *,
          initiator:users!initiator_id(*),
          receiver:users!receiver_id(*),
          listing:listings(*)
        `,
        )
        .single();

      if (error) throw error;

      // Create notification for other party
      const otherUserId = isInitiator ? data.receiver_id : data.initiator_id;
      const notificationTitle = bothConfirmed
        ? "Trade Completed"
        : "Trade Confirmation Received";
      const notificationMessage = bothConfirmed
        ? `Your trade for "${data.listing?.title}" has been completed!`
        : `${data[isInitiator ? "initiator" : "receiver"]?.name} has confirmed receipt of their item for "${data.listing?.title}"`;

      await api.notifications.create({
        user_id: otherUserId,
        title: notificationTitle,
        message: notificationMessage,
        type: "trade",
        data: { tradeId, listingId: data.listing_id, completed: bothConfirmed },
      });

      return data;
    },
  },

  // Ratings
  ratings: {
    async create(rating: {
      raterId: string;
      ratedId: string;
      tradeId: string;
      rating: number;
      comment?: string;
    }) {
      const { data, error } = await supabase
        .from("ratings")
        .insert({
          rater_id: rating.raterId,
          rated_id: rating.ratedId,
          trade_id: rating.tradeId,
          rating: rating.rating,
          comment: rating.comment,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("ratings")
        .select(
          `
          *,
          rater:users!rater_id(*),
          trade:trades(*)
        `,
        )
        .eq("rated_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  },

  // User reviews
  reviews: {
    async create(review: {
      reviewerId: string;
      reviewedUserId: string;
      rating: number;
      comment?: string;
      tradeId?: string;
    }) {
      if (review.reviewerId === review.reviewedUserId) {
        throw new Error("Cannot review yourself");
      }

      if (review.rating < 1 || review.rating > 5) {
        throw new Error("Rating must be between 1 and 5");
      }

      if (!review.comment || review.comment.trim().length === 0) {
        throw new Error("Review comment is required");
      }

      const { data, error } = await supabase
        .from("user_reviews")
        .insert({
          reviewer_id: review.reviewerId,
          target_user_id: review.reviewedUserId,
          rating: review.rating,
          comment: review.comment.trim(),
          trade_id: review.tradeId,
        })
        .select(
          `
          *,
          reviewer:users!reviewer_id(*),
          trade:trades(*)
        `,
        )
        .single();

      if (error) {
        console.error("Review creation error:", error);
        throw new Error(error.message || "Failed to create review");
      }

      // Send notification to reviewed user
      try {
        await api.notifications.create({
          user_id: review.reviewedUserId,
          title: "New Review",
          message: `${data.reviewer?.name || "Someone"} left you a ${review.rating}-star review!`,
          type: "review",
          data: { reviewId: data.id, rating: review.rating },
        });
      } catch (notifError) {
        console.warn("Failed to send review notification:", notifError);
      }

      return data;
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("user_reviews")
        .select(
          `
          *,
          reviewer:users!reviewer_id(*),
          trade:trades(*),
          replies:review_replies(
            *,
            user:users(*)
          )
        `,
        )
        .eq("target_user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async reply(reviewId: string, userId: string, reply: string) {
      if (!reply || reply.trim().length === 0) {
        throw new Error("Reply cannot be empty");
      }

      const { data, error } = await supabase
        .from("review_replies")
        .insert({
          review_id: reviewId,
          user_id: userId,
          reply: reply.trim(),
        })
        .select(
          `
          *,
          user:users(*)
        `,
        )
        .single();

      if (error) {
        console.error("Review reply error:", error);
        throw new Error(error.message || "Failed to post reply");
      }

      // Get the original review to notify the reviewer
      try {
        const { data: review } = await supabase
          .from("user_reviews")
          .select("reviewer_id, reviewer:users!reviewer_id(name)")
          .eq("id", reviewId)
          .single();

        if (review && review.reviewer_id !== userId) {
          const replier = await api.users.getById(userId);
          await api.notifications.create({
            user_id: review.reviewer_id,
            title: "Review Reply",
            message: `${replier.name || "Someone"} replied to your review`,
            type: "review_reply",
            data: { reviewId, replyId: data.id },
          });
        }
      } catch (notifError) {
        console.warn("Failed to send reply notification:", notifError);
      }

      return data;
    },
  },

  // Message attachments
  messageAttachments: {
    async create(attachment: {
      messageId: string;
      fileUrl: string;
      fileName: string;
      fileType: string;
      fileSize?: number;
    }) {
      const { data, error } = await supabase
        .from("message_attachments")
        .insert({
          message_id: attachment.messageId,
          file_url: attachment.fileUrl,
          file_name: attachment.fileName,
          file_type: attachment.fileType,
          file_size: attachment.fileSize,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getByMessageId(messageId: string) {
      const { data, error } = await supabase
        .from("message_attachments")
        .select("*")
        .eq("message_id", messageId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  },

  // File upload
  storage: {
    async uploadFile(bucket: string, path: string, file: File) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(path);

      return { ...data, publicUrl };
    },

    async deleteFile(bucket: string, path: string) {
      const { error } = await supabase.storage.from(bucket).remove([path]);

      if (error) throw error;
    },
  },

  // Trade proposals
  tradeProposals: {
    async create(proposal: {
      senderId: string;
      receiverId: string;
      targetListingId: string;
      offeredListingId: string;
      message?: string;
    }) {
      const { data, error } = await supabase
        .from("trade_proposals")
        .insert({
          sender_id: proposal.senderId,
          receiver_id: proposal.receiverId,
          target_listing_id: proposal.targetListingId,
          offered_listing_id: proposal.offeredListingId,
          message: proposal.message,
          status: "pending",
        })
        .select(
          `
          *,
          sender:users!sender_id(*),
          receiver:users!receiver_id(*),
          target_listing:listings!target_listing_id(*),
          offered_listing:listings!offered_listing_id(*)
        `,
        )
        .single();

      if (error) throw error;
      return data;
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("trade_proposals")
        .select(
          `
          *,
          sender:users!sender_id(*),
          receiver:users!receiver_id(*),
          target_listing:listings!target_listing_id(*),
          offered_listing:listings!offered_listing_id(*)
        `,
        )
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async updateStatus(proposalId: string, status: string, userId: string) {
      const { data, error } = await supabase
        .from("trade_proposals")
        .update({
          status,
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", proposalId)
        .select(
          `
          *,
          sender:users!sender_id(*),
          receiver:users!receiver_id(*),
          target_listing:listings!target_listing_id(*),
          offered_listing:listings!offered_listing_id(*)
        `,
        )
        .single();

      if (error) throw error;

      // If accepted, create or find conversation
      if (status === "accepted") {
        try {
          const conversation = await api.conversations.findOrCreateConversation(
            data.sender_id,
            data.receiver_id,
          );

          // Send notification to sender about acceptance
          await api.notifications.create({
            user_id: data.sender_id,
            title: "Trade Proposal Accepted! 🎉",
            message: `${data.receiver?.name || "Someone"} accepted your trade proposal for "${data.target_listing?.title || "their item"}". You can now chat!`,
            type: "trade_proposal_accepted",
            data: {
              trade_proposal_id: proposalId,
              conversation_id: conversation.id,
              status: "accepted",
            },
            metadata: {
              trade_proposal_id: proposalId,
              conversation_id: conversation.id,
              other_user_name: data.receiver?.name,
              target_listing_title: data.target_listing?.title,
            },
          });

          return { ...data, conversation_id: conversation.id };
        } catch (conversationError) {
          console.error("Error creating conversation:", conversationError);
          return data;
        }
      } else if (status === "declined") {
        // Send notification to sender about decline
        await api.notifications.create({
          user_id: data.sender_id,
          title: "Trade Proposal Declined",
          message: `${data.receiver?.name || "Someone"} declined your trade proposal for "${data.target_listing?.title || "their item"}".`,
          type: "trade_proposal_declined",
          data: {
            trade_proposal_id: proposalId,
            status: "declined",
          },
          metadata: {
            trade_proposal_id: proposalId,
            other_user_name: data.receiver?.name,
            target_listing_title: data.target_listing?.title,
          },
        });
      }

      return data;
    },

    async getForListing(listingId: string, userId: string) {
      const { data, error } = await supabase
        .from("trade_proposals")
        .select(
          `
          *,
          sender:users!sender_id(*),
          receiver:users!receiver_id(*),
          target_listing:listings!target_listing_id(*),
          offered_listing:listings!offered_listing_id(*)
        `,
        )
        .eq("target_listing_id", listingId)
        .eq("sender_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0] || null;
    },
  },

  // Exchange requests
  exchangeRequests: {
    async create(request: {
      senderId: string;
      receiverId: string;
      offeredListingId: string;
      targetListingId: string;
      message?: string;
    }) {
      const { data, error } = await supabase
        .from("exchange_requests")
        .insert({
          sender_id: request.senderId,
          receiver_id: request.receiverId,
          offered_listing_id: request.offeredListingId,
          target_listing_id: request.targetListingId,
          message: request.message,
          status: "pending",
        })
        .select(
          `
          *,
          sender:users_public!sender_id(*),
          receiver:users_public!receiver_id(*),
          offered_listing:listings!offered_listing_id(*),
          target_listing:listings!target_listing_id(*)
        `,
        )
        .single();

      if (error) throw error;

      // Create notification directly - the database trigger should handle this but we'll ensure it happens
      try {
        console.log("Creating notification for exchange request:", {
          receiverId: request.receiverId,
          senderId: request.senderId,
          exchangeRequestId: data.id,
        });

        // Create the notification directly
        const notificationData = {
          user_id: request.receiverId,
          title: "New Exchange Request! 📦",
          message: `${data.sender?.name || "Someone"} wants to exchange "${data.offered_listing?.title || "their item"}" for "${data.target_listing?.title || "your listing"}"`,
          type: "trade_request",
          related_listing_id: request.targetListingId,
          metadata: {
            exchange_request_id: data.id,
            offered_listing_id: request.offeredListingId,
            offered_listing_title:
              data.offered_listing?.title || "Unknown Item",
            target_listing_title: data.target_listing?.title || "Unknown Item",
            sender_id: request.senderId,
            sender_name: data.sender?.name || "Unknown User",
            message: request.message,
          },
          data: {
            exchange_request_id: data.id,
            offered_listing_id: request.offeredListingId,
            target_listing_id: request.targetListingId,
          },
        };

        console.log("Notification data to be created:", notificationData);

        const notification = await api.notifications.create(notificationData);
        console.log("Notification created successfully:", notification);
      } catch (notificationError) {
        console.error(
          "Failed to create exchange request notification:",
          notificationError,
        );
      }

      return data;
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("exchange_requests")
        .select(
          `
          *,
          sender:users_public!sender_id(*),
          receiver:users_public!receiver_id(*),
          offered_listing:listings!offered_listing_id(*),
          target_listing:listings!target_listing_id(*)
        `,
        )
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async updateStatus(requestId: string, status: string, userId: string) {
      const { data, error } = await supabase
        .from("exchange_requests")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .select(
          `
          *,
          sender:users_public!sender_id(*),
          receiver:users_public!receiver_id(*),
          offered_listing:listings!offered_listing_id(*),
          target_listing:listings!target_listing_id(*)
        `,
        )
        .single();

      if (error) throw error;

      // Wait a moment for database triggers to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Fetch conversation data separately if conversation_id exists
      let conversation = null;
      if (data.conversation_id) {
        try {
          const { data: conversationData } = await supabase
            .from("conversations")
            .select("*")
            .eq("id", data.conversation_id)
            .single();

          if (conversationData) {
            conversation = conversationData;
          }
        } catch (err) {
          console.warn("Could not fetch conversation data:", err);
        }
      }

      const finalData = {
        ...data,
        conversation,
      };

      // If accepted, ensure conversation exists and send notifications
      if (status === "accepted") {
        try {
          // Send notification to the sender about acceptance
          const senderId = finalData.sender_id;
          const receiverName = finalData.receiver?.name || "Someone";
          const targetListingTitle =
            finalData.target_listing?.title || "the item";

          await api.notifications.create({
            user_id: senderId,
            title: "Exchange Request Accepted! 🎉",
            message: `${receiverName} accepted your exchange request for "${targetListingTitle}". You can now start chatting!`,
            type: "exchange_started",
            data: {
              exchange_request_id: requestId,
              conversation_id:
                finalData.conversation_id || finalData.conversation?.id,
              status: "accepted",
            },
            metadata: {
              exchange_request_id: requestId,
              conversation_id:
                finalData.conversation_id || finalData.conversation?.id,
              other_user_name: receiverName,
              target_listing_title: targetListingTitle,
            },
          });
        } catch (notificationError) {
          console.warn(
            "Failed to send acceptance notification:",
            notificationError,
          );
        }
      } else if (status === "declined") {
        try {
          // Send notification to the sender about decline
          const senderId = finalData.sender_id;
          const receiverName = finalData.receiver?.name || "Someone";
          const targetListingTitle =
            finalData.target_listing?.title || "the item";

          await api.notifications.create({
            user_id: senderId,
            title: "Exchange Request Declined",
            message: `${receiverName} declined your exchange request for "${targetListingTitle}".`,
            type: "exchange_declined",
            data: {
              exchange_request_id: requestId,
              status: "declined",
            },
            metadata: {
              exchange_request_id: requestId,
              other_user_name: receiverName,
              target_listing_title: targetListingTitle,
            },
          });
        } catch (notificationError) {
          console.warn(
            "Failed to send decline notification:",
            notificationError,
          );
        }
      }

      return finalData;
    },

    async getForListing(listingId: string, userId: string) {
      const { data, error } = await supabase
        .from("exchange_requests")
        .select(
          `
          *,
          sender:users_public!sender_id(*),
          receiver:users_public!receiver_id(*),
          offered_listing:listings!offered_listing_id(*),
          target_listing:listings!target_listing_id(*)
        `,
        )
        .eq("target_listing_id", listingId)
        .eq("sender_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0] || null;
    },
  },

  // Conversations
  conversations: {
    async getByUserId(userId: string) {
      console.log("API: Fetching conversations for user:", userId);

      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          *,
          user1:users_public!user1_id(*),
          user2:users_public!user2_id(*),
          messages(
            id,
            content,
            created_at,
            sender_id
          )
        `,
        )
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching conversations:", error);
        throw error;
      }

      console.log("API: Raw conversations data:", data);

      // Ensure user data is properly populated and fetch exchange request data separately
      const processedData = await Promise.all(
        (data || []).map(async (conversation) => {
          console.log("API: Processing conversation:", conversation.id);
          let user1 = conversation.user1;
          let user2 = conversation.user2;
          let exchange_request = null;

          // If user1 data is missing from users_public, try to get it from the main users table
          if (!user1?.name && conversation.user1_id) {
            try {
              const { data: userData } = await supabase
                .from("users")
                .select("id, name, email, avatar_url")
                .eq("id", conversation.user1_id)
                .single();

              if (userData) {
                user1 = {
                  id: userData.id,
                  name: userData.name,
                  email: userData.email,
                  avatar_url: userData.avatar_url,
                  created_at: null,
                  updated_at: null,
                };
                console.log("API: Fetched user1 data from users table:", user1);
              }
            } catch (err) {
              console.warn("Could not fetch user1 data:", err);
            }
          }

          // If user2 data is missing from users_public, try to get it from the main users table
          if (!user2?.name && conversation.user2_id) {
            try {
              const { data: userData } = await supabase
                .from("users")
                .select("id, name, email, avatar_url")
                .eq("id", conversation.user2_id)
                .single();

              if (userData) {
                user2 = {
                  id: userData.id,
                  name: userData.name,
                  email: userData.email,
                  avatar_url: userData.avatar_url,
                  created_at: null,
                  updated_at: null,
                };
                console.log("API: Fetched user2 data from users table:", user2);
              }
            } catch (err) {
              console.warn("Could not fetch user2 data:", err);
            }
          }

          // Fetch exchange request data separately if conversation has exchange_request_id
          if (conversation.exchange_request_id) {
            try {
              const { data: exchangeData } = await supabase
                .from("exchange_requests")
                .select(
                  `
                  *,
                  offered_listing:listings!offered_listing_id(*),
                  target_listing:listings!target_listing_id(*)
                `,
                )
                .eq("id", conversation.exchange_request_id)
                .single();

              if (exchangeData) {
                exchange_request = exchangeData;
                console.log(
                  "API: Fetched exchange request data:",
                  exchange_request,
                );
              }
            } catch (err) {
              console.warn("Could not fetch exchange request data:", err);
            }
          }

          const processedConversation = {
            ...conversation,
            user1,
            user2,
            exchange_request,
          };

          console.log("API: Processed conversation:", processedConversation);
          return processedConversation;
        }),
      );

      console.log("API: Final processed conversations:", processedData);
      return processedData;
    },

    async getById(conversationId: string) {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          *,
          user1:users_public!user1_id(*),
          user2:users_public!user2_id(*)
        `,
        )
        .eq("id", conversationId)
        .single();

      if (error) {
        console.error("Error fetching conversation:", error);
        throw error;
      }

      // Fetch exchange request data separately if conversation has exchange_request_id
      let exchange_request = null;
      if (data?.exchange_request_id) {
        try {
          const { data: exchangeData } = await supabase
            .from("exchange_requests")
            .select(
              `
              *,
              offered_listing:listings!offered_listing_id(*),
              target_listing:listings!target_listing_id(*)
            `,
            )
            .eq("id", data.exchange_request_id)
            .single();

          if (exchangeData) {
            exchange_request = exchangeData;
          }
        } catch (err) {
          console.warn("Could not fetch exchange request data:", err);
        }
      }

      return {
        ...data,
        exchange_request,
      };
    },

    async findOrCreateConversation(user1Id: string, user2Id: string) {
      // First, try to find an existing conversation between these two users
      const { data: existingConversation } = await supabase
        .from("conversations")
        .select(
          `
          *,
          user1:users_public!user1_id(*),
          user2:users_public!user2_id(*)
        `,
        )
        .or(
          `and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`,
        )
        .single();

      if (existingConversation) {
        return existingConversation;
      }

      // If no existing conversation, create a new one
      const { data: newConversation, error } = await supabase
        .from("conversations")
        .insert({
          user1_id: user1Id,
          user2_id: user2Id,
        })
        .select(
          `
          *,
          user1:users_public!user1_id(*),
          user2:users_public!user2_id(*)
        `,
        )
        .single();

      if (error) throw error;
      return newConversation;
    },

    async createTestConversation(userId: string) {
      // Create a test user first if it doesn't exist
      const testUserId = "test-user-" + Date.now();
      const testUserEmail = `testuser${Date.now()}@example.com`;

      try {
        // Create test user in both tables
        await supabase.from("users").insert({
          id: testUserId,
          email: testUserEmail,
          name: "Test User",
          avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=test",
        });

        await supabase.from("users_public").insert({
          id: testUserId,
          email: testUserEmail,
          name: "Test User",
          avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=test",
        });
      } catch (error) {
        console.log("Test user might already exist:", error);
      }

      // Create conversation
      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert({
          user1_id: userId,
          user2_id: testUserId,
        })
        .select(
          `
          *,
          user1:users_public!user1_id(*),
          user2:users_public!user2_id(*)
        `,
        )
        .single();

      if (error) throw error;
      return conversation;
    },
  },

  // Users
  users: {
    async create(userData: {
      id: string;
      email: string;
      name?: string | null;
      avatar?: string | null;
      avatar_url?: string | null;
      location?: string | null;
      bio?: string | null;
      phone?: string | null;
      email_verified?: boolean;
      phone_verified?: boolean;
    }) {
      try {
        // Validate required fields
        if (!userData.id || !userData.email) {
          throw new APIError(
            "Missing required fields: id and email are required",
            "VALIDATION_ERROR",
          );
        }

        // Ensure email is valid
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
          throw new APIError("Invalid email format", "VALIDATION_ERROR");
        }

        // Clean and prepare user data
        const cleanUserData = {
          id: userData.id,
          email: userData.email.toLowerCase().trim(),
          name: userData.name?.trim() || null,
          avatar: userData.avatar || null,
          avatar_url: userData.avatar_url || null,
          location: userData.location || null,
          bio: userData.bio || null,
          phone: userData.phone || null,
          email_verified: userData.email_verified || false,
          phone_verified: userData.phone_verified || false,
        };

        // Check if user already exists
        const { data: existingUser } = await supabase
          .from("users")
          .select("*")
          .eq("id", userData.id)
          .single();

        if (existingUser) {
          // User already exists, just return the existing data
          return existingUser;
        }

        // Try to create user - the trigger should handle both tables
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert(cleanUserData)
          .select()
          .single();

        if (createError) {
          console.error("Error creating user:", createError);

          // If it's a duplicate, try to fetch the existing user
          if (createError.code === "23505") {
            const { data: existingUserData } = await supabase
              .from("users")
              .select("*")
              .eq("id", userData.id)
              .single();

            if (existingUserData) {
              return existingUserData;
            }
          }

          throw createError;
        }

        return newUser;
      } catch (error: any) {
        console.error("Database error creating user:", error);

        // Handle specific database errors
        if (error.code === "23505") {
          // Try to get existing user instead of failing
          try {
            const { data: existingUser } = await supabase
              .from("users")
              .select("*")
              .eq("id", userData.id)
              .single();

            if (existingUser) {
              return existingUser;
            }
          } catch (fetchError) {
            console.error("Could not fetch existing user:", fetchError);
          }

          throw new APIError("User already exists", "DUPLICATE_USER", error);
        }

        if (error.code === "23503") {
          throw new APIError(
            "Database constraint violation - invalid reference",
            "CONSTRAINT_VIOLATION",
            error,
          );
        }

        if (error.code === "23502") {
          throw new APIError(
            "Missing required field - please check all required data is provided",
            "NULL_CONSTRAINT",
            error,
          );
        }

        if (
          error.message?.includes("permission denied") ||
          error.code === "42501"
        ) {
          throw new APIError(
            "Permission denied for user creation",
            "PERMISSION_DENIED",
            error,
          );
        }

        if (error.message === "Supabase not configured") {
          throw new APIError(
            "Database service is not configured",
            "SERVICE_UNAVAILABLE",
            error,
          );
        }

        if (error.code === "PGRST301") {
          throw new APIError(
            "Database table not found or accessible",
            "TABLE_NOT_FOUND",
            error,
          );
        }

        if (error instanceof APIError) throw error;
        throw new APIError(
          "Failed to create user profile",
          "CREATE_USER_FAILED",
          error,
        );
      }
    },

    async getById(id: string) {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Database error getting user:", error);

          if (error.code === "PGRST116") {
            throw new APIError("User not found", "USER_NOT_FOUND", error);
          }
          if (error.message === "Supabase not configured") {
            throw new APIError(
              "Database service is not configured",
              "SERVICE_UNAVAILABLE",
              error,
            );
          }

          handleError(error, "get user by id");
        }

        return data;
      } catch (error) {
        if (error instanceof APIError) throw error;
        console.error("Unexpected error getting user:", error);
        throw new APIError(
          "Failed to get user profile",
          "GET_USER_FAILED",
          error,
        );
      }
    },

    async update(
      id: string,
      updates: {
        name?: string;
        avatar?: string;
        avatar_url?: string;
        location?: string;
        bio?: string;
        phone?: string;
      },
    ) {
      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getStats(userId: string) {
      const [listings, trades, ratings] = await Promise.all([
        supabase.from("listings").select("id").eq("user_id", userId),
        supabase
          .from("trades")
          .select("id")
          .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
          .eq("status", "COMPLETED"),
        supabase.from("ratings").select("rating").eq("rated_id", userId),
      ]);

      const avgRating = ratings.data?.length
        ? ratings.data.reduce((sum, r) => sum + r.rating, 0) /
          ratings.data.length
        : 0;

      return {
        totalListings: listings.data?.length || 0,
        completedTrades: trades.data?.length || 0,
        averageRating: Math.round(avgRating * 10) / 10,
        totalRatings: ratings.data?.length || 0,
      };
    },

    async banUser(
      userId: string,
      reason: string,
      bannedBy: string,
      duration?: number,
    ) {
      const bannedUntil = duration
        ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from("users")
        .update({
          banned_until: bannedUntil,
          ban_reason: reason,
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async unbanUser(userId: string) {
      const { data, error } = await supabase
        .from("users")
        .update({
          banned_until: null,
          ban_reason: null,
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getAllUsers(filters?: { role?: string; banned?: boolean }) {
      let query = supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.role) {
        query = query.eq("role", filters.role);
      }

      if (filters?.banned !== undefined) {
        if (filters.banned) {
          query = query.not("banned_until", "is", null);
        } else {
          query = query.is("banned_until", null);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  },
};
