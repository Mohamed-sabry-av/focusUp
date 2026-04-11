"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { RegisterInput } from "@focusUp/shared-types";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@focusUp/ui/lib/utils";
import { toast } from "sonner";
import { env } from "@focusUp/env/web";
import { zodErrorToFieldErrors } from "@/lib/zod-field-errors";

type RegisterFormValues = z.infer<typeof RegisterInput>;

function calculatePasswordStrength(password: string) {
  if (!password) return 0;
  let score = 0;
  if (password.length > 8) score += 1;
  if (password.match(/[a-z]/) && password.match(/[A-Z]/)) score += 1;
  if (password.match(/\d/)) score += 1;
  if (password.match(/[^a-zA-Z\d]/)) score += 1;
  return score;
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: async (data) => {
      const result = await RegisterInput.safeParseAsync(data);
      if (result.success) return { values: result.data, errors: {} };
      return {
        values: {},
        errors: zodErrorToFieldErrors(result.error),
      };
    },
  });

  const passwordValue = watch("password", "");
  const strengthScore = calculatePasswordStrength(passwordValue);

  const mutation = useMutation({
    mutationFn: async (data: RegisterFormValues) => {
      const res = await fetch(
        `${env.NEXT_PUBLIC_SERVER_URL}/api/v1/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          credentials: "include",
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to register");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Account created successfully!");
      router.push("/onboarding");
    },
    onError: (error) => {
      setServerError(error.message);
      toast.error("Registration failed. Please check your details.");
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    setServerError(null);
    mutation.mutate(data);
  };

  const handleGoogleLogin = () => {
    window.location.href = `${env.NEXT_PUBLIC_SERVER_URL}/api/v1/auth/google`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcf9f8] text-[#1c1b1b] font-sans antialiased animate-in fade-in duration-500">
      {/* Header */}
      <header className="w-full px-8 py-8 md:py-10 max-w-7xl mx-auto flex justify-center md:justify-start items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#003076] flex items-center justify-center font-extrabold text-white">
            F
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-[#003076]">
            FocusUP
          </span>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 max-w-5xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl shadow-[#1c1b1b]/5 transition-all">
          {/* Left Side: Visual Sanctuary */}
          <div className="hidden lg:flex lg:col-span-5 relative overflow-hidden bg-[#0245a3]">
            <img
              className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
              alt="Deep focus sanctuary"
              src="https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=2070&auto=format&fit=crop"
            />
            <div className="relative z-10 p-12 flex flex-col justify-end h-full text-white bg-gradient-to-t from-[#0245a3] to-transparent">
              <h1 className="text-4xl font-extrabold leading-tight mb-4 tracking-tight">
                Deep work is a journey,
                <br />
                not a destination.
              </h1>
              <p className="text-[#9eb9ff] text-lg font-medium leading-relaxed">
                Join a community dedicated to the art of focus and cognitive
                endurance.
              </p>
            </div>
          </div>

          {/* Right Side: Sign Up Canvas */}
          <div className="lg:col-span-7 p-8 md:p-14 lg:p-16 flex flex-col justify-center bg-white">
            <div className="max-w-md mx-auto w-full">
              <div className="mb-10 text-center md:text-left">
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 mb-2">
                  Create your account
                </h2>
                <p className="text-slate-500 font-medium">
                  Enter your details to begin your focus session.
                </p>
              </div>

              {serverError && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-semibold border border-red-100 animate-in slide-in-from-top-1">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 px-1 uppercase tracking-wider block">
                      Display Name
                    </label>
                    <input
                      {...register("displayName")}
                      className={cn(
                        "w-full px-4 py-3.5 rounded-xl border-2 transition-all duration-200 outline-none text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal bg-slate-50",
                        errors.displayName
                          ? "border-red-300 focus:border-red-500 bg-white"
                          : "border-transparent focus:border-[#003076] hover:border-slate-200 bg-slate-50 focus:bg-white",
                      )}
                      placeholder="Jane Doe"
                    />
                    {errors.displayName && (
                      <p className="text-xs text-red-500 font-medium ml-1 animate-in fade-in">
                        {errors.displayName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 px-1 uppercase tracking-wider block">
                      Username
                    </label>
                    <input
                      {...register("username")}
                      className={cn(
                        "w-full px-4 py-3.5 rounded-xl border-2 transition-all duration-200 outline-none text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal bg-slate-50",
                        errors.username
                          ? "border-red-300 focus:border-red-500 bg-white"
                          : "border-transparent focus:border-[#003076] hover:border-slate-200 bg-slate-50 focus:bg-white",
                      )}
                      placeholder="janedoe"
                    />
                    {errors.username && (
                      <p className="text-xs text-red-500 font-medium ml-1 animate-in fade-in">
                        {errors.username.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 px-1 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <input
                    {...register("email")}
                    type="email"
                    className={cn(
                      "w-full px-4 py-3.5 rounded-xl border-2 transition-all duration-200 outline-none text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal bg-slate-50",
                      errors.email
                        ? "border-red-300 focus:border-red-500 bg-white"
                        : "border-transparent focus:border-[#003076] hover:border-slate-200 bg-slate-50 focus:bg-white",
                    )}
                    placeholder="name@example.com"
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500 font-medium ml-1 animate-in fade-in">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 px-1 uppercase tracking-wider block">
                    Password
                  </label>
                  <div className="relative group transition-all">
                    <input
                      {...register("password")}
                      type={showPassword ? "text" : "password"}
                      className={cn(
                        "w-full pl-4 pr-12 py-3.5 rounded-xl border-2 transition-all duration-200 outline-none text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal bg-slate-50",
                        errors.password
                          ? "border-red-300 focus:border-red-500 bg-white"
                          : "border-transparent focus:border-[#003076] hover:border-slate-200 bg-slate-50 focus:bg-white",
                      )}
                      placeholder="Min. 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500 font-medium ml-1 animate-in fade-in">
                      {errors.password.message}
                    </p>
                  )}

                  {/* Password Strength Indicator */}
                  {passwordValue.length > 0 && !errors.password && (
                    <div className="flex gap-1 mt-2 px-1 animate-in fade-in">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={cn(
                            "h-1 w-full rounded-full transition-all duration-500",
                            strengthScore >= level
                              ? strengthScore <= 2
                                ? "bg-amber-400"
                                : strengthScore === 3
                                  ? "bg-blue-400"
                                  : "bg-emerald-500"
                              : "bg-slate-200",
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full py-4 mt-2 bg-gradient-to-br from-[#003076] to-[#0245a3] text-white font-bold tracking-wide rounded-xl hover:brightness-110 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#003076]/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {mutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {mutation.isPending ? "Getting Started..." : "Get Started"}
                </button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span className="px-4 bg-white">or continue with</span>
                </div>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={mutation.isPending}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-slate-50 rounded-xl hover:bg-slate-100 border border-slate-200 hover:border-slate-300 font-semibold text-slate-700 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  ></path>
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  ></path>
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  ></path>
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  ></path>
                </svg>
                Google
              </button>

              <div className="mt-10 text-center">
                <p className="text-sm font-medium text-slate-500">
                  Already have an account?
                  <Link
                    className="text-[#003076] font-bold hover:underline decoration-2 underline-offset-4 ml-1.5 transition-all"
                    href="/login"
                  >
                    Log In
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full mt-auto">
        <div className="border-t border-slate-200/60 flex flex-col md:flex-row justify-between items-center px-8 py-8 md:py-10 max-w-7xl mx-auto gap-4">
          <div className="font-extrabold text-[#003076]">FocusUP</div>
          <div className="flex gap-6 md:gap-8 flex-wrap justify-center">
            <a
              className="text-xs font-semibold text-slate-500 hover:text-[#003076] transition-all"
              href="#"
            >
              Privacy Policy
            </a>
            <a
              className="text-xs font-semibold text-slate-500 hover:text-[#003076] transition-all"
              href="#"
            >
              Terms of Service
            </a>
            <a
              className="text-xs font-semibold text-slate-500 hover:text-[#003076] transition-all"
              href="#"
            >
              Contact Us
            </a>
          </div>
          <div className="text-xs font-semibold text-slate-400">
            © 2024 FocusUP. Your Digital Sanctuary.
          </div>
        </div>
      </footer>
    </div>
  );
}
