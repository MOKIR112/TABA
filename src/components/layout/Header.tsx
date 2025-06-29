import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Heart,
  MessageCircle,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { notifications } from "@/lib/notifications";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function Header() {
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, userProfile, signOut } = useAuth();

  const isLoggedIn = !!user;
  const unreadMessages = 0; // TODO: Implement unread message count

  // Fetch notifications
  const { data: userNotifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => api.notifications.getByUserId(user!.id),
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-count", user?.id],
    queryFn: () => api.notifications.getUnreadCount(user!.id),
    enabled: !!user,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Request notification permission on mount
  useEffect(() => {
    if (isLoggedIn) {
      notifications.requestPermission();
    }
  }, [isLoggedIn]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.notifications.markAsRead(notificationId);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageCircle className="w-4 h-4" />;
      case "trade":
        return <Plus className="w-4 h-4" />;
      case "listing":
        return <Heart className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <header className="bg-background/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50 shadow-premium">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <img
              src="/taba png.png"
              alt="Tabadol Logo"
              className="h-16 w-auto transform group-hover:scale-105 transition-all duration-300 drop-shadow-lg group-hover:drop-shadow-xl"
            />
          </Link>

          {/* Language Switcher */}
          <div className="flex items-center space-x-2">
            <select
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="bg-transparent border border-border rounded-md px-3 py-1 text-sm"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoggedIn ? (
              <>
                <Button
                  variant="default"
                  size="default"
                  asChild
                  className="btn-gradient"
                >
                  <Link to="/create-listing">
                    <Plus className="w-5 h-5 mr-2" />
                    Create Listing
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="hover:bg-primary/10 hover:text-primary"
                >
                  <Link to="/favorites">
                    <Heart className="w-5 h-5" />
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="relative hover:bg-primary/10 hover:text-primary"
                >
                  <Link to="/inbox">
                    <MessageCircle className="w-5 h-5" />
                    {unreadMessages > 0 && (
                      <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                        {unreadMessages}
                      </Badge>
                    )}
                  </Link>
                </Button>

                {/* Notifications */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative hover:bg-primary/10 hover:text-primary"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                          {unreadCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-80 p-0 bg-card/95 backdrop-blur-md border-border/50 rounded-2xl shadow-premium"
                    align="end"
                  >
                    <div className="p-6 border-b border-border/50">
                      <h4 className="font-bold text-lg font-blinker">
                        Notifications
                      </h4>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {userNotifications.length > 0 ? (
                        userNotifications.slice(0, 10).map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                              !notification.read ? "bg-blue-50" : ""
                            }`}
                            onClick={() => {
                              handleMarkAsRead(notification.id);
                              // Handle navigation based on notification type
                              if (
                                notification.type === "message" &&
                                notification.data?.senderId
                              ) {
                                navigate(
                                  `/inbox?user=${notification.data.senderId}`,
                                );
                              } else if (
                                notification.type === "trade" &&
                                notification.data?.tradeId
                              ) {
                                navigate(`/trade-history`);
                              } else if (
                                notification.type === "review" &&
                                notification.data?.reviewId
                              ) {
                                navigate(`/profile`);
                              } else if (
                                notification.type === "listing" &&
                                notification.data?.listingId
                              ) {
                                navigate(
                                  `/listing/${notification.data.listingId}`,
                                );
                              }
                            }}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 mt-1">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 truncate">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(
                                    notification.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>No notifications yet</p>
                        </div>
                      )}
                    </div>
                    {userNotifications.length > 10 && (
                      <div className="p-4 border-t">
                        <Button variant="ghost" size="sm" className="w-full">
                          View all notifications
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-12 w-12 rounded-full hover:bg-primary/10"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={userProfile?.avatar_url || userProfile?.avatar}
                          alt={userProfile?.name || user?.email}
                        />
                        <AvatarFallback>
                          {(userProfile?.name || user?.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-56 bg-card/95 backdrop-blur-md border-border/50 rounded-2xl shadow-premium"
                    align="end"
                    forceMount
                  >
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/my-listings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        My Listings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/trade-history" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Trade History
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  asChild
                  className="hover:bg-primary/10 hover:text-primary"
                >
                  <Link to="/login">Login</Link>
                </Button>
                <Button className="btn-gradient" asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 animate-slide-in">
            {/* Mobile Navigation */}
            <div className="space-y-2">
              {isLoggedIn ? (
                <>
                  <Link
                    to="/create-listing"
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-tabadol-purple hover:bg-gray-50 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Plus className="w-4 h-4 mr-3" />
                    Create Listing
                  </Link>
                  <Link
                    to="/favorites"
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-tabadol-purple hover:bg-gray-50 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Heart className="w-4 h-4 mr-3" />
                    Favorites
                  </Link>
                  <Link
                    to="/inbox"
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-tabadol-purple hover:bg-gray-50 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <MessageCircle className="w-4 h-4 mr-3" />
                    Messages
                    {unreadMessages > 0 && (
                      <Badge className="ml-auto bg-red-500 text-white">
                        {unreadMessages}
                      </Badge>
                    )}
                  </Link>
                  <Link
                    to="/profile"
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-tabadol-purple hover:bg-gray-50 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="w-4 h-4 mr-3" />
                    Profile
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block px-3 py-2 text-sm font-medium text-gray-700 hover:text-tabadol-purple hover:bg-gray-50 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="block px-3 py-2 text-sm font-medium text-white bg-gradient-tabadol hover:bg-gradient-tabadol-hover rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}