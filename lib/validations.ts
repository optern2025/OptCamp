import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(100, "Full name is too long"),
  mobile_number: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid mobile number format"),
  user_type: z.enum(["student", "professional"]),
  is_admin_request: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const applicationSchema = z.object({
  cycle_id: z.string().uuid("Invalid cycle ID"),
  full_name: z.string().min(2, "Full name is required").max(100, "Full name is too long"),
  email: z.string().email("Invalid email address"),
  mobile_number: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid mobile number format"),
  user_type: z.enum(["student", "professional"]),
  college: z.string().optional(),
  graduation_year: z.string().optional(),
  skills: z.string().optional(),
  github_url: z.union([z.string().url("Invalid GitHub URL"), z.literal(""), z.null()]).optional(),
  linkedin_url: z.union([z.string().url("Invalid LinkedIn URL"), z.literal(""), z.null()]).optional(),
  portfolio_url: z.union([z.string().url("Invalid Portfolio URL"), z.literal(""), z.null()]).optional(),
  resume_url: z.union([z.string().url("Invalid Resume URL"), z.literal(""), z.null()]).optional(),
  motivation: z.string().max(2000, "Motivation is too long").optional(),
});

// Assuming admin forms might be managed here too.
export const adminCreateUserSchema = z.object({
  email: z.string().email("Invalid email"),
  full_name: z.string().min(2, "Name required"),
  role: z.enum(["user", "admin"]),
  admin_approval_status: z.enum(["pending", "approved", "rejected"]).optional(),
});
