// Patient Symptom Checker - wrapped version
import { useState } from "react";
import {
  Activity, AlertTriangle, CheckCircle, ChevronRight, Loader2,
  Thermometer, Brain, Heart, Stethoscope, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TriageResult {
  urgency: "non-urgent" | "needs-attention" | "urgent" | "emergency";
  summary: string;
  possible_conditions: { name: string; likelihood: string }[];
  recommended_action: string;
  questions: string[];
  warning_signs: string[];
}

const urgencyConfig = {
  "non-urgent": { color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle, label: "Non-Urgent" },
  "needs-attention": { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Activity, label: "Needs Attention" },
  "urgent": { color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: AlertTriangle, label: "Urgent" },
  "emergency": { color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle, label: "Emergency" },
};

const commonSymptoms = [
  "Headache", "Fever", "Cough", "Chest pain", "Fatigue",
  "Nausea", "Dizziness", "Shortness of breath", "Joint pain", "Abdominal pain",
];

export default function PatientSymptomChecker() {
  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  const [symptoms, setSymptoms] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [result, setResult] = useState<TriageResult | null>(null);

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleSubmit = async () => {
    const allSymptoms = [
      ...selectedSymptoms,
      ...symptoms.split(",").map((s) => s.trim()).filter(Boolean),
    ].join(", ");

    if (!allSymptoms) {
      toast({ title: "No symptoms", description: "Please enter at least one symptom.", variant: "destructive" });
      return;
    }

    setStep("loading");

    try {
      const { data, error } = await supabase.functions.invoke("symptom-triage", {
        body: { symptoms: allSymptoms, age, gender },
      });

      if (error) throw error;
      setResult(data);
      setStep("result");
    } catch (e) {
      toast({ title: "Error", description: "Triage service unavailable. Please try again.", variant: "destructive" });
      setStep("input");
    }
  };

  const resetChecker = () => {
    setStep("input");
    setSymptoms("");
    setSelectedSymptoms([]);
    setAge("");
    setGender("");
    setResult(null);
  };

  if (step === "loading") {
    return (
      <div className="flex-1 min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <h2 className="font-display text-xl font-bold">Analyzing Symptoms</h2>
          <p className="text-muted-foreground text-sm">Neo Synapse is assessing your symptoms...</p>
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  if (step === "result" && result) {
    const config = urgencyConfig[result.urgency];
    const UrgencyIcon = config.icon;

    return (
      <div className="flex-1 min-h-screen bg-background">
        <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold">Triage Assessment</h1>
            <Button variant="outline" size="sm" onClick={resetChecker}>
              New Check
            </Button>
          </div>

          {/* Urgency Banner */}
          <div className={`rounded-2xl p-6 border ${config.color}`}>
            <div className="flex items-center gap-3 mb-2">
              <UrgencyIcon className="w-6 h-6" />
              <span className="font-display text-lg font-bold">{config.label}</span>
            </div>
            <p className="text-sm opacity-90">{result.summary}</p>
          </div>

          {result.urgency === "emergency" && (
            <div className="bg-destructive/20 border border-destructive/30 rounded-2xl p-4">
              <p className="font-bold text-destructive">⚠️ If this is an emergency, call emergency services immediately.</p>
            </div>
          )}

          {/* Possible Conditions */}
          <div className="bg-card rounded-2xl p-5 shadow-food-card">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              Possible Conditions
            </h3>
            <div className="space-y-3">
              {result.possible_conditions.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <span className="text-sm">{c.name}</span>
                  <Badge variant="outline" className={
                    c.likelihood === "high" ? "border-orange-500/50 text-orange-500" :
                    c.likelihood === "medium" ? "border-yellow-500/50 text-yellow-500" :
                    "border-muted-foreground/50 text-muted-foreground"
                  }>
                    {c.likelihood}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Action */}
          <div className="bg-card rounded-2xl p-5 shadow-food-card">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              Recommended Action
            </h3>
            <p className="text-sm text-muted-foreground">{result.recommended_action}</p>
          </div>

          {/* Warning Signs */}
          {result.warning_signs.length > 0 && (
            <div className="bg-card rounded-2xl p-5 shadow-food-card">
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-destructive" />
                Warning Signs to Watch
              </h3>
              <ul className="space-y-2">
                {result.warning_signs.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Follow-up Questions */}
          {result.questions.length > 0 && (
            <div className="bg-card rounded-2xl p-5 shadow-food-card">
              <h3 className="font-display font-semibold mb-3">Questions for Your Doctor</h3>
              <ul className="space-y-2">
                {result.questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            This is not a medical diagnosis. Please consult a healthcare professional.
          </p>
        </div>
      </div>
    );
  }

  // Input Step
  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Thermometer className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">Symptom Checker</h1>
          <p className="text-muted-foreground text-sm">
            Select or describe your symptoms for an AI-powered triage assessment
          </p>
        </div>

        {/* Patient Info */}
        <div className="bg-card rounded-2xl p-5 shadow-food-card space-y-4">
          <h3 className="font-semibold">Patient Information</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Age</label>
              <Input
                type="number"
                placeholder="e.g. 35"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Gender</label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Common Symptoms */}
        <div className="bg-card rounded-2xl p-5 shadow-food-card">
          <h3 className="font-semibold mb-3">Common Symptoms</h3>
          <div className="flex flex-wrap gap-2">
            {commonSymptoms.map((s) => (
              <button
                key={s}
                onClick={() => toggleSymptom(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedSymptoms.includes(s)
                    ? "bg-primary text-primary-foreground glow-green"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Additional Symptoms */}
        <div className="bg-card rounded-2xl p-5 shadow-food-card">
          <h3 className="font-semibold mb-3">Describe Additional Symptoms</h3>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="e.g. Persistent dry cough for 3 days, mild chest tightness when breathing..."
            rows={3}
            className="w-full resize-none rounded-xl bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>

        <Button
          className="w-full h-12 bg-primary hover:bg-primary/90 rounded-full text-base font-semibold"
          onClick={handleSubmit}
          disabled={selectedSymptoms.length === 0 && !symptoms.trim()}
        >
          <Activity className="w-5 h-5 mr-2" />
          Analyze Symptoms
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          This tool provides guidance only and is not a substitute for professional medical advice.
        </p>
      </div>
    </div>
  );
}
