import { Outlet } from "react-router-dom";
import { PatientSidebar } from "../components/PatientSidebar";
import { PatientMobileNav } from "../components/PatientMobileNav";
import { AdminReturnToDashboard } from "@/components/AdminReturnToDashboard";

export function PatientLayout() {
  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-background lg:h-screen lg:overflow-hidden">
      {/* Desktop Sidebar */}
      <PatientSidebar />
      
      {/* Main Content Area */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:h-screen lg:min-h-0">
        {/* Page Content */}
        <div className="min-w-0 flex-1 pb-20 lg:min-h-0 lg:overflow-y-auto lg:pb-0">
          <AdminReturnToDashboard portalName="patient" />
          <Outlet />
        </div>
        
        {/* Mobile Bottom Navigation */}
        <PatientMobileNav />
      </div>
    </div>
  );
}
