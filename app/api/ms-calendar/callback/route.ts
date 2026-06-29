// app/api/ms-calendar/callback/route.ts
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL(`/employer/calendar?error=${error ?? "No code"}`, request.url));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  // Exchange code for tokens
  const tokenRes = await fetch(`https://login.microsoftonline.com/common/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/ms-calendar/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL(`/employer/calendar?error=${tokens.error_description}`, request.url));
  }

  const service = createServiceRoleClient();
  await service.from("calendar_connections").upsert({
    user_id: user.id,
    provider: "microsoft",
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  } as any, { onConflict: "user_id" });  // note: you'll need a composite unique key on (user_id, provider) if supporting multiple providers

  return NextResponse.redirect(new URL("/employer/calendar?connected=1", request.url));
}