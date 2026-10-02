"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Home,
  Users,
  Gift,
  Settings,
  HelpCircle,
  Shuffle,
  ChevronDown,
  ChevronUp,
  X,
  Calendar,
  Star,
  Video,
  MessageSquare,
  HelpCircle as HelpIcon,
  Menu,
  ExternalLink,
  Trash2,
  Pencil,
} from "lucide-react";
import { cn } from "@focusUp/ui/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@focusUp/ui/components/avatar";
import { Skeleton } from "@focusUp/ui/components/skeleton";
import { Sheet, SheetContent } from "@focusUp/ui/components/sheet";
import {
  useCurrentUser,
  useUserStats,
  useUserPreferences,
  useUpdatePreferences,
} from "@/hooks/useUser";
import { useCreateBooking } from "@/hooks/useBookings";
import { toast } from "sonner";
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
  isOpen,
  onToggle,
}: {
  duration: number;
  setDuration: (d: number) => void;
  selectedSlots: SelectedSlot[];
  onRemoveSlot: (id: string) => void;
  onClearAll: () => void;
  onBookAll: () => void;
  isBooking: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const DURATIONS = [25, 50, 75];

  return (
    <div className="w-[260px] bg-white flex flex-col shrink-0 h-full">
      {/* Header with toggle */}
      <div className="flex items-center justify-between px-4 pt-4 pb-0 shrink-0">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Session
        </span>
        <button
          onClick={onToggle}
          title={isOpen ? "Collapse panel" : "Expand panel"}
          className="text-slate-400 hover:text-slate-600 text-xs font-bold tracking-widest transition-colors"
        >
          {isOpen ? "«" : "»"}
        </button>
      </div>

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
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-500">
                {selectedSlots.length} Session
                {selectedSlots.length !== 1 ? "s" : ""} Selected
              </div>
              <button
                onClick={onClearAll}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
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

function RightProfilePanel({ onCollapse }: { onCollapse: () => void }) {
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
    <div className="w-[260px] bg-white flex flex-col shrink-0 h-full">
      <div className="flex-1 overflow-y-auto">
        {/* Top collapse toggle */}
        <div className="flex justify-end p-3 border-b border-slate-100">
          <button
            onClick={onCollapse}
            title="Collapse panel"
            className="text-slate-400 hover:text-slate-600 text-xs font-bold tracking-widest transition-colors"
          >
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
  const { data: userData } = useCurrentUser();
  const user = userData?.data?.user;

  const [settingsTab, setSettingsTab] = useState<
    "notifications" | "preferences" | "account"
  >("notifications");
  const { data: prefsData } = useUserPreferences();
  const updatePreferences = useUpdatePreferences();
  const prefs = prefsData?.data?.preferences;

  const [gcal, setGcal] = useState(false);
  const [emailCalendar, setEmailCalendar] = useState(true);
  const [perfReports, setPerfReports] = useState(true);
  const [desktopNotifs, setDesktopNotifs] = useState(true);

  useEffect(() => {
    if (prefs) {
      setGcal(prefs.googleCalendarSync);
      setEmailCalendar(prefs.emailCalendarInvites);
      setPerfReports(prefs.performanceReports);
      setDesktopNotifs(prefs.desktopNotifications);
    }
  }, [prefs]);

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
        {/* ── Notifications tab ── */}
        {settingsTab === "notifications" && (
          <div>
            <SettingRow
              title="Google Calendar Integration"
              description="Get sessions added to your calendar. Not connected."
              value={gcal}
              onChange={() => {
                const next = !gcal;
                setGcal(next);
                updatePreferences.mutate(
                  { googleCalendarSync: next },
                  { onSuccess: () => toast.success("Settings saved") },
                );
              }}
            />
            <SettingRow
              title="Email Calendar Invites"
              description="Get calendar events for sessions via email. Works with most calendars."
              value={emailCalendar}
              onChange={() => {
                const next = !emailCalendar;
                setEmailCalendar(next);
                updatePreferences.mutate(
                  { emailCalendarInvites: next },
                  { onSuccess: () => toast.success("Settings saved") },
                );
              }}
            />
            <SettingRow
              title="Performance Reports"
              description="Get weekly and monthly reports celebrating your accomplishments."
              value={perfReports}
              onChange={() => {
                const next = !perfReports;
                setPerfReports(next);
                updatePreferences.mutate(
                  { performanceReports: next },
                  { onSuccess: () => toast.success("Settings saved") },
                );
              }}
            />
            <SettingRow
              title="Desktop Notifications"
              description="Get notified when a session is about to start."
              value={desktopNotifs}
              onChange={() => {
                const next = !desktopNotifs;
                setDesktopNotifs(next);
                updatePreferences.mutate(
                  { desktopNotifications: next },
                  { onSuccess: () => toast.success("Settings saved") },
                );
              }}
            />
          </div>
        )}

        {/* ── Preferences tab ── */}
        {settingsTab === "preferences" && (
          <div className="divide-y divide-slate-100">
            {[
              {
                title: "Focusmate Guides Preference",
                value: "Complete 15 sessions to unlock",
                hasEdit: true,
                disabled: true,
              },
              { title: "Availability", value: "Everyone", hasEdit: true },
              {
                title: "Quiet Mode",
                value:
                  "I'm okay being matched with someone in Quiet Mode even if I'm not in Quiet Mode",
                hasEdit: true,
              },
              { title: "Prefer Favorites", value: "Anyone", hasEdit: true },
              {
                title: "Gender Preference",
                value: "Match me with everyone",
                hasEdit: true,
              },
              {
                title: "Time Format",
                value: "12-hour (AM/PM)",
                hasEdit: true,
              },
              {
                title: "My week starts on",
                value: "Monday",
                hasEdit: true,
              },
              {
                title: "Auto Rematch",
                value: "Do not auto rematch if my partner is late",
                hasEdit: true,
              },
              {
                title: "Microphone",
                value: "Unmuted when I join a session",
                hasEdit: true,
              },
            ].map(({ title, value, disabled }) => (
              <div
                key={title}
                className="flex items-start justify-between py-5"
              >
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-800">
                    {title}
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">{value}</div>
                </div>
                <button
                  disabled={!!disabled}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Dark Mode row with toggle */}
            <div className="flex items-start justify-between py-5">
              <div>
                <div className="text-sm font-semibold text-slate-800">
                  Dark Mode
                </div>
                <div className="text-sm text-slate-500 mt-0.5">
                  Dark Mode Disabled
                </div>
              </div>
              <Toggle value={false} onChange={() => {}} />
            </div>
          </div>
        )}

        {/* ── Account tab ── */}
        {settingsTab === "account" && (
          <div>
            {/* Basic info */}
            <div className="divide-y divide-slate-100">
              {[
                { title: "Name", value: user?.displayName ?? "—" },
                { title: "Gender", value: "Not set yet" },
                { title: "Timezone", value: user?.timezone ?? "UTC" },
                {
                  title: "Profile link",
                  value: `focusup.app/user/${user?.username ?? "—"}`,
                },
              ].map(({ title, value }) => (
                <div
                  key={title}
                  className="flex items-start justify-between py-5"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      {title}
                    </div>
                    <div className="text-sm text-slate-500 mt-0.5">{value}</div>
                  </div>
                  <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors shrink-0">
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Connected apps & API */}
            <div className="border-t border-slate-100 mt-2 pt-2 divide-y divide-slate-100">
              {[
                {
                  title: "Connected apps",
                  value:
                    "Manage which applications can access your focusUp data.",
                },
                {
                  title: "API Key",
                  value: "Access your focusUp data programmatically.",
                },
              ].map(({ title, value }) => (
                <div
                  key={title}
                  className="flex items-start justify-between py-5"
                >
                  <div className="flex-1 pr-4">
                    <div className="text-sm font-semibold text-slate-800">
                      {title}
                    </div>
                    <div className="text-sm text-slate-500 mt-0.5">{value}</div>
                  </div>
                  <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors shrink-0">
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Subscription & danger zone */}
            <div className="border-t border-slate-100 mt-2 pt-2 divide-y divide-slate-100">
              <div className="flex items-start justify-between py-5">
                <div className="flex-1 pr-4">
                  <div className="text-sm font-semibold text-slate-800">
                    Manage subscription
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">
                    Update your payment method, view invoices, and cancel/renew.
                  </div>
                  <div className="text-sm font-semibold text-slate-700 mt-2">
                    Your referrals balance
                  </div>
                  <div className="text-sm text-slate-500">
                    Total earned: 0 months
                  </div>
                </div>
                <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-start justify-between py-5">
                <div>
                  <div className="text-sm font-semibold text-red-600">
                    Delete account
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">
                    Permanently delete your account and all your data.
                  </div>
                </div>
                <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-red-200 text-red-400 hover:bg-red-50 transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
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
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [mobileBookingOpen, setMobileBookingOpen] = useState(false);

  const createBooking = useCreateBooking();

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
    if (selectedSlots.length === 0 || isBooking) return;
    setIsBooking(true);
    try {
      for (const slot of selectedSlots) {
        await createBooking.mutateAsync({
          slotTime: slot.slotTime,
          durationMin: slot.durationMin,
        });
      }
      setSelectedSlots([]);
      toast.success(
        `${selectedSlots.length} session${selectedSlots.length !== 1 ? "s" : ""} booked!`,
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to book sessions");
    } finally {
      setIsBooking(false);
    }
  }, [selectedSlots, isBooking, createBooking]);

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

      <div className="flex h-screen overflow-hidden bg-slate-100">
        {/* ── Shared left narrow nav (always visible) ── */}
        <LeftNav activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* ════════════════════════════════════════════
            MOBILE LAYOUT  (md:hidden)
        ════════════════════════════════════════════ */}
        <div className="md:hidden flex flex-col flex-1 h-full overflow-hidden bg-white">
          {/* Main content area */}
          <div className="flex-1 overflow-hidden">
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
          </div>

          {/* Mobile bottom controls — calendar tab only */}
          {activeTab === "calendar" && (
            <div className="shrink-0 bg-white border-t border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                {[25, 50, 75].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                      duration === d
                        ? "bg-[#0245A3]/10 text-[#0245A3] border border-[#0245A3]/20"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {d}m
                  </button>
                ))}
                <button className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl text-slate-500">
                  <Shuffle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setMobileBookingOpen(true)}
                  className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl text-slate-500"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>

              {/* Booking bar when slots selected */}
              {selectedSlots.length > 0 && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleClearAll}
                    className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-500"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handleBookAll}
                    disabled={isBooking}
                    className="flex-1 py-2.5 rounded-xl bg-[#0245A3] text-white text-sm font-bold disabled:opacity-60"
                  >
                    {isBooking ? "..." : `Book ${selectedSlots.length}`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile bottom nav */}
          <nav className="shrink-0 bg-white border-t border-slate-200 flex items-center justify-around px-2 py-2">
            {[
              { id: "calendar" as TabId, icon: Home, label: "Home" },
              { id: "people" as TabId, icon: Calendar, label: "Schedule" },
              { id: "rewards" as TabId, icon: Star, label: "Favorites" },
              { id: "settings" as TabId, icon: Menu, label: "Menu" },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
                  activeTab === id ? "bg-[#0245A3]/10" : "",
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    activeTab === id ? "text-[#0245A3]" : "text-slate-400",
                  )}
                  strokeWidth={activeTab === id ? 2.5 : 2}
                />
                <span
                  className={cn(
                    "text-[10px] font-bold",
                    activeTab === id ? "text-[#0245A3]" : "text-slate-400",
                  )}
                >
                  {label}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* ════════════════════════════════════════════
            DESKTOP LAYOUT  (hidden md:flex)
        ════════════════════════════════════════════ */}
        <div className="hidden md:flex flex-1 h-full gap-3 p-3 overflow-hidden">
          {/* Booking panel card */}
          {isLeftPanelOpen && (
            <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200/60 shrink-0 bg-white">
              <BookingPanel
                duration={duration}
                setDuration={setDuration}
                selectedSlots={selectedSlots}
                onRemoveSlot={handleRemoveSlot}
                onClearAll={handleClearAll}
                onBookAll={handleBookAll}
                isBooking={isBooking}
                isOpen={isLeftPanelOpen}
                onToggle={() => setIsLeftPanelOpen(false)}
              />
            </div>
          )}

          {/* Collapsed left panel re-open strip */}
          {!isLeftPanelOpen && (
            <button
              onClick={() => setIsLeftPanelOpen(true)}
              className="w-10 bg-white rounded-2xl shadow-sm border border-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-600 shrink-0 transition-colors"
              title="Expand booking panel"
            >
              »
            </button>
          )}

          {/* Center card */}
          <div className="flex-1 rounded-2xl overflow-hidden shadow-sm border border-slate-200/60 flex flex-col bg-white min-w-0">
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

            {/* Booking bar — appears when slots are selected */}
            {activeTab === "calendar" && selectedSlots.length > 0 && (
              <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-t border-slate-200 bg-white">
                <button
                  onClick={handleClearAll}
                  className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Clear All
                </button>
                <button
                  onClick={handleBookAll}
                  disabled={isBooking}
                  className="flex-1 py-2.5 rounded-xl bg-[#0245A3] text-white text-sm font-bold hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {isBooking
                    ? "Booking..."
                    : `Book ${selectedSlots.length} session${selectedSlots.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            )}
          </div>

          {/* Right panel card */}
          {isRightPanelOpen && (
            <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200/60 shrink-0 bg-white">
              <RightProfilePanel
                onCollapse={() => setIsRightPanelOpen(false)}
              />
            </div>
          )}

          {/* Collapsed right panel re-open strip */}
          {!isRightPanelOpen && (
            <button
              onClick={() => setIsRightPanelOpen(true)}
              className="w-10 bg-white rounded-2xl shadow-sm border border-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-600 shrink-0 transition-colors"
              title="Expand profile panel"
            >
              «
            </button>
          )}
        </div>

        {/* ════════════════════════════════════════════
            MOBILE BOOKING SETTINGS SHEET
        ════════════════════════════════════════════ */}
        <Sheet open={mobileBookingOpen} onOpenChange={setMobileBookingOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl bg-white p-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">
                  Session Settings
                </h3>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100"
                  onClick={() => setMobileBookingOpen(false)}
                >
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Duration
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[25, 50, 75].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={cn(
                        "py-3 rounded-xl text-sm font-bold flex flex-col items-center gap-0.5 transition-all",
                        duration === d
                          ? "bg-[#0245A3] text-white"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      <span>{d}</span>
                      <span className="text-[9px] opacity-80">min</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              <button
                onClick={() => {
                  handleBookAll();
                  setMobileBookingOpen(false);
                }}
                disabled={selectedSlots.length === 0 || isBooking}
                className="w-full py-4 bg-[#0245A3] text-white rounded-2xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-60"
              >
                {isBooking
                  ? "Booking..."
                  : selectedSlots.length > 0
                    ? `Book ${selectedSlots.length} session${selectedSlots.length !== 1 ? "s" : ""}`
                    : "Book session"}
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
