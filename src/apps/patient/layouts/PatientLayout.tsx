import { Outlet } from "react-router-dom";
import { PatientSidebar } from "../components/PatientSidebar";
import { PatientMobileNav } from "../components/PatientMobileNav";

export function PatientLayout() {
  return (
    <div className="flex min-h-screen w-full bg-background lg:h-screen lg:overflow-hidden">
      {/* Desktop Sidebar */}
      <PatientSidebar />
      
      {/* Main Content Area */}
      <div style={{ width: "100vw" }} className="flex min-h-screen flex-1 flex-col lg:h-screen lg:min-h-0">
        {/* Page Content */}
        <div className="flex-1 pb-20 lg:min-h-0 lg:overflow-y-auto lg:pb-0">
          <Outlet />
        </div>
        
        {/* Mobile Bottom Navigation */}
        <PatientMobileNav />
      </div>
    </div>
  );
}
