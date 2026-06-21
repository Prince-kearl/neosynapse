import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureNativePushRegistration } from "@/mobile/pushNotifications";
import { getEmailValidationError, normalizeEmail } from "@/shared/lib/inputValidation";
import { buildPublicAppUrl } from "@/shared/lib/appUrl";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ) => Promise<{ error: Error | null; session: Session | null; user: User | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          queryClient.clear();
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          queryClient.removeQueries({ queryKey: ["user-profile"] });
          queryClient.removeQueries({ queryKey: ["user-roles"] });
          queryClient.removeQueries({ queryKey: ["profile"] });
          queryClient.removeQueries({ queryKey: ["patient-profile"] });
          queryClient.removeQueries({ queryKey: ["pro-profile"] });
        }
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        void ensureNativePushRegistration(session?.user?.id);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      void ensureNativePushRegistration(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signUp = async (
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ) => {
    const normalizedEmail = normalizeEmail(email);
    const emailValidationError = getEmailValidationError(normalizedEmail);
    if (emailValidationError) {
      return { error: new Error(emailValidationError), session: null, user: null };
    }

    const emailRedirectTo = buildPublicAppUrl("/auth/sign-in");

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo,
        data: metadata,
      }
    });
    
    return {
      error: error as Error | null,
      session: data.session,
      user: data.user,
    };
  };

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
