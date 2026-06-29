import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (error) {
    console.error("OAuth callback error from Google:", error);
    return NextResponse.redirect(
      new URL(`/employer/calendar?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/employer/calendar?error=No+authorization+code+received", request.url)
    );
  }

  if (!siteUrl) {
    return NextResponse.redirect(
      new URL("/employer/calendar?error=Server+misconfiguration", request.url)
    );
  }

  try {
    const supabase = await createClient();

    // Exchange the code for a session — this sets the Supabase auth cookies
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError || !data.session) {
      throw new Error(sessionError?.message || "Session exchange failed");
    }

    const session = data.session;
    console.log("✅ Session created for:", session.user.email);

    const providerToken = session.provider_token;
    const providerRefreshToken = session.provider_refresh_token;

    // provider_token can be null in server-side exchange if Supabase didn't propagate it.
    // In that case, redirect to a lightweight client page that reads the token
    // from the browser session (supabase.auth.getSession()) and POSTs it to a save endpoint.
    if (!providerToken) {
      console.warn("⚠️ No provider_token in server session — redirecting to client-side token save");
      return NextResponse.redirect(
        new URL("/employer/calendar/save-token", request.url)
      );
    }

    if (!providerRefreshToken) {
      // This happens if the user already granted consent before and you didn't force prompt=consent.
      // The connect route already sets prompt=consent, but log it in case it slips through.
      console.warn("⚠️ No refresh token received — calendar connection will expire in 1 hour");
    }

    // Use the actual token expiry from the session if available, otherwise default to 1 hour
    const expiresAt = session.expires_at
      ? new Date(session.expires_at * 1000).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString();

    // Verify the user exists in your employers table before upserting
    const { data: employer, error: employerError } = await supabase
      .from("employers")
      .select("id")
      .eq("id", session.user.id)
      .single();

    if (employerError || !employer) {
      throw new Error("Authenticated user is not a registered employer");
    }

    // Save the calendar connection — upsert in case they reconnect
    const { error: dbError } = await supabase
      .from("calendar_connections")
      .upsert(
        {
          user_id: session.user.id,
          access_token: providerToken,
          refresh_token: providerRefreshToken ?? null,
          provider_account_email: session.user.email ?? null,
          expires_at: expiresAt,
          provider: "google",
          updated_at: new Date().toISOString(),
        } as any,
        {
          onConflict: "user_id",
        }
      );

    if (dbError) {
      console.error("❌ DB upsert error:", dbError);
      throw new Error("Failed to save calendar connection");
    }

    console.log("✅ Calendar connection saved for:", session.user.email);
    return NextResponse.redirect(new URL("/employer/calendar?connected=1", request.url));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("❌ Callback error:", err);
    return NextResponse.redirect(
      new URL(`/employer/calendar?error=${encodeURIComponent(msg)}`, request.url)
    );
  }
}