import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing Supabase configuration! Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are defined in your .env file.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
