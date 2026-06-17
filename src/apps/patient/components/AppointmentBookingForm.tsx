import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface BookingFormProps {
  consultationType: "in_person" | "telemedicine";
  onConsultationTypeChange: (value: "in_person" | "telemedicine") => void;
  reasonForVisit: string;
  onReasonChange: (value: string) => void;
  fullName: string;
  onFullNameChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  formErrors: Record<string, string>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export function AppointmentBookingForm({
  consultationType,
  onConsultationTypeChange,
  reasonForVisit,
  onReasonChange,
  fullName,
  onFullNameChange,
  email,
  onEmailChange,
  phone,
  onPhoneChange,
  formErrors,
  isSubmitting,
  onCancel,
  onSubmit,
}: BookingFormProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold">Appointment details</h2>
        <p className="text-sm text-muted-foreground">Complete your contact and consultation preferences before booking.</p>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Consultation type</Label>
          <RadioGroup value={consultationType} onValueChange={(value) => onConsultationTypeChange(value as "in_person" | "telemedicine")}> 
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={cn("rounded-2xl border p-4 text-left transition", consultationType === "in_person" ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/10") }>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">In-person</span>
                  <RadioGroupItem value="in_person" className="sr-only" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">Visit the clinic for a face-to-face consultation.</p>
              </label>
              <label className={cn("rounded-2xl border p-4 text-left transition", consultationType === "telemedicine" ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/10") }>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">Telemedicine</span>
                  <RadioGroupItem value="telemedicine" className="sr-only" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">Meet with your doctor through a secure video visit.</p>
              </label>
            </div>
          </RadioGroup>
          {formErrors.consultationType ? <p className="text-sm text-destructive">{formErrors.consultationType}</p> : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-3">
            <Label htmlFor="reason">Reason for visit</Label>
            <Textarea id="reason" value={reasonForVisit} onChange={(event) => onReasonChange(event.target.value)} rows={4} />
            {formErrors.reasonForVisit ? <p className="text-sm text-destructive">{formErrors.reasonForVisit}</p> : null}
          </div>

          <div className="lg:col-span-3 grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full name</Label>
              <Input id="full-name" value={fullName} onChange={(event) => onFullNameChange(event.target.value)} />
              {formErrors.fullName ? <p className="text-sm text-destructive">{formErrors.fullName}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} />
              {formErrors.email ? <p className="text-sm text-destructive">{formErrors.email}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" type="tel" value={phone} onChange={(event) => onPhoneChange(event.target.value)} />
              {formErrors.phone ? <p className="text-sm text-destructive">{formErrors.phone}</p> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">Cancel</Button>
          <Button onClick={onSubmit} className="w-full sm:w-auto" disabled={isSubmitting}>
            {isSubmitting ? "Booking…" : "Confirm appointment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
