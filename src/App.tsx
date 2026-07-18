import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import AuthGuard from './components/AuthGuard';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Payments from './pages/Payments';
import Analytics from './pages/Analytics';
import GST from './pages/GST';
import Settings from './pages/Settings';
import Loyalty from './pages/Loyalty';
import WhatsAppChat from './pages/WhatsAppChat';
import OfflineBanner from './components/OfflineBanner';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <OfflineBanner />
          <Routes>
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
              <Route path="gst" element={<GST />} />
              <Route path="settings" element={<Settings />} />
              <Route path="whatsapp" element={<WhatsAppChat />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
