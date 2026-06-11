import { useState } from "react";
import { useListScans, useDeleteScan, getListScansQueryKey, getGetDashboardStatsQueryKey, getGetRecentScansQueryKey, getGetThreatTrendQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VerdictBadge } from "@/components/verdict-badge";
import { History as HistoryIcon, Search, Trash2, Eye, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function HistoryPage() {
  const [filterVerdict, setFilterVerdict] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: scans, isLoading } = useListScans({ 
    verdict: filterVerdict !== "all" ? filterVerdict as any : undefined,
    limit: 100
  });

  const deleteScan = useDeleteScan();

  const handleDelete = async (id: number) => {
    try {
      await deleteScan.mutateAsync({ id });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: getListScansQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetRecentScansQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetThreatTrendQueryKey() });
      
      toast({
        title: "Scan Deleted",
        description: "The scan record has been permanently removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete scan record.",
        variant: "destructive"
      });
    }
  };

  const filteredScans = scans?.filter(scan => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (scan.subject && scan.subject.toLowerCase().includes(term)) ||
      (scan.senderEmail && scan.senderEmail.toLowerCase().includes(term)) ||
      scan.id.toString() === term
    );
  }) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-mono tracking-tight flex items-center gap-2">
          <HistoryIcon className="w-8 h-8 text-primary" />
          SCAN HISTORY
        </h1>
        <p className="text-muted-foreground mt-1">Audit log of all analyzed email content.</p>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
            <CardTitle className="font-mono text-sm tracking-widest text-muted-foreground uppercase hidden sm:block">Archive Records</CardTitle>
            <div className="flex w-full sm:w-auto items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subject, sender..."
                  className="pl-9 bg-background/50 font-mono text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterVerdict} onValueChange={setFilterVerdict}>
                <SelectTrigger className="w-[140px] bg-background/50 font-mono text-sm">
                  <SelectValue placeholder="Filter Verdict" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Verdicts</SelectItem>
                  <SelectItem value="safe">Safe</SelectItem>
                  <SelectItem value="suspicious">Suspicious</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="phishing">Phishing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredScans.length > 0 ? (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-mono text-xs uppercase w-[80px]">ID</TableHead>
                  <TableHead className="font-mono text-xs uppercase">Target / Details</TableHead>
                  <TableHead className="font-mono text-xs uppercase">Verdict</TableHead>
                  <TableHead className="font-mono text-xs uppercase">Score</TableHead>
                  <TableHead className="font-mono text-xs uppercase">Date</TableHead>
                  <TableHead className="text-right font-mono text-xs uppercase">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScans.map((scan) => (
                  <TableRow key={scan.id} className="hover:bg-muted/50 border-border/50">
                    <TableCell className="font-mono text-xs text-muted-foreground">#{scan.id}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm max-w-[200px] sm:max-w-[300px] truncate">
                        {scan.subject || "No Subject"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
                        {scan.senderEmail || "Unknown Sender"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <VerdictBadge verdict={scan.verdict} />
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono text-sm font-bold ${
                        scan.confidence > 80 && scan.verdict === 'safe' ? 'text-safe' : 
                        scan.confidence < 50 ? 'text-phishing' : 'text-suspicious'
                      }`}>
                        {scan.confidence}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {format(new Date(scan.scannedAt), "MMM d, yy HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground hover:text-primary">
                          <Link href={`/scan/${scan.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View Details</span>
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-destructive/20 bg-card">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-mono">Confirm Deletion</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to permanently delete scan #{scan.id}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="font-mono text-xs uppercase">Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(scan.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono text-xs uppercase"
                              >
                                {deleteScan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Record"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <HistoryIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-mono text-lg font-medium text-foreground">No records found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                No scan history matches your current filters, or no scans have been performed yet.
              </p>
              {searchTerm || filterVerdict !== "all" ? (
                <Button 
                  variant="outline" 
                  className="mt-4 font-mono text-xs uppercase"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterVerdict("all");
                  }}
                >
                  Clear Filters
                </Button>
              ) : (
                <Button asChild className="mt-4 font-mono text-xs uppercase">
                  <Link href="/scan">Execute New Scan</Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
