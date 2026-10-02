"use client";
import { useMatchNotifications } from "@/hooks/useNotifications";
import { VerifyEmailBanner } from "@/components/dashboard/VerifyEmailBanner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useMatchNotifications();
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f4f4f6] text-[#1a1a2e] font-sans">
      <VerifyEmailBanner />
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
