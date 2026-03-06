import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Bell, 
  Globe, 
  Moon, 
  Smartphone,
  Shield,
  Eye,
  Trash2,
  BellRing
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "@/hooks/use-toast";

const Settings = () => {
  const navigate = useNavigate();
  const { isSupported, isEnabled, permission, requestPermission } = usePushNotifications();

  const handlePushToggle = async (checked: boolean) => {
    if (checked && permission !== "granted") {
      const granted = await requestPermission();
      if (granted) {
        toast({
          title: "Notifications enabled",
          description: "You'll receive order status updates even when the app is in the background.",
        });
      } else if (permission === "denied") {
        toast({
          title: "Notifications blocked",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-xl font-bold">Settings</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Appearance */}
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">
            Appearance
          </h2>
          <div className="bg-card rounded-2xl shadow-food-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Theme</span>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">
            Notifications
          </h2>
          <div className="bg-card rounded-2xl shadow-food-card overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <BellRing className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Browser Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    {!isSupported 
                      ? "Not supported in this browser" 
                      : permission === "denied"
                      ? "Blocked - enable in browser settings"
                      : "Get notified when your order status changes"}
                  </p>
                </div>
              </div>
              <Switch 
                checked={isEnabled} 
                onCheckedChange={handlePushToggle}
                disabled={!isSupported || permission === "denied"}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">In-App Notifications</p>
                  <p className="text-sm text-muted-foreground">Toast alerts for order updates</p>
                </div>
              </div>
              <Switch defaultChecked disabled />
            </div>
            <Separator />
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">SMS Notifications</p>
                  <p className="text-sm text-muted-foreground">Important order updates only</p>
                </div>
              </div>
              <Switch />
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">
            Privacy
          </h2>
          <div className="bg-card rounded-2xl shadow-food-card overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Profile Visibility</p>
                  <p className="text-sm text-muted-foreground">Show activity to vendors</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Data Collection</p>
                  <p className="text-sm text-muted-foreground">Analytics & improvements</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </section>

        {/* Language */}
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">
            Language
          </h2>
          <div className="bg-card rounded-2xl shadow-food-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">English (US)</span>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 className="font-display text-lg font-semibold text-destructive mb-3">
            Danger Zone
          </h2>
          <div className="bg-card rounded-2xl shadow-food-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Delete Account</p>
                  <p className="text-sm text-muted-foreground">Permanently remove your data</p>
                </div>
              </div>
              <Button variant="destructive" size="sm">Delete</Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
