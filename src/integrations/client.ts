// src/integrations/client.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase client environment variables.");
}

const rememberMe = localStorage.getItem("remember_me") !== "false";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: rememberMe ? localStorage : sessionStorage,
    autoRefreshToken: rememberMe,
    detectSessionInUrl: true,
  },
});
