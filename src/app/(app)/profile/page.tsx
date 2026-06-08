import { redirect } from "next/navigation";
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
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Profile row may be missing if the signup upsert failed — create it now
  if (!profile) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("profiles")
      .upsert({ id: user.id, email: user.email ?? "" });

    const { data: fresh } = await supabase
      .from("profiles")
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
        <h1 className="text-2xl font-bold text-white">Your Profile</h1>
        <p className="text-slate-400 text-sm mt-1">
          {complete
            ? "Looking good! Keep your info up to date."
            : "Complete your profile before you can start swiping."}
        </p>
        {!complete && (
          <div className="mt-3 inline-flex items-center gap-2 text-xs bg-yellow-900/40 text-yellow-400 border border-yellow-700/50 rounded-full px-3 py-1">
            <span>⚠️</span> Profile incomplete — fill in required fields to unlock Swipe
          </div>
        )}
      </div>
      <ProfileForm profile={profile as unknown as Profile} userId={user.id} />
    </div>
  );
}
