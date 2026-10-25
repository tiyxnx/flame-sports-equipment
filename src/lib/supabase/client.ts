import { createClient } from "@supabase/supabase-js";

// FLAME University Production Supabase Endpoint & Public Anon Key
const DEFAULT_SUPABASE_URL = "https://txkrwdpbhbpakxcmhzmt.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4a3J3ZHBiaGJwYWt4Y21oem10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MzgzMTEsImV4cCI6MjEwODUxNDMxMX0.PFM9b8qzOgGE00scgTk4wNx9mSobzbVJ-GDHrjYmakE";

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;

export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
