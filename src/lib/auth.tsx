import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { SessionUser } from "../types/domain";
import { hasSupabaseEnv, supabase } from "./supabase";

interface AuthContextValue {
  session: SessionUser | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<{ ok: boolean; message: string }>;
  signUp(email: string, password: string): Promise<{ ok: boolean; message: string }>;
  signInWithGoogle(): Promise<{ ok: boolean; message: string }>;
  signOut(): Promise<void>;
}

const DEMO_SESSION_KEY = "beauty-tracker-demo-session";

const AuthContext = createContext<AuthContextValue | null>(null);

function buildSession(email: string, demoMode: boolean): SessionUser {
  return {
    email,
    role: "admin",
    workspaceId: "workspace-default",
    workspaceName: "Beauty Business Tracker",
    demoMode
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionUser | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv || !supabase) {
      const saved = localStorage.getItem(DEMO_SESSION_KEY);
      const next = saved ? (JSON.parse(saved) as SessionUser) : null;
      if (next?.email) {
        setSession(next);
      } else {
        localStorage.removeItem(DEMO_SESSION_KEY);
        setSession(null);
      }
      setLoading(false);
      return;
    }

    const client = supabase;

    client.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setSession(buildSession(data.user.email, false));
      }
      setLoading(false);
    });

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, authSession) => {
      if (authSession?.user?.email) {
        setSession(buildSession(authSession.user.email, false));
      } else {
        setSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,

      async signIn(email: string, password: string) {
        if (!hasSupabaseEnv || !supabase) {
          const demo = buildSession(email, true);
          localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demo));
          setSession(demo);
          return { ok: true, message: "Demo session started." };
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          return { ok: false, message: error.message };
        }
        return { ok: true, message: "Signed in." };
      },

      async signUp(email: string, password: string) {
        if (!hasSupabaseEnv || !supabase) {
          const demo = buildSession(email, true);
          localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demo));
          setSession(demo);
          return { ok: true, message: "Demo session started." };
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: import.meta.env.VITE_SITE_URL ?? window.location.origin
          }
        });
        if (error) {
          return { ok: false, message: error.message };
        }
        return { ok: true, message: "Check your email for a confirmation link." };
      },

      async signInWithGoogle() {
        if (!hasSupabaseEnv || !supabase) {
          const demo = buildSession("demo@google.com", true);
          localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demo));
          setSession(demo);
          return { ok: true, message: "Demo session started." };
        }

        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: import.meta.env.VITE_SITE_URL ?? window.location.origin
          }
        });
        if (error) {
          return { ok: false, message: error.message };
        }
        return { ok: true, message: "Redirecting to Google..." };
      },

      async signOut() {
        if (!hasSupabaseEnv || !supabase) {
          localStorage.removeItem(DEMO_SESSION_KEY);
          setSession(null);
          return;
        }
        await supabase.auth.signOut();
      }
    }),
    [loading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
