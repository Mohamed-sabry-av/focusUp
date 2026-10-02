"use client";

import type { Route } from "next";
import { usePreviousPartners } from "@/hooks/useUser";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@focusUp/ui/components/avatar";
import { Skeleton } from "@focusUp/ui/components/skeleton";
import { Users } from "lucide-react";
import Link from "next/link";

interface Partner {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  lastSessionDate: string;
  totalSessionsTogether: number;
}

function PartnerCard({ partner }: { partner: Partner }) {
  const lastDate = new Date(partner.lastSessionDate);
  const dateStr = lastDate.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F2FCFC] border border-[#BDF1F6] hover:border-[#8FBAF3] hover:bg-[#BDF1F6]/30 transition-all group">
      <Avatar className="w-9 h-9 rounded-xl shrink-0">
        <AvatarImage
          src={partner.avatarUrl ?? undefined}
          className="object-cover"
        />
        <AvatarFallback className="rounded-xl bg-[#0245A3]/10 text-[#0245A3] text-sm font-bold">
          {partner.displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-xs text-[#001945] truncate">
          {partner.displayName}
        </div>
        <div className="text-[10px] text-slate-400 font-medium">
          {partner.totalSessionsTogether} session
          {partner.totalSessionsTogether !== 1 ? "s" : ""} · {dateStr}
        </div>
      </div>

      <Link
        href={`/profile/${partner.username}` as Route}
        className="shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[#0245A3] bg-white border border-[#8FBAF3] hover:bg-[#0245A3] hover:text-white hover:border-[#0245A3] transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label={`Book session with ${partner.displayName}`}
      >
        Book
      </Link>
    </div>
  );
}

export default function PreviousPartnersSection() {
  const { data, isLoading } = usePreviousPartners();
  const partners = data?.data?.partners ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Previous Partners
        </h3>
        <Skeleton className="h-[60px] rounded-xl" />
        <Skeleton className="h-[60px] rounded-xl" />
      </div>
    );
  }

  if (partners.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-3.5 h-3.5 text-[#8FBAF3]" />
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Previous Partners
        </h3>
      </div>
      <div className="space-y-2">
        {partners.slice(0, 4).map((partner) => (
          <PartnerCard key={partner.id} partner={partner} />
        ))}
      </div>
      {(data?.total ?? 0) > 4 && (
        <Link
          href={"/dashboard/partners" as Route}
          className="block text-center text-xs font-semibold text-[#0245A3] hover:underline py-1"
        >
          View all {data?.total} partners →
        </Link>
      )}
    </div>
  );
}
