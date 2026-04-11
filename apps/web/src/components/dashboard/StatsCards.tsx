"use client";

import { useUserStats } from "@/hooks/useUser";
import { Skeleton } from "@focusUp/ui/components/skeleton";
import { CalendarDays, Clock, Flame } from "lucide-react";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  accentColor: string;
  iconBg: string;
}

function StatCard({ icon, label, value, subtitle, accentColor, iconBg }: StatCardProps) {
  return (
    <div className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${iconBg}`}>
          {icon}
        </div>
      </div>
      <div className={`text-3xl font-extrabold tracking-tight ${accentColor}`}>
        {value}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
        {label}
      </div>
      {subtitle && (
        <div className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</div>
      )}
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <Skeleton className="w-10 h-10 rounded-xl mb-4" />
      <Skeleton className="w-16 h-8 rounded-lg mb-1.5" />
      <Skeleton className="w-24 h-3 rounded" />
    </div>
  );
}

export default function StatsCards() {
  const { data, isLoading } = useUserStats();
  const stats = data?.data;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard
        icon={<CalendarDays className="w-5 h-5 text-[#0245A3]" />}
        label="Sessions this week"
        value={stats?.sessionsThisWeek ?? 0}
        accentColor="text-[#0245A3]"
        iconBg="bg-[#0245A3]/10"
      />
      <StatCard
        icon={<Clock className="w-5 h-5 text-[#184e52]" />}
        label="Focus hours"
        value={stats?.focusHoursThisWeek ?? 0}
        subtitle="hours this week"
        accentColor="text-[#184e52]"
        iconBg="bg-[#184e52]/10"
      />
      <StatCard
        icon={<Flame className="w-5 h-5 text-amber-600" />}
        label="Day streak"
        value={stats?.currentStreak ?? 0}
        subtitle="consecutive days"
        accentColor="text-amber-600"
        iconBg="bg-amber-100"
      />
    </div>
  );
}
