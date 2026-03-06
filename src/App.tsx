import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { DeliveryModeProvider } from "@/contexts/DeliveryModeContext";
import { OrderNotificationListener } from "@/components/OrderNotificationListener";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileNav";
import Index from "./pages/Index";
import MealDetail from "./pages/MealDetail";
import VendorProfile from "./pages/VendorProfile";
import Explore from "./pages/Explore";
import Orders from "./pages/Orders";
import Saved from "./pages/Saved";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Auth from "./pages/Auth";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <LocationProvider>
          <DeliveryModeProvider>
            <CartProvider>
              <TooltipProvider>
                <OrderNotificationListener />
              <Toaster />
              <Sonner />
              <BrowserRouter>
              <div className="min-h-screen flex w-full bg-background">
                {/* Desktop Sidebar */}
                <AppSidebar />
                
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-h-screen">
                  {/* Page Content */}
                  <div className="flex-1 pb-20 lg:pb-0">
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/meal/:id" element={<MealDetail />} />
                      <Route path="/vendor/:id" element={<VendorProfile />} />
                      <Route path="/explore" element={<Explore />} />
                      <Route path="/orders" element={<Orders />} />
                      <Route path="/saved" element={<Saved />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/help" element={<Help />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/checkout" element={<Checkout />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </div>
                  
                  {/* Mobile Bottom Navigation */}
                  <MobileBottomNav />
                </div>
              </div>
              </BrowserRouter>
            </TooltipProvider>
          </CartProvider>
        </DeliveryModeProvider>
      </LocationProvider>
    </AuthProvider>
  </ThemeProvider>
</QueryClientProvider>
);

export default App;
