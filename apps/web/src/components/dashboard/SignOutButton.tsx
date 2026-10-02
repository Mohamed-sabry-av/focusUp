"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await authClient.signOut();
    // Drop everything cached for the previous user before showing the login page.
    queryClient.clear();
    router.push("/login");
  };

  return (
    <button
      type="button"
      onClick={signOut}
      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-red-50 transition-colors text-left group"
    >
      <LogOut className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-red-500" />
      <span className="text-xs font-medium text-slate-600 group-hover:text-red-600">
        Sign out
      </span>
    </button>
  );
}
