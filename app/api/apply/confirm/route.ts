import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as { extensionToken?: unknown };
  const extensionToken = body.extensionToken;

  if (typeof extensionToken !== "string" || !extensionToken) {
    return NextResponse.json({ error: "extensionToken required" }, { status: 400 });
  }

  // Service-role client: this endpoint is called by the Chrome extension background
  // worker which has no user session cookies. The one-time extensionToken UUID is
  // the authentication mechanism — RLS cannot be applied here.
  const supabase = createServiceRoleClient();

  // Atomic: update WHERE extension_token = token, then null it out (one-time use).
  // Matching by token in the predicate prevents a race where two concurrent requests
  // both succeed — only the first will find a non-null token to match.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error: updateError } = await (supabase.from("applications") as any)
    .update({ status: "applied", extension_token: null, updated_at: new Date().toISOString() })
    .eq("extension_token", extensionToken)
    .select("id")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Not found or already used" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
