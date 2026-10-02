"use client";

import { MailWarning } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { authClient, webUrl } from "@/lib/auth-client";
import { useCurrentUser } from "@/hooks/useUser";

/** Shown to signed-in users whose email is not verified yet (they cannot book or join until it is). */
export function VerifyEmailBanner() {
  const { data } = useCurrentUser();
  const user = data?.data?.user as { email: string; emailVerified: boolean } | undefined;

  const resend = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: webUrl("/dashboard"),
      });
      if (error) throw new Error(error.message || "Could not send the email");
    },
    onSuccess: () => toast.success("Verification email sent. Check your inbox."),
    onError: (error) => toast.error(error.message),
  });

  if (!user || user.emailVerified) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-900"
    >
      <span className="flex items-center gap-2 font-medium">
        <MailWarning className="w-4 h-4 shrink-0" />
        Verify <strong>{user.email}</strong> to book and join sessions.
      </span>
      <button
        type="button"
        onClick={() => resend.mutate(user.email)}
        disabled={resend.isPending}
        className="font-bold underline underline-offset-2 hover:text-amber-700 disabled:opacity-60"
      >
        {resend.isPending ? "Sending..." : "Resend email"}
      </button>
    </div>
  );
}
