import { z } from "zod";

export const connectorUpdateSchema = z.object({
  id: z.string().min(1),
  connected: z.boolean().optional(),
  token: z.string().trim().max(4000).optional(),
  webhookUrl: z.string().trim().url().nullable().optional()
});

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  company: z.string().trim().min(2).max(160),
  role: z.string().trim().min(2).max(80)
});

export const teamInviteSchema = z.object({
  email: z.string().trim().email().max(180),
  role: z.enum(["Admin", "Member"]).default("Member")
});

export const notificationUpdateSchema = z.object({
  critical: z.boolean(),
  high: z.boolean(),
  digest: z.boolean(),
  remediation: z.boolean(),
  connectors: z.boolean()
});

export const subscriptionUpdateSchema = z.object({
  plan: z.enum(["starter", "pro", "enterprise"]),
  payment: z
    .object({
      testMode: z.boolean().optional(),
      last4: z.string().trim().regex(/^\d{4}$/).optional()
    })
    .optional()
});
