import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './components/Toast';
import AuthGuard from './components/AuthGuard';
import LoadingScreen from './components/LoadingScreen';
import DashboardLayout from './components/layout/DashboardLayout';
import OfflineBanner from './components/OfflineBanner';

// Lazy-loaded pages for code-splitting
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Billing = lazy(() => import('./pages/Billing'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Customers = lazy(() => import('./pages/Customers'));
const Payments = lazy(() => import('./pages/Payments'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Expenses = lazy(() => import('./pages/Expenses'));
const GST = lazy(() => import('./pages/GST'));
const Settings = lazy(() => import('./pages/Settings'));
const Loyalty = lazy(() => import('./pages/Loyalty'));
const WhatsAppChat = lazy(() => import('./pages/WhatsAppChat'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Terms = lazy(() => import('./pages/Terms'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-brand-dark">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-brand-purple/20 flex items-center justify-center animate-pulse">
          <svg className="w-5 h-5 text-brand-purple animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <span className="text-sm text-gray-400 font-heading">Loading...</span>
      </div>
    </div>
  );
}

export default function App() {
  const [appReady, setAppReady] = useState(false);

  if (!appReady) {
    return <LoadingScreen onFinished={() => setAppReady(true)} />;
  }

  return (
    <ToastProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
          <OfflineBanner />
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/landing" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={
              <AuthGuard><Register /></AuthGuard>
            } />
            <Route path="/" element={
              <AuthGuard>
                <DashboardLayout />
              </AuthGuard>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="billing/new" element={<Billing />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="customers" element={<Customers />} />
              <Route path="payments" element={<Payments />} />
              <Route path="loyalty" element={<Loyalty />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="gst" element={<GST />} />
              <Route path="settings" element={<Settings />} />
              <Route path="whatsapp" element={<WhatsAppChat />} />
            </Route>
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ToastProvider>
  );
}
