"use client";

import { useState } from "react";
import { cn } from "@focusUp/ui/lib/utils";
import { useCurrentUser, useUserStats } from "@/hooks/useUser";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  Star,
  Monitor,
  PersonStanding,
  Shapes,
  Video,
  MessageSquare,
  HelpCircle,
  ChevronsRight,
  MicOff,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@focusUp/ui/components/avatar";

/* ═══════════════════════════════════════════════════════════════════
   1. SESSION SETTINGS PANEL (Left)
   ═══════════════════════════════════════════════════════════════════ */

const DURATIONS = [25, 50, 75] as const;
const TASK_TYPES = [
  { id: "desk", label: "Desk", icon: Monitor },
  { id: "moving", label: "Moving", icon: PersonStanding },
  { id: "any", label: "Anything", icon: Shapes },
] as const;

function SettingsPanel() {
  const [duration, setDuration] = useState<number>(25);
  const [taskType, setTaskType] = useState("desk");
  const [quietMode, setQuietMode] = useState(false);
  const [preferFavorites, setPreferFavorites] = useState(false);

  return (
    <aside className="w-[320px] shrink-0 flex flex-col gap-4 overflow-y-auto pr-1 pb-1 custom-scrollbar">
      {/* Book Button */}
      <button className="w-full py-4 bg-[#5A67D8] text-white rounded-[20px] font-bold text-sm shadow-md hover:brightness-110 active:scale-[0.98] transition-all">
        Book session
      </button>

      {/* Settings Card */}
      <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-5 space-y-6 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80">
            <h2 className="text-sm font-semibold text-slate-700">Session Settings</h2>
            <Info className="w-4 h-4 text-slate-400" />
          </div>
          <button className="p-1 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Duration Segmented Control */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-2 block">
            Duration
          </label>
          <div className="flex bg-[#f3f4f6] p-1 rounded-xl">
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={cn(
                  "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
                  duration === d
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {d}
                <br />
                <span className="text-[10px] font-normal text-slate-400">min</span>
              </button>
            ))}
          </div>
        </div>

        {/* Task Type Segmented Control */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-2 block">
            My Task
          </label>
          <div className="flex bg-[#f3f4f6] p-1 rounded-xl">
            {TASK_TYPES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTaskType(id)}
                className={cn(
                  "flex-1 py-2 flex flex-col items-center gap-1 rounded-lg transition-all",
                  taskType === id
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-[10px] font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Quiet Mode</span>
            <button
              onClick={() => setQuietMode(!quietMode)}
              className={cn(
                "w-10 h-5 rounded-full relative flex items-center px-0.5 transition-colors border border-slate-200",
                quietMode ? "bg-[#5A67D8]" : "bg-slate-100"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full shadow-sm transition-transform",
                  quietMode ? "bg-white translate-x-5" : "bg-white translate-x-0"
                )}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Prefer Favorites</span>
            <button
              onClick={() => setPreferFavorites(!preferFavorites)}
              className={cn(
                "w-10 h-5 rounded-full relative flex items-center px-0.5 transition-colors border border-slate-200",
                preferFavorites ? "bg-[#5A67D8]" : "bg-slate-100"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full shadow-sm transition-transform",
                  preferFavorites ? "bg-white translate-x-5" : "bg-white translate-x-0"
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   2. CALENDAR PANEL (Center)
   ═══════════════════════════════════════════════════════════════════ */

const HOURS = [
  "12am", "1am", "2am", "3am", "4am" // Just a small set to match visual
];

function CalendarPanel() {
  return (
    <main className="flex-1 bg-white rounded-[20px] border border-slate-100 shadow-sm flex flex-col min-w-0 overflow-hidden">
      {/* Top Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-100">
        <button className="flex items-center gap-2 px-4 py-2 font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
          Apr 2026
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            3 days
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
          
          <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <button className="px-3 py-2 border-r border-slate-200 hover:bg-slate-50 transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <button className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              Today
            </button>
            <button className="px-3 py-2 border-l border-slate-200 hover:bg-slate-50 transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative">
        {/* Day Headers */}
        <div className="grid grid-cols-[50px_1fr_1fr_1fr] sticky top-0 bg-white z-20 border-b border-slate-100 shadow-[0_4px_10px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col items-center justify-center p-2">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">EET</span>
          </div>
          <div className="p-4 flex items-center font-semibold text-sm border-l border-slate-100">
            <span className="text-[#5A67D8]">Sat 11</span>
          </div>
          <div className="p-4 flex items-center font-semibold text-sm text-slate-500 border-l border-slate-100">
            Sun 12
          </div>
          <div className="p-4 flex items-center font-semibold text-sm text-slate-500 border-l border-slate-100">
            Mon 13
          </div>
        </div>

        {/* Grid Body */}
        <div className="grid grid-cols-[50px_1fr_1fr_1fr] relative">
          {/* Time Labels */}
          <div className="border-r border-slate-100 relative">
             <div className="absolute top-[28px] text-[11px] font-bold text-red-500 w-full text-right pr-2 bg-white rounded-r">
                12:17a
             </div>
             {HOURS.map((h, i) => (
                <div key={h} className="h-[120px] text-[11px] font-medium text-slate-400 flex flex-col pt-1 pl-2">
                   {h}
                   <div className="mt-6">:15</div>
                   <div className="mt-3">:30</div>
                   <div className="mt-3">:45</div>
                </div>
             ))}
          </div>

          {/* Lines (Spanning all 3 columns) */}
          <div className="absolute inset-0 left-[50px] pointer-events-none">
             {/* Red Time line */}
             <div className="absolute top-[34px] left-0 right-0 h-px bg-red-500" />
             <div className="absolute top-[32px] left-[-3px] w-1.5 h-1.5 bg-red-500 rounded-full" />
             
             {/* Horizontal grid lines only, as per screenshot */}
             {HOURS.map((_, i) => (
                <div key={i} className="absolute w-full h-[120px]" style={{ top: i * 120 }}>
                   <div className="w-full h-px bg-slate-100 absolute top-0" />
                   <div className="w-full h-px bg-slate-50 absolute top-[30px] border-dashed" />
                   <div className="w-full h-px bg-slate-50 absolute top-[60px] border-dashed" />
                   <div className="w-full h-px bg-slate-50 absolute top-[90px] border-dashed" />
                </div>
             ))}
          </div>

          {/* Col 1 */}
           <div className="relative border-r border-slate-100/50">
             {/* Example session block */}
             <div className="absolute top-[80px] left-2 w-10 h-10 bg-[#e0e7ff] rounded-xl flex items-center justify-center cursor-pointer shadow-sm hover:-translate-y-0.5 transition-transform">
               <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-[#b4c6fc] text-[#5A67D8]">S</AvatarFallback>
               </Avatar>
               <div className="absolute -bottom-1 -left-1 bg-white rounded-full p-0.5 shadow-sm border border-slate-100">
                 <MicOff className="w-2.5 h-2.5 text-blue-500" />
               </div>
             </div>
             {/* Another block in Col 1 */}
             <div className="absolute top-[180px] left-2 w-10 h-10 bg-[#65a30d] rounded-xl flex items-center justify-center text-white font-bold cursor-pointer shadow-sm">
                S
             </div>
           </div>

           {/* Col 2 */}
           <div className="relative border-r border-slate-100/50">
             <div className="absolute top-[180px] left-2 w-10 h-10 bg-[#65a30d] rounded-xl flex items-center justify-center text-white font-bold cursor-pointer shadow-sm">
                S
             </div>
           </div>

           {/* Col 3 */}
           <div className="relative">
             <div className="absolute top-[50px] left-2 cursor-pointer shadow-sm hover:scale-105 transition-transform">
               <Avatar className="w-10 h-10 rounded-xl">
                  <AvatarImage src="https://i.pravatar.cc/150?u=1" />
                  <AvatarFallback>U</AvatarFallback>
               </Avatar>
             </div>
           </div>
        </div>
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   3. PROFILE PANEL (Right)
   ═══════════════════════════════════════════════════════════════════ */

function ProfilePanel() {
  const { data: userData } = useCurrentUser();
  const { data: statsData } = useUserStats();
  const user = userData?.data?.user;
  const stats = statsData?.data;

  const displayName = user?.displayName ?? "User";

  return (
    <aside className="w-[320px] bg-white rounded-[20px] border border-slate-100 shadow-sm flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
      {/* Top action */}
      <div className="flex justify-end p-4 pb-0">
        <button className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors border border-slate-200">
           <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      <div className="px-6 pb-6 pt-2">
         {/* Avatar */}
         <Avatar className="w-16 h-16 rounded-[14px] shadow-sm mb-4 bg-slate-100">
           <AvatarImage src={user?.avatarUrl ?? undefined} className="object-cover rounded-[14px]" />
           <AvatarFallback className="bg-[#5A67D8] text-white text-xl font-bold rounded-[14px]">
             {displayName.charAt(0).toUpperCase()}
           </AvatarFallback>
         </Avatar>

         <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-snug">
            Good Morning,<br/>{displayName.split(' ')[0]}!
         </h2>
         
         <div className="mt-3 space-y-1">
            <div className="text-[13px] font-medium text-[#5A67D8]">
              {stats?.sessionsThisWeek ?? 0} session
            </div>
            <div className="text-[11px] font-medium text-slate-500">
              Free Plan · {stats?.sessionLimit ?? 3} sessions per week
            </div>
         </div>

         <button className="mt-4 px-4 py-2 bg-[#5A67D8] text-white rounded-xl font-semibold text-sm shadow-md hover:brightness-110 active:scale-95 transition-all">
            Upgrade to Plus
         </button>

         {/* Nav Items */}
         <div className="mt-6 flex flex-col gap-3">
            <button className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all bg-white group">
               <div className="flex items-center gap-3">
                 <Calendar className="w-4 h-4 text-slate-400 group-hover:text-[#5A67D8] transition-colors" />
                 <span className="text-sm font-semibold text-slate-600">My Schedule</span>
               </div>
               <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
            <button className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all bg-white group">
               <div className="flex items-center gap-3">
                 <Star className="w-4 h-4 text-slate-400 fill-slate-300 group-hover:text-[#5A67D8] group-hover:fill-[#5A67D8] transition-colors" />
                 <span className="text-sm font-semibold text-slate-600">Favorites Schedule</span>
               </div>
               <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
         </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-auto p-4 flex flex-col gap-3">
         <button className="w-full flex items-center justify-center gap-2 p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <Video className="w-[18px] h-[18px] text-slate-400" />
            Test audio and video
         </button>
         <button className="w-full flex items-center justify-center gap-2 p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <MessageSquare className="w-[18px] h-[18px] text-slate-400" />
            Share feedback
         </button>
         <button className="w-full flex items-center justify-center gap-2 p-3 bg-slate-100 border border-transparent rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors mb-2">
            <HelpCircle className="w-[18px] h-[18px] text-slate-400" />
            Contact support
         </button>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE EXPORT
   ═══════════════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: #cbd5e1;
        }
      `}} />
      <SettingsPanel />
      <CalendarPanel />
      <ProfilePanel />
    </>
  );
}
