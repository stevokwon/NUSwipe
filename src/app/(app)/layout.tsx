import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";

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
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      {/* Top nav */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/swipe"
            className="font-bold text-lg tracking-tight"
            style={{ fontFamily: "var(--font-syne), sans-serif" }}
          >
            💼 NUSwipe
          </Link>
          <div className="flex items-center gap-1">
            <NavLink href="/swipe" label="Swipe" icon="🃏" />
            <NavLink href="/tracker" label="Tracker" icon="📋" />
            <NavLink href="/profile" label="Profile" icon="👤" />
            <LogoutButton />
          </div>
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
    >
      <span>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
