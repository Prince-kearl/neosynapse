import { useState } from "react";
import {
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff,
  MessageSquare, FileText, Users, Clock, Shield, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

type ConsultationState = "lobby" | "waiting" | "active" | "ended";

const mockDoctors = [
  { id: "1", name: "Dr. Ama Mensah", specialty: "General Practice", rating: 4.8, available: true, image: null },
  { id: "2", name: "Dr. Kwame Asante", specialty: "Internal Medicine", rating: 4.9, available: true, image: null },
  { id: "3", name: "Dr. Efua Owusu", specialty: "Pediatrics", rating: 4.7, available: false, image: null },
  { id: "4", name: "Dr. Kofi Boateng", specialty: "Cardiology", rating: 4.9, available: true, image: null },
];

const Telemedicine = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<ConsultationState>("lobby");
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [consentRecording, setConsentRecording] = useState(false);

  if (!user) {
    return (
      <div className="flex-1 min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <Video className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Sign in for Telemedicine</h1>
        <p className="text-muted-foreground mb-6">Access virtual consultations with healthcare professionals</p>
        <Button onClick={() => navigate("/auth?redirect=/telemedicine")}>Sign In</Button>
      </div>
    );
  }

  if (state === "active") {
    return (
      <div className="flex-1 min-h-screen bg-background flex flex-col">
        {/* Video Area */}
        <div className="flex-1 relative bg-card rounded-2xl m-4 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-24 h-24 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-12 h-12 text-primary" />
              </div>
              <p className="font-display font-semibold text-lg">
                {mockDoctors.find((d) => d.id === selectedDoctor)?.name}
              </p>
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                Connected
              </Badge>
              {consentRecording && (
                <div className="flex items-center gap-2 justify-center text-xs text-destructive">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  Recording with consent
                </div>
              )}
            </div>
          </div>

          {/* Self View */}
          <div className="absolute bottom-4 right-4 w-32 h-24 bg-muted rounded-xl flex items-center justify-center border border-border">
            {videoEnabled ? (
              <p className="text-xs text-muted-foreground">Your camera</p>
            ) : (
              <VideoOff className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4">
          <div className="max-w-md mx-auto flex items-center justify-center gap-4">
            <Button
              variant={audioEnabled ? "outline" : "destructive"}
              size="icon"
              className="rounded-full w-12 h-12"
              onClick={() => setAudioEnabled(!audioEnabled)}
            >
              {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>
            <Button
              variant={videoEnabled ? "outline" : "destructive"}
              size="icon"
              className="rounded-full w-12 h-12"
              onClick={() => setVideoEnabled(!videoEnabled)}
            >
              {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="rounded-full w-14 h-14"
              onClick={() => setState("ended")}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full w-12 h-12">
              <MessageSquare className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full w-12 h-12">
              <FileText className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "waiting") {
    return (
      <div className="flex-1 min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 p-6">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <h2 className="font-display text-xl font-bold">Connecting to Doctor</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Waiting for {mockDoctors.find((d) => d.id === selectedDoctor)?.name} to join...
          </p>
          <Button variant="outline" onClick={() => setState("lobby")}>Cancel</Button>
        </div>
      </div>
    );
  }

  if (state === "ended") {
    return (
      <div className="flex-1 min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 p-6 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Phone className="w-10 h-10 text-primary" />
          </div>
          <h2 className="font-display text-xl font-bold">Consultation Ended</h2>
          <p className="text-muted-foreground text-sm">
            Your consultation has ended. {consentRecording 
              ? "A recording and AI-generated report will be available in your Medical Reports shortly."
              : "No recording was made."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => { setState("lobby"); setSelectedDoctor(null); }}>
              Back to Lobby
            </Button>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </div>
        </div>
      </div>
    );
  }

  // Lobby
  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Telemedicine</h1>
          <p className="text-muted-foreground">Connect with healthcare professionals via video consultation</p>
        </div>

        {/* Available Doctors */}
        <div>
          <h2 className="font-display text-lg font-semibold mb-3">Available Doctors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mockDoctors.map((doc) => (
              <button
                key={doc.id}
                onClick={() => doc.available && setSelectedDoctor(doc.id)}
                disabled={!doc.available}
                className={`bg-card rounded-2xl p-4 shadow-food-card text-left transition-all ${
                  selectedDoctor === doc.id
                    ? "ring-2 ring-primary glow-green"
                    : doc.available
                    ? "hover:border-primary/50 border border-transparent"
                    : "opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-muted-foreground">{doc.specialty}</p>
                  </div>
                  <Badge className={doc.available 
                    ? "bg-green-500/10 text-green-500 border-green-500/20" 
                    : "bg-muted text-muted-foreground"
                  }>
                    {doc.available ? "Available" : "Busy"}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedDoctor && (
          <>
            {/* Pre-consultation Settings */}
            <div className="bg-card rounded-2xl p-5 shadow-food-card space-y-4">
              <h3 className="font-display font-semibold">Pre-Consultation Settings</h3>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">Camera</span>
                </div>
                <Switch checked={videoEnabled} onCheckedChange={setVideoEnabled} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mic className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">Microphone</span>
                </div>
                <Switch checked={audioEnabled} onCheckedChange={setAudioEnabled} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <span className="text-sm block">Consent to Record</span>
                    <span className="text-xs text-muted-foreground">
                      Allow recording for AI report generation
                    </span>
                  </div>
                </div>
                <Switch checked={consentRecording} onCheckedChange={setConsentRecording} />
              </div>
            </div>

            {consentRecording && (
              <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Auto-Documentation Enabled</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Neo Synapse will record, transcribe, and generate an AI medical report from this consultation. 
                      The doctor will review and approve it before it's added to your records.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              className="w-full h-12 bg-primary hover:bg-primary/90 rounded-full text-base font-semibold"
              onClick={() => setState("waiting")}
            >
              <Video className="w-5 h-5 mr-2" />
              Start Consultation
            </Button>
          </>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl p-4 shadow-food-card text-center">
            <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">Quick Connect</p>
            <p className="text-xs text-muted-foreground">Average wait: 5 min</p>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-food-card text-center">
            <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">End-to-End Encrypted</p>
            <p className="text-xs text-muted-foreground">HIPAA compliant</p>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-food-card text-center">
            <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">AI Documentation</p>
            <p className="text-xs text-muted-foreground">Auto-generated reports</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Telemedicine;
