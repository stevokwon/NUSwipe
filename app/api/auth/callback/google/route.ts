import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { exchangeGoogleCalendarCode, fetchGoogleUserInfo } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const cookieState = request.cookies.get("gcal_oauth_state")?.value;
  const redirectUri = request.cookies.get("gcal_redirect_uri")?.value;

  if (error) {
    return NextResponse.redirect(new URL(`/employer/calendar?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !state || !cookieState || state !== cookieState || !redirectUri) {
    return NextResponse.redirect(new URL("/employer/calendar?error=invalid_oauth_state", request.url));
  }

  const supabase = await createClient();
  const service = createServiceRoleClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/employer/login?error=session_required", request.url));
  }

  const { data: employer } = await service.from("employers").select("id").eq("id", user.id).maybeSingle();
  if (!employer) {
    return NextResponse.redirect(new URL("/employer/login?error=not_employer", request.url));
  }

  try {
    const tokens = await exchangeGoogleCalendarCode(code, redirectUri);
    const userInfo = await fetchGoogleUserInfo(tokens.access_token);
    const existing = await service
      .from("calendar_connections")
      .select("refresh_token, connected_at")
      .eq("employer_id", user.id)
      .eq("provider", "google")
      .maybeSingle();

    const refreshToken = tokens.refresh_token ?? existing.data?.refresh_token ?? null;
    if (!refreshToken) {
      return NextResponse.redirect(new URL("/employer/calendar?error=missing_refresh_token", request.url));
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: upsertError } = await service.from("calendar_connections").upsert(
      {
        employer_id: user.id,
        provider: "google",
        provider_account_email: userInfo.email ?? null,
        access_token: tokens.access_token,
        refresh_token: refreshToken,
        scope: tokens.scope ?? null,
        token_type: tokens.token_type ?? "Bearer",
        expires_at: expiresAt,
        calendar_id: "primary",
        connected_at: existing.data?.connected_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_synced_at: null,
      },
      { onConflict: "employer_id,provider" }
    );

    if (upsertError) {
      return NextResponse.redirect(
        new URL(`/employer/calendar?error=${encodeURIComponent(upsertError.message)}`, request.url)
      );
    }

    const response = NextResponse.redirect(new URL("/employer/calendar?connected=1", request.url));
    response.cookies.set("gcal_oauth_state", "", { path: "/", maxAge: 0 });
    response.cookies.set("gcal_redirect_uri", "", { path: "/", maxAge: 0 });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google Calendar connect failed";
    return NextResponse.redirect(
      new URL(`/employer/calendar?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
