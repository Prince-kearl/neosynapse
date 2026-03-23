import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Stethoscope, Shield } from "lucide-react";

interface RoleSwitcherProps {
  currentPath: string;
}

export function RoleSwitcher({ currentPath }: RoleSwitcherProps) {
  const navigate = useNavigate();

  const roles = [
    {
      id: "patient",
      name: "Patient Portal",
      description: "Access patient dashboard, AI assistant, symptom checker",
      icon: User,
      path: "/patient/dashboard",
      color: "bg-blue-500"
    },
    {
      id: "professional",
      name: "Professional Portal",
      description: "Manage encounters, view patient data, telemedicine",
      icon: Stethoscope,
      path: "/professional/dashboard",
      color: "bg-green-500"
    },
    {
      id: "admin",
      name: "Admin Console",
      description: "User management, invitations, system settings",
      icon: Shield,
      path: "/admin/dashboard",
      color: "bg-purple-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
      {roles.map((role) => {
        const Icon = role.icon;
        const isActive = currentPath.startsWith(`/${role.id}`);

        return (
          <Card
            key={role.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              isActive ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => navigate(role.path)}
          >
            <CardHeader className="text-center">
              <div className={`w-12 h-12 ${role.color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-lg">{role.name}</CardTitle>
              <CardDescription>{role.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant={isActive ? "default" : "outline"}
              >
                {isActive ? "Current View" : "Switch to View"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}