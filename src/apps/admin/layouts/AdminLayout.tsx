import { Outlet } from "react-router-dom";
import { AdminSidebar } from "../components/AdminSidebar";
import { AdminMobileNav } from "../components/AdminMobileNav";
import { MobileTopActions } from "@/components/common/MobileTopActions";

export function AdminLayout() {
  return (
    <div className="flex min-h-screen w-full bg-background lg:h-screen lg:overflow-hidden">
      <AdminSidebar />
      <div className="flex min-h-screen flex-1 flex-col lg:h-screen lg:min-h-0">
        <MobileTopActions
          profilePath="/admin/settings"
          notificationsPath="/admin/notifications"
        />
        <div className="flex-1 pb-20 lg:min-h-0 lg:overflow-y-auto lg:pb-0"><Outlet /></div>
        <AdminMobileNav />
      </div>
    </div>
  );
}
