import { Loader2 } from "lucide-react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        className="flex h-dvh items-center justify-center"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-text-muted)" }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
