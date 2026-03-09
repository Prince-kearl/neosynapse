import { Outlet } from "react-router-dom";
import { PatientSidebar } from "../components/PatientSidebar";
import { PatientMobileNav } from "../components/PatientMobileNav";

export function PatientLayout() {
  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop Sidebar */}
      <PatientSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Page Content */}
        <div className="flex-1 pb-20 lg:pb-0">
          <Outlet />
        </div>
        
        {/* Mobile Bottom Navigation */}
        <PatientMobileNav />
      </div>
    </div>
  );
}
