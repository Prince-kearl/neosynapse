import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  label?: string;
};

export function BrandMark({ className, label = "Neo Synapse" }: BrandMarkProps) {
  return (
    <span
      aria-label={label}
      className={cn("block h-10 w-10 shrink-0 bg-current text-primary", className)}
      role="img"
      style={{
        WebkitMask: "url('/favicon.ico') center / contain no-repeat",
        mask: "url('/favicon.ico') center / contain no-repeat",
      }}
    />
  );
}
