import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json() as { extensionToken?: unknown };
  const extensionToken = body.extensionToken;

  if (typeof extensionToken !== "string" || !extensionToken) {
    return NextResponse.json({ error: "extensionToken required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Find the application by extension_token
  const { data: application, error: findError } = await supabase
    .from("applications")
    .select("id, status, extension_token")
    .eq("extension_token", extensionToken)
    .single();

  if (findError || !application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Flip status to "applied" and null out the token (one-time use)
  const { error: updateError } = await supabase
    .from("applications")
    .update({ status: "applied", extension_token: null, updated_at: new Date().toISOString() })
    .eq("id", application.id);

  if (updateError) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
