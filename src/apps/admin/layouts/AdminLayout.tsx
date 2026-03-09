import { Outlet } from "react-router-dom";
import { AdminSidebar } from "../components/AdminSidebar";

export function AdminLayout() {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <div className="flex-1"><Outlet /></div>
      </div>
    </div>
  );
}
