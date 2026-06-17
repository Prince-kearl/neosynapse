import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TimeSlotPickerProps {
  scheduledDate: Date | null;
  scheduledTime: string;
  onDateChange: (date: Date) => void;
  onTimeChange: (value: string) => void;
  unavailableSlotKeys: Set<string>;
  minDate: Date;
  maxDate: Date;
  isLoading: boolean;
  dateError?: string;
  timeError?: string;
}

const TIME_SLOTS = Array.from({ length: 16 }, (_, index) => {
  const hour = 8 + Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${minute}`;
});

export function TimeSlotPicker({
  scheduledDate,
  scheduledTime,
  onDateChange,
  onTimeChange,
  unavailableSlotKeys,
  minDate,
  maxDate,
  isLoading,
  dateError,
  timeError,
}: TimeSlotPickerProps) {
  const selectedDateTime = scheduledDate ? new Date(scheduledDate) : null;

  const renderSlot = (slot: string) => {
    if (!scheduledDate) return false;
    const date = new Date(scheduledDate);
    const [hours, minutes] = slot.split(":").map(Number);
    date.setHours(hours, minutes, 0, 0);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    return unavailableSlotKeys.has(key);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
      <div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Choose date and time</h2>
            <p className="text-sm text-muted-foreground">Pick an available slot for your appointment.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <div className="space-y-3">
          <Label htmlFor="appointment-date">Appointment date</Label>
          <Calendar
            mode="single"
            selected={scheduledDate}
            onSelect={(date) => date && onDateChange(date)}
            disabled={(date) => date < minDate || date > maxDate}
          />
          {dateError ? <p className="text-sm text-destructive">{dateError}</p> : null}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="appointment-time">Appointment time</Label>
              <p className="text-sm text-muted-foreground">Select a 30-minute start time.</p>
            </div>
            <div className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">{scheduledDate ? selectedDateTime?.toDateString() : "No date selected"}</div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {TIME_SLOTS.map((slot) => {
              const disabled = renderSlot(slot);
              const isSelected = scheduledTime === slot;
              return (
                <Button
                  key={slot}
                  type="button"
                  variant={isSelected ? "secondary" : "outline"}
                  className={cn(
                    "justify-center text-sm",
                    disabled && "cursor-not-allowed opacity-60",
                    isSelected && "border-primary bg-primary/10 text-primary",
                  )}
                  onClick={() => !disabled && onTimeChange(slot)}
                  disabled={disabled}
                >
                  {slot}
                </Button>
              );
            })}
          </div>
          {timeError ? <p className="text-sm text-destructive">{timeError}</p> : null}
          {isLoading ? <p className="text-sm text-muted-foreground">Refreshing availability…</p> : null}
        </div>
      </div>
    </div>
  );
}
