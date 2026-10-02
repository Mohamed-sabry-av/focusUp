"use client";

import React, { useState, useCallback } from "react";
import {
  Home,
  Users,
  Gift,
  Settings,
  HelpCircle,
  Shuffle,
  ChevronDown,
  X,
  Calendar,
  Star,
  Video,
  MessageSquare,
  HelpCircle as HelpIcon,
} from "lucide-react";
import { cn } from "@focusUp/ui/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@focusUp/ui/components/avatar";
import { useCurrentUser, useUserStats } from "@/hooks/useUser";
import { CalendarView } from "@/components/dashboard/CalendarView";

// ── Types ──────────────────────────────────────────────────────

type TabId = "calendar" | "people" | "rewards" | "settings" | "help";

interface SelectedSlot {
  id: string;
  dateLabel: string;
  timeRange: string;
  durationMin: number;
  slotTime: string;
}

// ── Nav items ─────────────────────────────────────────────────

const NAV_ITEMS: Array<{
  id: TabId;
  icon: React.ElementType;
  label: string;
}> = [
  { id: "calendar", icon: Home, label: "Home" },
  { id: "people", icon: Users, label: "People" },
  { id: "rewards", icon: Gift, label: "Rewards" },
  { id: "settings", icon: Settings, label: "Settings" },
  { id: "help", icon: HelpCircle, label: "Help" },
];

// ── Left Narrow Nav ───────────────────────────────────────────

function LeftNav({
  activeTab,
  setActiveTab,
}: {
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
}) {
  const { data: userData } = useCurrentUser();
  const user = userData?.data?.user;

  return (
    <aside className="w-16 bg-[#0245A3] flex flex-col items-center py-4 shrink-0 h-full z-10">
      {/* Logo */}
      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white font-extrabold text-lg mb-6 select-none">
        F
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-2 w-full px-2 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              title={item.label}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full h-11 flex items-center justify-center rounded-xl transition-all duration-150",
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10",
              )}
            >
              <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
            </button>
          );
        })}
      </nav>

      {/* Avatar */}
      <div className="mt-auto mb-2 px-2 w-full flex justify-center">
        <Avatar className="w-9 h-9 rounded-xl border-2 border-white/20 cursor-pointer hover:border-white/40 transition-colors">
          <AvatarImage
            src={user?.avatarUrl ?? undefined}
            className="object-cover"
          />
          <AvatarFallback className="rounded-xl bg-white/10 text-white text-xs font-bold">
            {user?.displayName?.charAt(0)?.toUpperCase() ?? "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    </aside>
  );
}

// ── Left Booking Panel ────────────────────────────────────────

function BookingPanel({
  duration,
  setDuration,
  selectedSlots,
  onRemoveSlot,
  onClearAll,
  onBookAll,
  isBooking,
}: {
  duration: number;
  setDuration: (d: number) => void;
  selectedSlots: SelectedSlot[];
  onRemoveSlot: (id: string) => void;
  onClearAll: () => void;
  onBookAll: () => void;
  isBooking: boolean;
}) {
  const DURATIONS = [25, 50, 75];

  return (
    <div className="w-[260px] bg-white border-r border-slate-200/60 flex flex-col shrink-0 h-full">
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Book session CTA */}
        <button
          onClick={onBookAll}
          disabled={selectedSlots.length === 0 || isBooking}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] bg-[#0245A3] text-white shadow-md shadow-[#0245A3]/20 hover:brightness-110 disabled:opacity-60"
        >
          {isBooking ? "Booking..." : "Book session"}
        </button>

        {/* Duration + controls row */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                  duration === d
                    ? "bg-white shadow-sm text-slate-800"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                {d}m
              </button>
            ))}
          </div>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
            <Shuffle className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Selected sessions */}
        {selectedSlots.length > 0 && (
          <>
            <div className="h-px bg-slate-100" />
            <div className="text-xs font-bold text-slate-500">
              {selectedSlots.length} Session
              {selectedSlots.length !== 1 ? "s" : ""} Selected
            </div>

            <div className="space-y-2">
              {selectedSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="rounded-xl border border-[#0245A3]/30 bg-[#0245A3]/5 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-700">
                        {slot.dateLabel}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {slot.timeRange}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-[#0245A3]">
                        {slot.durationMin}m
                      </span>
                      <button
                        onClick={() => onRemoveSlot(slot.id)}
                        className="ml-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Right Profile Panel ───────────────────────────────────────

function RightProfilePanel() {
  const { data: userData } = useCurrentUser();
  const { data: statsData } = useUserStats();
  const user = userData?.data?.user;
  const stats = statsData?.data;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const firstName = user?.displayName?.split(" ")[0] ?? "there";
  const isPro = stats?.planTier === "PRO" || stats?.planTier === "TEAM";

  return (
    <div className="w-[260px] bg-white border-l border-slate-200/60 flex flex-col shrink-0 h-full">
      <div className="flex-1 overflow-y-auto">
        {/* Top expand toggle */}
        <div className="flex justify-end p-3 border-b border-slate-100">
          <button className="text-slate-400 hover:text-slate-600 text-xs font-bold tracking-widest">
            »
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Profile */}
          <div className="space-y-1">
            <Avatar className="w-14 h-14 rounded-xl mb-3">
              <AvatarImage
                src={user?.avatarUrl ?? undefined}
                className="object-cover"
              />
              <AvatarFallback className="rounded-xl bg-[#0245A3]/10 text-[#0245A3] text-xl font-bold">
                {firstName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="text-lg font-bold text-slate-900 leading-tight">
              {greeting},<br />
              {firstName}!
            </div>
            <div className="text-xs text-slate-400 font-medium">
              {isPro
                ? "Pro Plan · Unlimited"
                : "Free Plan · 3 sessions per week"}
            </div>

            {!isPro && (
              <button className="mt-3 w-full py-2.5 bg-[#0245A3] text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all active:scale-[0.98]">
                Upgrade to Plus
              </button>
            )}
          </div>

          <div className="h-px bg-slate-100" />

          {/* Quick links */}
          <div className="space-y-1">
            {[
              { icon: Calendar, label: "My Schedule" },
              { icon: Star, label: "Favorites Schedule" },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group"
              >
                <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-[#0245A3]" />
                  {label}
                </div>
                <span className="text-slate-300 group-hover:text-slate-500">
                  ›
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom support links */}
      <div className="p-4 border-t border-slate-100 space-y-1">
        {[
          { icon: Video, label: "Test audio and video" },
          { icon: MessageSquare, label: "Share feedback" },
          { icon: HelpIcon, label: "Contact support" },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
          >
            <Icon className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-medium text-slate-600">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Center Panel: People ──────────────────────────────────────

function PeoplePanel() {
  return (
    <div className="flex-1 bg-white flex flex-col overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-100">
        <h1 className="text-2xl font-bold text-slate-900">People</h1>
      </div>
      <div className="px-8 py-4 flex items-center gap-3 border-b border-slate-100">
        <select className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white appearance-none pr-8 outline-none">
          <option>Favorites</option>
          <option>All Partners</option>
        </select>
        <div className="flex-1" />
        <select className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white appearance-none pr-8 outline-none">
          <option>Recently met</option>
          <option>Most sessions</option>
        </select>
      </div>
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            Complete sessions to see your partners here
          </p>
        </div>
      </div>
      <div className="px-8 py-4 border-t border-slate-100 text-center text-sm text-slate-400 font-medium">
        1 of 1 &nbsp; «&#8249; ›»
      </div>
    </div>
  );
}

// ── Center Panel: Rewards ─────────────────────────────────────

function RewardsPanel() {
  const [copied, setCopied] = useState(false);
  const referralLink = "focusup.app/?ref=yourcode";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 bg-white flex flex-col overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-100">
        <h1 className="text-2xl font-bold text-slate-900">Refer a friend</h1>
        <p className="text-sm text-slate-500 mt-1">
          Share your referral link with a friend to give them a free month of
          focusUp Plus and earn a free month when they upgrade!
        </p>
      </div>
      <div className="px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600 font-mono">
            {referralLink}
          </div>
          <button
            onClick={handleCopy}
            className="px-5 py-2.5 bg-[#0245A3] text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all active:scale-[0.98]"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>

        <div>
          <div className="text-sm font-bold text-slate-700 mb-1">
            Your referrals balance
          </div>
          <div className="text-sm text-slate-500">Total earned: 0 months</div>
        </div>

        <button className="flex items-center gap-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl px-4 py-2.5 hover:bg-slate-50 transition-colors">
          Learn about our referral program
          <span className="text-xs">↗</span>
        </button>
      </div>
    </div>
  );
}

// ── Center Panel: Settings ────────────────────────────────────

function SettingsPanel() {
  const [settingsTab, setSettingsTab] = useState<
    "notifications" | "preferences" | "account"
  >("notifications");
  const [emailCalendar, setEmailCalendar] = useState(true);
  const [perfReports, setPerfReports] = useState(true);
  const [desktopNotifs, setDesktopNotifs] = useState(true);
  const [gcal, setGcal] = useState(false);

  const Toggle = ({
    value,
    onChange,
  }: {
    value: boolean;
    onChange: () => void;
  }) => (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={value}
      className={cn(
        "w-12 h-6 rounded-full transition-colors flex items-center shrink-0",
        value ? "bg-[#0245A3]" : "bg-slate-200",
      )}
    >
      <div
        className={cn(
          "w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
          value ? "translate-x-6" : "translate-x-0.5",
        )}
      />
    </button>
  );

  const SettingRow = ({
    title,
    description,
    value,
    onChange,
  }: {
    title: string;
    description: string;
    value: boolean;
    onChange: () => void;
  }) => (
    <div className="flex items-start justify-between py-5 border-b border-slate-100 last:border-0">
      <div className="flex-1 pr-8">
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="text-sm text-slate-500 mt-0.5">{description}</div>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );

  return (
    <div className="flex-1 bg-white flex flex-col overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-100">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      </div>

      {/* Sub-tabs */}
      <div className="px-8 border-b border-slate-100">
        <div className="flex gap-6">
          {(["notifications", "preferences", "account"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSettingsTab(tab)}
              className={cn(
                "py-3 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px",
                settingsTab === tab
                  ? "text-[#0245A3] border-[#0245A3]"
                  : "text-slate-400 border-transparent hover:text-slate-600",
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-2">
        {settingsTab === "notifications" && (
          <div>
            <SettingRow
              title="Google Calendar Integration"
              description="Get sessions added to your calendar. Not connected."
              value={gcal}
              onChange={() => setGcal((v) => !v)}
            />
            <SettingRow
              title="Email Calendar Invites"
              description="Get calendar events for sessions via email. Works with most calendars."
              value={emailCalendar}
              onChange={() => setEmailCalendar((v) => !v)}
            />
            <SettingRow
              title="Performance Reports"
              description="Get weekly and monthly reports celebrating your accomplishments."
              value={perfReports}
              onChange={() => setPerfReports((v) => !v)}
            />
            <SettingRow
              title="Desktop Notifications"
              description="Get notified when a session is about to start."
              value={desktopNotifs}
              onChange={() => setDesktopNotifs((v) => !v)}
            />
          </div>
        )}
        {settingsTab === "preferences" && (
          <div className="py-8 text-center text-slate-400">
            <Settings className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Preferences settings coming soon</p>
          </div>
        )}
        {settingsTab === "account" && (
          <div className="py-8 text-center text-slate-400">
            <Settings className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Account settings coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Center Panel: Help ────────────────────────────────────────

function HelpPanel() {
  return (
    <div className="flex-1 bg-white flex flex-col overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-100">
        <h1 className="text-2xl font-bold text-slate-900">Help & Support</h1>
      </div>
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Support resources coming soon</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard Page ───────────────────────────────────────

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>("calendar");
  const [duration, setDuration] = useState(50);
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const [isBooking, setIsBooking] = useState(false);

  const handleSlotSelected = useCallback(
    (slot: {
      id: string;
      dateLabel: string;
      timeRange: string;
      durationMin: number;
      slotTime: string;
    }) => {
      setSelectedSlots((prev) => {
        const exists = prev.find((s) => s.id === slot.id);
        if (exists) return prev.filter((s) => s.id !== slot.id);
        return [...prev, slot];
      });
    },
    [],
  );

  const handleRemoveSlot = useCallback((id: string) => {
    setSelectedSlots((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleClearAll = useCallback(() => setSelectedSlots([]), []);

  const handleBookAll = useCallback(async () => {
    if (selectedSlots.length === 0) return;
    setIsBooking(true);
    // Actual multi-booking logic will be wired to the booking mutation
    setTimeout(() => setIsBooking(false), 2000);
  }, [selectedSlots]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .custom-scrollbar::-webkit-scrollbar { width: 5px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #8FBAF3; border-radius: 10px; }
            .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #0245A3; }
          `,
        }}
      />

      <div className="flex h-screen overflow-hidden">
        {/* 1. Left narrow nav */}
        <LeftNav activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* 2. Left booking panel */}
        <BookingPanel
          duration={duration}
          setDuration={setDuration}
          selectedSlots={selectedSlots}
          onRemoveSlot={handleRemoveSlot}
          onClearAll={handleClearAll}
          onBookAll={handleBookAll}
          isBooking={isBooking}
        />

        {/* 3. Center panel */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === "calendar" && (
            <CalendarView
              durationSelected={duration}
              taskType="desk"
              onSlotSelected={handleSlotSelected}
            />
          )}
          {activeTab === "people" && <PeoplePanel />}
          {activeTab === "rewards" && <RewardsPanel />}
          {activeTab === "settings" && <SettingsPanel />}
          {activeTab === "help" && <HelpPanel />}

          {/* Bottom booking bar — appears when slots are selected on calendar */}
          {activeTab === "calendar" && selectedSlots.length > 0 && (
            <div className="shrink-0 flex items-center gap-3 px-6 py-4 bg-white border-t border-slate-200 shadow-lg">
              <button
                onClick={handleClearAll}
                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                Clear All
              </button>
              <button
                onClick={handleBookAll}
                disabled={isBooking}
                className="flex-1 py-3 rounded-xl bg-[#0245A3] text-white text-sm font-bold hover:brightness-110 transition-all active:scale-[0.98] shadow-lg shadow-[#0245A3]/20 disabled:opacity-60"
              >
                {isBooking
                  ? "Booking..."
                  : `Book ${selectedSlots.length} session${selectedSlots.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          )}
        </div>

        {/* 4. Right profile panel */}
        <RightProfilePanel />
      </div>
    </>
  );
}
