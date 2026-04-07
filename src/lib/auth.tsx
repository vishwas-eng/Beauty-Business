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
  signIn(email: string): Promise<{ ok: boolean; message: string }>;
  signOut(): Promise<void>;
}

const DEMO_SESSION_KEY = "beauty-tracker-demo-session";
const ALLOWED_DOMAIN = "opptra.com";

const AuthContext = createContext<AuthContextValue | null>(null);

function isAllowedEmail(email: string) {
  return email.trim().toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

function buildDemoSession(email = `demo@${ALLOWED_DOMAIN}`): SessionUser {
  return {
    email,
    role: "admin",
    workspaceId: "workspace-demo",
    workspaceName: "Beauty Tracker",
    demoMode: true
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionUser | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv || !supabase) {
      const saved = localStorage.getItem(DEMO_SESSION_KEY);
      const nextSession = saved ? (JSON.parse(saved) as SessionUser) : null;
      if (nextSession?.email && isAllowedEmail(nextSession.email)) {
        setSession(nextSession);
      } else {
        localStorage.removeItem(DEMO_SESSION_KEY);
        setSession(null);
      }
      setLoading(false);
      return;
    }

    const supabaseClient = supabase;

    supabaseClient.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        if (isAllowedEmail(data.user.email)) {
          setSession({
            email: data.user.email,
            role: "admin",
            workspaceId: "workspace-demo",
            workspaceName: "Beauty Tracker",
            demoMode: false
          });
        } else {
          void supabaseClient.auth.signOut();
          setSession(null);
        }
      }
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabaseClient.auth.onAuthStateChange((_event, authSession) => {
      if (authSession?.user?.email) {
        if (isAllowedEmail(authSession.user.email)) {
          setSession({
            email: authSession.user.email,
            role: "admin",
            workspaceId: "workspace-demo",
            workspaceName: "Beauty Tracker",
            demoMode: false
          });
        } else {
          setSession(null);
          void supabaseClient.auth.signOut();
        }
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
      async signIn(email: string) {
        if (!isAllowedEmail(email)) {
          return {
            ok: false,
            message: `Only @${ALLOWED_DOMAIN} email addresses can access this workspace.`
          };
        }

        if (!hasSupabaseEnv || !supabase) {
          const demoSession = buildDemoSession(email);
          localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoSession));
          setSession(demoSession);
          return { ok: true, message: "Demo session started locally." };
        }

        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: import.meta.env.VITE_SITE_URL ?? window.location.origin
          }
        });

        if (error) {
          return { ok: false, message: error.message };
        }

        return { ok: true, message: "Magic link sent to your email." };
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
