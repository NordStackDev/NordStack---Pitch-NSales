import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";

/**
 * Protects a route by requiring a userProfile and (optionally) a specific role.
 * Shows loader while waiting for userProfile. Only logs warnings/errors.
 */
export default function ProtectedRoute({
  children,
  roles,
}: {
  children: JSX.Element;
  roles?: Array<"team_lead" | "seller">;
}) {
  const { userProfile, loading, user } = useAuth();
  const location = useLocation();

  // Wait for loading or for userProfile to be fetched if user exists
  if (loading || (user && !userProfile)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loader brugerdata...</p>
      </div>
    );
  }

  if (!userProfile) {
    // Only warn if user is present but no profile
    if (user) {
      console.warn("[ProtectedRoute] Ingen userProfile. Redirect til /auth", { user });
    }
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(userProfile.role)) {
    // Warn if user has wrong role
    console.warn("[ProtectedRoute] Adgang nægtet pga. rolle", { role: userProfile.role, required: roles, path: location.pathname });
    return <Navigate to="/" replace />;
  }

  return children;
}