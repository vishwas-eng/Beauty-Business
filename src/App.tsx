import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { AuthProvider, useAuth } from "./lib/auth";
import { DashboardPage } from "./routes/DashboardPage";
import { LoginPage } from "./routes/LoginPage";

function ProtectedRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="page-loader">Loading dashboard...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </AuthProvider>
  );
}
