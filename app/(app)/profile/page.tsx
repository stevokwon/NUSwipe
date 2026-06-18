import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/ProfileForm";
import type { Profile } from "@/lib/types";
import { isProfileComplete } from "@/lib/types";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let { data: profile } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", user.id)
    .single();

  // Profile row may be missing if the signup upsert failed — create it now
  if (!profile) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("candidates")
      .upsert({ id: user.id, email: user.email ?? "" });

    const { data: fresh } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!fresh) redirect("/login"); // truly unrecoverable
    profile = fresh;
  }

  const complete = isProfileComplete(profile as unknown as Profile);

  return (
    <div className="py-8 px-4">
      <div className="max-w-lg mx-auto mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/swipe" className="text-slate-500 hover:text-white transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-white">Your Profile</h1>
        </div>
        {!complete && (
          <div className="inline-flex items-center gap-2 text-xs bg-yellow-900/40 text-yellow-400 border border-yellow-700/50 rounded-full px-3 py-1">
            <span>⚠️</span> Profile incomplete - fill in required fields to unlock Swipe
          </div>
        )}
      </div>
      <ProfileForm profile={profile as unknown as Profile} userId={user.id} />
    </div>
  );
}
