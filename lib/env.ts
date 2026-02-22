import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  SESSION_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  API_CACHE_ENABLED: z.string().optional(),
  TEST_MODE: z.string().optional(),
});

export const env = envSchema.parse(process.env);
