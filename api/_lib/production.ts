import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-3-5-sonnet-latest"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_SHEETS_API_KEY: z.string().optional(),
  GOOGLE_APPS_SCRIPT_URL: z.string().url().optional(),
  GOOGLE_APPS_SCRIPT_KEY: z.string().optional(),
  NOTION_ACCESS_TOKEN: z.string().optional(),
  NOTION_VERSION: z.string().default("2022-06-28"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

type Env = z.infer<typeof envSchema>;

let validatedEnv: Env;

export function getEnv() {
  if (!validatedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const errors = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`);
      throw new Error(`Invalid environment configuration:\n${errors.join("\n")}`);
    }
    validatedEnv = result.data;
  }
  return validatedEnv;
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => {
    if (getEnv().LOG_LEVEL === "debug") {
      console.debug(JSON.stringify({ timestamp: new Date().toISOString(), level: "debug", message, ...data }));
    }
  },
  info: (message: string, data?: Record<string, unknown>) => {
    if (["debug", "info"].includes(getEnv().LOG_LEVEL)) {
      console.info(JSON.stringify({ timestamp: new Date().toISOString(), level: "info", message, ...data }));
    }
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    if (["debug", "info", "warn"].includes(getEnv().LOG_LEVEL)) {
      console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: "warn", message, ...data }));
    }
  },
  error: (message: string, error?: Error, data?: Record<string, unknown>) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      message,
      error: error?.message,
      stack: error?.stack,
      ...data
    }));
  }
};

interface FetchWithRetryOptions {
  retries?: number;
  timeout?: number;
  backoffMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit & FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    retries = 3,
    timeout = 30000,
    backoffMs = 1000,
    onRetry,
    ...fetchOptions
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status >= 500 && attempt < retries) {
        throw new Error(`Server error: ${response.status}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        const delay = backoffMs * Math.pow(2, attempt);
        onRetry?.(attempt + 1, lastError);
        logger.warn(`Request failed, retrying (${attempt + 1}/${retries})`, { url, delay });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

import type { VercelResponse } from "@vercel/node";

export function createErrorResponse(res: VercelResponse, message: string, status: number = 500, details?: Record<string, unknown>) {
  return res.status(status).json({
    error: message,
    details,
    timestamp: new Date().toISOString()
  });
}

export function createSuccessResponse(res: VercelResponse, data: unknown, status: number = 200) {
  return res.status(status).json(data);
}

export function validateRequest<T>(schema: z.Schema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid request: ${errors.join(", ")}`);
  }
  return result.data;
}
