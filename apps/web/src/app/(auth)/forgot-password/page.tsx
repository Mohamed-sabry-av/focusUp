"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { cn } from "@focusUp/ui/lib/utils";

import { AuthCard } from "@/components/auth/AuthCard";
import { authClient, webUrl } from "@/lib/auth-client";
import { zodErrorToFieldErrors } from "@/lib/zod-field-errors";

const ForgotPasswordInput = z.object({
  email: z.string().email("Invalid email address"),
});
type ForgotPasswordValues = z.infer<typeof ForgotPasswordInput>;

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: async (data) => {
      const result = await ForgotPasswordInput.safeParseAsync(data);
      if (result.success) return { values: result.data, errors: {} };
      return { values: {}, errors: zodErrorToFieldErrors(result.error) };
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ForgotPasswordValues) => {
      const { error } = await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: webUrl("/reset-password"),
      });
      if (error) throw new Error(error.message || "Could not send the reset email");
      return data.email;
    },
    onSuccess: (email) => setSentTo(email),
    onError: (error) => setServerError(error.message),
  });

  if (sentTo) {
    return (
      <AuthCard
        title="Check your email"
        description="If an account exists for that address, we have sent a link to reset your password."
        footer={
          <Link className="text-[#003076] font-bold hover:underline" href="/login">
            Back to sign in
          </Link>
        }
      >
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#F2FCFC] border border-[#BDF1F6] text-sm font-medium text-slate-700">
          <MailCheck className="w-5 h-5 text-[#0245A3] shrink-0" />
          <span>
            Sent to <strong>{sentTo}</strong>. The link expires in 1 hour.
          </span>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your email and we will send you a link to choose a new one."
      footer={
        <Link className="text-[#003076] font-bold hover:underline" href="/login">
          Back to sign in
        </Link>
      }
    >
      {serverError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-semibold border border-red-100">
          {serverError}
        </div>
      )}

      <form
        onSubmit={handleSubmit((data) => {
          setServerError(null);
          mutation.mutate(data);
        })}
        className="space-y-5"
      >
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-xs font-bold text-slate-500 tracking-wider uppercase ml-1"
          >
            Email Address
          </label>
          <input
            {...register("email")}
            id="email"
            type="email"
            placeholder="name@example.com"
            disabled={mutation.isPending}
            className={cn(
              "w-full px-4 py-3.5 rounded-xl border-2 bg-slate-50 transition-all duration-200 outline-none text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal",
              errors.email
                ? "border-red-300 focus:border-red-500 focus:bg-white"
                : "border-transparent focus:border-[#003076] focus:bg-white hover:border-slate-200",
            )}
          />
          {errors.email && (
            <p className="text-xs text-red-500 font-medium ml-1">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-[#003076] to-[#0245A3] text-white font-bold tracking-wide hover:brightness-110 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#003076]/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {mutation.isPending ? "Sending..." : "Send reset link"}
        </button>
      </form>
    </AuthCard>
  );
}
