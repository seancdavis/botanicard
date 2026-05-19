import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getUser,
  handleAuthCallback,
  logout as identityLogout,
  onAuthChange,
  type User,
} from "@netlify/identity";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await handleAuthCallback();
      } catch (err) {
        console.error("Auth callback error:", err);
      }
      const current = await getUser();
      if (mounted) {
        setUser(current);
        setLoading(false);
      }
    })();

    const unsubscribe = onAuthChange((_event, currentUser) => {
      if (mounted) setUser(currentUser);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    await identityLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
