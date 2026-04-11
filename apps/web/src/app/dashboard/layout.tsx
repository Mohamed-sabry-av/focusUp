"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Gift,
  Settings,
  HelpCircle,
} from "lucide-react";
import { cn } from "@focusUp/ui/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@focusUp/ui/components/avatar";
import { useCurrentUser } from "@/hooks/useUser";

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/dashboard/community", icon: Users, label: "Community" },
  { href: "/dashboard/rewards", icon: Gift, label: "Rewards" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
  { href: "/dashboard/help", icon: HelpCircle, label: "Help" },
] as const;

function SidebarNav({ pathname }: { pathname: string }) {
  const { data: userData } = useCurrentUser();
  const user = userData?.data?.user;

  return (
    <>
      {/* Logo Area */}
      <div className="w-10 h-10 bg-[#4A55C8] rounded-[14px] flex items-center justify-center text-white font-extrabold text-xl shadow-inner mb-6 mt-2">
        F
      </div>

      {/* Main Nav */}
      <nav className="flex flex-col gap-4 w-full px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200 mx-auto",
                isActive
                  ? "bg-white text-[#5A67D8] shadow-md shadow-black/10"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              <item.icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.5 : 2} />
            </Link>
          );
        })}
      </nav>

      {/* User Avatar at Bottom */}
      <div className="mt-auto mb-4 w-full px-3 flex justify-center">
         <Avatar className="w-10 h-10 border-2 border-white/20 hover:border-white/50 transition-colors shadow-none rounded-xl cursor-pointer">
            <AvatarImage src={user?.avatarUrl ?? undefined} className="object-cover" />
            <AvatarFallback className="bg-white/10 text-white text-xs font-bold rounded-xl">
              {user?.displayName?.charAt(0).toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
      </div>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="h-screen flex bg-[#f4f5f7] overflow-hidden text-[#1c1b1b] font-sans">
      {/* ── Desktop Sidebar ── */}
      <aside className="w-[88px] bg-[#5A67D8] flex flex-col items-center py-4 shrink-0 shadow-lg z-20">
        <SidebarNav pathname={pathname} />
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        {children}
      </div>
    </div>
  );
}
