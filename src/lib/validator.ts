// src/lib/validator.ts
import { z } from "zod";

/**
 * Common helpers
 */
const trimmed = (schema: z.ZodString) => schema.transform((v) => v.trim());

/**
 * Username: 3-20 chars, letters/numbers/_ only, must start with a letter
 */
export const UsernameSchema = trimmed(
  z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .max(20, "Username must be at most 20 characters.")
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Only letters, numbers, and underscores; must start with a letter.")
);

/**
 * Email
 */
export const EmailSchema = trimmed(z.string().email("Enter a valid email address."));

/**
 * Password: 6+ chars (tune later if you want stronger rules)
 */
export const PasswordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters.")
  .max(200, "Password is too long.");

/**
 * Post content: 1–500 chars after trim
 */
export const PostContentSchema = trimmed(
  z
    .string()
    .min(1, "Post content is required.")
    .max(500, "Post is too long (max 500 characters).")
);

/**
 * Request body schemas
 */
export const RegisterSchema = z.object({
  username: UsernameSchema,
  email: EmailSchema,
  password: PasswordSchema,
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

export const CreatePostSchema = z.object({
  content: PostContentSchema,
});

/**
 * Types
 */
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreatePostInput = z.infer<typeof CreatePostSchema>;

/**
 * Helper: parse-or-400 for Next.js Route Handlers
 */
export function parseOrBadRequest<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { ok: true; data: z.infer<T> } | { ok: false; message: string } {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    // return first human-friendly message
    const msg =
      parsed.error.issues[0]?.message ||
      "Invalid request payload.";
    return { ok: false, message: msg };
  }
  return { ok: true, data: parsed.data };
}
