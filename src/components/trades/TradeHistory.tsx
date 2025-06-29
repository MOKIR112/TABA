import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Calendar,
  MapPin,
  Star,
  MessageCircle,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  BarChart3,
  Target,
  Award,
  Activity,
  Plus,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function TradeHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's trades
  const {
    data: trades = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["trades", user?.id],
    queryFn: () => api.trades.getByUserId(user!.id),
    enabled: !!user,
  });

  // Fetch trade proposals
  const { data: proposals = [] } = useQuery({
    queryKey: ["trade-proposals", user?.id],
    queryFn: () => api.tradeProposals.getByUserId(user!.id),
    enabled: !!user,
  });

  // Fetch user analytics
  const { data: userAnalytics } = useQuery({
    queryKey: ["user-analytics", user?.id],
    queryFn: () => api.analytics.getUserStats(user!.id),
    enabled: !!user,
  });

  const handleProposalAction = async (
    proposalId: string,
    action: "ACCEPTED" | "REJECTED",
  ) => {
    try {
      await api.tradeProposals.updateStatus(proposalId, action, user!.id);
      toast({
        title: `Proposal ${action.toLowerCase()}`,
        description: `The trade proposal has been ${action.toLowerCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update proposal. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Categorize trades
  const categorizedTrades = {
    completed: trades.filter((trade) => trade.status === "COMPLETED"),
    pending: trades.filter((trade) => trade.status === "PENDING"),
    cancelled: trades.filter((trade) => trade.status === "CANCELLED"),
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "COMPLETED":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "pending":
      case "PENDING":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "cancelled":
      case "CANCELLED":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "pending":
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "cancelled":
      case "CANCELLED":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const TradeCard = ({ trade }: { trade: any }) => {
    // Use real user data from trade object
    const traderInfo =
      trade.trader ||
      (trade.initiator_id === user?.id ? trade.receiver : trade.initiator);

    return (
      <Card className="card-hover">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-2">
              {getStatusIcon(trade.status)}
              <h3 className="font-semibold text-lg font-blinker">
                Trade with {traderInfo?.name || "Unknown User"}
              </h3>
            </div>
            {getStatusBadge(trade.status)}
          </div>

          {/* Trade Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* My Item */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Your Item</h4>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <img
                  src={
                    trade.myItem?.image ||
                    trade.initiator_item?.image ||
                    "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=100&q=80"
                  }
                  alt={trade.myItem?.title || trade.initiator_item || "Item"}
                  className="w-12 h-12 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {trade.myItem?.title ||
                      trade.initiator_item ||
                      "Unknown Item"}
                  </p>
                </div>
              </div>
            </div>

            {/* Their Item */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Their Item</h4>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <img
                  src={
                    trade.theirItem?.image ||
                    trade.receiver_item?.image ||
                    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=100&q=80"
                  }
                  alt={trade.theirItem?.title || trade.receiver_item || "Item"}
                  className="w-12 h-12 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {trade.theirItem?.title ||
                      trade.receiver_item ||
                      "Unknown Item"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trader Info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={traderInfo?.avatar} />
                <AvatarFallback>
                  {traderInfo?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {traderInfo?.name || "Unknown User"}
                </p>
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span>{traderInfo?.rating || "N/A"}</span>
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {trade.location || "Unknown Location"}
              </div>
            </div>
          </div>

          {/* Status Specific Info */}
          {(trade.status === "completed" || trade.status === "COMPLETED") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Completed{" "}
                  {trade.completed_at
                    ? new Date(trade.completed_at).toLocaleDateString()
                    : new Date(trade.completedDate).toLocaleDateString()}
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-800">
                    Confirmation Status:
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center space-x-2">
                    <CheckCircle
                      className={`w-4 h-4 ${
                        trade.initiator_confirmed
                          ? "text-green-500"
                          : "text-gray-300"
                      }`}
                    />
                    <span
                      className={
                        trade.initiator_confirmed
                          ? "text-green-700"
                          : "text-gray-500"
                      }
                    >
                      {trade.initiator?.name || "Initiator"} confirmed
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle
                      className={`w-4 h-4 ${
                        trade.receiver_confirmed
                          ? "text-green-500"
                          : "text-gray-300"
                      }`}
                    />
                    <span
                      className={
                        trade.receiver_confirmed
                          ? "text-green-700"
                          : "text-gray-500"
                      }
                    >
                      {trade.receiver?.name || "Receiver"} confirmed
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-gray-600">Your rating: </span>
                  <div className="inline-flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < (trade.myRating || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Their rating: </span>
                  <div className="inline-flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < (trade.theirRating || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(trade.status === "pending" || trade.status === "PENDING") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Initiated{" "}
                  {trade.created_at
                    ? new Date(trade.created_at).toLocaleDateString()
                    : new Date(trade.initiatedDate).toLocaleDateString()}
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="mb-2">
                  <span className="text-sm font-medium text-yellow-800">
                    Confirmation Status:
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle
                      className={`w-4 h-4 ${
                        trade.initiator_confirmed
                          ? "text-green-500"
                          : "text-gray-300"
                      }`}
                    />
                    <span
                      className={
                        trade.initiator_confirmed
                          ? "text-green-700"
                          : "text-gray-500"
                      }
                    >
                      {trade.initiator?.name || "Initiator"}
                      {trade.initiator_confirmed ? " confirmed" : " pending"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle
                      className={`w-4 h-4 ${
                        trade.receiver_confirmed
                          ? "text-green-500"
                          : "text-gray-300"
                      }`}
                    />
                    <span
                      className={
                        trade.receiver_confirmed
                          ? "text-green-700"
                          : "text-gray-500"
                      }
                    >
                      {trade.receiver?.name || "Receiver"}
                      {trade.receiver_confirmed ? " confirmed" : " pending"}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-yellow-800">
                  <strong>Status:</strong>{" "}
                  {trade.initiator_confirmed && trade.receiver_confirmed
                    ? "Both parties confirmed - Trade will be marked complete"
                    : trade.initiator_confirmed || trade.receiver_confirmed
                      ? "Waiting for other party to confirm receipt"
                      : "Waiting for both parties to confirm receipt"}
                </p>
              </div>
            </div>
          )}

          {(trade.status === "cancelled" || trade.status === "CANCELLED") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Cancelled{" "}
                  {trade.cancelled_at
                    ? new Date(trade.cancelled_at).toLocaleDateString()
                    : new Date(trade.cancelledDate).toLocaleDateString()}
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  <strong>Reason:</strong>{" "}
                  {trade.reason || "No reason provided"}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/profile/${traderInfo?.id}`}>View Profile</Link>
            </Button>
            {(trade.status === "completed" || trade.status === "COMPLETED") && (
              <Button variant="outline" size="sm">
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact Again
              </Button>
            )}
            {(trade.status === "pending" || trade.status === "PENDING") && (
              <Button
                size="sm"
                className="btn-gradient"
                onClick={async () => {
                  try {
                    await api.trades.confirmCompletion(trade.id, user!.id);
                    toast({
                      title: "Confirmation recorded",
                      description:
                        "Your confirmation has been recorded. The trade will be completed when both parties confirm.",
                    });
                    // Refresh the data
                    queryClient.invalidateQueries({ queryKey: ["trades"] });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description:
                        "Failed to confirm completion. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={
                  (trade.initiator_id === user?.id &&
                    trade.initiator_confirmed) ||
                  (trade.receiver_id === user?.id && trade.receiver_confirmed)
                }
              >
                {(trade.initiator_id === user?.id &&
                  trade.initiator_confirmed) ||
                (trade.receiver_id === user?.id && trade.receiver_confirmed)
                  ? "Confirmed ✓"
                  : "Confirm Receipt"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Only use real trades, no mock data
  const displayTrades = {
    completed: categorizedTrades.completed,
    pending: categorizedTrades.pending,
    cancelled: categorizedTrades.cancelled,
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4 font-blinker">
                Trade Management
              </h1>
              <p className="text-xl text-muted-foreground">
                Track your trading activity, proposals, and performance
                analytics
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant={showAnalytics ? "default" : "outline"}
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </Button>
              <Button className="btn-gradient" asChild>
                <Link to="/create-listing">
                  <Plus className="w-4 h-4 mr-2" />
                  New Listing
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        {showAnalytics && userAnalytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Total Views
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userAnalytics.totalViews}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all listings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-500" />
                  Response Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userAnalytics.responseRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Average response time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userAnalytics.totalListings > 0
                    ? Math.round(
                        (userAnalytics.completedTrades /
                          userAnalytics.totalListings) *
                          100,
                      )
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">
                  Completed trades
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-500" />
                  Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userAnalytics.averageRating}
                </div>
                <p className="text-xs text-muted-foreground">
                  {userAnalytics.totalRatings} reviews
                </p>
              </CardContent>
            </Card>
          </div>
        )}

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
              <p className="text-red-600 mb-4">Failed to load trade history</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && (
          <>
            {/* Simplified Search */}
            <div className="flex flex-col sm:flex-row gap-4 items-center mb-8">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search your trades..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-10 rounded-lg border-gray-300 focus:border-primary"
                  />
                </div>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-48 h-10 rounded-lg border-gray-300 focus:border-primary">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-gray-200">
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter Pills */}
            <div className="flex flex-wrap gap-3 mb-8 justify-center">
              {[
                {
                  key: "all",
                  label: "All Trades",
                  count:
                    displayTrades.completed.length +
                    displayTrades.pending.length +
                    displayTrades.cancelled.length,
                },
                {
                  key: "proposals",
                  label: "Proposals",
                  count: proposals.length,
                },
                {
                  key: "completed",
                  label: "Completed",
                  count: displayTrades.completed.length,
                },
                {
                  key: "pending",
                  label: "Pending",
                  count: displayTrades.pending.length,
                },
                {
                  key: "cancelled",
                  label: "Cancelled",
                  count: displayTrades.cancelled.length,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-6 py-3 rounded-full font-semibold text-sm transition-all duration-200 ${
                    statusFilter === tab.key
                      ? "bg-primary text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Tabs */}
            <Tabs
              value={statusFilter}
              onValueChange={setStatusFilter}
              className="space-y-6"
            >
              <TabsList className="hidden">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="proposals">Proposals</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-6">
                {[
                  ...displayTrades.completed,
                  ...displayTrades.pending,
                  ...displayTrades.cancelled,
                ].map((trade) => (
                  <TradeCard key={trade.id} trade={trade} />
                ))}
              </TabsContent>

              <TabsContent value="proposals" className="space-y-6">
                {proposals.length > 0 ? (
                  proposals.map((proposal) => (
                    <Card key={proposal.id} className="card-hover">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Activity className="w-5 h-5 text-blue-500" />
                            <h3 className="font-semibold text-lg font-blinker">
                              Trade Proposal
                            </h3>
                          </div>
                          <Badge
                            className={`${
                              proposal.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-800"
                                : proposal.status === "ACCEPTED"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {proposal.status}
                          </Badge>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">
                              Listing
                            </h4>
                            <p className="text-sm">
                              {proposal.listing?.title || "Unknown Listing"}
                            </p>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">
                              Offered Items
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {(proposal.offered_items || []).map(
                                (item, index) => (
                                  <Badge key={index} variant="secondary">
                                    {item}
                                  </Badge>
                                ),
                              )}
                            </div>
                          </div>

                          {proposal.message && (
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2">
                                Message
                              </h4>
                              <p className="text-sm text-gray-600">
                                {proposal.message}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage
                                  src={
                                    proposal.initiator_id === user?.id
                                      ? proposal.receiver?.avatar
                                      : proposal.initiator?.avatar
                                  }
                                />
                                <AvatarFallback>
                                  {(proposal.initiator_id === user?.id
                                    ? proposal.receiver?.name
                                    : proposal.initiator?.name
                                  )?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {proposal.initiator_id === user?.id
                                    ? proposal.receiver?.name
                                    : proposal.initiator?.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(
                                    proposal.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            {proposal.status === "PENDING" &&
                              proposal.receiver_id === user?.id && (
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleProposalAction(
                                        proposal.id,
                                        "ACCEPTED",
                                      )
                                    }
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleProposalAction(
                                        proposal.id,
                                        "REJECTED",
                                      )
                                    }
                                  >
                                    Decline
                                  </Button>
                                </div>
                              )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2 font-blinker">
                        No trade proposals
                      </h3>
                      <p className="text-gray-600">
                        You don't have any trade proposals yet
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-6">
                {displayTrades.completed.map((trade) => (
                  <TradeCard key={trade.id} trade={trade} />
                ))}
              </TabsContent>

              <TabsContent value="pending" className="space-y-6">
                {displayTrades.pending.length > 0 ? (
                  displayTrades.pending.map((trade) => (
                    <TradeCard key={trade.id} trade={trade} />
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2 font-blinker">
                        No pending trades
                      </h3>
                      <p className="text-gray-600">
                        You don't have any trades in progress
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="cancelled" className="space-y-6">
                {displayTrades.cancelled.length > 0 ? (
                  displayTrades.cancelled.map((trade) => (
                    <TradeCard key={trade.id} trade={trade} />
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2 font-blinker">
                        No cancelled trades
                      </h3>
                      <p className="text-gray-600">
                        You don't have any cancelled trades
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
