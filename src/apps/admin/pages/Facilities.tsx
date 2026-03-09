import { Building2, Plus, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminFacilities() {
  const { data: facilities = [] } = useQuery({
    queryKey: ["admin-facilities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("facilities").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Facilities</h1>
            <p className="text-muted-foreground">Manage hospitals and clinics</p>
          </div>
          <Button><Plus className="w-4 h-4 mr-2" /> Add Facility</Button>
        </div>

        <div className="space-y-4">
          {facilities.map((f: any) => (
            <div key={f.id} className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="w-6 h-6 text-primary" /></div>
                <div className="flex-1">
                  <p className="font-medium">{f.name}</p>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                    {f.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{f.location}</span>}
                    {f.contact_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{f.contact_phone}</span>}
                    {f.facility_type && <span>{f.facility_type}</span>}
                  </div>
                </div>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            </div>
          ))}
          {facilities.length === 0 && (
            <div className="bg-card rounded-2xl p-8 shadow-food-card text-center">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No facilities configured yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
