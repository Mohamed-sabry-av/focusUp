'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { RegisterInput } from '@focusUp/shared-types';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '@focusUp/ui/components/button';
import { Input } from '@focusUp/ui/components/input';
import { Label } from '@focusUp/ui/components/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@focusUp/ui/components/card';
import Link from 'next/link';
import { z } from 'zod';

type RegisterFormValues = z.infer<typeof RegisterInput>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: async (data) => {
      const result = await RegisterInput.safeParseAsync(data);
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
    mutationFn: async (data: RegisterFormValues) => {
      const res = await fetch('http://localhost:4000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to register');
      }
      return res.json();
    },
    onSuccess: () => {
      router.push('/onboarding');
    },
    onError: (error) => {
      setServerError(error.message);
    }
  });

  const onSubmit = (data: RegisterFormValues) => {
    setServerError(null);
    mutation.mutate(data);
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:4000/api/v1/auth/google';
  };

  return (
    <div className="flex w-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
          <CardDescription>Enter your details below to create your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <Button variant="outline" type="button" onClick={handleGoogleLogin} className="w-full">
              Sign up with Google
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-zinc-950 px-2 text-gray-500">Or continue with</span>
              </div>
            </div>
            {serverError && (
              <div className="p-3 text-sm rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                {serverError}
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input id="displayName" placeholder="John Doe" {...register('displayName')} />
                {errors.displayName && <p className="text-sm text-red-500">{errors.displayName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" placeholder="johndoe" {...register('username')} />
                {errors.username && <p className="text-sm text-red-500">{errors.username.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="name@example.com" {...register('email')} />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...register('password')} />
                {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
