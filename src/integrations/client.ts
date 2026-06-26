// src/integrations/client.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase client environment variables.");
}

const isBrowser = typeof window !== "undefined";

const rememberMe = isBrowser ? localStorage.getItem("remember_me") !== "false" : true;

const storage = isBrowser ? (rememberMe ? localStorage : sessionStorage) : undefined;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage,
    autoRefreshToken: rememberMe,
    detectSessionInUrl: true,
  },
});
