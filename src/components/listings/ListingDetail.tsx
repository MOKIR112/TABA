import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import {
  Heart,
  MapPin,
  Calendar,
  Star,
  MessageCircle,
  Share2,
  Flag,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  Send,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [selectedOfferedListing, setSelectedOfferedListing] =
    useState<string>("");
  const [tradeMessage, setTradeMessage] = useState("");

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch listing data
  const {
    data: listing,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => api.listings.getById(id!),
    enabled: !!id,
  });

  // Fetch user's listings for trade proposals
  const { data: userListings = [] } = useQuery({
    queryKey: ["userListings", user?.id],
    queryFn: () => api.listings.getByUserId(user!.id),
    enabled: !!user?.id && showTradeModal,
  });

  // Increment view count
  useEffect(() => {
    if (listing && id) {
      api.listings.incrementViews(id);
    }
  }, [listing, id]);

  // Check if favorited
  useEffect(() => {
    if (user && listing) {
      api.favorites.getByUserId(user.id).then((favorites: any[]) => {
        setIsFavorited(favorites.some((f) => f.listing_id === listing.id));
      });
    }
  }, [user, listing]);

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !listing) throw new Error("User or listing not found");
      if (isFavorited) {
        await api.favorites.remove(user.id, listing.id);
      } else {
        await api.favorites.add(user.id, listing.id);
      }
    },
    onSuccess: () => {
      setIsFavorited((prev) => !prev);
      toast({
        title: isFavorited ? "Removed from favorites" : "Added to favorites",
        description: isFavorited
          ? "The listing has been removed from your favorites."
          : "The listing has been saved to your favorites.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggleFavorite = () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to save favorites.",
        variant: "destructive",
      });
      return;
    }
    toggleFavoriteMutation.mutate();
  };

  const handleSendMessage = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to send messages.",
        variant: "destructive",
      });
      return;
    }

    if (!listing?.user?.id) {
      toast({
        title: "Error",
        description: "Listing owner not found.",
        variant: "destructive",
      });
      return;
    }

    if (user.id === listing.user.id) {
      toast({
        title: "Cannot message yourself",
        description: "You cannot send a message to your own listing.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Checking for existing conversation between:", {
        currentUser: user.id,
        listingOwner: listing.user.id,
        listingTitle: listing.title,
      });

      // Check for existing conversation first
      const existingConversations = await api.conversations.getByUserId(
        user.id,
      );
      const existingConversation = existingConversations.find(
        (conv: any) =>
          (conv.user1_id === user.id && conv.user2_id === listing.user.id) ||
          (conv.user1_id === listing.user.id && conv.user2_id === user.id),
      );

      let conversation;
      if (existingConversation) {
        console.log("Found existing conversation:", existingConversation.id);
        conversation = existingConversation;
      } else {
        console.log("Creating new conversation...");
        // Create new conversation with user1_id as current user, user2_id as listing owner
        conversation = await api.conversations.findOrCreateConversation(
          user.id,
          listing.user.id,
        );
        console.log("New conversation created:", conversation.id);
      }

      // Navigate directly to inbox with the conversation selected
      navigate(`/inbox?conversation=${conversation.id}`);

      toast({
        title: "Chat opened",
        description: `You can now chat with ${listing.user.name || "the listing owner"}`,
      });
    } catch (error: any) {
      console.error("Error handling conversation:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to start conversation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleProposeTradeClick = () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to propose trades.",
        variant: "destructive",
      });
      return;
    }

    if (user.id === listing?.user?.id) {
      toast({
        title: "Cannot trade with yourself",
        description: "You cannot propose a trade for your own listing.",
        variant: "destructive",
      });
      return;
    }

    setShowTradeModal(true);
  };

  // Trade proposal mutation
  const tradeProposalMutation = useMutation({
    mutationFn: async () => {
      if (!user || !listing || !selectedOfferedListing) {
        throw new Error("Missing required data");
      }

      return api.tradeProposals.create({
        senderId: user.id,
        receiverId: listing.user.id,
        targetListingId: listing.id,
        offeredListingId: selectedOfferedListing,
        message: tradeMessage.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: "Trade Proposal Sent! 🎉",
        description:
          "Your trade proposal has been sent. You'll be notified when they respond.",
      });
      setShowTradeModal(false);
      setSelectedOfferedListing("");
      setTradeMessage("");
      queryClient.invalidateQueries({ queryKey: ["tradeProposals"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to send trade proposal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitTradeProposal = () => {
    if (!selectedOfferedListing) {
      toast({
        title: "Please select an item",
        description: "You need to select an item to offer in exchange.",
        variant: "destructive",
      });
      return;
    }

    tradeProposalMutation.mutate();
  };

  const getActionButtonsContent = () => {
    if (!user || user.id === listing?.user?.id) {
      return null;
    }

    return (
      <div className="space-y-3">
        <Button
          className="w-full btn-gradient"
          onClick={handleProposeTradeClick}
        >
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Propose Trade
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleSendMessage}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Send Message
        </Button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tabadol-purple"></div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-xl font-semibold mb-2">Listing not found</h3>
            <p className="text-gray-600 mb-6">
              The listing you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate("/listings")}>
              Browse Listings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Images logic
  const images: string[] = (Array.isArray(listing.images) &&
  listing.images.length > 0
    ? listing.images
    : listing.image
      ? [listing.image]
      : []) || [
    "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80",
  ];

  // Related listings (replace with real data if available)
  const relatedListings = [
    {
      id: 2,
      title: "DSLR Camera Bundle",
      image:
        "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=300&q=80",
      location: "Oakland, CA",
    },
    {
      id: 3,
      title: "Photography Lighting Kit",
      image:
        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&q=80",
      location: "San Jose, CA",
    },
  ];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" className="mb-6" asChild>
          <Link to="/listings">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Listings
          </Link>
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <Card>
              <CardContent className="p-0">
                <div className="relative">
                  <img
                    src={images[currentImageIndex]}
                    alt={listing.title}
                    className="w-full h-96 object-cover rounded-t-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src =
                        "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80";
                    }}
                  />
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                        onClick={nextImage}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          index === currentImageIndex
                            ? "bg-white"
                            : "bg-white/50"
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                      />
                    ))}
                  </div>
                </div>
                {images.length > 1 && (
                  <div className="p-4 flex space-x-2 overflow-x-auto">
                    {images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                          index === currentImageIndex
                            ? "border-tabadol-purple"
                            : "border-gray-200"
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${listing.title} ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src =
                              "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80";
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Listing Details */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-2 font-blinker">
                      {listing.title}
                    </h1>
                    <div className="flex items-center space-x-4 text-gray-600">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {listing.location}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Posted{" "}
                        {listing.created_at
                          ? new Date(listing.created_at).toLocaleDateString()
                          : new Date(listing.postedDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleFavorite}
                      className={isFavorited ? "text-red-500" : ""}
                      disabled={toggleFavoriteMutation.isPending}
                    >
                      <Heart
                        className={`w-4 h-4 ${isFavorited ? "fill-current" : ""}`}
                      />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Flag className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge>{listing.category}</Badge>
                  <Badge variant="secondary">
                    Condition: {listing.condition}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2 font-blinker">
                      Description
                    </h3>
                    <p className="text-white leading-relaxed">
                      {listing.description}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold text-lg mb-3 font-blinker">
                      Looking for in exchange:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(listing.wanted_items || listing.wantedItems || []).map(
                        (item: string, index: number) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-sm"
                          >
                            {item}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={listing.user?.avatar} />
                    <AvatarFallback>
                      {listing.user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg font-blinker">
                      {listing.user?.name || "Unknown User"}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{listing.user?.rating || "N/A"}</span>
                      <span>•</span>
                      <span>{listing.user?.totalTrades || 0} trades</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <p>
                    Joined{" "}
                    {listing.user?.created_at
                      ? new Date(listing.user.created_at).toLocaleDateString()
                      : "Unknown"}
                  </p>
                  <div className="flex space-x-4">
                    {listing.user?.email_verified && (
                      <span className="text-green-600">✓ Email verified</span>
                    )}
                    {listing.user?.phone_verified && (
                      <span className="text-green-600">✓ Phone verified</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {getActionButtonsContent()}
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/profile/${listing.user?.id}`}>
                      View Profile
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Related Listings */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 font-blinker">
                  Similar Listings
                </h3>
                <div className="space-y-4">
                  {relatedListings.map((item) => (
                    <Link
                      key={item.id}
                      to={`/listing/${item.id}`}
                      className="flex space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">
                          {item.title}
                        </h4>
                        <p className="text-xs text-gray-600 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {item.location}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Trade Proposal Modal */}
        <Dialog open={showTradeModal} onOpenChange={setShowTradeModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
                <span>Propose a Trade</span>
              </DialogTitle>
              <DialogDescription>
                Select one of your items to trade for "{listing?.title}"
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Trade Preview */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-center space-x-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600">You offer</div>
                    <div className="font-medium text-blue-600">
                      {selectedOfferedListing
                        ? userListings.find(
                            (l: any) => l.id === selectedOfferedListing,
                          )?.title
                        : "Select an item"}
                    </div>
                  </div>
                  <ArrowRightLeft className="w-6 h-6 text-blue-500" />
                  <div className="text-center">
                    <div className="text-sm text-gray-600">You get</div>
                    <div className="font-medium text-blue-600">
                      {listing?.title}
                    </div>
                  </div>
                </div>
              </div>

              {/* Item Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Select your item to offer:
                </label>
                <Select
                  value={selectedOfferedListing}
                  onValueChange={setSelectedOfferedListing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an item from your listings" />
                  </SelectTrigger>
                  <SelectContent>
                    {userListings
                      .filter(
                        (userListing: any) =>
                          userListing.id !== listing?.id &&
                          userListing.status === "ACTIVE",
                      )
                      .map((userListing: any) => (
                        <SelectItem key={userListing.id} value={userListing.id}>
                          <div className="flex items-center space-x-2">
                            <span>{userListing.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {userListing.category}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {userListings.filter((l: any) => l.status === "ACTIVE")
                  .length === 0 && (
                  <p className="text-sm text-gray-500">
                    You don't have any active listings to trade.
                    <Link
                      to="/create-listing"
                      className="text-primary hover:underline"
                    >
                      Create a listing first
                    </Link>
                  </p>
                )}
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Message (optional):
                </label>
                <Textarea
                  placeholder="Add a personal message to your trade proposal..."
                  value={tradeMessage}
                  onChange={(e) => setTradeMessage(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              {/* Trade Benefits */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center space-x-2 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Secure exchange</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Direct communication</span>
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
                onClick={() => setShowTradeModal(false)}
                disabled={tradeProposalMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitTradeProposal}
                disabled={
                  !selectedOfferedListing || tradeProposalMutation.isPending
                }
                className="btn-gradient flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>
                  {tradeProposalMutation.isPending
                    ? "Sending..."
                    : "Send Proposal"}
                </span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
