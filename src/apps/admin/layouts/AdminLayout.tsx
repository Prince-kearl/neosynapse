import { Outlet } from "react-router-dom";
import { AdminSidebar } from "../components/AdminSidebar";
import { AdminMobileNav } from "../components/AdminMobileNav";
import { MobileTopActions } from "@/components/common/MobileTopActions";
import { AdminSettingsRuntime } from "../components/AdminSettingsRuntime";

export function AdminLayout() {
  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-background lg:h-screen lg:overflow-hidden">
      <AdminSidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:h-screen lg:min-h-0">
        <AdminSettingsRuntime />
        <MobileTopActions
          profilePath="/admin/settings"
          notificationsPath="/admin/notifications"
        />
        <div className="min-w-0 flex-1 pb-20 lg:min-h-0 lg:overflow-y-auto lg:pb-0"><Outlet /></div>
        <AdminMobileNav />
      </div>
    </div>
  );
}
