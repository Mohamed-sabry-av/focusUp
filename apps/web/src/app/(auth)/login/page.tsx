'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { LoginInput } from '@focusUp/shared-types';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@focusUp/ui/lib/utils';
import { toast } from 'sonner';
import { env } from '@focusUp/env/web';

type LoginFormValues = z.infer<typeof LoginInput>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: async (data) => {
      const result = await LoginInput.safeParseAsync(data);
      if (result.success) return { values: result.data, errors: {} };
      return {
        values: {},
        errors: result.error.errors.reduce((acc: any, err) => {
          acc[err.path[0]] = { message: err.message, type: err.code };
          return acc;
        }, {})
      };
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to login');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Welcome back!");
      router.push('/dashboard');
    },
    onError: (error) => {
      setServerError(error.message);
      toast.error("Login failed. Please check your credentials.");
    }
  });

  const onSubmit = (data: LoginFormValues) => {
    setServerError(null);
    mutation.mutate(data);
  };

  const handleGoogleLogin = () => {
    window.location.href = `${env.NEXT_PUBLIC_SERVER_URL}/api/v1/auth/google`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcf9f8] text-[#1c1b1b] font-sans antialiased animate-in fade-in duration-500">
      <main className="flex-grow flex items-center justify-center px-4 py-8 md:p-6">
        <div className="w-full max-w-[1100px] grid md:grid-cols-2 bg-white rounded-3xl overflow-hidden shadow-2xl shadow-[#1c1b1b]/5 transition-all">
          
          {/* Branding/Visual Side */}
          <div className="hidden md:flex flex-col justify-between p-16 bg-[#003076] relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <img 
                className="w-full h-full object-cover" 
                alt="Workspace" 
                src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop" 
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-[#003076] via-[#003076]/90 to-transparent" />
            
            <div className="relative z-10 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-extrabold text-[#003076]">F</div>
              <span className="font-extrabold text-2xl tracking-tight text-white">FocusUP</span>
            </div>
            
            <div className="relative z-10">
              <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight mb-6">
                 Return to your<br/>digital sanctuary.
              </h1>
              <p className="text-[#b0c6ff] text-lg max-w-sm leading-relaxed font-medium">
                 Find your flow state in a space designed for clarity and collective productivity.
              </p>
            </div>
            
            <div className="relative z-10 flex items-center gap-3">
              <div className="flex -space-x-3">
                <img className="w-10 h-10 rounded-full border-2 border-[#003076] object-cover" src="https://i.pravatar.cc/150?u=1" alt="User 1"/>
                <img className="w-10 h-10 rounded-full border-2 border-[#003076] object-cover" src="https://i.pravatar.cc/150?u=2" alt="User 2"/>
                <img className="w-10 h-10 rounded-full border-2 border-[#003076] object-cover" src="https://i.pravatar.cc/150?u=3" alt="User 3"/>
              </div>
              <span className="text-sm text-[#d3e4ff] font-medium">Joined by 12,000+ deep workers</span>
            </div>
          </div>

          {/* Form Side */}
          <div className="bg-white p-8 md:p-14 lg:p-16 flex flex-col justify-center">
            <div className="md:hidden mb-10 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#003076] flex items-center justify-center font-extrabold text-white">F</div>
              <span className="text-2xl font-extrabold tracking-tight text-[#003076]">FocusUP</span>
            </div>
            
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight mb-2">Welcome Back</h2>
              <p className="text-slate-500 text-sm font-medium">Please enter your details to access your workspace.</p>
            </div>
            
            {serverError && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-semibold border border-red-100 animate-in slide-in-from-top-1">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase ml-1" htmlFor="email">
                  Email Address
                </label>
                <div className="relative group transition-all">
                   <input 
                     {...register('email')}
                     className={cn(
                       "w-full px-4 py-3.5 rounded-xl border-2 bg-slate-50 transition-all duration-200 outline-none text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal",
                       errors.email 
                         ? "border-red-300 focus:border-red-500 focus:bg-white" 
                         : "border-transparent focus:border-[#003076] focus:bg-white hover:border-slate-200"
                     )}
                     id="email" 
                     placeholder="name@company.com" 
                     type="email"
                     disabled={mutation.isPending}
                   />
                </div>
                {errors.email && <p className="text-xs text-red-500 font-medium ml-1 animate-in fade-in">{errors.email.message}</p>}
              </div>
              
              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase" htmlFor="password">
                    Password
                  </label>
                  <a className="text-xs font-bold text-[#003076] hover:underline transition-all" href="#">
                    Forgot password?
                  </a>
                </div>
                <div className="relative group transition-all">
                  <input 
                    {...register('password')}
                    className={cn(
                      "w-full pl-4 pr-12 py-3.5 rounded-xl border-2 bg-slate-50 transition-all duration-200 outline-none text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal",
                      errors.password
                         ? "border-red-300 focus:border-red-500 focus:bg-white" 
                         : "border-transparent focus:border-[#003076] focus:bg-white hover:border-slate-200"
                    )}
                    id="password" 
                    placeholder="••••••••" 
                    type={showPassword ? 'text' : 'password'}
                    disabled={mutation.isPending}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 font-medium ml-1 animate-in fade-in">{errors.password.message}</p>}
              </div>
              
              <div className="flex items-center gap-3 py-2 ml-1">
                <input 
                  className="w-4 h-4 rounded border-slate-300 text-[#003076] focus:ring-[#003076]/20 transition-colors cursor-pointer" 
                  id="remember" 
                  type="checkbox"
                />
                <label className="text-sm font-medium text-slate-600 cursor-pointer select-none" htmlFor="remember">
                  Keep me focused for 30 days
                </label>
              </div>
              
              <button 
                disabled={mutation.isPending}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#003076] to-[#0245A3] text-white font-bold tracking-wide hover:brightness-110 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#003076]/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2" 
                type="submit"
              >
                {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {mutation.isPending ? "Signing in..." : "Sign In"}
              </button>
            </form>
            
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                <span className="bg-white px-4 text-slate-400">Or continue with</span>
              </div>
            </div>
            
            <button 
              onClick={handleGoogleLogin}
              disabled={mutation.isPending}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all font-semibold text-slate-700 active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
              </svg>
              Google
            </button>
            
            <p className="mt-8 text-center text-sm font-medium text-slate-500">
              Don&apos;t have an account? 
              <Link className="text-[#003076] font-bold hover:underline decoration-2 underline-offset-4 ml-1.5 transition-all" href="/register">
                Start focusing today
              </Link>
            </p>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="w-full mt-auto border-t border-slate-200/60 bg-[#f6f3f2]">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 py-8 md:py-6 max-w-[1100px] mx-auto gap-4">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-extrabold text-[#003076]">FocusUP</span>
            <span className="text-xs font-medium text-slate-500">© 2024 FocusUP. Your Digital Sanctuary.</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-6">
            <a className="text-xs font-semibold text-slate-500 hover:text-[#003076] transition-colors" href="#">Privacy Policy</a>
            <a className="text-xs font-semibold text-slate-500 hover:text-[#003076] transition-colors" href="#">Terms of Service</a>
            <a className="text-xs font-semibold text-slate-500 hover:text-[#003076] transition-colors" href="#">Contact Us</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
