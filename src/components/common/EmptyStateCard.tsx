import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconContainerClassName?: string;
  compact?: boolean;
}

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  iconContainerClassName = "bg-primary/10",
  compact = false,
}: EmptyStateCardProps) {
  return (
    <div className={`bg-card rounded-2xl border border-border text-center ${compact ? "p-8" : "p-8 lg:p-12"}`}>
      <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center ${iconContainerClassName}`}>
        <Icon className="w-10 h-10 text-primary" />
      </div>
      <h2 className="font-display text-xl font-semibold text-foreground mb-3">{title}</h2>
      {description && <p className="text-muted-foreground max-w-md mx-auto mb-4">{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}