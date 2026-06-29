"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Briefcase, 
  UserCircle, 
  LogOut, 
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
  ClipboardList,
  History,
  AlertCircle,
  Calendar,
  Bookmark
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface SidebarItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  disabled?: boolean;
}

function SidebarItem({ href, icon: Icon, label, active, collapsed, disabled }: SidebarItemProps) {
  if (disabled) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group relative opacity-50 cursor-not-allowed",
          collapsed && "justify-center px-2"
        )}
      >
        <Icon className="h-5 w-5 shrink-0 text-slate-500" />
        {!collapsed && <span className="font-medium text-sm truncate text-slate-500">{label}</span>}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group relative",
        active 
          ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" 
          : "text-slate-400 hover:text-white hover:bg-white/5",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className={cn(
        "h-5 w-5 transition-colors shrink-0",
        active ? "text-white" : "group-hover:text-purple-400"
      )} />
      {!collapsed && <span className="font-medium text-sm truncate">{label}</span>}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-white/10">
          {label}
        </div>
      )}
    </Link>
  );
}

const STORAGE_KEY = "sidebar-collapsed";

export function CandidateSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Initialise from localStorage, default to collapsed
const [isCollapsed, setIsCollapsed] = useState(true); // always start collapsed on server

useEffect(() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) {
    setIsCollapsed(stored === "true");
  }
}, []);

  // Hover-expand state — true when the 1s timer has fired and cursor is still inside
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist collapse state
  function toggleCollapsed(next: boolean) {
    setIsCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  function handleMouseEnter() {
    if (!isCollapsed) return;
    hoverTimer.current = setTimeout(() => {
      setHoverExpanded(true);
    }, 1000);
  }

  function handleMouseLeave() {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setHoverExpanded(false);
  }

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  // The sidebar shows as expanded if either: not collapsed, or hover-expanded
  const isExpanded = !isCollapsed || hoverExpanded;

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    startTransition(() => {
      router.push("/login");
      router.refresh();
    });
  }

  const items = [
    { href: "/swipe", icon: Briefcase, label: "Jobs" },
    { href: "/saved", icon: Bookmark, label: "Saved Jobs" },
    { href: "/skipped", icon: History, label: "Skipped Jobs" },
    { href: "/tracker", icon: ClipboardList, label: "Tracker" },
    { href: "/actions", icon: AlertCircle, label: "Outstanding Actions", disabled: true },
    { href: "/calendar", icon: Calendar, label: "Calendar" },
  ];

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "border-r border-white/10 bg-slate-900/50 backdrop-blur-xl flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out z-50",
        isExpanded ? "w-52" : "w-16"  // skinnier: 52 expanded (was 64), 16 collapsed (was 20)
      )}
    >
      <div className={cn(
        "p-4 flex items-center justify-between min-h-[72px]",
        !isExpanded && "justify-center"
      )}>
        {isExpanded ? (
          <>
            <Link href="/swipe" className="flex items-center gap-2 hover:opacity-80 transition-opacity overflow-hidden mr-2">
              <div className="h-8 w-8 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-base tracking-tight text-white truncate">NUSwipe</span>
            </Link>
            {/* Only show close button when truly collapsed (not hover-expanded) */}
            {!hoverExpanded && (
              <button
                onClick={() => toggleCollapsed(true)}
                className="text-slate-500 hover:text-purple-400 transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer shrink-0"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => toggleCollapsed(false)}
            className="text-slate-500 hover:text-purple-400 transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer shrink-0"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1 overflow-x-hidden">
        {isExpanded && (
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
            Menu
          </div>
        )}
        {items.map((item) => (
          <SidebarItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname === item.href}
            collapsed={!isExpanded}
            disabled={item.disabled}
          />
        ))}
      </nav>

      <div className="p-3 border-t border-white/5 space-y-1">
        <SidebarItem
          href="/profile"
          icon={UserCircle}
          label="Profile"
          active={pathname === "/profile"}
          collapsed={!isExpanded}
        />
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 group text-left cursor-pointer",
            !isExpanded && "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4 group-hover:text-rose-400 shrink-0" />
          {isExpanded && <span className="font-medium text-sm truncate">Sign out</span>}
          {!isExpanded && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-white/10">
              Sign out
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
