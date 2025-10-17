import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          fetchUserRole(session.user.id);
        }, 0);
      } else {
        setUserRole(null);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).single();

      if (error) throw error;
      setUserRole(data.role);
    } catch (error) {
      console.error("Error fetching user role:", error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Normalize email
      const normalizedEmail = (email ?? "").trim().toLowerCase();

      if (!normalizedEmail || !password) {
        return { error: { message: "Email and password are required" } };
      }

      // Bootstrap admin user if trying to log in with admin email
      if (normalizedEmail === "wingrowagritech@gmail.com") {
        const { error: fnError } = await supabase.functions.invoke("create-employee", {
          body: {
            name: "Wingrow Admin",
            email: "wingrowagritech@gmail.com",
            phone_number: "0000000000",
            designation: "Administrator",
            location: "Pune",
            password: "Wingrow@1234",
            role: "ADMIN",
          },
        });
        // Continue even if provision fails (user might already exist)
      }

      // Attempt sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        return { error: { message: "Invalid email or password" } };
      }

      if (!data.user) {
        return { error: { message: "Login error. Please contact admin." } };
      }

      // Fetch profile to check role and is_active
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        return { error: { message: "Account not fully set up. Contact admin." } };
      }

      if (profile.is_active === false) {
        await supabase.auth.signOut();
        return { error: { message: "Your account has been deactivated. Please contact admin." } };
      }

      // Navigate based on role
      if (profile.role === "ADMIN") {
        navigate("/admin");
      } else if (profile.role === "EMPLOYEE") {
        navigate("/employee");
      } else {
        navigate("/dashboard");
      }

      return { error: null };
    } catch (e) {
      console.error("Login error:", e);
      return { error: { message: "An error occurred during login" } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        loading,
        signIn,
        signOut,
      }}
    >
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
