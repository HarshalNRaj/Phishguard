import { useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAnalyzeScan } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Terminal, ShieldAlert, Upload, FileText, X, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

const scanSchema = z.object({
  emailContent: z.string().min(1, "Email content is required"),
  senderEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  subject: z.string().optional()
});

type ScanFormValues = z.infer<typeof scanSchema>;

function parseEml(raw: string): { from: string; subject: string; body: string } {
  const lines = raw.split(/\r?\n/);
  let from = "";
  let subject = "";
  let bodyStart = -1;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      bodyStart = i + 1;
      break;
    }

    const continuationMatch = line.match(/^[\t ]+(.+)/);
    if (continuationMatch && i > 0) {
      i++;
      continue;
    }

    const fromMatch = line.match(/^From:\s*(.+)/i);
    if (fromMatch) {
      let val = fromMatch[1];
      let j = i + 1;
      while (j < lines.length && lines[j].match(/^[\t ]/)) {
        val += " " + lines[j].trim();
        j++;
      }
      const emailInAngle = val.match(/<([^>]+)>/);
      from = emailInAngle ? emailInAngle[1] : val.trim();
    }

    const subjectMatch = line.match(/^Subject:\s*(.+)/i);
    if (subjectMatch) {
      let val = subjectMatch[1];
      let j = i + 1;
      while (j < lines.length && lines[j].match(/^[\t ]/)) {
        val += " " + lines[j].trim();
        j++;
      }
      subject = val.trim().replace(/=\?[^?]+\?[BQ]\?[^?]+\?=/gi, (m) => {
        try {
          const parts = m.match(/=\?([^?]+)\?([BQ])\?([^?]+)\?=/i);
          if (!parts) return m;
          if (parts[2].toUpperCase() === "B") return atob(parts[3]);
          return parts[3].replace(/_/g, " ");
        } catch {
          return m;
        }
      });
    }

    i++;
  }

  const body = bodyStart >= 0 ? lines.slice(bodyStart).join("\n").trim() : raw;

  return { from, subject, body };
}

export default function ScanPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const analyzeScan = useAnalyzeScan();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ScanFormValues>({
    resolver: zodResolver(scanSchema),
    defaultValues: { emailContent: "", senderEmail: "", subject: "" }
  });

  const processEmlFile = useCallback((file: File) => {
    if (!file.name.endsWith(".eml") && file.type !== "message/rfc822") {
      toast({
        title: "Invalid File",
        description: "Please upload a .eml file.",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = e.target?.result as string;
      if (!raw) return;

      const { from, subject, body } = parseEml(raw);

      form.setValue("emailContent", raw, { shouldValidate: true });
      if (from) form.setValue("senderEmail", from);
      if (subject) form.setValue("subject", subject);
      setUploadedFile({ name: file.name });

      toast({
        title: "File Loaded",
        description: `Parsed "${file.name}" — fields auto-filled from headers.`,
      });
    };
    reader.readAsText(file);
  }, [form, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processEmlFile(file);
  }, [processEmlFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processEmlFile(file);
    e.target.value = "";
  };

  const clearFile = () => {
    setUploadedFile(null);
    form.reset();
  };

  const onSubmit = async (data: ScanFormValues) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeScan.mutateAsync({
        data: {
          emailContent: data.emailContent,
          senderEmail: data.senderEmail || undefined,
          subject: data.subject || undefined
        }
      });
      toast({
        title: "Analysis Complete",
        description: `Verdict: ${result.verdict.toUpperCase()}`,
      });
      setLocation(`/scan/${result.id}`);
    } catch {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze email content. Please try again.",
        variant: "destructive"
      });
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-mono tracking-tight flex items-center gap-2">
          <Terminal className="w-8 h-8 text-primary" />
          ANALYSIS ENGINE
        </h1>
        <p className="text-muted-foreground mt-1">Upload a .eml file or paste raw email content for AI threat detection.</p>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur relative overflow-hidden">
        {isAnalyzing && (
          <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" />
              <ShieldAlert className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <p className="mt-6 font-mono text-sm text-primary tracking-widest uppercase animate-pulse">Running neural analysis...</p>
            <p className="mt-2 text-xs text-muted-foreground font-mono">Extracting indicators of compromise</p>
          </div>
        )}

        <CardHeader>
          <CardTitle className="font-mono text-sm tracking-widest text-muted-foreground uppercase">New Scan Task</CardTitle>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList className="bg-background/50 border border-border/50 font-mono text-xs uppercase tracking-wider w-full grid grid-cols-2">
              <TabsTrigger value="upload" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Upload className="w-3.5 h-3.5 mr-2" />
                Upload .eml
              </TabsTrigger>
              <TabsTrigger value="paste" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Terminal className="w-3.5 h-3.5 mr-2" />
                Paste Content
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 mt-0">
              {uploadedFile ? (
                <div className="flex items-center gap-3 p-4 rounded-md border border-safe/40 bg-safe/5">
                  <CheckCircle2 className="w-5 h-5 text-safe flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm text-safe font-medium truncate">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Headers extracted — fields auto-filled below</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearFile} className="h-7 w-7 text-muted-foreground hover:text-foreground flex-shrink-0">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  className={clsx(
                    "relative flex flex-col items-center justify-center gap-3 py-14 px-6 rounded-md border-2 border-dashed cursor-pointer transition-all duration-200",
                    isDragging
                      ? "border-primary bg-primary/10 scale-[1.01]"
                      : "border-border/50 bg-background/30 hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <div className={clsx("p-4 rounded-full border transition-colors", isDragging ? "border-primary/50 bg-primary/10" : "border-border/50 bg-muted/50")}>
                    <FileText className={clsx("w-8 h-8 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-sm font-medium text-foreground">
                      {isDragging ? "Drop to upload" : "Drop .eml file here"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      or <span className="text-primary underline underline-offset-2">click to browse</span>
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 font-mono uppercase tracking-wider">
                    RFC 2822 · .eml format
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".eml,message/rfc822"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="paste" className="mt-0" />
          </Tabs>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="senderEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Sender Email (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="attacker@example.com" className="font-mono bg-background/50 border-border/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Subject (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="URGENT: Action Required" className="font-mono bg-background/50 border-border/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="emailContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      Raw Email Content *
                      {uploadedFile && (
                        <span className="ml-2 text-safe font-mono normal-case text-[10px]">← loaded from {uploadedFile.name}</span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste email headers and body here..."
                        className="font-mono min-h-[260px] bg-background/80 border-border/50 resize-y text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isAnalyzing}
                  className="font-mono uppercase tracking-wider font-bold w-full md:w-auto"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Terminal className="w-4 h-4 mr-2" />
                      Execute Scan
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
