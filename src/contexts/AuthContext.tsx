import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
        }
      }
    );

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
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserRole(data.role);
    } catch (error) {
      console.error('Error fetching user role:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      // 1) Look up profile by username to get email + role
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, role, is_active')
        .eq('username', username)
        .maybeSingle();

      // 2) If admin username not found, bootstrap via edge function (one-time)
      if (!profile && username === 'wingrowagritech') {
        const { error: fnError } = await supabase.functions.invoke('create-employee', {
          body: {
            name: 'Wingrow Admin',
            username: 'wingrowagritech',
            phone_number: '0000000000',
            designation: 'Administrator',
            location: 'Pune',
            password,
            role: 'ADMIN',
          },
        });
        if (fnError) {
          return { error: { message: 'Unable to provision admin user' } };
        }
        // Re-fetch profile after provisioning
        ({ data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email, role, is_active')
          .eq('username', username)
          .maybeSingle());
      }

      if (profileError || !profile) {
        return { error: { message: 'Invalid username or password' } };
      }

      if (profile.is_active === false) {
        return { error: { message: 'Your account has been deactivated. Please contact admin.' } };
      }

      // 3) Sign in with the associated email
      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      });

      if (error) {
        return { error: { message: 'Invalid username or password' } };
      }

      // 4) Navigate based on role
      if (profile.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }

      return { error: null };
    } catch (e) {
      console.error('Login error:', e);
      return { error: { message: 'An error occurred during login' } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
