import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface AuthUser {
  email: string;
  name?: string;
  isAdmin: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth session
    const checkAuth = async () => {
      try {
        const res = await fetch("/.netlify/functions/auth-status");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user || null);
        }
      } catch {
        // Not authenticated
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const signIn = () => {
    window.location.href = "/.netlify/functions/auth-login";
  };

  const signOut = () => {
    window.location.href = "/.netlify/functions/auth-logout";
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
