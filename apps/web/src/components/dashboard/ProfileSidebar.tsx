"use client";

import type { Route } from "next";
import { Calendar, Star, Video, MessageSquare, HelpCircle } from "lucide-react";
import { useCurrentUser, useUserStats } from "@/hooks/useUser";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@focusUp/ui/components/avatar";
import { Progress } from "@focusUp/ui/components/progress";
import { Skeleton } from "@focusUp/ui/components/skeleton";
import { cn } from "@focusUp/ui/lib/utils";
import { Crown, Zap, Sparkles } from "lucide-react";
import Link from "next/link";
import { useUpcomingSessions } from "@/hooks/useSessions";
import SessionCard from "./SessionCard";
import PendingBookingCard from "./PendingBookingCard";
import { useUserBookings } from "@/hooks/useBookings";
import PreviousPartnersSection from "./PreviousPartnersSection";

function PlanBadge() {
  const { data: statsData } = useUserStats();
  const stats = statsData?.data;

  if (!stats) return <Skeleton className="h-14 rounded-2xl w-full" />;

  const isPro = stats.planTier === "PRO" || stats.planTier === "TEAM";
  const sessionsUsed = stats.sessionsUsedThisWeek ?? 0;
  const limit = stats.sessionLimit ?? 3;
  const progressPercent = isPro
    ? 100
    : Math.min((sessionsUsed / limit) * 100, 100);
  const isAtLimit = !isPro && sessionsUsed >= limit;

  if (isPro) {
    return (
      <div className="bg-gradient-to-r from-[#0245A3] to-[#184e52] rounded-2xl p-4 flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-xl">
          <Crown className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-white">Pro Plan</div>
          <p className="text-xs text-white/70 font-medium">
            Unlimited sessions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl p-4 border transition-colors",
        isAtLimit
          ? "bg-red-50 border-red-200"
          : "bg-[#F2FCFC] border-[#BDF1F6]",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap
            className={cn(
              "w-4 h-4",
              isAtLimit ? "text-red-500" : "text-[#0245A3]",
            )}
          />
          <span className="text-xs font-bold text-[#001945]">Free Plan</span>
          <span className="text-xs text-slate-400 font-medium">
            {sessionsUsed}/{limit} this week
          </span>
        </div>
        {isAtLimit && (
          <Link
            href={"/dashboard/upgrade" as Route}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-[#0245A3] hover:brightness-110 transition-all"
          >
            <Sparkles className="w-3 h-3" />
            Upgrade
          </Link>
        )}
      </div>
      <Progress
        value={progressPercent}
        className={cn(
          "h-1.5 rounded-full",
          isAtLimit ? "[&>div]:bg-red-500" : "[&>div]:bg-[#0245A3]",
        )}
      />
    </div>
  );
}

export function ProfileSidebar() {
  const { data: userData, isLoading: userLoading } = useCurrentUser();
  const { data: statsData } = useUserStats();
  const { data: upcomingData, isLoading: sessionsLoading } =
    useUpcomingSessions();
  const { data: pendingData } = useUserBookings("PENDING");

  const user = userData?.data?.user;
  const stats = statsData?.data;
  const upcomingSessions = Array.isArray(upcomingData?.data)
    ? upcomingData.data
    : [];
  const pendingBookings = (pendingData?.bookings ?? []).slice(0, 2);

  const firstName = user?.displayName?.split(" ")[0] || "There";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="w-[300px] bg-white border-l border-slate-100 flex flex-col shrink-0 h-full overflow-y-auto custom-scrollbar">
      <div className="p-5 space-y-5">
        {/* User header */}
        {userLoading ? (
          <div className="space-y-2">
            <Skeleton className="w-14 h-14 rounded-2xl" />
            <Skeleton className="w-32 h-5 rounded" />
            <Skeleton className="w-24 h-3 rounded" />
          </div>
        ) : (
          <div>
            <Avatar className="w-14 h-14 rounded-2xl mb-3 shadow-sm">
              <AvatarImage
                src={user?.avatarUrl ?? undefined}
                className="object-cover"
              />
              <AvatarFallback className="rounded-2xl bg-[#0245A3]/10 text-[#0245A3] text-lg font-bold">
                {firstName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-base font-bold text-[#001945] leading-tight">
              {greeting},<br />
              <span className="text-[#0245A3]">{firstName}!</span>
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Link
                href={"/dashboard/history" as Route}
                className="text-xs font-semibold text-slate-400 hover:text-[#0245A3] transition-colors"
              >
                {stats?.totalSessions ?? 0} sessions total
              </Link>
            </div>
          </div>
        )}

        {/* Plan badge */}
        <PlanBadge />

        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: "This week",
              value: stats?.sessionsThisWeek ?? 0,
              unit: "sessions",
            },
            {
              label: "Hours",
              value: stats?.focusHoursThisWeek ?? 0,
              unit: "hrs",
            },
            { label: "Streak", value: stats?.currentStreak ?? 0, unit: "days" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-[#F2FCFC] rounded-xl p-3 text-center border border-[#BDF1F6]"
            >
              <div className="text-lg font-extrabold text-[#0245A3] tabular-nums">
                {s.value}
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-tight mt-0.5">
                {s.unit}
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming sessions */}
        {sessionsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        ) : upcomingSessions.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Upcoming
            </h3>
            {upcomingSessions
              .slice(0, 2)
              .map((session: Record<string, unknown>) => (
                <SessionCard
                  key={session.id as string}
                  session={
                    session as Parameters<typeof SessionCard>[0]["session"]
                  }
                />
              ))}
          </div>
        ) : null}

        {/* Pending bookings */}
        {pendingBookings.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Waiting for partner
            </h3>
            {pendingBookings.map((booking: Record<string, unknown>) => (
              <PendingBookingCard
                key={booking.id as string}
                booking={
                  booking as Parameters<typeof PendingBookingCard>[0]["booking"]
                }
              />
            ))}
          </div>
        )}

        {/* Previous partners */}
        <PreviousPartnersSection />

        <div className="h-px bg-[#BDF1F6] w-full" />

        {/* Quick links */}
        <div className="space-y-1.5">
          {[
            {
              icon: Calendar,
              label: "My Schedule",
              href: "/dashboard/schedule" as Route,
            },
            {
              icon: Star,
              label: "Favorites",
              href: "/dashboard/favorites" as Route,
            },
          ].map(({ icon: Icon, label, href }) => (
            <Link
              key={href}
              href={href}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-[#BDF1F6] hover:bg-[#F2FCFC] transition-colors bg-white group"
            >
              <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-600">
                <Icon className="w-4 h-4 text-slate-400 group-hover:text-[#0245A3]" />
                {label}
              </div>
              <span className="text-slate-300 group-hover:text-[#8FBAF3]">
                ›
              </span>
            </Link>
          ))}
        </div>

        {/* Support */}
        <div className="space-y-1.5">
          {[
            { icon: Video, label: "Test audio & video" },
            { icon: MessageSquare, label: "Share feedback" },
            { icon: HelpCircle, label: "Contact support" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-100 hover:bg-[#F2FCFC] hover:border-[#BDF1F6] transition-colors text-xs font-semibold text-slate-500"
            >
              <Icon className="w-4 h-4 text-slate-400" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
