import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a mock client to prevent the app from crashing when env vars are missing
const mockClient = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signInWithPassword: () =>
      Promise.resolve({
        data: { user: null, session: null },
        error: { message: "Supabase not configured" },
      }),
    signUp: () =>
      Promise.resolve({
        data: { user: null, session: null },
        error: { message: "Supabase not configured" },
      }),
    signInWithOAuth: () =>
      Promise.resolve({
        data: { url: null },
        error: { message: "Supabase not configured" },
      }),
    signOut: () => Promise.resolve({ error: null }),
    resetPasswordForEmail: () => Promise.resolve({ error: null }),
    updateUser: () => Promise.resolve({ error: null }),
  },
  from: () => ({
    select: () => ({
      data: [],
      error: { message: "Supabase not configured" },
    }),
    insert: () => ({
      data: null,
      error: { message: "Supabase not configured" },
    }),
    update: () => ({
      data: null,
      error: { message: "Supabase not configured" },
    }),
    delete: () => ({
      data: null,
      error: { message: "Supabase not configured" },
    }),
    upsert: () => ({
      data: null,
      error: { message: "Supabase not configured" },
    }),
    eq: function () {
      return this;
    },
    single: function () {
      return this;
    },
    order: function () {
      return this;
    },
    limit: function () {
      return this;
    },
    range: function () {
      return this;
    },
    or: function () {
      return this;
    },
    ilike: function () {
      return this;
    },
    in: function () {
      return this;
    },
  }),
  rpc: () =>
    Promise.resolve({
      data: null,
      error: { message: "Supabase not configured" },
    }),
};

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase environment variables not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.",
  );
  console.log("Current env vars:", {
    VITE_SUPABASE_URL: supabaseUrl ? "SET" : "NOT SET",
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? "SET" : "NOT SET",
  });
}

// Create the real Supabase client with enhanced configuration
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return mockClient as any;
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      debug: import.meta.env.DEV,
    },
    db: {
      schema: "public",
    },
    global: {
      headers: {
        "X-Client-Info": "tabadol-web-app",
      },
    },
  });
};

export const supabase = createSupabaseClient();
