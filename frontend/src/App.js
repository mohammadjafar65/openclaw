import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loading } from '@carbon/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/layout/AppShell';

/* ── Lazy-loaded pages ──────────────────────────────────── */
const LoginPage        = lazy(() => import('./pages/LoginPage'));
const DashboardPage    = lazy(() => import('./pages/DashboardPage'));
const FindLeadsPage    = lazy(() => import('./pages/FindLeadsPage'));
const LeadDatabasePage = lazy(() => import('./pages/LeadDatabasePage'));
const LeadDetailPage   = lazy(() => import('./pages/LeadDetailPage'));
const AuditQueuePage   = lazy(() => import('./pages/AuditQueuePage'));
const CrmPipelinePage  = lazy(() => import('./pages/CrmPipelinePage'));
const CampaignsPage    = lazy(() => import('./pages/CampaignsPage'));
const CompliancePage   = lazy(() => import('./pages/CompliancePage'));
const TeamPage         = lazy(() => import('./pages/TeamPage'));
const SettingsPage     = lazy(() => import('./pages/SettingsPage'));

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading withOverlay />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<Loading withOverlay description="Loading…" />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppShell>
                <Routes>
                  <Route index element={<DashboardPage />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="find-leads" element={<FindLeadsPage />} />
                  <Route path="leads" element={<LeadDatabasePage />} />
                  <Route path="leads/:id" element={<LeadDetailPage />} />
                  <Route path="audit" element={<AuditQueuePage />} />
                  <Route path="pipeline" element={<CrmPipelinePage />} />
                  <Route path="campaigns" element={<CampaignsPage />} />
                  <Route path="compliance" element={<CompliancePage />} />
                  <Route path="team" element={<TeamPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
