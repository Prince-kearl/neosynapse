import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  Tag, 
  Settings, 
  Info, 
  HelpCircle,
  ChevronRight,
  Heart,
  LogOut,
  Wallet,
  MapPin,
  CreditCard,
  Bell,
  Shield,
  Utensils
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useFavorites } from "@/hooks/useFavorites";
import { BudgetEditDialog } from "@/components/profile/BudgetEditDialog";
import { DietPreferencesDialog } from "@/components/profile/DietPreferencesDialog";

const DIET_LABELS: Record<string, string> = {
  "vegetarian": "Vegetarian",
  "vegan": "Vegan",
  "halal": "Halal",
  "gluten-free": "Gluten Free",
  "dairy-free": "Dairy Free",
  "nut-free": "Nut Free",
  "spicy": "Loves Spicy",
  "low-carb": "Low Carb",
};

const accountMenuItems = [
  { icon: MapPin, label: "Saved Addresses", description: "Manage delivery locations" },
  { icon: CreditCard, label: "Payment Methods", description: "Add or remove payment options" },
  { icon: Bell, label: "Notifications", description: "Manage your alerts" },
  { icon: Shield, label: "Privacy & Security", description: "Account protection settings" },
];

const otherMenuItems = [
  { icon: Tag, label: "Promo codes", url: null },
  { icon: Settings, label: "Settings", url: "/settings" },
  { icon: Info, label: "About", url: null },
  { icon: HelpCircle, label: "Help & Support", url: "/help" },
];

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { preferences, saveBudget, saveDietPreferences } = useUserPreferences();
  const { favoriteIds } = useFavorites();
  
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [dietDialogOpen, setDietDialogOpen] = useState(false);

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || "Guest User";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const formatDietPreferences = (prefs: string[]) => {
    if (prefs.length === 0) return "No restrictions set";
    if (prefs.length <= 2) {
      return prefs.map(p => DIET_LABELS[p] || p).join(", ");
    }
    return `${prefs.length} preferences set`;
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <div className="bg-card rounded-2xl p-6 shadow-food-card">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <User className="w-10 h-10 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="font-display text-xl font-bold text-foreground">
                {displayName}
              </h1>
              {!user ? (
                <p className="text-muted-foreground text-sm">
                  Sign in to save your preferences
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {user.email}
                </p>
              )}
            </div>
          </div>
          {!user && (
            <Button 
              className="w-full mt-5 bg-primary hover:bg-primary/90"
              onClick={() => navigate("/auth")}
            >
              Sign In or Create Account
            </Button>
          )}
        </div>

        {/* Favourites Section */}
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">
            Favourites
          </h2>
          <button
            onClick={() => navigate("/saved")}
            className="w-full bg-card rounded-2xl p-5 shadow-food-card flex items-center justify-between gap-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium text-foreground text-left">
                {favoriteIds.length > 0 
                  ? `${favoriteIds.length} saved meal${favoriteIds.length > 1 ? 's' : ''}`
                  : "No favourites added"
                }
              </p>
              <p className="text-sm text-muted-foreground text-left">
                {favoriteIds.length > 0 
                  ? "Tap to view your saved meals"
                  : "Save all your favourites in one place using the heart icon"
                }
              </p>
            </div>
            <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                <Heart className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </button>
        </div>

        {/* Your Preferences Section */}
        <div className="bg-card rounded-2xl p-5 shadow-food-card">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">
            Your Preferences
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Default Budget</p>
                  <p className="text-sm text-muted-foreground">GHS {preferences.defaultBudget} max per meal</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setBudgetDialogOpen(true)}>
                Edit
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Diet Preferences</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDietPreferences(preferences.dietPreferences)}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setDietDialogOpen(true)}>
                Edit
              </Button>
            </div>
          </div>
        </div>

        {/* Account Menu Items */}
        <div className="bg-card rounded-2xl shadow-food-card overflow-hidden">
          {accountMenuItems.map((item, index) => (
            <div key={item.label}>
              <button
                className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </button>
              {index < accountMenuItems.length - 1 && <Separator />}
            </div>
          ))}
        </div>

        {/* Theme Section */}
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">
            Theme
          </h2>
          <ThemeToggle />
        </div>

        {/* Other Section */}
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">
            Other
          </h2>
          <div className="bg-card rounded-2xl shadow-food-card overflow-hidden">
            {otherMenuItems.map((item, index) => (
              <div key={item.label}>
                <button
                  onClick={() => item.url && navigate(item.url)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <p className="font-medium text-foreground flex-1">{item.label}</p>
                  {item.url && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                </button>
                {index < otherMenuItems.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </div>

        {/* Become a Vendor CTA */}
        <div className="bg-primary/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="flex-1">
            <p className="font-display font-semibold text-foreground">
              Become a vendor
            </p>
            <p className="text-sm text-muted-foreground">
              Sell your food on ChowPoint
            </p>
          </div>
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            Apply
          </Button>
        </div>

        {/* Log Out Button */}
        {user && (
          <Button 
            variant="outline" 
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
            onClick={handleSignOut}
            disabled={authLoading}
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </Button>
        )}

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          ChowPoint v1.0.0 • Made with ❤️ in Ghana
        </p>
      </div>

      {/* Edit Dialogs */}
      <BudgetEditDialog
        open={budgetDialogOpen}
        onOpenChange={setBudgetDialogOpen}
        currentBudget={preferences.defaultBudget}
        onSave={saveBudget}
      />
      <DietPreferencesDialog
        open={dietDialogOpen}
        onOpenChange={setDietDialogOpen}
        currentPreferences={preferences.dietPreferences}
        onSave={saveDietPreferences}
      />
    </div>
  );
};

export default Profile;
