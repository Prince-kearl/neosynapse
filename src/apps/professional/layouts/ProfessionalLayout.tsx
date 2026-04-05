import { Outlet } from "react-router-dom";
import { ProfessionalSidebar } from "../components/ProfessionalSidebar";
import { ProfessionalMobileNav } from "../components/ProfessionalMobileNav";
import { MobileTopActions } from "@/components/common/MobileTopActions";

export function ProfessionalLayout() {
  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-background lg:h-screen lg:overflow-hidden">
      <ProfessionalSidebar />
      <div className="flex min-h-screen flex-1 min-w-0 flex-col lg:h-screen lg:min-h-0">
        <MobileTopActions
          profilePath="/professional/settings"
          notificationsPath="/professional/notifications"
        />
        <div className="flex-1 min-w-0 pb-20 lg:min-h-0 lg:overflow-y-auto lg:pb-0">
          <Outlet />
        </div>
        <ProfessionalMobileNav />
      </div>
    </div>
  );
}
