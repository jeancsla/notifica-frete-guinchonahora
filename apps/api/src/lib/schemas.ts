import { z } from "zod";

/**
 * Reusable Zod schemas for API validation
 */

// Pagination schema for list endpoints
export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

// Login schema for auth endpoints
export const LoginSchema = z.object({
  username: z.string().min(1).max(128),
  password: z.string().min(1).max(256),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// Carga query parameters schema
export const ListCargasQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  notified: z.enum(["true", "false"]).nullable().default(null),
  sortBy: z
    .enum(["id_viagem", "created_at", "prev_coleta", "origem", "destino"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  includeTotal: z.coerce.boolean().default(true),
  fields: z
    .string()
    .transform((val) =>
      val
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
    )
    .optional(),
});

export type ListCargasQueryInput = z.infer<typeof ListCargasQuerySchema>;

// Carga model schema for validation
export const CargaSchema = z.object({
  id_viagem: z.string().min(1).max(64),
  origem: z.string().max(256).nullable(),
  destino: z.string().max(256).nullable(),
  produto: z.string().max(256).nullable(),
  equipamento: z.string().max(128).nullable(),
  prev_coleta: z.string().datetime().nullable(),
  vr_frete: z.string().max(64).nullable(),
  created_at: z.string().datetime(),
  notified_at: z.string().datetime().nullable().optional(),
});

export type CargaInput = z.infer<typeof CargaSchema>;

// Cron webhook schema
export const CronEventSchema = z.object({
  eventId: z.string().regex(/^[a-zA-Z0-9._:-]{1,128}$/).optional(),
  mockedResult: z
    .string()
    .transform((val) => {
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    })
    .pipe(
      z
        .object({
          processed: z.number().int().optional(),
          new_cargas: z.array(z.unknown()).optional(),
        })
        .nullable(),
    )
    .optional(),
});

export type CronEventInput = z.infer<typeof CronEventSchema>;

// Helper to format Zod errors into user-friendly messages
export function formatZodError(error: z.ZodError): string {
  const issues = error.issues;
  if (issues.length === 0) return "Invalid input";

  const firstIssue = issues[0];
  const path = firstIssue.path.length > 0 ? firstIssue.path.join(".") : "input";
  return `${path}: ${firstIssue.message}`;
}

// Helper to safely parse query params from URL
export function parseQueryParams<T extends z.ZodTypeAny>(
  url: URL,
  schema: T,
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const rawParams: Record<string, string | null> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const result = schema.safeParse(rawParams);

  if (!result.success) {
    return { success: false, error: formatZodError(result.error) };
  }

  return { success: true, data: result.data };
}
