"use client";

import { createBrowserClient } from "@supabase/ssr";

let instance: ReturnType<typeof createBrowserClient> | null = null;

export function isCloudConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getBrowserSupabase() {
  if (!isCloudConfigured()) return null;
  if (!instance) {
    instance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  }
  return instance;
}
