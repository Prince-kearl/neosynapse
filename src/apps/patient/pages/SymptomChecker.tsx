// Patient Symptom Checker - wrapped version
import { useEffect, useRef, useState } from "react";
import {
  Activity, AlertTriangle, CheckCircle, ChevronRight, Loader2,
  Thermometer, Brain, Heart, Stethoscope, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MedicalReportTools } from "./MedicalReportTools";
import { medicalReportService } from "@/shared/services/healthcare";
import { useMedicalHistory } from "@/shared/hooks/useHealthcare";
import { buildMedicalHistoryContext } from "@/shared/lib/medicalHistory";

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

const symptomCheckerCopy = {
  en: {
    loadingTitle: "Analyzing Symptoms",
    loadingBody: "Neo Synapse is assessing your symptoms...",
    triageTitle: "Triage Assessment",
    newCheck: "New Check",
    possibleConditions: "Possible Conditions",
    recommendedAction: "Recommended Action",
    warningSignsTitle: "Warning Signs to Watch",
    doctorQuestions: "Questions for Your Doctor",
    disclaimer: "This is not a medical diagnosis. Please consult a healthcare professional.",
    checkerTitle: "Symptom Checker",
    checkerSubtitle: "Select or describe your symptoms for an AI-powered triage assessment",
    patientInformation: "Patient Information",
    age: "Age",
    agePlaceholder: "e.g. 35",
    gender: "Gender",
    select: "Select",
    commonSymptoms: "Common Symptoms",
    selected: "selected",
    clearAll: "Clear all",
    additionalSymptoms: "Describe Additional Symptoms",
    additionalPlaceholder: "e.g. Persistent dry cough for 3 days, mild chest tightness when breathing...",
    commaHint: "Separate multiple symptoms with commas.",
    analyze: "Analyze Symptoms",
  },
  tw: {
    loadingTitle: "Yerehwehwɛ nsɛnkyerɛnne no",
    loadingBody: "Neo Synapse repɛ mu nsɛmpɔw no...",
    triageTitle: "Triage Nhwehwemu",
    newCheck: "San hwehwɛ bio",
    possibleConditions: "Yare a ebetumi ayɛ",
    recommendedAction: "Anamɔn a ɛfata",
    warningSignsTitle: "Nsɛnkyerɛnne a ɛsɛ sɛ wode ani to so",
    doctorQuestions: "Nsɛmmisa ma Dokita",
    disclaimer: "Eyi nyɛ ayaresa mu diagnosis. Fa wo ho to oduruyɛfoɔ so.",
    checkerTitle: "Yare Nsɛnkyerɛnne Checker",
    checkerSubtitle: "Yi anaa kyerɛkyerɛ wo nsɛnkyerɛnne ma AI triage nhwehwemu",
    patientInformation: "Yarefo Ho Nsɛm",
    age: "Mfe",
    agePlaceholder: "sɛe 35",
    gender: "Bɔbeasu",
    select: "Yi",
    commonSymptoms: "Nsɛnkyerɛnne a ɛtaa ba",
    selected: "wɔayi",
    clearAll: "Popa nyinaa",
    additionalSymptoms: "Kyerɛkyerɛ nsɛnkyerɛnne foforo",
    additionalPlaceholder: "sɛe, kuruwa a ɛkɔ so nnansa yi, na ahome mu den kakra...",
    commaHint: "Fa koma hyehyɛ nsɛnkyerɛnne pii ntam.",
    analyze: "Hwehwɛ Nsɛnkyerɛnne mu",
  },
  ga: {
    loadingTitle: "Mihe nileee niyɔŋmɔi",
    loadingBody: "Neo Synapse ebaakɛ niyɔŋmɔi lɛ mli...",
    triageTitle: "Triage Hweɛmɔ",
    newCheck: "Kɛ amli bio",
    possibleConditions: "Hewalɛi si wɔba",
    recommendedAction: "Ninɔŋmɔ ni baa",
    warningSignsTitle: "Nitsumɔi ni ohe kɛ se",
    doctorQuestions: "Biabii ma Dokita",
    disclaimer: "Ehe nyɛ diagnosis. Tsake dokita kɛ faa ni.",
    checkerTitle: "Niyɔŋmɔ Checker",
    checkerSubtitle: "Lɛ niyɔŋmɔi lɛ ko ekɛ shishi amɛ AI triage",
    patientInformation: "Yarefo Nsɛm",
    age: "Mfe",
    agePlaceholder: "sɛe 35",
    gender: "Bɔbeasu",
    select: "Yi",
    commonSymptoms: "Niyɔŋmɔi ni taa ba",
    selected: "a wɔayi",
    clearAll: "Popa nyinaa",
    additionalSymptoms: "Kasa hewalɛi ahefo",
    additionalPlaceholder: "sɛe, kuruwa ni eko bo nnansa, ahome mu den kakra...",
    commaHint: "Fa comma hyehyɛ niyɔŋmɔi pii ntam.",
    analyze: "Hweɛ Niyɔŋmɔi",
  },
  ee: {
    loadingTitle: "Mele dzesi to dzodzo me",
    loadingBody: "Neo Synapse le wo dzodzoewo me kpɔm...",
    triageTitle: "Triage Ŋutinyanya",
    newCheck: "Wɔwɔ ake",
    possibleConditions: "Nudzɔdzɔ siwo ate ŋu",
    recommendedAction: "Nusi wowɔa o",
    warningSignsTitle: "Dzesi siwo nèle kpɔ o",
    doctorQuestions: "Biabia na dokita",
    disclaimer: "Esi menye diagnosis o. Taflatse kpe ɖe dokita ŋu.",
    checkerTitle: "Dzodzo Checker",
    checkerSubtitle: "Tia alo gblɔ wo dzodzoewo na AI triage",
    patientInformation: "Dɔlila Nyatakakawo",
    age: "Xexe",
    agePlaceholder: "le 35",
    gender: "Sɔŋli",
    select: "Tia",
    commonSymptoms: "Dzodzo siwo wɔa vaa",
    selected: "wo tia",
    clearAll: "Tutui katã",
    additionalSymptoms: "Gblɔ dzodzo bubuawo",
    additionalPlaceholder: "le kpɔe, kuku geɖe le ŋkeke etɔ̃ me...",
    commaHint: "Tsɔ koma mae le dzodzo geɖewo dome.",
    analyze: "Le Dzodzoewo Kpɔm",
  },
  ha: {
    loadingTitle: "Ana nazarin alamomi",
    loadingBody: "Neo Synapse na tantance alamominka...",
    triageTitle: "Binciken Triage",
    newCheck: "Sabon bincike",
    possibleConditions: "Yiwuwa cututtuka",
    recommendedAction: "Matakin da aka ba da shawara",
    warningSignsTitle: "Alamomin gargadi",
    doctorQuestions: "Tambayoyi ga likita",
    disclaimer: "Wannan ba tantancewa ta likita ba ce. Tuntuɓi ƙwararren likita.",
    checkerTitle: "Mai duba alamomi",
    checkerSubtitle: "Zaɓi ko rubuta alamominka domin AI triage",
    patientInformation: "Bayanin mara lafiya",
    age: "Shekaru",
    agePlaceholder: "misali 35",
    gender: "Jinsi",
    select: "Zaɓi",
    commonSymptoms: "Alamomin da suka fi yawa",
    selected: "an zaɓa",
    clearAll: "Goge duka",
    additionalSymptoms: "Bayyana ƙarin alamomi",
    additionalPlaceholder: "misali tari busasshe na kwanaki 3...",
    commaHint: "Raba alamomi da wakafi.",
    analyze: "Nazarin Alamomi",
  },
} as const;

const localizedCommonSymptoms: Record<string, string[]> = {
  en: ["Headache", "Fever", "Cough", "Chest pain", "Fatigue", "Nausea", "Dizziness", "Shortness of breath", "Joint pain", "Abdominal pain"],
  tw: ["Ti yare", "Atiridii", "Watiridii", "Koko mu yaw", "Brɛ", "Fom", "Tiritiri", "Ahomegye mu den", "Nnompe mu yaw", "Yafunu mu yaw"],
  ga: ["Ntsu yɔɔ", "Atidii", "Sɛɛ", "Koko mu yɛmɔ", "Brɛ", "Fom", "Tsɛtsɛ", "Ahomgye mu den", "Nnompe mu yɛmɔ", "Yafunum yɛmɔ"],
  ee: ["Ta nu veve", "Asra", "Xexe", "Aƒoƒome veve", "Gbɔdzɔdzɔ", "Nududu", "Amevivina", "Gbɔgbɔtsitsi sesẽ", "Aƒɔveve", "Dɔmeveve"],
  ha: ["Ciwon kai", "Zazzabi", "Tari", "Ciwon kirji", "Gajiya", "Tashin zuciya", "Jiri", "Wahalar numfashi", "Ciwon gabobi", "Ciwon ciki"],
};

function parseSymptoms(selectedSymptoms: string[], additionalSymptoms: string): string[] {
  const fromText = additionalSymptoms
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Deduplicate case-insensitively while preserving first-seen value.
  const dedup = new Map<string, string>();
  [...selectedSymptoms, ...fromText].forEach((item) => {
    const normalized = item.toLowerCase();
    if (!dedup.has(normalized)) dedup.set(normalized, item);
  });

  return [...dedup.values()];
}

function buildSymptomReport(params: {
  result: TriageResult;
  age: string;
  gender: string;
  selectedSymptoms: string[];
  additionalSymptoms: string;
}) {
  const { result, age, gender, selectedSymptoms, additionalSymptoms } = params;
  const now = new Date();
  const additional = additionalSymptoms
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allSymptoms = [...selectedSymptoms, ...additional];

  const reportJson = {
    title: "AI Symptom Triage Report",
    generatedAt: now.toISOString(),
    generatedBy: "Neo Synapse Symptom Checker",
    patient: {
      age: age || "unknown",
      gender: gender || "unknown",
    },
    symptoms: allSymptoms,
    urgency: result.urgency,
    summary: result.summary,
    possible_conditions: result.possible_conditions,
    recommended_action: result.recommended_action,
    follow_up_questions: result.questions,
    warning_signs: result.warning_signs,
    disclaimer: "This report is triage guidance only and is not a medical diagnosis.",
  };

  const warningSigns = result.warning_signs.length > 0
    ? result.warning_signs.map((w) => `- ${w}`).join("\n")
    : "- None listed";

  const followUps = result.questions.length > 0
    ? result.questions.map((q) => `- ${q}`).join("\n")
    : "- None listed";

  const possibleConditions = result.possible_conditions.length > 0
    ? result.possible_conditions.map((c) => `- ${c.name} (${c.likelihood})`).join("\n")
    : "- None listed";

  const reportMarkdown = `# Symptom Triage Report

## Report Details
- Generated: ${now.toLocaleString()}
- Generated By: Neo Synapse Symptom Checker

## Patient Information
- Age: ${age || "unknown"}
- Gender: ${gender || "unknown"}

## Reported Symptoms
${allSymptoms.length > 0 ? allSymptoms.map((s) => `- ${s}`).join("\n") : "- None listed"}

## Triage Result
- Urgency: ${result.urgency}
- Summary: ${result.summary}

## Possible Conditions
${possibleConditions}

## Recommended Action
${result.recommended_action}

## Warning Signs
${warningSigns}

## Questions For Follow-up
${followUps}

## Disclaimer
This report is triage guidance only and is not a medical diagnosis. Please consult a qualified healthcare professional.
`;

  return { markdown: reportMarkdown, json: reportJson };
}

export default function PatientSymptomChecker() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { data: medicalHistory } = useMedicalHistory();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  const [symptoms, setSymptoms] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [result, setResult] = useState<TriageResult | null>(null);
  const savedReportSignaturesRef = useRef<Set<string>>(new Set());
  const copy = symptomCheckerCopy[language] || symptomCheckerCopy.en;
  const medicalHistoryContext = buildMedicalHistoryContext(medicalHistory, null);
  const commonSymptoms = localizedCommonSymptoms[language] || localizedCommonSymptoms.en;
  const parsedSymptoms = parseSymptoms(selectedSymptoms, symptoms);

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const getValidAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    let accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      accessToken = refreshed.session?.access_token;
    }

    return accessToken;
  };

  const handleSubmit = async () => {
    const allSymptomsList = parseSymptoms(selectedSymptoms, symptoms);
    const allSymptoms = allSymptomsList.join(", ");

    if (!allSymptomsList.length) {
      toast({ title: "No symptoms", description: "Please enter at least one symptom.", variant: "destructive" });
      return;
    }

    if (age.trim()) {
      const ageNumber = Number(age);
      if (!Number.isFinite(ageNumber) || ageNumber <= 0 || ageNumber > 120) {
        toast({ title: "Invalid age", description: "Please enter an age between 1 and 120.", variant: "destructive" });
        return;
      }
    }

    setStep("loading");

    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        toast({ title: "Sign in required", description: "Redirecting you to sign in.", variant: "destructive" });
        navigate("/auth/sign-in?redirect=/patient/symptom-checker");
        setStep("input");
        return;
      }

      const invokeTriage = (token: string) => supabase.functions.invoke("symptom-triage", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: { symptoms: allSymptoms, age, gender, language, medicalHistoryContext },
      });

      let { data, error } = await invokeTriage(accessToken);

      if (error) {
        const initialStatus = (error as any)?.context?.status || (error as any)?.status;
        if (initialStatus === 401) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          const refreshedToken = refreshed.session?.access_token;

          if (refreshedToken) {
            const retryResult = await invokeTriage(refreshedToken);
            data = retryResult.data;
            error = retryResult.error;
          }

          const retryStatus = (error as any)?.context?.status || (error as any)?.status;
          if (retryStatus === 401) {
            toast({ title: "Session expired", description: "Redirecting you to sign in.", variant: "destructive" });
            navigate("/auth/sign-in?redirect=/patient/symptom-checker");
            setStep("input");
            return;
          }
        }
        const finalStatus = (error as any)?.context?.status || (error as any)?.status;
        if (finalStatus === 429) {
          toast({ title: "Too many requests", description: "Please wait a moment and try again.", variant: "destructive" });
          setStep("input");
          return;
        }
        if (finalStatus === 402) {
          toast({ title: "Service temporarily unavailable", description: "Triage credits are currently exhausted.", variant: "destructive" });
          setStep("input");
          return;
        }
        throw error;
      }
      if (!data || typeof data !== "object") {
        throw new Error("Invalid triage response");
      }

      const normalized: TriageResult = {
        urgency: data.urgency,
        summary: data.summary || "Assessment complete.",
        possible_conditions: Array.isArray(data.possible_conditions) ? data.possible_conditions : [],
        recommended_action: data.recommended_action || "Please consult a healthcare professional for next steps.",
        questions: Array.isArray(data.questions) ? data.questions : [],
        warning_signs: Array.isArray(data.warning_signs) ? data.warning_signs : [],
      };

      setResult(normalized);
      setStep("result");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Triage service unavailable. Please try again.";
      toast({ title: "Error", description: message, variant: "destructive" });
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

  // Auto-save generated symptom triage report into medical_reports.
  useEffect(() => {
    if (step !== "result" || !result || !user?.id) return;

    const autoReport = buildSymptomReport({
      result,
      age,
      gender,
      selectedSymptoms,
      additionalSymptoms: symptoms,
    });

    const signature = `${result.urgency}|${result.summary}|${autoReport.markdown.slice(0, 220)}`;
    if (savedReportSignaturesRef.current.has(signature)) return;

    let cancelled = false;
    const persistReport = async () => {
      const { error } = await medicalReportService.create({
        patient_id: user.id,
        report_type: "symptom_triage",
        report_json: {
          ...autoReport.json,
          markdown: autoReport.markdown,
          source: "symptom_checker",
        },
      });

      if (cancelled) return;
      if (error) {
        console.error("Failed to auto-save symptom triage report:", error);
        return;
      }

      savedReportSignaturesRef.current.add(signature);
      queryClient.invalidateQueries({ queryKey: ["my-reports", user.id] });
      queryClient.invalidateQueries({ queryKey: ["recent-reports", user.id] });
      toast({ title: "Report saved to history" });
    };

    persistReport();
    return () => {
      cancelled = true;
    };
  }, [step, result, user?.id, age, gender, selectedSymptoms, symptoms, queryClient, navigate]);

  if (step === "loading") {
    return (
      <div className="flex-1 min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <h2 className="font-display text-xl font-bold">{copy.loadingTitle}</h2>
          <p className="text-muted-foreground text-sm">{copy.loadingBody}</p>
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  if (step === "result" && result) {
    const config = urgencyConfig[result.urgency];
    const UrgencyIcon = config.icon;
    const autoReport = buildSymptomReport({
      result,
      age,
      gender,
      selectedSymptoms,
      additionalSymptoms: symptoms,
    });

    return (
      <div className="flex-1 min-h-screen bg-background">
        <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold">{copy.triageTitle}</h1>
            <Button variant="outline" size="sm" onClick={resetChecker}>
              {copy.newCheck}
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
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              {copy.possibleConditions}
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
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              {copy.recommendedAction}
            </h3>
            <p className="text-sm text-muted-foreground">{result.recommended_action}</p>
          </div>

          {/* Warning Signs */}
          {result.warning_signs.length > 0 && (
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-destructive" />
                {copy.warningSignsTitle}
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
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
              <h3 className="font-display font-semibold mb-3">{copy.doctorQuestions}</h3>
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

          <MedicalReportTools
            markdown={autoReport.markdown}
            json={autoReport.json}
          />

          <p className="text-xs text-muted-foreground text-center">
            {copy.disclaimer}
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
          <h1 className="font-display text-2xl font-bold mb-2">{copy.checkerTitle}</h1>
          <p className="text-muted-foreground text-sm">
            {copy.checkerSubtitle}
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Best for urgency triage</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use Symptom Checker when you want risk level and next-step care guidance.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="sm:shrink-0"
              onClick={() => navigate("/patient/ai-assistant")}
            >
              Need broader health guidance?
            </Button>
          </div>
        </div>

        {/* Patient Info */}
        <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
          <h3 className="font-semibold">{copy.patientInformation}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{copy.age}</label>
              <Input
                type="number"
                placeholder={copy.agePlaceholder}
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{copy.gender}</label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder={copy.select} />
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
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold">{copy.commonSymptoms}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{parsedSymptoms.length} {copy.selected}</span>
              {(selectedSymptoms.length > 0 || symptoms.trim()) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setSelectedSymptoms([]);
                    setSymptoms("");
                  }}
                >
                  {copy.clearAll}
                </Button>
              )}
            </div>
          </div>
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
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
          <h3 className="font-semibold mb-3">{copy.additionalSymptoms}</h3>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder={copy.additionalPlaceholder}
            rows={3}
            className="w-full resize-none rounded-xl bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {copy.commaHint}
          </p>
        </div>

        <Button
          className="w-full h-12 bg-primary hover:bg-primary/90 rounded-full text-base font-semibold"
          onClick={handleSubmit}
          disabled={parsedSymptoms.length === 0}
        >
          <Activity className="w-5 h-5 mr-2" />
          {copy.analyze}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          This tool provides guidance only and is not a substitute for professional medical advice.
        </p>
      </div>
    </div>
  );
}
