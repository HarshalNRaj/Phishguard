import { Badge } from "@/components/ui/badge";
import { ThreatIndicatorSeverity } from "@workspace/api-client-react";
import { clsx } from "clsx";

export function SeverityChip({ severity, className }: { severity: ThreatIndicatorSeverity; className?: string }) {
  const config = {
    low: "bg-blue-500/20 text-blue-500 border-blue-500/50",
    medium: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50",
    high: "bg-orange-500/20 text-orange-500 border-orange-500/50",
    critical: "bg-red-500/20 text-red-500 border-red-500/50"
  };

  const color = config[severity] || config.low;

  return (
    <Badge variant="outline" className={clsx("font-mono text-[10px] px-1.5 py-0 uppercase tracking-wider border", color, className)}>
      {severity}
    </Badge>
  );
}
