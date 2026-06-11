import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, AlertCircle, ShieldAlert } from "lucide-react";
import { ScanVerdict } from "@workspace/api-client-react";
import { clsx } from "clsx";

export function VerdictBadge({ verdict, className }: { verdict: ScanVerdict; className?: string }) {
  const config = {
    safe: {
      color: "bg-safe/20 text-safe border-safe/50",
      icon: ShieldCheck,
      label: "Safe"
    },
    suspicious: {
      color: "bg-suspicious/20 text-suspicious border-suspicious/50",
      icon: AlertTriangle,
      label: "Suspicious"
    },
    spam: {
      color: "bg-spam/20 text-spam border-spam/50",
      icon: AlertCircle,
      label: "Spam"
    },
    phishing: {
      color: "bg-phishing/20 text-phishing border-phishing/50",
      icon: ShieldAlert,
      label: "Phishing"
    }
  };

  const { color, icon: Icon, label } = config[verdict] || config.safe;

  return (
    <Badge variant="outline" className={clsx("font-mono px-2.5 py-0.5 border flex items-center gap-1.5 w-fit", color, className)}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Badge>
  );
}
