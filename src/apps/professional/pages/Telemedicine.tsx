// Professional Telemedicine - similar to patient but for doctors
import { Video, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

// TODO: Fetch real waiting rooms from consultation_rooms table
const mockWaitingPatients = [
  { id: "room-1", patientName: "Ama Mensah", waitingSince: "2 min", reason: "Follow-up consultation" },
  { id: "room-2", patientName: "Kofi Asante", waitingSince: "5 min", reason: "New patient - chest pain" },
];

export default function ProfessionalTelemedicine() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // TODO: Implement WebRTC join logic for doctor side
  const handleJoinCall = (roomId: string) => {
    // Navigate to call or start WebRTC connection
    console.log("Joining room:", roomId);
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Telemedicine Console</h1>
          <p className="text-muted-foreground">Manage video consultations with patients</p>
        </div>

        {/* Waiting Patients */}
        <section className="bg-card rounded-2xl p-5 shadow-food-card border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Waiting Patients
            </h2>
            <span className="text-sm text-muted-foreground">{mockWaitingPatients.length} waiting</span>
          </div>

          {mockWaitingPatients.length > 0 ? (
            <div className="space-y-3">
              {mockWaitingPatients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {patient.patientName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{patient.patientName}</p>
                      <p className="text-sm text-muted-foreground">{patient.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Waiting: {patient.waitingSince}</span>
                    <Button onClick={() => handleJoinCall(patient.id)}>
                      <Video className="w-4 h-4 mr-2" />
                      Join Call
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No patients waiting</p>
            </div>
          )}
        </section>

        {/* Info */}
        <div className="bg-muted/50 rounded-2xl p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> When you join a call, the patient's video feed will appear. 
            Ensure your camera and microphone are enabled. If recording consent was granted, 
            the consultation will be transcribed for clinical documentation.
          </p>
        </div>
      </div>
    </div>
  );
}
