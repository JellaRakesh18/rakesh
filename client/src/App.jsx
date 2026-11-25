import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ResearchWorkspacePage } from './pages/ResearchWorkspacePage';
import { ReportPage } from './pages/ReportPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';

function SafeProtectedPage({ children, requireAdmin = false }) {
  return (
    <ProtectedRoute requireAdmin={requireAdmin}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ErrorBoundary title="RESEARCHX AI encountered an unexpected error">
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route
                path="/dashboard"
                element={
                  <SafeProtectedPage>
                    <DashboardPage />
                  </SafeProtectedPage>
                }
              />
              <Route
                path="/workspace"
                element={
                  <SafeProtectedPage>
                    <ResearchWorkspacePage />
                  </SafeProtectedPage>
                }
              />
              <Route
                path="/reports/:id"
                element={
                  <SafeProtectedPage>
                    <ReportPage />
                  </SafeProtectedPage>
                }
              />
              <Route
                path="/documents"
                element={
                  <SafeProtectedPage>
                    <DocumentsPage />
                  </SafeProtectedPage>
                }
              />
              <Route
                path="/history"
                element={
                  <SafeProtectedPage>
                    <HistoryPage />
                  </SafeProtectedPage>
                }
              />
              <Route
                path="/settings"
                element={
                  <SafeProtectedPage>
                    <SettingsPage />
                  </SafeProtectedPage>
                }
              />
              <Route
                path="/admin"
                element={
                  <SafeProtectedPage requireAdmin>
                    <AdminPage />
                  </SafeProtectedPage>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
