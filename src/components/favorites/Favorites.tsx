import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Heart,
  Search,
  MapPin,
  Calendar,
  MessageCircle,
  Filter,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

export default function Favorites() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const categories = [
    "All Categories",
    "Electronics",
    "Furniture",
    "Clothing",
    "Books",
    "Sports",
    "Music",
    "Art",
  ];

  // Fetch user's favorites
  const {
    data: favorites = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        return await api.favorites.getByUserId(user.id);
      } catch (error) {
        console.error("Error fetching favorites:", error);
        return [];
      }
    },
    enabled: !!user,
    retry: 1,
  });

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: (listingId: string) =>
      api.favorites.remove(user!.id, listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast({
        title: "Removed from favorites",
        description: "The listing has been removed from your favorites.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove from favorites. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRemoveFavorite = (listingId: string) => {
    removeFavoriteMutation.mutate(listingId);
  };

  // Filter favorites based on search and category
  const filteredFavorites = favorites.filter((favorite) => {
    const listing = favorite.listing;
    if (!listing) return false;

    const matchesSearch =
      !searchQuery ||
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" ||
      listing.category.toLowerCase() === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 font-blinker">
            My Favorites
          </h1>
          <p className="text-xl text-muted-foreground">
            Items you've saved for later
          </p>
        </div>

        {/* Enhanced Filters */}
        <div className="bg-card/90 backdrop-blur-sm rounded-3xl shadow-premium border-2 border-primary/20 p-8 mb-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary" />
                <Input
                  placeholder="Search your favorites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 text-lg font-medium bg-background/80 border-2 border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl shadow-soft"
                />
              </div>
            </div>

            {/* Category Filter */}
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-full lg:w-56 h-14 text-lg font-medium bg-background/80 border-2 border-primary/30 focus:border-primary rounded-2xl shadow-soft">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-md border-2 border-primary/20 rounded-2xl shadow-premium">
                {categories.map((category, index) => (
                  <SelectItem
                    key={index}
                    value={index === 0 ? "all" : category.toLowerCase()}
                    className="text-base font-medium hover:bg-primary/10 focus:bg-primary/10"
                  >
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full lg:w-56 h-14 text-lg font-medium bg-background/80 border-2 border-primary/30 focus:border-primary rounded-2xl shadow-soft">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-md border-2 border-primary/20 rounded-2xl shadow-premium">
                <SelectItem
                  value="recent"
                  className="text-base font-medium hover:bg-primary/10 focus:bg-primary/10"
                >
                  Recently Added
                </SelectItem>
                <SelectItem
                  value="oldest"
                  className="text-base font-medium hover:bg-primary/10 focus:bg-primary/10"
                >
                  Oldest First
                </SelectItem>
                <SelectItem
                  value="title"
                  className="text-base font-medium hover:bg-primary/10 focus:bg-primary/10"
                >
                  Title A-Z
                </SelectItem>
                <SelectItem
                  value="location"
                  className="text-base font-medium hover:bg-primary/10 focus:bg-primary/10"
                >
                  Location
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tabadol-purple"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-red-600 mb-4">Failed to load favorites</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Favorites Grid */}
        {!isLoading &&
          !error &&
          (filteredFavorites.length > 0 ? (
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredFavorites.map((favorite) => {
                const listing = favorite.listing;
                if (!listing) return null;

                return (
                  <Card
                    key={listing.id}
                    className="group cursor-pointer transition-all duration-500 hover:shadow-premium hover:-translate-y-2 rounded-3xl overflow-hidden border-2 border-primary/10 hover:border-primary/30 bg-card/90 backdrop-blur-sm"
                  >
                    <Link to={`/listing/${listing.id}`}>
                      <div className="relative overflow-hidden aspect-[4/3]">
                        <img
                          src={
                            (Array.isArray(listing.images) &&
                            listing.images.length > 0
                              ? listing.images[0]
                              : listing.image) ||
                            "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&q=80"
                          }
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src =
                              "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&q=80";
                          }}
                        />

                        {/* Enhanced Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />

                        {/* Status Badge */}
                        <div className="absolute top-4 left-4">
                          <Badge
                            className={`font-semibold rounded-full px-3 py-1 shadow-lg ${
                              listing.status === "ACTIVE"
                                ? "bg-gradient-success text-white"
                                : "bg-gradient-danger text-white"
                            }`}
                          >
                            {listing.status === "ACTIVE"
                              ? "Available"
                              : "Traded"}
                          </Badge>
                        </div>

                        {/* Category Badge */}
                        <div className="absolute top-4 right-4">
                          <Badge className="bg-white/95 text-gray-800 font-medium rounded-full px-3 py-1 shadow-lg">
                            {listing.category}
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-6">
                        <div className="mb-4">
                          <h3 className="font-bold text-xl mb-2 font-blinker line-clamp-1 group-hover:text-primary transition-colors">
                            {listing.title}
                          </h3>
                          <p className="text-muted-foreground mb-3 line-clamp-2 text-base leading-relaxed">
                            {listing.description}
                          </p>
                        </div>

                        <div className="flex items-center text-sm text-muted-foreground mb-4">
                          <MapPin className="w-4 h-4 mr-2" />
                          {listing.location}
                        </div>

                        {/* Wanted Items */}
                        {(() => {
                          const validWantedItems = (
                            listing.wanted_items || []
                          ).filter((item) => {
                            return (
                              item !== null &&
                              item !== undefined &&
                              typeof item === "string" &&
                              item.length > 0 &&
                              item.trim().length > 0
                            );
                          });

                          if (validWantedItems.length === 0) return null;

                          return (
                            <div className="mb-4">
                              <p className="text-sm font-semibold text-foreground mb-2">
                                Looking for:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {validWantedItems
                                  .slice(0, 3)
                                  .map((item, index) => (
                                    <Badge
                                      key={index}
                                      variant="secondary"
                                      className="text-xs rounded-full px-3 py-1 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                                    >
                                      {item}
                                    </Badge>
                                  ))}
                                {validWantedItems.length > 3 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs rounded-full px-3 py-1 bg-muted"
                                  >
                                    +{validWantedItems.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* User Info & Date */}
                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-tabadol rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-sm">
                                {(listing.user?.name || "U")
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-semibold">
                                {listing.user?.name || "Unknown"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 mr-1" />
                            {favorite.created_at
                              ? new Date(
                                  favorite.created_at,
                                ).toLocaleDateString()
                              : "Recently"}
                          </div>
                        </div>
                      </CardContent>
                    </Link>

                    {/* Remove Favorite Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-4 right-16 bg-white/90 hover:bg-white rounded-full w-10 h-10 p-0 opacity-0 group-hover:opacity-100 transition-all duration-500 shadow-lg hover:scale-110"
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemoveFavorite(listing.id);
                      }}
                      disabled={removeFavoriteMutation.isPending}
                    >
                      <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                    </Button>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-card/50 to-card/80 backdrop-blur-sm">
              <CardContent className="p-16 text-center">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Heart className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-3xl font-bold mb-4 font-blinker gradient-text">
                  No favorites yet
                </h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg leading-relaxed">
                  Start browsing listings and save items you're interested in
                  trading for
                </p>
                <Button
                  className="btn-gradient rounded-full px-8 py-4 text-lg font-semibold"
                  asChild
                >
                  <Link to="/listings">Browse Listings</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
