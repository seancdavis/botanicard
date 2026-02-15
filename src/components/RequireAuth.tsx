import { useAuth } from "../contexts/AuthContext";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, signIn } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-text/50">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="bg-surface rounded-xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-8 text-center max-w-sm">
          <h1 className="text-2xl font-bold mb-4">Botanicard</h1>
          <p className="text-text/60 mb-6">Sign in to manage your plants.</p>
          <button
            onClick={signIn}
            className="bg-primary text-white rounded-md px-6 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
