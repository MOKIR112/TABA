import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Users,
  Package,
  Flag,
  BarChart3,
  UserX,
  Shield,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "../ui/use-toast";

export default function AdminPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("");
  const [showBanDialog, setShowBanDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch admin data (you would need to implement these API endpoints)
  const { data: adminStats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.analytics.getPlatformStats(),
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: moderationQueue = [] } = useQuery({
    queryKey: ["moderation-queue"],
    queryFn: () => api.admin.getModerationQueue(),
    enabled: !!user,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.users.getAllUsers(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: reportedUsers = [] } = useQuery({
    queryKey: ["admin-reported-users"],
    queryFn: async () => {
      const reports = await api.admin.getModerationQueue();
      const userReports = reports.filter((r: any) => r.reported_user_id);
      return userReports;
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const { data: listings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: () => api.listings.getAll({ limit: 50 }),
    enabled: !!user,
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => api.admin.getModerationQueue(),
    enabled: !!user,
    refetchInterval: 15000,
  });

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: ({
      userId,
      reason,
      duration,
    }: {
      userId: string;
      reason: string;
      duration?: number;
    }) => api.users.banUser(userId, reason, user!.id, duration),
    onSuccess: () => {
      toast({
        title: "User banned",
        description: "The user has been banned successfully.",
      });
      setShowBanDialog(false);
      setBanReason("");
      setBanDuration("");
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to ban user. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Unban user mutation
  const unbanUserMutation = useMutation({
    mutationFn: (userId: string) => api.users.unbanUser(userId),
    onSuccess: () => {
      toast({
        title: "User unbanned",
        description: "The user has been unbanned successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unban user. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Resolve report mutation
  const resolveReportMutation = useMutation({
    mutationFn: ({
      reportId,
      action,
    }: {
      reportId: string;
      action: "APPROVED" | "REJECTED";
    }) => api.admin.resolveReport(reportId, action, user!.id),
    onSuccess: () => {
      toast({
        title: "Report resolved",
        description: "The report has been resolved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reported-users"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resolve report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBanUser = (user: any) => {
    setSelectedUser(user);
    setShowBanDialog(true);
  };

  const handleUnbanUser = (userId: string) => {
    if (window.confirm("Are you sure you want to unban this user?")) {
      unbanUserMutation.mutate(userId);
    }
  };

  const submitBan = () => {
    if (!banReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for the ban.",
        variant: "destructive",
      });
      return;
    }

    const duration = banDuration ? parseInt(banDuration) : undefined;
    banUserMutation.mutate({
      userId: selectedUser.id,
      reason: banReason.trim(),
      duration,
    });
  };

  const stats = adminStats || {
    totalUsers: 1234,
    activeListings: 567,
    reportedItems: moderationQueue.length,
    completedTrades: 89,
  };

  const recentActivity = [
    {
      type: "user_signup",
      message: "New user registered",
      time: "2 minutes ago",
    },
    {
      type: "listing_created",
      message: "New listing posted",
      time: "5 minutes ago",
    },
    {
      type: "trade_completed",
      message: "Trade completed successfully",
      time: "12 minutes ago",
    },
    {
      type: "report_submitted",
      message: "User report submitted",
      time: "18 minutes ago",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 font-blinker">
            Admin Panel
          </h1>
          <p className="text-gray-600">Manage your TABADOL marketplace</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Listings
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeListings}</div>
              <p className="text-xs text-muted-foreground">
                +8% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Reported Items
              </CardTitle>
              <Flag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.reportedItems}</div>
              <p className="text-xs text-muted-foreground">
                -5% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Trades
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedTrades}</div>
              <p className="text-xs text-muted-foreground">
                +15% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Activity Feed */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Real-time Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activity.type === "user_signup"
                          ? "bg-green-500"
                          : activity.type === "listing_created"
                            ? "bg-blue-500"
                            : activity.type === "trade_completed"
                              ? "bg-purple-500"
                              : "bg-red-500"
                      }`}
                    />
                    <span className="text-sm">{activity.message}</span>
                  </div>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Management Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="reports">
              Reports{" "}
              {moderationQueue.length > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">
                  {moderationQueue.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reported-users">
              Reported Users{" "}
              {reportedUsers.length > 0 && (
                <Badge className="ml-2 bg-orange-500 text-white">
                  {reportedUsers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage registered users and their accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tabadol-purple"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => {
                      const isBanned =
                        user.banned_until &&
                        new Date(user.banned_until) > new Date();
                      return (
                        <div
                          key={user.id}
                          className={`flex items-center justify-between p-4 border rounded-lg ${
                            isBanned ? "border-red-200 bg-red-50" : ""
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">
                                {user.name || "Unknown User"}
                              </h3>
                              {isBanned && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  Banned
                                </Badge>
                              )}
                              {user.role === "admin" && (
                                <Badge className="text-xs bg-purple-100 text-purple-800">
                                  Admin
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {user.email}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                              <span>
                                Joined:{" "}
                                {new Date(
                                  user.created_at || Date.now(),
                                ).toLocaleDateString()}
                              </span>
                              <span>
                                Followers: {user.followers_count || 0}
                              </span>
                              <span>Reviews: {user.reviews_count || 0}</span>
                              <span>
                                Rating: {user.average_rating || "N/A"}
                              </span>
                            </div>
                            {isBanned && user.ban_reason && (
                              <p className="text-sm text-red-600 mt-1">
                                Reason: {user.ban_reason}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/profile/${user.id}`}>
                                View Profile
                              </Link>
                            </Button>
                            {isBanned ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnbanUser(user.id)}
                                disabled={unbanUserMutation.isPending}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Shield className="w-4 h-4 mr-1" />
                                Unban
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBanUser(user)}
                                disabled={banUserMutation.isPending}
                                className="text-red-600 hover:text-red-700"
                              >
                                <UserX className="w-4 h-4 mr-1" />
                                Ban
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="listings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Listing Management</CardTitle>
                <CardDescription>
                  Review and manage marketplace listings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {listingsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tabadol-purple"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {listings.map((listing) => (
                      <div
                        key={listing.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <h3 className="font-medium">{listing.title}</h3>
                          <p className="text-sm text-gray-600">
                            Posted by {listing.user?.name || "Unknown User"}
                          </p>
                          <p className="text-xs text-gray-500">
                            Category: {listing.category} • Created:{" "}
                            {new Date(listing.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default">{listing.status}</Badge>
                          <Button variant="outline" size="sm">
                            Review
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reported-users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Reported Users</span>
                  <Badge variant="secondary">
                    {reportedUsers.length} reports
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Review and manage reported users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportedUsers.length > 0 ? (
                    reportedUsers.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            <h3 className="font-medium">
                              {report.reported_user?.name || "Unknown User"}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {report.reason}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            Reported by {report.reporter?.name || "Anonymous"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              resolveReportMutation.mutate({
                                reportId: report.id,
                                action: "APPROVED",
                              })
                            }
                            disabled={resolveReportMutation.isPending}
                            className="text-green-600 hover:text-green-700"
                          >
                            Take Action
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              resolveReportMutation.mutate({
                                reportId: report.id,
                                action: "REJECTED",
                              })
                            }
                            disabled={resolveReportMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No reported users</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Reported Content</span>
                  <Badge variant="secondary">
                    {moderationQueue.length} pending
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Review reported listings and users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {moderationQueue.length > 0 ? (
                    moderationQueue.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Flag className="w-4 h-4 text-red-500" />
                            <h3 className="font-medium">
                              {report.listing?.title || "User Report"}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {report.reason}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            Reported by {report.reporter?.name || "Anonymous"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                resolveReportMutation.mutate({
                                  reportId: report.id,
                                  action: "APPROVED",
                                })
                              }
                              disabled={resolveReportMutation.isPending}
                              className="text-green-600 hover:text-green-700"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                resolveReportMutation.mutate({
                                  reportId: report.id,
                                  action: "REJECTED",
                                })
                              }
                              disabled={resolveReportMutation.isPending}
                              className="text-red-600 hover:text-red-700"
                            >
                              Reject
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/admin/mediation?report=${report.id}`}>
                                Review
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Flag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No reports to review</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        User growth chart would be here
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trade Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        Trade volume chart would be here
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Popular Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {["Electronics", "Fashion", "Books", "Sports", "Home"].map(
                      (category, index) => (
                        <div
                          key={category}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm">{category}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div
                                className="h-full bg-tabadol-purple rounded-full"
                                style={{ width: `${(5 - index) * 20}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">
                              {(5 - index) * 20}%
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Server Status</span>
                      <Badge className="bg-green-100 text-green-800">
                        Healthy
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Database</span>
                      <Badge className="bg-green-100 text-green-800">
                        Connected
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Storage</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        75% Used
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">API Response</span>
                      <Badge className="bg-green-100 text-green-800">
                        Fast
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>
                  Configure marketplace settings and policies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Auto-approve listings</h3>
                      <p className="text-sm text-gray-600">
                        Automatically approve new listings
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">User verification</h3>
                      <p className="text-sm text-gray-600">
                        Require email verification for new users
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Content moderation</h3>
                      <p className="text-sm text-gray-600">
                        Enable automatic content filtering
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
