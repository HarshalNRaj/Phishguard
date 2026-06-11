import { useGetScan } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VerdictBadge } from "@/components/verdict-badge";
import { SeverityChip } from "@/components/severity-chip";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, Link as LinkIcon, AlertTriangle, ArrowLeft, BrainCircuit } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { clsx } from "clsx";

export default function ScanDetailPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const id = parseInt(params.id || "0", 10);

  const { data: scan, isLoading, isError } = useGetScan(id, { query: { enabled: !!id } });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h2 className="text-2xl font-bold font-mono">Scan Not Found</h2>
        <p className="text-muted-foreground">The requested scan ID does not exist or has been deleted.</p>
        <Button onClick={() => setLocation("/history")} variant="outline" className="font-mono uppercase">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to History
        </Button>
      </div>
    );
  }

  if (isLoading || !scan) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] md:col-span-2" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  const confidenceColor = 
    scan.confidence > 80 && scan.verdict === "safe" ? "bg-safe" : 
    scan.confidence > 80 && scan.verdict === "phishing" ? "bg-phishing" :
    "bg-suspicious";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/history")} className="mb-2 font-mono text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3 h-3 mr-1" /> BACK
          </Button>
          <h1 className="text-3xl font-bold font-mono tracking-tight flex items-center gap-2">
            SCAN REPORT <span className="text-muted-foreground text-xl">#{scan.id}</span>
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            Executed on {format(new Date(scan.scannedAt), "MMM d, yyyy 'at' HH:mm:ss")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <VerdictBadge verdict={scan.verdict} className="text-lg px-4 py-1" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Explanation */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="font-mono text-sm tracking-widest text-muted-foreground uppercase flex items-center">
                <BrainCircuit className="w-4 h-4 mr-2" />
                AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-foreground/90 leading-relaxed font-sans">{scan.explanation}</p>
            </CardContent>
          </Card>

          {/* Extracted URLs */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="font-mono text-sm tracking-widest text-muted-foreground uppercase flex items-center">
                <LinkIcon className="w-4 h-4 mr-2" />
                Extracted URLs ({scan.extractedUrls?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 p-0">
              {scan.extractedUrls && scan.extractedUrls.length > 0 ? (
                <ul className="divide-y divide-border/50">
                  {scan.extractedUrls.map((urlObj, idx) => (
                    <li key={idx} className={clsx("p-4 flex flex-col gap-1", urlObj.isSuspicious && "bg-destructive/5")}>
                      <div className="flex items-center gap-2">
                        {urlObj.isSuspicious ? (
                          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className={clsx("font-mono text-sm break-all", urlObj.isSuspicious ? "text-destructive" : "text-muted-foreground")}>
                          {urlObj.url}
                        </span>
                      </div>
                      {urlObj.reason && (
                        <p className="text-xs text-muted-foreground ml-6 mt-1">{urlObj.reason}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">No URLs detected in content.</div>
              )}
            </CardContent>
          </Card>

          {/* Raw Content */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="font-mono text-sm tracking-widest text-muted-foreground uppercase">Raw Content</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="bg-background/80 p-4 rounded-md border border-border/50 overflow-auto max-h-[400px]">
                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">{scan.emailContent}</pre>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Meta & Indicators */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="font-mono text-sm tracking-widest text-muted-foreground uppercase">Confidence Score</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col items-center">
              <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/20" />
                  <circle 
                    cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10" 
                    strokeDasharray={`${scan.confidence * 2.827} 282.7`} 
                    className={clsx(
                      scan.verdict === 'safe' ? 'text-safe' : 
                      scan.verdict === 'phishing' ? 'text-phishing' : 
                      scan.verdict === 'spam' ? 'text-spam' : 'text-suspicious',
                      "transition-all duration-1000 ease-out"
                    )}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold font-mono">{scan.confidence}</span>
                  <span className="text-[10px] text-muted-foreground font-mono uppercase">/ 100</span>
                </div>
              </div>
              
              <div className="w-full space-y-4 pt-4 border-t border-border/50">
                <div>
                  <div className="text-xs text-muted-foreground font-mono mb-1 uppercase tracking-wider">Sender</div>
                  <div className="text-sm font-medium truncate">{scan.senderEmail || "Unknown"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-mono mb-1 uppercase tracking-wider">Subject</div>
                  <div className="text-sm font-medium truncate">{scan.subject || "No Subject"}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="font-mono text-sm tracking-widest text-muted-foreground uppercase flex justify-between">
                Threat Indicators
                <Badge variant="secondary" className="font-mono text-[10px]">{scan.indicators?.length || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              {scan.indicators && scan.indicators.length > 0 ? (
                <ul className="divide-y divide-border/50">
                  {scan.indicators.map((indicator, idx) => (
                    <li key={idx} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground/80">{indicator.type.replace(/_/g, ' ')}</span>
                        <SeverityChip severity={indicator.severity} />
                      </div>
                      <p className="text-xs text-muted-foreground">{indicator.description}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center">
                  <ShieldCheck className="w-8 h-8 text-safe mb-2 opacity-50" />
                  No threat indicators found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

