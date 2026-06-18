import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useTouchedFields } from "@/shared/hooks/useTouchedFields";
import { Loader2, Mail, Lock, Eye, EyeOff, Activity, User } from "lucide-react";

const signUpSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters" }).max(100),
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(100),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  preferredLanguage: z.string().optional(),
});

export default function PatientSignUp() {
  type RequiredField = "fullName" | "email" | "password";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configWarning, setConfigWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const touched = useTouchedFields<RequiredField>();
  
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();

  const fullNameError = fullName.trim().length < 2 ? "Name must be at least 2 characters" : undefined;
  const emailError = z.string().trim().email().safeParse(email).success ? undefined : "Invalid email address";
  const passwordError = password.length < 6 ? "Password must be at least 6 characters" : undefined;

  const showFullNameError = touched.isTouched("fullName") && !!fullNameError;
  const showEmailError = touched.isTouched("email") && !!emailError;
  const showPasswordError = touched.isTouched("password") && !!passwordError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfigWarning(null);

    const validation = signUpSchema.safeParse({
      fullName,
      email,
      password,
      dateOfBirth,
      gender,
      phone,
      emergencyContactName,
      emergencyContactPhone,
      preferredLanguage,
    });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const metadata = {
        role: "patient",
        full_name: fullName,
        display_name: fullName,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        phone: phone || null,
        emergency_contact_name: emergencyContactName || null,
        emergency_contact_phone: emergencyContactPhone || null,
        preferred_language: preferredLanguage || "en",
      };
      const { error, session } = await signUp(email, password, metadata);
      if (error) {
        if (error.message.includes("already registered")) {
          setError("An account with this email already exists");
        } else {
          setError(error.message);
        }
      } else {
        if (!session) {
          const { error: signInError } = await signIn(email, password);
          if (signInError) {
            const isEmailConfirmationEnabled = signInError.message.includes("Email not confirmed");

            if (isEmailConfirmationEnabled) {
              setConfigWarning(
                "Admin/Dev warning: Supabase email confirmation is enabled. New users must verify email before first login."
              );
              setError("Account created. Please verify your email, then sign in.");
            } else {
              setError("Account created, but automatic sign-in failed. Please sign in manually.");
            }
            return;
          }
        }

        navigate("/", { replace: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center glow-green">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">Neo Synapse</span>
        </Link>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Create Account</h1>
            <p className="text-muted-foreground mt-1">
              Sign up for your patient portal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            {configWarning && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                {configWarning}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    touched.touch("fullName");
                  }}
                  onBlur={() => touched.touch("fullName")}
                  aria-invalid={showFullNameError}
                  className="pl-10 h-12 rounded-xl"
                  required
                />
              </div>
              {showFullNameError && <p className="text-xs text-destructive">{fullNameError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    touched.touch("email");
                  }}
                  onBlur={() => touched.touch("email")}
                  aria-invalid={showEmailError}
                  className="pl-10 h-12 rounded-xl"
                  required
                />
              </div>
              {showEmailError && <p className="text-xs text-destructive">{emailError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    touched.touch("password");
                  }}
                  onBlur={() => touched.touch("password")}
                  aria-invalid={showPasswordError}
                  className="pl-10 pr-10 h-12 rounded-xl"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {showPasswordError ? (
                <p className="text-xs text-destructive">{passwordError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">At least 6 characters</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+233 XX XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
              <Input
                id="emergency_contact_name"
                type="text"
                placeholder="Contact full name"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
              <Input
                id="emergency_contact_phone"
                type="tel"
                placeholder="+233 XX XXX XXXX"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferred_language">Preferred Language</Label>
              <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="tw">Twi</SelectItem>
                  <SelectItem value="ga">Ga</SelectItem>
                  <SelectItem value="ee">Ewe</SelectItem>
                  <SelectItem value="ha">Hausa</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="yo">Yoruba</SelectItem>
                  <SelectItem value="sw">Swahili</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
            </Button>

            <p className="text-center text-xs leading-5 text-muted-foreground">
              By creating an account, you agree that Neo Synapse will process your health information as described in the{" "}
              <Link to="/privacy" className="font-medium text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/auth/sign-in" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Your health data is protected with secure access controls and privacy-aware care workflows.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
