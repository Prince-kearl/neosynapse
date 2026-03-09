import { Users, Search, Shield, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

// TODO: Fetch real users from profiles table
const mockUsers = [
  { id: "1", name: "Ama Mensah", email: "ama@email.com", role: "patient", status: "active" },
  { id: "2", name: "Dr. Kwame Asante", email: "kwame@hospital.gh", role: "professional", status: "active" },
  { id: "3", name: "Admin User", email: "admin@neosynapse.health", role: "admin", status: "active" },
  { id: "4", name: "Efua Owusu", email: "efua@email.com", role: "patient", status: "active" },
];

const roleColors: Record<string, string> = {
  patient: "bg-blue-500/10 text-blue-500",
  professional: "bg-green-500/10 text-green-500",
  admin: "bg-destructive/10 text-destructive",
};

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const filtered = mockUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Users</h1>
          <p className="text-muted-foreground">Manage platform users and access</p>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-12 rounded-xl" />
          </div>
          <div className="flex gap-2">
            {["patient", "professional", "admin"].map((role) => (
              <Button key={role} variant={roleFilter === role ? "default" : "outline"} size="sm" onClick={() => setRoleFilter(roleFilter === role ? null : role)} className="capitalize">
                {role}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((user) => (
            <div key={user.id} className="bg-card rounded-2xl p-4 shadow-food-card border border-border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">{user.name.charAt(0)}</div>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={roleColors[user.role]}>{user.role}</Badge>
                <Badge variant="outline" className="border-green-500/50 text-green-500">{user.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
