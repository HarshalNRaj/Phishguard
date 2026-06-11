import { GoogleGenAI } from "@google/genai";
import { logger } from "./logger";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY must be set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ThreatIndicator {
  type: "urgent_language" | "fake_login" | "suspicious_url" | "misspelled_domain" | "password_request" | "ip_url" | "url_shortener" | "attachment" | "brand_impersonation" | "generic";
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface ExtractedUrl {
  url: string;
  isSuspicious: boolean;
  reason: string | null;
}

export interface AnalysisResult {
  verdict: "safe" | "suspicious" | "spam" | "phishing";
  confidence: number;
  explanation: string;
  indicators: ThreatIndicator[];
  extractedUrls: ExtractedUrl[];
}

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  return [...new Set(text.match(urlRegex) ?? [])];
}

function analyzeUrlSuspicion(url: string): { isSuspicious: boolean; reason: string | null } {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      return { isSuspicious: true, reason: "IP-based URL — hides true destination" };
    }
    const shorteners = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "short.io", "rb.gy", "is.gd", "buff.ly"];
    if (shorteners.some(s => hostname.endsWith(s))) {
      return { isSuspicious: true, reason: "URL shortener — obscures real destination" };
    }
    if ((hostname.match(/-/g) ?? []).length > 3) {
      return { isSuspicious: true, reason: "Excessive hyphens — common in phishing domains" };
    }
    const suspiciousWords = ["login", "verify", "secure", "account", "update", "confirm", "signin", "bank", "paypal", "amazon", "microsoft", "apple", "google"];
    if (suspiciousWords.some(w => hostname.toLowerCase().includes(w))) {
      return { isSuspicious: true, reason: "Domain contains credential-harvesting keyword" };
    }
    return { isSuspicious: false, reason: null };
  } catch {
    return { isSuspicious: true, reason: "Malformed URL" };
  }
}

export async function analyzeEmail(
  emailContent: string,
  senderEmail?: string | null,
  subject?: string | null
): Promise<AnalysisResult> {
  const urls = extractUrls(emailContent);
  const extractedUrls: ExtractedUrl[] = urls.map(url => ({
    url,
    ...analyzeUrlSuspicion(url),
  }));

  const prompt = `You are a cybersecurity expert analyzing an email for phishing, spam, or other threats.

Analyze the following email and return a JSON object with this exact structure:
{
  "verdict": "safe" | "suspicious" | "spam" | "phishing",
  "confidence": <number 0-100>,
  "explanation": "<one or two sentences explaining the verdict in plain English, starting with 'This email is...' or 'This email appears...'  >",
  "indicators": [
    {
      "type": "<one of: urgent_language, fake_login, suspicious_url, misspelled_domain, password_request, ip_url, url_shortener, attachment, brand_impersonation, generic>",
      "description": "<specific description of this indicator>",
      "severity": "<low | medium | high | critical>"
    }
  ]
}

Rules:
- verdict "phishing": email is clearly trying to steal credentials/personal info
- verdict "spam": unsolicited commercial email, not credential theft
- verdict "suspicious": something feels off but not definitively malicious
- verdict "safe": legitimate email
- confidence should reflect certainty (90-100 = very sure, 60-89 = likely, 40-59 = uncertain)
- Only include real indicators you actually detected — don't fabricate them
- Keep explanation concise and human-readable (1-2 sentences max)
- Return ONLY valid JSON, no markdown, no explanation outside the JSON

${senderEmail ? `Sender: ${senderEmail}` : ""}
${subject ? `Subject: ${subject}` : ""}

Email content:
${emailContent.slice(0, 4000)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 8192 },
    });

    const text = response.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in Gemini response");

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      verdict: parsed.verdict ?? "suspicious",
      confidence: Math.min(100, Math.max(0, parsed.confidence ?? 50)),
      explanation: parsed.explanation ?? "Unable to determine threat level.",
      indicators: Array.isArray(parsed.indicators) ? parsed.indicators : [],
      extractedUrls,
    };
  } catch (err) {
    logger.error({ err }, "Gemini analysis failed, falling back to heuristic");
    return heuristicAnalysis(emailContent, senderEmail, subject, extractedUrls);
  }
}

function heuristicAnalysis(
  emailContent: string,
  senderEmail: string | null | undefined,
  subject: string | null | undefined,
  extractedUrls: ExtractedUrl[]
): AnalysisResult {
  const text = (emailContent + " " + (subject ?? "")).toLowerCase();
  const indicators: ThreatIndicator[] = [];
  let score = 0;

  const urgentPhrases = ["urgent", "immediately", "account suspended", "verify now", "act now", "limited time", "expires today"];
  if (urgentPhrases.some(p => text.includes(p))) {
    indicators.push({ type: "urgent_language", description: "Email creates artificial urgency", severity: "medium" });
    score += 25;
  }
  const loginPhrases = ["click here to login", "verify your account", "confirm your identity", "sign in to verify"];
  if (loginPhrases.some(p => text.includes(p))) {
    indicators.push({ type: "fake_login", description: "Email requests login/credential verification", severity: "high" });
    score += 35;
  }
  const passwordPhrases = ["password", "otp", "one-time", "pin code", "security code"];
  if (passwordPhrases.some(p => text.includes(p))) {
    indicators.push({ type: "password_request", description: "Email requests sensitive credentials", severity: "high" });
    score += 30;
  }
  const suspiciousUrls = extractedUrls.filter(u => u.isSuspicious);
  if (suspiciousUrls.length > 0) {
    indicators.push({ type: "suspicious_url", description: `${suspiciousUrls.length} suspicious URL(s) detected`, severity: "critical" });
    score += 40;
  }

  const verdict: "safe" | "suspicious" | "spam" | "phishing" =
    score >= 60 ? "phishing" : score >= 35 ? "suspicious" : score >= 15 ? "spam" : "safe";

  return {
    verdict,
    confidence: Math.min(95, 50 + score),
    explanation: `This email was analyzed using heuristic rules. ${indicators.length > 0 ? `Detected ${indicators.length} potential threat indicator(s).` : "No obvious threat indicators were found."}`,
    indicators,
    extractedUrls,
  };
}
