import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { AuthProvider, useAuth } from "./lib/auth";
import { DashboardPage } from "./routes/DashboardPage";
import { BrandPage } from "./routes/BrandPage";
import { IntelPage } from "./routes/IntelPage";
import { ImageStudioPage } from "./routes/ImageStudioPage";
import { StrategyPage } from "./routes/StrategyPage";
import { MosaicBridgePage } from "./routes/MosaicBridgePage";
import { RevenuePage } from "./routes/RevenuePage";
import { ResearchLabPage } from "./routes/ResearchLabPage";
import { InventoryPage } from "./routes/InventoryPage";
import { SheetMasterPage } from "./routes/SheetMasterPage";
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
        <Route path="/brand/:brandId" element={<BrandPage />} />
        <Route path="/intel" element={<IntelPage />} />
        <Route path="/studio" element={<ImageStudioPage />} />
        <Route path="/strategy" element={<StrategyPage />} />
        <Route path="/mosaic" element={<MosaicBridgePage />} />
        <Route path="/revenue" element={<RevenuePage />} />
        <Route path="/research" element={<ResearchLabPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/sheet-master" element={<SheetMasterPage />} />
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
