import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  return (
    <div className="flex items-center justify-between gap-4">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className="flex flex-col items-center gap-2 flex-1"
        >
          <div
            className={cn(
              "w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all",
              theme === option.value
                ? "border-primary"
                : "border-muted-foreground/30"
            )}
          >
            {option.value === "system" && (
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-foreground via-foreground to-background" 
                style={{
                  background: "linear-gradient(135deg, hsl(var(--foreground)) 50%, hsl(var(--background)) 50%)"
                }}
              />
            )}
            {option.value === "light" && (
              <div className="w-10 h-10 rounded-full bg-background border border-muted" />
            )}
            {option.value === "dark" && (
              <div className="w-10 h-10 rounded-full bg-foreground" />
            )}
          </div>
          <span className={cn(
            "text-sm",
            theme === option.value ? "text-primary font-medium" : "text-muted-foreground"
          )}>
            {option.label}
          </span>
        </button>
      ))}
    </div>
  );
}
