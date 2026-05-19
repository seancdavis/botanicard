import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { oauthLogin } from "@netlify/identity";
import { useAuth } from "../contexts/AuthContext";

const RETURN_TO_KEY = "botanicard:returnTo";

export function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (loading || !user) return;
    const stored = sessionStorage.getItem(RETURN_TO_KEY);
    sessionStorage.removeItem(RETURN_TO_KEY);
    const returnTo = stored || searchParams.get("returnTo") || "/";
    navigate(returnTo, { replace: true });
  }, [user, loading, navigate, searchParams]);

  const handleGoogleLogin = () => {
    const returnTo = searchParams.get("returnTo");
    if (returnTo) sessionStorage.setItem(RETURN_TO_KEY, returnTo);
    oauthLogin("google");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-surface p-8">
        <h1 className="text-3xl font-heading font-bold text-primary text-center mb-2">
          Botanicard
        </h1>
        <p className="text-center text-sm text-text/70 mb-8">
          Sign in to manage your plants.
        </p>
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-primary text-white rounded-md px-4 py-2.5 font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Loading…" : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}
