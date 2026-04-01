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
    <div className="rounded-2xl border border-border/20 bg-gradient-to-b from-card to-card/95 p-6 shadow-lg shadow-black/5 dark:shadow-black/20 max-[380px]:rounded-[20px] max-[380px]:p-4">
      <div className="flex items-center gap-6 max-[380px]:gap-3">
        {/* Circular Progress */}
        <div className="relative flex-shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140" className="max-[380px]:h-24 max-[380px]:w-24">
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
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-bold text-xl text-primary sm:text-2xl max-[380px]:text-lg">
            {completionPercent}%
          </span>
        </div>
        {/* Text & Button */}
        <div className="flex flex-1 flex-col items-center gap-2 text-center sm:items-start sm:text-left max-[380px]:gap-1.5">
          <div className="break-words text-base font-semibold text-foreground sm:text-lg max-[380px]:text-sm max-[380px]:leading-tight">Health Profile Completion</div>
          <div className="mb-2 break-words text-sm text-muted-foreground max-[380px]:mb-1 max-[380px]:text-xs max-[380px]:leading-tight">
            Complete your health profile for better care.
          </div>
          <Button asChild className="w-full sm:w-fit max-[380px]:h-9 max-[380px]:px-3 max-[380px]:text-xs">
            <Link to="/patient/profile">
              Complete Profile
              <ChevronRight className="ml-1 h-4 w-4 max-[380px]:h-3.5 max-[380px]:w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
