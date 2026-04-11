"use client";

import { useUserStats } from "@/hooks/useUser";
import { Progress } from "@focusUp/ui/components/progress";
import { cn } from "@focusUp/ui/lib/utils";
import { Zap, Crown, Sparkles } from "lucide-react";
import Link from "next/link";

export default function FreeTierBanner() {
  const { data } = useUserStats();
  const stats = data?.data;

  if (!stats) return null;

  const isPro = stats.planTier === "PRO" || stats.planTier === "TEAM";
  const sessionsUsed = stats.sessionsUsedThisWeek ?? 0;
  const limit = stats.sessionLimit ?? 3;
  const isAtLimit = sessionsUsed >= limit;
  const progressPercent = isPro ? 100 : Math.min((sessionsUsed / limit) * 100, 100);

  if (isPro) {
    return (
      <div className="bg-gradient-to-r from-[#0245A3] to-[#184e52] rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-[#0245A3]/10">
        <div className="p-2 bg-white/15 rounded-xl">
          <Crown className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Pro Plan</span>
            <span className="text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
              ∞ Sessions
            </span>
          </div>
          <p className="text-xs text-white/70 font-medium mt-0.5">Unlimited focus sessions</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl p-5 border shadow-sm transition-all duration-300",
        isAtLimit
          ? "bg-red-50 border-red-200"
          : "bg-white border-slate-200"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-2 rounded-xl",
            isAtLimit ? "bg-red-100" : "bg-[#0245A3]/10"
          )}>
            <Zap className={cn("w-4 h-4", isAtLimit ? "text-red-600" : "text-[#0245A3]")} />
          </div>
          <div>
            <span className="text-sm font-bold text-[#001945]">Free Plan</span>
            <span className="text-xs text-slate-400 font-medium ml-2">
              {sessionsUsed} / {limit} this week
            </span>
          </div>
        </div>
        {isAtLimit && (
          <Link
            href="/dashboard/upgrade"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white",
              "bg-[#0245A3] hover:brightness-110 transition-all active:scale-[0.98]",
              "shadow-lg shadow-[#0245A3]/20"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Upgrade to Pro
          </Link>
        )}
      </div>
      <Progress
        value={progressPercent}
        className={cn(
          "h-2 rounded-full",
          isAtLimit ? "[&>div]:bg-red-500" : "[&>div]:bg-[#0245A3]"
        )}
      />
      {isAtLimit && (
        <p className="text-xs text-red-600 font-medium mt-2">
          You&apos;ve reached your weekly limit. Upgrade for unlimited sessions.
        </p>
      )}
    </div>
  );
}
