import { Outlet } from "react-router-dom";
import { ProfessionalSidebar } from "../components/ProfessionalSidebar";

export function ProfessionalLayout() {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <ProfessionalSidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
