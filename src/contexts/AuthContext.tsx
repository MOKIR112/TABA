import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { authService } from "@/lib/auth";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  userProfile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    userData?: { name?: string },
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    authService.getCurrentSession().then((session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (user) => {
      setUser(user);
      if (user) {
        await loadUserProfile(user.id);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await api.users.getById(userId);
      setUserProfile(profile);
    } catch (error: any) {
      console.error("Error loading user profile:", error);

      // Handle specific errors
      if (error.message?.includes("not found") || error.code === "PGRST116") {
        console.log("User profile not found, will create on next auth action");
        return; // Don't throw, just return
      }
      if (error.message === "Supabase not configured") {
        console.error("Database service is not properly configured");
        return; // Don't throw, just return
      }

      console.warn(
        "Profile loading failed, continuing without profile:",
        error,
      );
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { user, error } = await authService.signIn(email, password);

      if (error) {
        // Handle specific Supabase auth errors
        if (error.message === "Supabase not configured") {
          throw new Error(
            "Authentication service is not properly configured. Please check your environment variables.",
          );
        }
        if (error.message === "Invalid login credentials") {
          throw new Error(
            "Invalid email or password. Please check your credentials and try again.",
          );
        }
        if (error.message === "Email not confirmed") {
          throw new Error(
            "Please check your email and click the confirmation link before signing in.",
          );
        }
        if (error.message === "Too many requests") {
          throw new Error(
            "Too many login attempts. Please wait a few minutes before trying again.",
          );
        }
        throw new Error(error.message || "Sign in failed. Please try again.");
      }

      if (user) {
        // Try to load existing profile with retry logic
        let profileLoaded = false;
        let retryCount = 0;
        const maxRetries = 3;

        while (!profileLoaded && retryCount < maxRetries) {
          try {
            await loadUserProfile(user.id);
            profileLoaded = true;
          } catch (profileError: any) {
            retryCount++;
            console.log(
              `Profile load attempt ${retryCount} failed:`,
              profileError,
            );

            if (retryCount < maxRetries) {
              // Wait before retrying (exponential backoff)
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * retryCount),
              );
            } else {
              console.log(
                "All profile load attempts failed, profile will be created by trigger or manually",
              );

              // Set a minimal profile to allow authentication to continue
              const minimalProfile = {
                id: user.id,
                email: user.email!,
                name:
                  user.user_metadata?.name ||
                  user.user_metadata?.full_name ||
                  null,
                avatar_url: user.user_metadata?.avatar_url || null,
                location: null,
                bio: null,
                phone: null,
                email_verified: user.email_confirmed_at ? true : false,
                phone_verified: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              setUserProfile(minimalProfile);
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData?: { name?: string },
  ) => {
    try {
      const { user, error } = await authService.signUp(
        email,
        password,
        userData,
      );

      if (error) {
        // Handle specific Supabase auth errors
        if (error.message === "Supabase not configured") {
          throw new Error(
            "Authentication service is not properly configured. Please check your environment variables.",
          );
        }
        if (error.message === "User already registered") {
          throw new Error(
            "An account with this email already exists. Please try signing in instead.",
          );
        }
        if (error.message === "Password should be at least 6 characters") {
          throw new Error("Password must be at least 6 characters long.");
        }
        if (error.message === "Signup is disabled") {
          throw new Error(
            "New user registration is currently disabled. Please contact support.",
          );
        }
        if (error.message?.includes("rate limit")) {
          throw new Error(
            "Too many signup attempts. Please wait a few minutes before trying again.",
          );
        }
        if (error.message?.includes("Database error granting user")) {
          throw new Error(
            "There was a database issue during signup. Please try again in a moment.",
          );
        }
        throw new Error(error.message || "Sign up failed. Please try again.");
      }

      if (user) {
        console.log(
          "User created successfully in auth, profile should be auto-created by trigger",
        );

        // Wait for the trigger to process and try to load profile with retry logic
        let profileLoaded = false;
        let retryCount = 0;
        const maxRetries = 5;

        while (!profileLoaded && retryCount < maxRetries) {
          try {
            // Wait before each attempt (increasing delay)
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * (retryCount + 1)),
            );
            await loadUserProfile(user.id);
            profileLoaded = true;
            console.log(
              `Profile loaded successfully on attempt ${retryCount + 1}`,
            );
          } catch (profileError: any) {
            retryCount++;
            console.log(
              `Profile load attempt ${retryCount} failed:`,
              profileError,
            );

            if (retryCount >= maxRetries) {
              console.log(
                "All profile load attempts failed, setting minimal profile",
              );

              // Set minimal profile to allow user to continue
              const minimalProfile = {
                id: user.id,
                email: user.email!,
                name: userData?.name || null,
                avatar_url: null,
                location: null,
                bio: null,
                phone: null,
                email_verified: false,
                phone_verified: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              setUserProfile(minimalProfile);
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { user, error } = await authService.signInWithGoogle();

      if (error) {
        if (error.message === "Supabase not configured") {
          throw new Error(
            "Authentication service is not properly configured. Please check your environment variables.",
          );
        }
        throw new Error(
          error.message || "Google sign in failed. Please try again.",
        );
      }

      if (user) {
        // Wait for OAuth to fully process
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Try to load existing profile with retry logic for OAuth users
        let profileLoaded = false;
        let retryCount = 0;
        const maxRetries = 4;

        while (!profileLoaded && retryCount < maxRetries) {
          try {
            // Wait before each attempt
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * (retryCount + 1)),
            );
            await loadUserProfile(user.id);
            profileLoaded = true;
            console.log(
              `OAuth profile loaded successfully on attempt ${retryCount + 1}`,
            );
          } catch (profileError) {
            retryCount++;
            console.log(
              `OAuth profile load attempt ${retryCount} failed:`,
              profileError,
            );

            if (retryCount >= maxRetries) {
              console.log(
                "All OAuth profile load attempts failed, setting minimal profile",
              );

              // Set minimal profile for OAuth users
              const minimalProfile = {
                id: user.id,
                email: user.email!,
                name:
                  user.user_metadata?.full_name ||
                  user.user_metadata?.name ||
                  null,
                avatar_url: user.user_metadata?.avatar_url || null,
                location: null,
                bio: null,
                phone: null,
                email_verified: user.email_confirmed_at ? true : false,
                phone_verified: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              setUserProfile(minimalProfile);
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Google sign in error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setUserProfile(null);
  };

  const updateProfile = async (updates: any) => {
    if (!user) return;
    const updatedProfile = await api.users.update(user.id, updates);
    setUserProfile(updatedProfile);
  };

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
