"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { OnboardingInput } from "@focusUp/shared-types";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@focusUp/ui/components/button";
import { Checkbox } from "@focusUp/ui/components/checkbox";
import { Label } from "@focusUp/ui/components/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@focusUp/ui/components/card";
import { z } from "zod";
import { env } from "@focusUp/env/web";
import { zodErrorToFieldErrors } from "@/lib/zod-field-errors";

type OnboardingFormValues = z.infer<typeof OnboardingInput>;

const CATEGORIES = [
  "CODING",
  "WRITING",
  "STUDYING",
  "DESIGN",
  "ADMIN",
  "OTHER",
];
const LENGTHS = [25, 50, 75];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: async (data) => {
      const result = await OnboardingInput.safeParseAsync(data);
      if (result.success) return { values: result.data, errors: {} };
      return {
        values: {},
        errors: zodErrorToFieldErrors(result.error),
      };
    },
    defaultValues: {
      timezone: "UTC",
      categories: [],
      // Use defaults
      preferredLength: [25, 50],
    },
  });

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setValue("timezone", tz);
    } catch (e) {}
  }, [setValue]);

  const mutation = useMutation({
    mutationFn: async (data: OnboardingFormValues) => {
      const res = await fetch(
        `${env.NEXT_PUBLIC_SERVER_URL}/api/v1/users/me/onboarding`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          credentials: "include",
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update preferences");
      }
      return res.json();
    },
    onSuccess: () => router.push("/dashboard"),
    onError: (e) => setServerError(e.message),
  });

  const onSubmit = (data: OnboardingFormValues) => {
    setServerError(null);
    mutation.mutate(data);
  };

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Welcome to FocusUp
            </CardTitle>
            <CardDescription>Step {step} of 3</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {serverError && (
              <div className="p-3 text-sm bg-red-100 text-red-800 rounded">
                {serverError}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Confirm your timezone</h3>
                <p className="text-sm text-gray-500">
                  We need this to schedule your sessions accurately.
                </p>
                <div className="space-y-2">
                  <Controller
                    name="timezone"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="America/New_York">
                          Eastern Time (US & Canada)
                        </option>
                        <option value="America/Chicago">
                          Central Time (US & Canada)
                        </option>
                        <option value="America/Denver">
                          Mountain Time (US & Canada)
                        </option>
                        <option value="America/Los_Angeles">
                          Pacific Time (US & Canada)
                        </option>
                        <option value="UTC">UTC / GMT</option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Paris">Paris</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                        <option value={field.value}>{field.value}</option>
                      </select>
                    )}
                  />
                  {errors.timezone && (
                    <p className="text-sm text-red-500">
                      {errors.timezone.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">What do you focus on?</h3>
                <p className="text-sm text-gray-500">
                  Select the categories that best describe your work.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Controller
                    name="categories"
                    control={control}
                    render={({ field }) => (
                      <>
                        {CATEGORIES.map((cat) => (
                          <div
                            key={cat}
                            className="flex items-center space-x-2 pt-2"
                          >
                            <Checkbox
                              id={`cat-${cat}`}
                              checked={field.value.includes(cat as any)}
                              onCheckedChange={(checked) => {
                                const current = new Set(field.value);
                                if (checked) current.add(cat as any);
                                else current.delete(cat as any);
                                field.onChange(Array.from(current));
                              }}
                            />
                            <Label htmlFor={`cat-${cat}`}>{cat}</Label>
                          </div>
                        ))}
                      </>
                    )}
                  />
                </div>
                {errors.categories && (
                  <p className="text-sm text-red-500">
                    {errors.categories.message}
                  </p>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">
                  Preferred session lengths
                </h3>
                <p className="text-sm text-gray-500">
                  Choose the standard session durations you prefer.
                </p>
                <div className="space-y-3">
                  <Controller
                    name="preferredLength"
                    control={control}
                    render={({ field }) => (
                      <>
                        {LENGTHS.map((len) => (
                          <div
                            key={len}
                            className="flex items-center space-x-2 pt-2"
                          >
                            <Checkbox
                              id={`len-${len}`}
                              checked={field.value.includes(len)}
                              onCheckedChange={(checked) => {
                                const current = new Set(field.value);
                                if (checked) current.add(len);
                                else current.delete(len);
                                field.onChange(Array.from(current));
                              }}
                            />
                            <Label htmlFor={`len-${len}`}>{len} minutes</Label>
                          </div>
                        ))}
                      </>
                    )}
                  />
                </div>
                {errors.preferredLength && (
                  <p className="text-sm text-red-500">
                    {errors.preferredLength.message}
                  </p>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
            ) : (
              <div></div>
            )}

            {step < 3 ? (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Get Started"}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
