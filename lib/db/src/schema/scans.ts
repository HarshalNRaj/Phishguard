import { pgTable, text, serial, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const threatIndicatorSchema = z.object({
  type: z.enum(["urgent_language", "fake_login", "suspicious_url", "misspelled_domain", "password_request", "ip_url", "url_shortener", "attachment", "brand_impersonation", "generic"]),
  description: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
});

export const extractedUrlSchema = z.object({
  url: z.string(),
  isSuspicious: z.boolean(),
  reason: z.string().nullable(),
});

export const scansTable = pgTable("scans", {
  id: serial("id").primaryKey(),
  emailContent: text("email_content").notNull(),
  senderEmail: text("sender_email"),
  subject: text("subject"),
  verdict: text("verdict").notNull().$type<"safe" | "suspicious" | "spam" | "phishing">(),
  confidence: real("confidence").notNull(),
  explanation: text("explanation").notNull(),
  indicators: jsonb("indicators").notNull().default([]),
  extractedUrls: jsonb("extracted_urls").notNull().default([]),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScanSchema = createInsertSchema(scansTable).omit({ id: true, scannedAt: true });
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scansTable.$inferSelect;
