"use client";

import { createClient } from "@supabase/supabase-js";
import { publicSupabaseUrl } from "@/lib/supabase/environment";

export function createBrowserClient() {
  return createClient(
    publicSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
