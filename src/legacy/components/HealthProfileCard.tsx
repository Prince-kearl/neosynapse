import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface HealthProfileCardProps {
  completionPercent?: number;
}

export function HealthProfileCard({ completionPercent = 66 }: HealthProfileCardProps) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercent / 100) * circumference;

  return (
    <div className="bg-gradient-to-b from-card to-card/95 rounded-2xl p-6 border border-border/20 shadow-lg shadow-black/5 dark:shadow-black/20">
      <div className="flex items-center gap-6">
        {/* Circular Progress */}
        <div className="relative flex-shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke="hsl(var(--muted))"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke="hsl(var(--primary))"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 70 70)"
              className="transition-all duration-1000 ease-out"
              style={{
                filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.5))",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-foreground">{completionPercent}%</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="font-display font-semibold text-primary mb-1">
            Health Profile Completion
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Complete your health profile for better recommendations.
          </p>
          <Button
            asChild
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full gap-1"
          >
            <Link to="/patient/profile">
              Complete Profile
              <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
