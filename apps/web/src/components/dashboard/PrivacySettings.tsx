"use client";

import { toast } from "sonner";

import { useCurrentUser, useUpdateProfile } from "@/hooks/useUser";
import { Switch } from "./Switch";

interface Row {
  field: "hidePhoto" | "dataSaver";
  title: string;
  description: string;
}

const ROWS: Row[] = [
  {
    field: "hidePhoto",
    title: "Hide my photo",
    description: "On the calendar, other people see your initials instead of your photo.",
  },
  {
    field: "dataSaver",
    title: "Data saver",
    description: "Uses less data in video sessions by capping video quality at 360p.",
  },
];

/** Privacy and data switches for the Preferences tab. They save as soon as they are flipped. */
export function PrivacySettings() {
  const { data } = useCurrentUser();
  const user = data?.data?.user as { hidePhoto?: boolean; dataSaver?: boolean } | undefined;
  const update = useUpdateProfile();

  return (
    <div className="divide-y divide-slate-100 border-b border-slate-100">
      {ROWS.map((row) => (
        <div key={row.field} className="flex items-start justify-between gap-4 py-5">
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-800">{row.title}</div>
            <div className="text-sm text-slate-500 mt-0.5">{row.description}</div>
          </div>
          <Switch
            label={row.title}
            checked={Boolean(user?.[row.field])}
            disabled={!user || update.isPending}
            onChange={(next) =>
              update.mutate(
                { [row.field]: next },
                { onError: (error) => toast.error(error.message) },
              )
            }
          />
        </div>
      ))}
    </div>
  );
}
