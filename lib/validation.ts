import { z } from "zod";

/** POST /api/fp-accounts (login) */
export const LoginSchema = z.object({
  employeeId: z.string().min(1).max(20),
  password: z.string().min(1).max(100),
});

/** POST /api/daily-touch */
export const DailyTouchSchema = z.object({
  stfno: z.string().min(1).max(20),
});

/** POST /api/generate-lms */
export const GenerateLmsSchema = z.object({
  customer: z.object({
    id: z.string().min(1),
    name: z.string(),
    gender: z.enum(["남", "여"]),
    age: z.number(),
    event: z.string(),
    eventDetail: z.string(),
    products: z.array(z.object({
      id: z.string(),
      name: z.string(),
      contractNo: z.string(),
      renewalDate: z.string().optional(),
      expiryDate: z.string().optional(),
      premium: z.number().optional(),
      type: z.enum(["장기", "자동차", "기타"]),
    })),
    urgency: z.enum(["urgent", "high", "normal", "low"]),
    birthDate: z.string(),
    phone: z.string().optional(),
    eventDate: z.string().optional(),
    lastContact: z.string().nullable(),
    contactHistory: z.array(z.any()),
    longTermCount: z.number(),
    carCount: z.number(),
    memo: z.string().optional(),
  }),
  fpName: z.string().optional(),
});

/** POST /api/regenerate-lms */
export const RegenerateLmsSchema = z.object({
  customer: GenerateLmsSchema.shape.customer,
  messageType: z.string().min(1),
  existingContent: z.string().optional(),
  fpName: z.string().optional(),
});

/** POST /api/parse-query */
export const ParseQuerySchema = z.object({
  query: z.string().max(500),
});

/** POST /api/query-csv */
export const QueryCsvSchema = z.object({
  intent: z.string().min(1),
  targetName: z.string().nullable().optional(),
  fpName: z.string().nullable().optional(),
  params: z.object({
    months: z.number().nullable().optional(),
    keyword: z.string().nullable().optional(),
    gender: z.string().nullable().optional(),
    ageMin: z.number().nullable().optional(),
    ageMax: z.number().nullable().optional(),
    month: z.number().nullable().optional(),
  }).optional(),
});

/** POST /api/analyze-data */
export const AnalyzeDataSchema = z.object({
  query: z.string().max(500),
  dataText: z.string().max(10000),
});

/** POST /api/silson-search & /api/jobcode-search */
export const ProxySearchSchema = z.object({
  query: z.string().min(1).max(500),
  topk: z.number().int().min(1).max(20).optional(),
});

/** POST /api/analytics */
export const AnalyticsSchema = z.object({
  events: z.array(z.record(z.string(), z.unknown())).max(100),
});

/** Helper: validate and return parsed data or NextResponse error */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown):
  | { success: true; data: T }
  | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    return { success: false, error: `Validation error: ${issues}` };
  }
  return { success: true, data: result.data };
}
