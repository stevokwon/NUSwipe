
"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Briefcase, 
  UserCircle, 
  LogOut, 
  Building2,
  CalendarDays,
  PanelLeftClose,
  PanelLeftOpen
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
}

function SidebarItem({ href, icon: Icon, label, active, collapsed }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group relative",
        active 
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
          : "text-slate-400 hover:text-white hover:bg-white/5",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className={cn(
        "h-5 w-5 transition-colors shrink-0",
        active ? "text-white" : "group-hover:text-indigo-400"
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

const STORAGE_KEY = "employer-sidebar-collapsed";

export function EmployerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setIsCollapsed(stored === "true");
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  function toggleCollapsed(next: boolean) {
    setIsCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  function handleMouseEnter() {
    if (!isCollapsed) return;
    hoverTimer.current = setTimeout(() => setHoverExpanded(true), 1000);
  }

  function handleMouseLeave() {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setHoverExpanded(false);
  }

  const isExpanded = !isCollapsed || hoverExpanded;

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    startTransition(() => {
      router.push("/employer/login");
      router.refresh();
    });
  }

  const items = [
    { href: "/employer/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/employer/jobs", icon: Briefcase, label: "Jobs" },
    { href: "/employer/calendar", icon: CalendarDays, label: "Calendar" },
  ];

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "border-r border-white/10 bg-slate-900/50 backdrop-blur-xl flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out",
        isExpanded ? "w-52" : "w-16"
      )}
    >
      <div className={cn(
        "p-4 flex items-center justify-between min-h-[72px]",
        !isExpanded && "justify-center"
      )}>
        {isExpanded ? (
          <>
            <Link href="/employer/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity overflow-hidden mr-2">
              <div className="h-8 w-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-base tracking-tight text-white truncate">NUSwipe</span>
            </Link>
            {!hoverExpanded && (
              <button
                onClick={() => toggleCollapsed(true)}
                className="text-slate-500 hover:text-indigo-400 transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer shrink-0"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => toggleCollapsed(false)}
            className="text-slate-500 hover:text-indigo-400 transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer shrink-0"
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
          />
        ))}
      </nav>

      <div className="p-3 border-t border-white/5 space-y-1">
        <SidebarItem
          href="/employer/profile"
          icon={UserCircle}
          label="Profile"
          active={pathname === "/employer/profile"}
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