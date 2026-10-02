"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@focusUp/ui/lib/utils";

import { AuthCard } from "@/components/auth/AuthCard";
import { authClient } from "@/lib/auth-client";
import { zodErrorToFieldErrors } from "@/lib/zod-field-errors";

const ResetPasswordInput = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type ResetPasswordValues = z.infer<typeof ResetPasswordInput>;

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const linkProblem = params.get("error");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: async (data) => {
      const result = await ResetPasswordInput.safeParseAsync(data);
      if (result.success) return { values: result.data, errors: {} };
      return { values: {}, errors: zodErrorToFieldErrors(result.error) };
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ResetPasswordValues) => {
      const { error } = await authClient.resetPassword({
        newPassword: data.newPassword,
        token: token ?? "",
      });
      if (error) throw new Error(error.message || "Could not reset your password");
    },
    onSuccess: () => {
      toast.success("Password updated. Please sign in.");
      router.push("/login");
    },
    onError: (error) => setServerError(error.message),
  });

  if (!token || linkProblem) {
    return (
      <AuthCard
        title="This link is not valid"
        description="The reset link is missing, has expired or was already used. Request a new one."
        footer={
          <Link className="text-[#003076] font-bold hover:underline" href="/login">
            Back to sign in
          </Link>
        }
      >
        <Link
          href="/forgot-password"
          className="block w-full py-4 rounded-xl bg-gradient-to-r from-[#003076] to-[#0245A3] text-white font-bold tracking-wide text-center hover:brightness-110 transition-all"
        >
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  const fieldClass = (hasError: boolean) =>
    cn(
      "w-full px-4 py-3.5 rounded-xl border-2 bg-slate-50 transition-all duration-200 outline-none text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal",
      hasError
        ? "border-red-300 focus:border-red-500 focus:bg-white"
        : "border-transparent focus:border-[#003076] focus:bg-white hover:border-slate-200",
    );

  return (
    <AuthCard
      title="Choose a new password"
      description="Use at least 8 characters. You will be signed out on every other device."
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
            htmlFor="newPassword"
            className="block text-xs font-bold text-slate-500 tracking-wider uppercase ml-1"
          >
            New password
          </label>
          <input
            {...register("newPassword")}
            id="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            disabled={mutation.isPending}
            className={fieldClass(Boolean(errors.newPassword))}
          />
          {errors.newPassword && (
            <p className="text-xs text-red-500 font-medium ml-1">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="block text-xs font-bold text-slate-500 tracking-wider uppercase ml-1"
          >
            Confirm password
          </label>
          <input
            {...register("confirmPassword")}
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat the password"
            disabled={mutation.isPending}
            className={fieldClass(Boolean(errors.confirmPassword))}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-500 font-medium ml-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-[#003076] to-[#0245A3] text-white font-bold tracking-wide hover:brightness-110 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#003076]/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {mutation.isPending ? "Saving..." : "Update password"}
        </button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
