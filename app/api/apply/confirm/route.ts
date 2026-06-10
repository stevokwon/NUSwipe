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

  // Find the application by extension_token
  const { data: application, error: findError } = await supabase
    .from("applications")
    .select("id, status, extension_token")
    .eq("extension_token", extensionToken)
    .single<{ id: string; status: string; extension_token: string }>();

  if (findError || !application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Flip status to "applied" and null out the token (one-time use)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from("applications") as any)
    .update({ status: "applied", extension_token: null, updated_at: new Date().toISOString() })
    .eq("id", application.id);

  if (updateError) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
