"use client";

import { useState, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@focusUp/ui/components/avatar";
import { Badge } from "@focusUp/ui/components/badge";
import { cn } from "@focusUp/ui/lib/utils";
import { Clock, Video, Users } from "lucide-react";

interface SessionCardProps {
  session: {
    id: string;
    scheduledAt: string;
    durationMin: number;
    status: string;
    category?: string | null;
    partner?: {
      id: string;
      displayName: string;
      username: string;
      avatarUrl?: string | null;
    } | null;
  };
}

const STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  ACTIVE: {
    label: "In Progress",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse",
    dot: "bg-emerald-500",
  },
  PENDING: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
};

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [canJoin, setCanJoin] = useState(false);

  const calculateTime = useCallback(() => {
    const now = new Date().getTime();
    const target = new Date(targetDate).getTime();
    const diff = target - now;

    if (diff <= 0) {
      setCanJoin(true);
      setTimeLeft("Now");
      return;
    }

    const minutes = Math.floor(diff / 60000);
    if (minutes <= 5) {
      setCanJoin(true);
      setTimeLeft(`${minutes}m`);
    } else {
      setCanJoin(false);
      const hours = Math.floor(minutes / 60);
      const remainMins = minutes % 60;
      setTimeLeft(hours > 0 ? `${hours}h ${remainMins}m` : `${remainMins}m`);
    }
  }, [targetDate]);

  useEffect(() => {
    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [calculateTime]);

  return { timeLeft, canJoin };
}

export default function SessionCard({ session }: SessionCardProps) {
  const isActive = session.status === "ACTIVE";
  const { timeLeft, canJoin } = useCountdown(session.scheduledAt);
  const statusCfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.PENDING;

  const scheduledDate = new Date(session.scheduledAt);
  const timeStr = scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = scheduledDate.toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <div
      className={cn(
        "group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm",
        "hover:shadow-lg hover:-translate-y-1 transition-all duration-200",
        isActive && "ring-2 ring-emerald-400/50 border-emerald-200"
      )}
    >
      {/* Top Row: Avatar + Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 ring-2 ring-white shadow-sm">
            <AvatarImage src={session.partner?.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-[#0245A3] text-white text-sm font-bold">
              {session.partner?.displayName?.charAt(0)?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-bold text-sm text-[#001945]">
              {session.partner?.displayName ?? "Matching..."}
            </div>
            <div className="text-xs text-slate-400 font-medium">
              @{session.partner?.username ?? "..."}
            </div>
          </div>
        </div>
        <Badge variant="outline" className={cn("text-[10px] font-bold border", statusCfg.className)}>
          <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5 inline-block", statusCfg.dot)} />
          {statusCfg.label}
        </Badge>
      </div>

      {/* Detail Row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          {dateStr}, {timeStr}
        </div>
        <Badge variant="secondary" className="text-[10px] font-bold bg-slate-100 text-slate-600 border-0">
          {session.durationMin} min
        </Badge>
        {session.category && (
          <Badge variant="secondary" className="text-[10px] font-bold bg-[#0245A3]/5 text-[#0245A3] border-0">
            {session.category}
          </Badge>
        )}
      </div>

      {/* Join Button */}
      <button
        disabled={!canJoin && !isActive}
        className={cn(
          "w-full py-3 rounded-xl font-bold text-sm transition-all duration-200",
          "active:scale-[0.98]",
          canJoin || isActive
            ? "bg-[#0245A3] text-white shadow-lg shadow-[#0245A3]/20 hover:brightness-110"
            : "bg-slate-100 text-slate-400 cursor-not-allowed"
        )}
      >
        <div className="flex items-center justify-center gap-2">
          <Video className="w-4 h-4" />
          {isActive
            ? "Rejoin Session"
            : canJoin
              ? "Join Now"
              : `Starts in ${timeLeft}`
          }
        </div>
      </button>
    </div>
  );
}
