import { env } from "@focusUp/env/web";
import type { z } from "zod";

/** An error answered by the API, with its HTTP status so the screen can react to it. */
export class ApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: Method;
  body?: unknown;
}

async function send(path: string, { method = "GET", body }: RequestOptions): Promise<unknown> {
  const response = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/v1${path}`, {
    method,
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const json = (await response.json().catch(() => ({}))) as { data?: unknown; error?: string };
  if (!response.ok) {
    throw new ApiError(json.error || "Something went wrong. Please try again.", response.status);
  }
  return json.data;
}

/** Calls the API and checks the answer against its Zod schema from `@focusUp/shared-types`. */
export async function apiRequest<S extends z.ZodType>(
  path: string,
  options: RequestOptions & { schema: S },
): Promise<z.output<S>> {
  return options.schema.parse(await send(path, options));
}

/** Calls the API when the answer does not matter, only that it worked. */
export async function apiAction(path: string, options: RequestOptions = {}): Promise<void> {
  await send(path, options);
}
