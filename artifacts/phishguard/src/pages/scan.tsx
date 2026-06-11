import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Terminal, ShieldAlert } from "lucide-react";

const scanSchema = z.object({
  emailContent: z.string().min(1, "Email content is required"),
  senderEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  subject: z.string().optional()
});

type ScanFormValues = z.infer<typeof scanSchema>;

export default function ScanPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const analyzeScan = useAnalyzeScan();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const form = useForm<ScanFormValues>({
    resolver: zodResolver(scanSchema),
    defaultValues: {
      emailContent: "",
      senderEmail: "",
      subject: ""
    }
  });

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
        description: `Scan finished with verdict: ${result.verdict}`,
      });
      setLocation(`/scan/${result.id}`);
    } catch (error) {
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
        <p className="text-muted-foreground mt-1">Input raw email content, headers, or suspicious text for AI threat detection.</p>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur relative overflow-hidden">
        {isAnalyzing && (
          <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin"></div>
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Raw Email Content *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Paste email headers and body here..." 
                        className="font-mono min-h-[300px] bg-background/80 border-border/50 resize-y" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
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
