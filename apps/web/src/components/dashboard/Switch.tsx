"use client";

import { cn } from "@focusUp/ui/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** The accessible name: what the switch controls. */
  label: string;
  disabled?: boolean;
}

/** An on/off switch with the right ARIA role, keyboard focus ring and label. */
export function Switch({ checked, onChange, label, disabled = false }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "w-10 h-6 flex items-center rounded-full transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0245A3] disabled:opacity-50",
        checked ? "bg-[#0245A3]" : "bg-slate-200",
      )}
    >
      <span
        className={cn(
          "w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
          checked ? "translate-x-5" : "translate-x-1",
        )}
      />
    </button>
  );
}
