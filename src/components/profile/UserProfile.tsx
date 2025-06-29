import { useState, useEffect } from "react";
import EditProfile from "./EditProfile";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  MapPin,
  Calendar,
  MessageCircle,
  Shield,
  Award,
  TrendingUp,
  Heart,
  Settings,
  Edit,
  Flag,
  UserX,
  CheckCircle,
  AlertTriangle,
  Package,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isOwnProfile = !id || id === currentUser?.id;
  const [activeTab, setActiveTab] = useState("listings");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  const [replyingToReview, setReplyingToReview] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user data
  const {
    data: user,
    isLoading: userLoading,
    error: userError,
  } = useQuery({
    queryKey: ["user", id || currentUser?.id],
    queryFn: async () => {
      const userId = id || currentUser!.id;
      try {
        return await api.users.getById(userId);
      } catch (error) {
        // If user doesn't exist in database, create them
        if (currentUser && userId === currentUser.id) {
          const newUser = await api.users.create({
            id: currentUser.id,
            email: currentUser.email!,
            name: currentUser.user_metadata?.name || null,
            avatar_url: currentUser.user_metadata?.avatar_url || null,
            location: null,
            bio: null,
            phone: null,
            email_verified: currentUser.email_confirmed_at ? true : false,
            phone_verified: false,
          });
          return newUser;
        }
        throw error;
      }
    },
    enabled: !!(id || currentUser?.id),
    retry: 1,
  });

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ["user-stats", id || currentUser?.id],
    queryFn: () => api.users.getStats(id || currentUser!.id),
    enabled: !!(id || currentUser?.id),
  });

  // Fetch user's listings
  const { data: userListings = [] } = useQuery({
    queryKey: ["user-listings", id || currentUser?.id],
    queryFn: () => api.listings.getByUserId(id || currentUser!.id),
    enabled: !!(id || currentUser?.id),
  });

  // Fetch user's ratings/reviews (legacy)
  const { data: userRatings = [] } = useQuery({
    queryKey: ["user-ratings", id || currentUser?.id],
    queryFn: () => api.ratings.getByUserId(id || currentUser!.id),
    enabled: !!(id || currentUser?.id),
  });

  // Fetch user badges
  const { data: userBadges = [] } = useQuery({
    queryKey: ["user-badges", id || currentUser?.id],
    queryFn: () => api.userStats.calculateBadges(id || currentUser!.id),
    enabled: !!(id || currentUser?.id),
  });

  // Fetch eco stats
  const { data: ecoStats } = useQuery({
    queryKey: ["eco-stats", id || currentUser?.id],
    queryFn: () => api.userStats.getEcoStats(id || currentUser!.id),
    enabled: !!(id || currentUser?.id),
  });

  // Fetch user reviews
  const { data: userReviews = [] } = useQuery({
    queryKey: ["user-reviews", id || currentUser?.id],
    queryFn: () => api.reviews.getByUserId(id || currentUser!.id),
    enabled: !!(id || currentUser?.id),
  });

  const displayUser = user;
  const displayStats = userStats || {
    totalListings: 0,
    completedTrades: 0,
    averageRating: 0,
    totalRatings: 0,
  };
  const displayListings = userListings;
  const displayReviews = userReviews.length > 0 ? userReviews : userRatings;

  // Report user mutation
  const reportUserMutation = useMutation({
    mutationFn: ({
      reportedUserId,
      reason,
    }: {
      reportedUserId: string;
      reason: string;
    }) => api.moderation.reportUser(currentUser!.id, reportedUserId, reason),
    onSuccess: () => {
      toast({
        title: "User reported",
        description: "Thank you for your report. We'll review it shortly.",
      });
      setShowReportDialog(false);
      setReportReason("");
      setReportDetails("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: (blockedUserId: string) =>
      api.moderation.blockUser(currentUser!.id, blockedUserId),
    onSuccess: () => {
      toast({
        title: "User blocked",
        description: "You will no longer see content from this user.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to block user. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: (reviewData: { rating: number; comment: string }) => {
      if (!currentUser || !displayUser) {
        throw new Error("User not authenticated or profile not found");
      }
      return api.reviews.create({
        reviewerId: currentUser.id,
        reviewedUserId: displayUser.id,
        rating: reviewData.rating,
        comment: reviewData.comment,
      });
    },
    onSuccess: () => {
      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });
      setShowReviewDialog(false);
      setNewReview({ rating: 5, comment: "" });
      queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (error: any) => {
      console.error("Review submission error:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reply to review mutation
  const replyMutation = useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      api.reviews.reply(reviewId, currentUser!.id, reply),
    onSuccess: () => {
      toast({
        title: "Reply posted",
        description: "Your reply has been posted.",
      });
      setReplyingToReview(null);
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post reply. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleReportUser = () => {
    if (!reportReason) {
      toast({
        title: "Please select a reason",
        description: "You must select a reason for reporting this user.",
        variant: "destructive",
      });
      return;
    }

    const fullReason = reportDetails
      ? `${reportReason}: ${reportDetails}`
      : reportReason;
    if (displayUser?.id) {
      reportUserMutation.mutate({
        reportedUserId: displayUser.id,
        reason: fullReason,
      });
    }
  };

  const handleBlockUser = () => {
    if (
      window.confirm(
        "Are you sure you want to block this user? You won't see their content anymore.",
      )
    ) {
      if (displayUser?.id) {
        blockUserMutation.mutate(displayUser.id);
      }
    }
  };

  const handleSubmitReview = () => {
    if (!newReview.comment.trim()) {
      toast({
        title: "Please add a comment",
        description: "Reviews must include a written comment.",
        variant: "destructive",
      });
      return;
    }

    submitReviewMutation.mutate(newReview);
  };

  if (userLoading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tabadol-purple"></div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
              {/* Avatar and Basic Info */}
              <div className="flex items-center space-x-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage
                    src={displayUser?.avatar_url || displayUser?.avatar}
                  />
                  <AvatarFallback className="text-2xl">
                    {displayUser?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-3xl font-bold font-blinker">
                      {displayUser?.name || "Unknown User"}
                    </h1>
                    {isOwnProfile && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingProfile(true)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-gray-600 mb-3">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {displayUser?.location || "Unknown Location"}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Joined{" "}
                      {displayUser?.created_at
                        ? new Date(displayUser.created_at).toLocaleDateString()
                        : displayUser?.joinedDate
                          ? new Date(
                              displayUser.joinedDate,
                            ).toLocaleDateString()
                          : "Unknown"}
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">
                        {displayStats.averageRating || displayUser?.rating || 0}
                      </span>
                      <span className="text-gray-600">
                        (
                        {displayStats.totalRatings ||
                          displayUser?.totalTrades ||
                          0}{" "}
                        trades)
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {displayStats.completedTrades ||
                        displayUser?.completedTrades ||
                        0}{" "}
                      completed
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {!isOwnProfile && (
                <div className="flex flex-col space-y-3 md:ml-auto">
                  <Button
                    className="btn-gradient"
                    onClick={async () => {
                      if (!currentUser) {
                        toast({
                          title: "Please sign in",
                          description:
                            "You need to be signed in to send messages.",
                          variant: "destructive",
                        });
                        return;
                      }

                      if (!displayUser?.id) {
                        toast({
                          title: "Error",
                          description: "User profile not found.",
                          variant: "destructive",
                        });
                        return;
                      }

                      try {
                        // Find or create conversation between current user and profile user
                        const conversation =
                          await api.conversations.findOrCreateConversation(
                            currentUser.id,
                            displayUser.id,
                          );

                        // Navigate to inbox with the conversation selected
                        navigate(`/inbox?conversation=${conversation.id}`);
                      } catch (error) {
                        console.error("Error creating conversation:", error);
                        toast({
                          title: "Error",
                          description:
                            "Failed to start conversation. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                  <div className="flex space-x-2">
                    <Dialog
                      open={showReviewDialog}
                      onOpenChange={setShowReviewDialog}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Star className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Leave a Review</DialogTitle>
                          <DialogDescription>
                            Share your experience trading with{" "}
                            {displayUser?.name || "this user"}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Rating
                            </label>
                            <div className="flex space-x-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={() =>
                                    setNewReview((prev) => ({
                                      ...prev,
                                      rating: star,
                                    }))
                                  }
                                  className={`w-8 h-8 ${star <= newReview.rating ? "text-yellow-400" : "text-gray-300"}`}
                                >
                                  <Star className="w-full h-full fill-current" />
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Comment
                            </label>
                            <Textarea
                              placeholder="Share your experience..."
                              value={newReview.comment}
                              onChange={(e) =>
                                setNewReview((prev) => ({
                                  ...prev,
                                  comment: e.target.value,
                                }))
                              }
                              rows={4}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setShowReviewDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSubmitReview}
                            disabled={
                              submitReviewMutation.isPending ||
                              !newReview.comment.trim()
                            }
                          >
                            {submitReviewMutation.isPending
                              ? "Submitting..."
                              : "Submit Review"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog
                      open={showReportDialog}
                      onOpenChange={setShowReportDialog}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Flag className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Report User</DialogTitle>
                          <DialogDescription>
                            Help us keep the community safe by reporting
                            inappropriate behavior
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Reason
                            </label>
                            <Select
                              value={reportReason}
                              onValueChange={setReportReason}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a reason" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="spam">
                                  Spam or fake listings
                                </SelectItem>
                                <SelectItem value="harassment">
                                  Harassment or abuse
                                </SelectItem>
                                <SelectItem value="fraud">
                                  Fraudulent activity
                                </SelectItem>
                                <SelectItem value="inappropriate">
                                  Inappropriate content
                                </SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Additional Details
                            </label>
                            <Textarea
                              placeholder="Please provide more details..."
                              value={reportDetails}
                              onChange={(e) => setReportDetails(e.target.value)}
                              rows={3}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setShowReportDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleReportUser}
                            disabled={reportUserMutation.isPending}
                            variant="destructive"
                          >
                            Submit Report
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBlockUser}
                      disabled={blockUserMutation.isPending}
                    >
                      <UserX className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              {isOwnProfile && (
                <div className="md:ml-auto">
                  <Button variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </div>
              )}
            </div>

            {/* Bio */}
            {displayUser?.bio && (
              <div className="mt-6">
                <p className="text-gray-700 leading-relaxed">
                  {displayUser.bio}
                </p>
              </div>
            )}

            {/* Badges */}
            {userBadges.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-6">
                {userBadges.map((badge, index) => {
                  const Icon = badge.icon;
                  return (
                    <div
                      key={index}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-full bg-${badge.color}-100 text-${badge.color}-800`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{badge.name}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Eco Impact */}
            {ecoStats && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">
                  Environmental Impact
                </h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-green-700">
                      {ecoStats.itemsSaved}
                    </div>
                    <div className="text-xs text-green-600">Items Saved</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-700">
                      {ecoStats.weightDiverted}
                    </div>
                    <div className="text-xs text-green-600">Waste Diverted</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-700">
                      {ecoStats.co2Saved}
                    </div>
                    <div className="text-xs text-green-600">CO2 Saved</div>
                  </div>
                </div>
              </div>
            )}

            {/* Verifications */}
            {displayUser && (
              <div className="flex items-center space-x-6 mt-6 pt-6 border-t">
                <div className="text-sm">
                  <span className="text-gray-600">Verifications: </span>
                  <div className="flex items-center space-x-4 mt-1">
                    <span
                      className={`flex items-center ${
                        displayUser?.email_verified
                          ? "text-green-600"
                          : "text-gray-400"
                      }`}
                    >
                      ✓ Email{" "}
                      {displayUser?.email_verified ? "verified" : "unverified"}
                    </span>
                    <span
                      className={`flex items-center ${
                        displayUser?.phone_verified
                          ? "text-green-600"
                          : "text-gray-400"
                      }`}
                    >
                      ✓ Phone{" "}
                      {displayUser?.phone_verified ? "verified" : "unverified"}
                    </span>
                    <span
                      className={`flex items-center ${
                        displayUser?.identity_verified
                          ? "text-green-600"
                          : "text-gray-400"
                      }`}
                    >
                      ✓ Identity{" "}
                      {displayUser?.identity_verified
                        ? "verified"
                        : "unverified"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-tabadol-purple mb-1">
                {displayStats.totalListings}
              </div>
              <div className="text-sm text-gray-600">Total Listings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-tabadol-purple mb-1">
                {displayStats.activeListings || displayStats.totalListings}
              </div>
              <div className="text-sm text-gray-600">Active Listings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-tabadol-purple mb-1">
                {displayStats.completedTrades}
              </div>
              <div className="text-sm text-gray-600">Completed Trades</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-tabadol-purple mb-1">
                {displayStats.averageRating}
              </div>
              <div className="text-sm text-gray-600">Average Rating</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-tabadol-purple mb-1">
                {displayUser?.followers_count || 0}
              </div>
              <div className="text-sm text-gray-600">Followers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-tabadol-purple mb-1">
                {displayUser?.reviews_count || userReviews.length}
              </div>
              <div className="text-sm text-gray-600">Reviews</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3 lg:w-96">
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-6">
            {displayListings.length > 0 ? (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {displayListings.map((listing) => (
                  <Card key={listing.id} className="card-hover">
                    <Link to={`/listing/${listing.id}`}>
                      <div className="relative overflow-hidden rounded-t-lg">
                        <img
                          src={
                            listing.images?.[0] ||
                            "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80"
                          }
                          alt={listing.title}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src =
                              "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80";
                          }}
                        />
                        <Badge className="absolute top-3 left-3 bg-white/90 text-gray-800">
                          {listing.category}
                        </Badge>
                        <Badge
                          className={`absolute top-3 right-3 ${
                            listing.status === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {listing.status === "ACTIVE" ? "Active" : "Completed"}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2 font-blinker">
                          {listing.title}
                        </h3>
                        <div className="text-sm text-gray-600">
                          Posted{" "}
                          {new Date(listing.created_at).toLocaleDateString()}
                        </div>
                        {listing.status === "ACTIVE" && (
                          <div className="flex justify-between text-sm text-gray-500 mt-2">
                            <span>{listing.views || 0} views</span>
                            <span>
                              {listing._count?.messages || 0} messages
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2 font-blinker">
                    No Listings Yet
                  </h3>
                  <p className="text-gray-600">
                    {isOwnProfile
                      ? "You haven't created any listings yet"
                      : "This user hasn't created any listings yet"}
                  </p>
                  {isOwnProfile && (
                    <Button className="mt-4" asChild>
                      <Link to="/create-listing">
                        Create Your First Listing
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            {displayReviews.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2 font-blinker">
                    No Reviews Yet
                  </h3>
                  <p className="text-gray-600">
                    {isOwnProfile
                      ? "You haven't received any reviews yet"
                      : "This user hasn't received any reviews yet"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              displayReviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage
                          src={
                            review.reviewer?.avatar_url ||
                            review.reviewer?.avatar ||
                            review.rater?.avatar_url ||
                            review.rater?.avatar
                          }
                        />
                        <AvatarFallback>
                          {(
                            review.reviewer?.name ||
                            review.rater?.name ||
                            "U"
                          ).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">
                              {review.reviewer?.name ||
                                review.rater?.name ||
                                "Anonymous"}
                            </h4>
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {review.created_at
                              ? new Date(review.created_at).toLocaleDateString()
                              : new Date(review.date).toLocaleDateString()}
                          </div>
                        </div>
                        <p className="text-gray-700 mb-2">{review.comment}</p>
                        <div className="text-sm text-gray-500 mb-3">
                          Trade:{" "}
                          {review.trade?.listing?.title ||
                            review.tradeItem ||
                            "General Review"}
                        </div>

                        {/* Reply Section */}
                        {review.replies && review.replies.length > 0 && (
                          <div className="mt-4 pl-4 border-l-2 border-gray-200">
                            {review.replies.map((reply: any) => (
                              <div key={reply.id} className="mb-3">
                                <div className="flex items-center space-x-2 mb-1">
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage
                                      src={
                                        reply.user?.avatar_url ||
                                        reply.user?.avatar
                                      }
                                    />
                                    <AvatarFallback className="text-xs">
                                      {reply.user?.name?.charAt(0) || "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-medium">
                                    {reply.user?.name || "Anonymous"}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(
                                      reply.created_at,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-white">
                                  {reply.reply}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Input */}
                        {isOwnProfile && (
                          <div className="mt-3">
                            {replyingToReview === review.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  placeholder="Write a reply..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  rows={2}
                                />
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (replyText.trim()) {
                                        replyMutation.mutate({
                                          reviewId: review.id,
                                          reply: replyText.trim(),
                                        });
                                      }
                                    }}
                                    disabled={
                                      replyMutation.isPending ||
                                      !replyText.trim()
                                    }
                                  >
                                    Post Reply
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setReplyingToReview(null);
                                      setReplyText("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setReplyingToReview(review.id)}
                              >
                                Reply
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardContent className="p-12 text-center">
                <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 font-blinker">
                  Activity Timeline
                </h3>
                <p className="text-gray-600">
                  Recent activity and trade history will appear here
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Profile Modal */}
        <EditProfile
          isOpen={isEditingProfile}
          onClose={() => setIsEditingProfile(false)}
        />
      </div>
    </div>
  );
}
