import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Heart, MapPin, Grid3X3, List, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";

export default function ListingsPage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch categories from API
  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.categories.getAll();
      return [
        { id: "all", name: t("common.allCategories") },
        ...response,
      ];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Simple debounce for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch listings from API
  const {
    data: listings = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["listings", debouncedSearch, selectedCategory, sortBy],
    queryFn: async () => {
      return api.listings.getAll({
        search: debouncedSearch || undefined,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        sortBy: sortBy,
        limit: 24,
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleToggleFavorite = async (listingId: string) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to save favorites.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if already favorited
      const favorites = await api.favorites.getByUserId(user.id);
      const isFavorited = favorites.some((f) => f.listing_id === listingId);

      if (isFavorited) {
        await api.favorites.remove(user.id, listingId);
        toast({
          title: "Removed from favorites",
          description: "The listing has been removed from your favorites.",
        });
      } else {
        await api.favorites.add(user.id, listingId);
        toast({
          title: "Added to favorites",
          description: "The listing has been saved to your favorites.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    }
  };

  const activeListings = listings;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-eco-primary/5 to-transparent backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-eco-primary to-eco-forest bg-clip-text text-transparent font-blinker">
              {t("listings.findItemsToTrade")}
            </h1>
            <p className="text-lg text-eco-forest/70 mb-10 leading-relaxed">
              {t("listings.discoverQualityItems")}
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <div className="relative">
                
                
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Filters */}
        <div className="bg-card/90 backdrop-blur-sm rounded-3xl shadow-premium border-2 border-primary/20 p-8 mb-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary" />
                <Input
                  placeholder="Search your items"
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
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-md border-2 border-primary/20 rounded-2xl shadow-premium">
                {categories.map((category) => (
                  <SelectItem
                    key={category.id}
                    value={category.id}
                    className="text-base font-medium hover:bg-primary/10 focus:bg-primary/10"
                  >
                    {category.name}
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
                  value="newest"
                  className="text-base font-medium hover:bg-primary/10 focus:bg-primary/10"
                >
                  Newest First
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
          <div className="rounded-xl border-red-200 bg-red-50/80 p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-red-700 mb-2">
                {t("common.failedToLoad")}
              </h3>
              <p className="text-red-600 mb-6">
                {t("common.connectionTrouble")}
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-8"
              >
                {t("common.tryAgain")}
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && activeListings.length === 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-eco-soft/60 to-eco-beige/30 backdrop-blur-sm shadow-floating p-8">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-eco-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
                <Search className="w-10 h-10 text-eco-primary" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-6 text-eco-forest font-blinker">
                {t("common.noItemsFound")}
              </h3>
              <p className="text-eco-forest/70 mb-10 max-w-md mx-auto leading-relaxed">
                {t("common.adjustSearch")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  className="bg-eco-primary hover:bg-eco-forest text-white rounded-2xl px-8 py-3 shadow-floating hover:shadow-glow-eco transition-all duration-300 hover:scale-105"
                  asChild
                >
                  <Link to="/create-listing">{t("common.listYourItems")}</Link>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl px-8 py-3 border-eco-primary/30 text-eco-forest hover:bg-eco-primary hover:text-white backdrop-blur-sm transition-all duration-300 hover:scale-105"
                  asChild
                >
                  <Link to="/">{t("common.browseAll")}</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Listings Grid */}
        {!isLoading && !error && activeListings.length > 0 && (
          <div
            className={`grid gap-6 ${
              viewMode === "grid"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1 max-w-4xl mx-auto"
            }`}
          >
            {activeListings.map((listing) => (
              <div
                key={listing.id}
                className={`group cursor-pointer transition-all duration-300 rounded-2xl overflow-hidden bg-gradient-to-br from-eco-soft/80 to-eco-beige/40 backdrop-blur-sm shadow-floating hover:shadow-glow-eco hover:-translate-y-1 border-0 ${
                  viewMode === "list" ? "flex" : ""
                }`}
              >
                <Link to={`/listing/${listing.id}`} className="block">
                  <div
                    className={`relative overflow-hidden ${
                      viewMode === "list" ? "w-64 flex-shrink-0" : "aspect-[4/3]"
                    }`}
                  >
                    <img
                      src={
                        (Array.isArray(listing.images) &&
                        listing.images.length > 0
                          ? listing.images[0]
                          : listing.image
                      ) ||
                        "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&q=80"
                      }
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src =
                          "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&q=80";
                      }}
                    />

                    {/* Condition badge */}
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-eco-soft/90 text-eco-forest text-xs font-medium rounded-full px-3 py-1 shadow-soft">
                        {listing.condition}
                      </Badge>
                    </div>

                    {/* Heart button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-3 right-3 bg-eco-soft/90 hover:bg-eco-soft rounded-full w-8 h-8 p-0 hover:scale-110 transition-all duration-300 shadow-soft hover:shadow-glow-soft"
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleFavorite(listing.id);
                      }}
                    >
                      <Heart className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-eco-forest line-clamp-1 font-blinker">
                        {listing.title}
                      </h3>
                      {listing.category && (
                        <Badge className="bg-eco-primary/10 text-eco-primary text-xs font-medium rounded-full px-3 py-1">
                          {categories.find(c => c.id === listing.category)?.name || listing.category}
                        </Badge>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-eco-forest/70 text-sm mb-4 line-clamp-2">
                      {listing.description}
                    </p>

                    <div className="flex items-center gap-2 mb-4 text-sm text-eco-forest/70">
                      <span className="font-semibold">{listing.brand}</span>
                    </div>

                    <div className="flex items-center text-sm text-eco-forest/70 mb-4">
                      <MapPin className="w-4 h-4 mr-2" />
                      {listing.location}
                    </div>

                    {/* Looking for section */}
                    {(() => {
                      const validWantedItems = (listing.wantedItems || []).filter(
                        (item) => {
                          return (
                            item !== null &&
                            item !== undefined &&
                            typeof item === "string" &&
                            item.length > 0 &&
                            item.trim().length > 0
                          );
                        }
                      );

                      if (validWantedItems.length === 0) return null;

                      return (
                        <div className="mt-4 pt-4 border-t border-eco-forest/10">
                          <p className="text-sm font-semibold text-eco-forest mb-2">
                            {t("common.lookingFor")}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {validWantedItems.slice(0, 3).map((item, index) => (
                              <Badge
                                key={index}
                                className="text-xs bg-eco-primary/10 text-eco-primary font-medium rounded-full px-3 py-1"
                              >
                                {item}
                              </Badge>
                            ))}
                            {validWantedItems.length > 3 && (
                              <Badge className="text-xs bg-eco-beige/50 text-eco-forest font-medium rounded-full px-3 py-1">
                                +{validWantedItems.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* User info */}
                    <div className="flex items-center justify-between pt-4 border-t border-eco-forest/10">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-eco-primary to-eco-forest rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {(listing.user?.name || "U").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-eco-forest">
                            {listing.user?.name || "Unknown"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {!isLoading && !error && activeListings.length > 0 && (
          <div className="text-center mt-16">
            <p className="text-eco-forest/70 mb-6 font-medium">
              {t("common.showingItems", { count: activeListings.length })}
            </p>
            <Button
              variant="outline"
              className="px-10 py-3 border-eco-primary/30 text-eco-forest hover:bg-eco-primary hover:text-white rounded-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105 shadow-soft hover:shadow-glow-eco"
            >
              {t("common.loadMore")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}