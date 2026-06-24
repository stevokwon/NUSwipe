import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify the user is already logged in to your app before connecting calendar
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.redirect(new URL("/login?error=Not+authenticated", request.url));
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) throw new Error("NEXT_PUBLIC_SITE_URL is not set");

    const redirectTo = `${siteUrl}/api/google-calendar/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        scopes: [
          "openid",
          "email",
          "profile",
          "https://www.googleapis.com/auth/calendar.events",
          "https://www.googleapis.com/auth/calendar.readonly",
        ].join(" "),
        queryParams: {
          // Required to get a refresh token so the connection survives past 1 hour
          access_type: "offline",
          // Required to force consent screen even if user already granted — ensures refresh token is returned
          prompt: "consent",
        },
      },
    });

    if (error || !data.url) {
      console.error("OAuth initiation error:", error);
      return NextResponse.redirect(
        new URL(
          `/employer/calendar?error=${encodeURIComponent(error?.message || "OAuth failed")}`,
          request.url
        )
      );
    }

    return NextResponse.redirect(data.url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Connect error:", err);
    return NextResponse.redirect(
      new URL(`/employer/calendar?error=${encodeURIComponent(msg)}`, request.url)
    );
  }
}