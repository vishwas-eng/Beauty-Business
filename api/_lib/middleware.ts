import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { logger, validateRequest, getEnv } from "./production";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173"
];

export function withCors(handler: (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse> | VercelResponse) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const origin = req.headers.origin;

    if (origin && (allowedOrigins.includes(origin) || getEnv().NODE_ENV !== "production")) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Max-Age", "86400");
    }

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    return handler(req, res);
  };
}

export function withValidation<T>(schema: z.Schema<T>, handler: (req: VercelRequest, res: VercelResponse, body: T) => Promise<VercelResponse> | VercelResponse) {
  return withCors(async (req: VercelRequest, res: VercelResponse) => {
    try {
      const body = validateRequest(schema, req.body);
      return handler(req, res, body);
    } catch (error) {
      logger.warn("Invalid request");
      return res.status(400).json({ error: (error as Error).message, timestamp: new Date().toISOString() });
    }
  });
}

export function withErrorHandling(handler: (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse> | VercelResponse) {
  return withCors(async (req: VercelRequest, res: VercelResponse) => {
    try {
      return await handler(req, res);
    } catch (error) {
      logger.error("Request failed", error as Error, { path: req.url, method: req.method });
      return res.status(500).json({ error: "Internal server error", timestamp: new Date().toISOString() });
    }
  });
}
