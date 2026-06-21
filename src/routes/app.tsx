import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

export const Route = createFileRoute("/app")({
  component: ProtectedApp,
});

function ProtectedApp() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth" });
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-eco mx-auto" />
          <p className="text-sm text-muted-foreground">Syncing credentials...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <AppShell />;
}
