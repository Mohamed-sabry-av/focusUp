import type { ZodError } from "zod";

export function zodErrorToFieldErrors(
  zodError: ZodError,
): Record<string, { message: string; type?: string }> {
  const acc: Record<string, { message: string; type?: string }> = {};
  for (const issue of zodError.issues) {
    const key = issue.path[0];
    if (key === undefined) continue;
    acc[String(key)] = { message: issue.message, type: issue.code };
  }
  return acc;
}
