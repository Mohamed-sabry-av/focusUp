"use client";
import { useMatchNotifications } from "@/hooks/useNotifications";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useMatchNotifications();
  return (
    <div className="h-screen overflow-hidden bg-[#f4f4f6] text-[#1a1a2e] font-sans">
      {children}
    </div>
  );
}
