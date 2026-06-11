import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(
  _req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Job id is required" }, { status: 400 });
    }

    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: employer, error: employerError } = await authClient
      .from("employers")
      .select("id")
      .eq("id", user.id)
      .single();

    if (employerError || !employer) {
      return NextResponse.json(
        { error: "Forbidden: Only employers can delete jobs" },
        { status: 403 }
      );
    }

    const deleteClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createServiceRoleClient()
      : authClient;
    const { data: deleted, error: deleteError } = await deleteClient
      .from("jobs")
      .delete()
      .eq("id", id)
      .eq("posted_by", user.id)
      .select("id")
      .single();

    if (deleteError || !deleted) {
      const status = deleteError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json(
        {
          error:
            status === 404
              ? "Job not found or unauthorized"
              : deleteError?.message || "Failed to delete job",
        },
        { status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete job";
    console.error("Job delete failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await req.json();

    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: "No fields to update provided" },
        { status: 400 }
      );
    }

    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updateClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createServiceRoleClient()
      : authClient;

    const { data, error } = await updateClient
      .from("jobs")
      .update(body)
      .eq("id", id)
      .eq("posted_by", user.id)
      .select()
      .single();

    if (error || !data) {
      const status = error?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json(
        {
          error:
            status === 404
              ? "Job not found or unauthorized"
              : error?.message || "Failed to update job",
        },
        { status }
      );
    }

    return NextResponse.json({ success: true, job: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update job";
    console.error("Job update failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
