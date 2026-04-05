import { type LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconWrapClassName?: string;
  iconClassName?: string;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  iconWrapClassName = "bg-muted",
  iconClassName = "text-primary",
}: MetricCardProps) {
  return (
    <div className="bg-card rounded-3xl p-4 border border-border/50 shadow-sm w-full min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${iconWrapClassName}`}>
          <Icon className={`w-6 h-6 ${iconClassName}`} />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-2xl font-bold leading-tight text-foreground truncate">{value}</p>
          <p className="text-xs text-muted-foreground leading-snug truncate">{label}</p>
        </div>
      </div>
    </div>
  );
}