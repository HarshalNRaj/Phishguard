import { Router, type IRouter } from "express";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { db, scansTable } from "@workspace/db";
import {
  AnalyzeScanBody,
  GetScanParams,
  DeleteScanParams,
  ListScansQueryParams,
  GetRecentScansQueryParams,
} from "@workspace/api-zod";
import { analyzeEmail } from "../lib/gemini";

const router: IRouter = Router();

router.get("/scans", async (req, res): Promise<void> => {
  const params = ListScansQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { limit = 20, offset = 0, verdict } = params.data;

  const query = db
    .select()
    .from(scansTable)
    .orderBy(desc(scansTable.scannedAt))
    .limit(limit)
    .offset(offset);

  if (verdict) {
    const scans = await db
      .select()
      .from(scansTable)
      .where(eq(scansTable.verdict, verdict))
      .orderBy(desc(scansTable.scannedAt))
      .limit(limit)
      .offset(offset);
    res.json(scans);
    return;
  }

  const scans = await query;
  res.json(scans);
});

router.post("/scans", async (req, res): Promise<void> => {
  const parsed = AnalyzeScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { emailContent, senderEmail, subject } = parsed.data;

  req.log.info("Analyzing email for threats");
  const analysis = await analyzeEmail(emailContent, senderEmail, subject);

  const [scan] = await db
    .insert(scansTable)
    .values({
      emailContent,
      senderEmail: senderEmail ?? null,
      subject: subject ?? null,
      verdict: analysis.verdict,
      confidence: analysis.confidence,
      explanation: analysis.explanation,
      indicators: analysis.indicators,
      extractedUrls: analysis.extractedUrls,
    })
    .returning();

  res.status(201).json(scan);
});

router.get("/scans/:id", async (req, res): Promise<void> => {
  const params = GetScanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [scan] = await db
    .select()
    .from(scansTable)
    .where(eq(scansTable.id, params.data.id));

  if (!scan) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  res.json(scan);
});

router.delete("/scans/:id", async (req, res): Promise<void> => {
  const params = DeleteScanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [scan] = await db
    .delete(scansTable)
    .where(eq(scansTable.id, params.data.id))
    .returning();

  if (!scan) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      verdict: scansTable.verdict,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(scansTable)
    .groupBy(scansTable.verdict);

  const counts = { safe: 0, suspicious: 0, spam: 0, phishing: 0 };
  for (const row of rows) {
    counts[row.verdict as keyof typeof counts] = row.count;
  }

  const totalScans = Object.values(counts).reduce((a, b) => a + b, 0);
  const threatCount = counts.suspicious + counts.spam + counts.phishing;
  const threatRate = totalScans > 0 ? Math.round((threatCount / totalScans) * 100) : 0;

  res.json({
    totalScans,
    safeCount: counts.safe,
    suspiciousCount: counts.suspicious,
    spamCount: counts.spam,
    phishingCount: counts.phishing,
    threatRate,
  });
});

router.get("/dashboard/recent", async (req, res): Promise<void> => {
  const params = GetRecentScansQueryParams.safeParse(req.query);
  const limit = params.success ? (params.data.limit ?? 10) : 10;

  const scans = await db
    .select()
    .from(scansTable)
    .orderBy(desc(scansTable.scannedAt))
    .limit(limit);

  res.json(scans);
});

router.get("/dashboard/trend", async (_req, res): Promise<void> => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      date: sql<string>`to_char(date_trunc('day', ${scansTable.scannedAt}), 'YYYY-MM-DD')`,
      verdict: scansTable.verdict,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(scansTable)
    .where(gte(scansTable.scannedAt, sevenDaysAgo))
    .groupBy(
      sql`date_trunc('day', ${scansTable.scannedAt})`,
      scansTable.verdict
    )
    .orderBy(sql`date_trunc('day', ${scansTable.scannedAt})`);

  // Build 7-day array with zeroes for missing days
  const trendMap: Record<string, { safe: number; suspicious: number; spam: number; phishing: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    trendMap[key] = { safe: 0, suspicious: 0, spam: 0, phishing: 0 };
  }

  for (const row of rows) {
    if (trendMap[row.date]) {
      trendMap[row.date][row.verdict as keyof typeof trendMap[string]] = row.count;
    }
  }

  res.json(Object.entries(trendMap).map(([date, counts]) => ({ date, ...counts })));
});

export default router;
