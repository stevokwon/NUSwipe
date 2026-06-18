import { createClient } from "@/lib/supabase/server";
import { CandidateSidebar } from "@/components/CandidateSidebar";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex bg-slate-950 text-white">
      <CandidateSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
