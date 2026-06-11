import { useGetDashboardStats, useGetRecentScans, useGetThreatTrend } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, AlertTriangle, AlertCircle, ShieldAlert, Activity, ScanLine } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { VerdictBadge } from "@/components/verdict-badge";
import { Link } from "wouter";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recentScans, isLoading: recentLoading } = useGetRecentScans({ limit: 5 });
  const { data: trendData, isLoading: trendLoading } = useGetThreatTrend();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-mono tracking-tight flex items-center gap-2">
          <Activity className="w-8 h-8 text-primary" />
          SOC OVERVIEW
        </h1>
        <p className="text-muted-foreground mt-1">Real-time threat intelligence and scan metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Scans" 
          value={stats?.totalScans} 
          loading={statsLoading} 
          icon={ScanLine} 
          color="text-primary" 
        />
        <StatCard 
          title="Safe" 
          value={stats?.safeCount} 
          loading={statsLoading} 
          icon={ShieldCheck} 
          color="text-safe" 
        />
        <StatCard 
          title="Spam" 
          value={stats?.spamCount} 
          loading={statsLoading} 
          icon={AlertCircle} 
          color="text-spam" 
        />
        <StatCard 
          title="Phishing" 
          value={stats?.phishingCount} 
          loading={statsLoading} 
          icon={ShieldAlert} 
          color="text-phishing" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="font-mono text-sm tracking-widest text-muted-foreground uppercase">7-Day Threat Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="w-full h-full" />
              </div>
            ) : trendData && trendData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => format(new Date(val), "MMM d")} 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      labelFormatter={(val) => format(new Date(val), "MMM d, yyyy")}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="safe" stackId="a" fill="hsl(var(--safe))" name="Safe" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="suspicious" stackId="a" fill="hsl(var(--suspicious))" name="Suspicious" />
                    <Bar dataKey="spam" stackId="a" fill="hsl(var(--spam))" name="Spam" />
                    <Bar dataKey="phishing" stackId="a" fill="hsl(var(--phishing))" name="Phishing" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No trend data available.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-mono text-sm tracking-widest text-muted-foreground uppercase">Recent Scans</CardTitle>
            <Link href="/history" className="text-xs text-primary hover:underline font-mono">View All</Link>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {recentLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentScans && recentScans.length > 0 ? (
              <div className="space-y-4">
                {recentScans.map((scan) => (
                  <Link key={scan.id} href={`/scan/${scan.id}`} className="block group">
                    <div className="p-3 rounded-md border border-border/50 bg-background/50 hover:bg-muted transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-mono text-xs text-muted-foreground truncate max-w-[150px]">
                          {scan.subject || scan.senderEmail || "No Subject"}
                        </div>
                        <VerdictBadge verdict={scan.verdict} className="scale-75 origin-top-right" />
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(scan.scannedAt), "MMM d, HH:mm")}
                        </div>
                        <div className="text-xs font-mono">
                          Score: <span className={scan.confidence > 80 ? "text-safe" : scan.confidence < 50 ? "text-phishing" : "text-suspicious"}>{scan.confidence}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm py-10">
                No recent scans.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, loading, icon: Icon, color }: { title: string; value?: number; loading: boolean; icon: any; color: string }) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium font-mono text-muted-foreground uppercase tracking-wider">{title}</p>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <div className="flex items-baseline space-x-2 mt-2">
          {loading ? (
            <Skeleton className="h-10 w-24" />
          ) : (
            <h2 className="text-4xl font-bold font-mono tracking-tighter">
              {value !== undefined ? value.toLocaleString() : "0"}
            </h2>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
