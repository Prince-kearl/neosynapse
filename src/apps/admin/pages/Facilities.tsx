import { Building2, Plus, MapPin, Phone, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";

export default function AdminFacilities() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [facilityType, setFacilityType] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");

  const { data: facilities = [], isLoading } = useQuery({
    queryKey: ["admin-facilities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("facilities").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Count professionals per facility
  const { data: proCounts = {} } = useQuery({
    queryKey: ["admin-facility-pro-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("professional_profiles").select("facility_id");
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        if (p.facility_id) counts[p.facility_id] = (counts[p.facility_id] || 0) + 1;
      });
      return counts;
    },
  });

  // NOTE: Facility insert requires admin RLS — currently facilities table only allows SELECT.
  // TODO: Add admin INSERT/UPDATE RLS policy for facilities
  const createFacility = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("facilities").insert({
        name,
        facility_type: facilityType || null,
        location: location || null,
        contact_phone: phone || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Facility created" });
      setName(""); setFacilityType(""); setLocation(""); setPhone("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["admin-facilities"] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Facilities</h1>
            <p className="text-muted-foreground">Manage hospitals, clinics, and health centers</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" /> Add Facility
          </Button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-card rounded-2xl p-5 border border-border space-y-4">
            <h3 className="font-semibold">New Facility</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Facility name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl" />
              <Select value={facilityType} onValueChange={setFacilityType}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="health_center">Health Center</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="lab">Laboratory</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Location / Address" value={location} onChange={(e) => setLocation(e.target.value)} className="h-12 rounded-xl" />
              <Input placeholder="Contact phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <Button onClick={() => createFacility.mutate()} disabled={createFacility.isPending || !name}>
              {createFacility.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Facility"}
            </Button>
          </div>
        )}

        {/* Facility List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : facilities.length > 0 ? (
          <div className="space-y-3">
            {facilities.map((f: any) => (
              <div key={f.id} className="bg-card rounded-2xl p-4 border border-border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{f.name}</p>
                      {f.facility_type && (
                        <Badge variant="outline" className="text-xs capitalize">{f.facility_type}</Badge>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                      {f.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{f.location}</span>}
                      {f.contact_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{f.contact_phone}</span>}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />{(proCounts as any)[f.id] || 0} professionals
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyStateCard icon={Building2} title="No facilities configured yet" compact />
        )}
      </div>
    </div>
  );
}
