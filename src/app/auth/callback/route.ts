import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dbStore } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (code && supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      return NextResponse.redirect(`${origin}?error=${encodeURIComponent("Authentication failed with Google.")}`);
    }

    const email = data.user.email?.toLowerCase() || "";

    // 1. Domain Enforcement: Must end with @flame.edu.in
    if (!email.endsWith("@flame.edu.in")) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        `${origin}?error=${encodeURIComponent(
          "Access denied. Only official FLAME University (@flame.edu.in) Google accounts are permitted."
        )}`
      );
    }

    // 2. Synchronize user record in database
    const fullName = data.user.user_metadata?.full_name || email.split("@")[0].replace(".", " ");
    dbStore.authenticateUser(email, fullName);

    // Redirect to home with authenticated email
    const response = NextResponse.redirect(`${origin}?auth_success=${encodeURIComponent(email)}`);
    return response;
  }

  return NextResponse.redirect(origin);
}
