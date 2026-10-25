import { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Header, Footer, SupportChat, MobileBottomNav, PageLoader } from './components';
import { useApp } from './context';
import { api } from './api';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Listing from './pages/Listing';
import Sell from './pages/Sell';
import Auth from './pages/Auth';
import Account from './pages/Account';
import Messages from './pages/Messages';
import Admin from './pages/Admin';
import Seller from './pages/Seller';
import { InfoPage, NotFound } from './pages/Info';

function Protected({ children }) {
  const { user, authLoading } = useApp();
  const location = useLocation();
  if (authLoading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" state={{ from: location.pathname + location.search }} replace />;
  return children;
}

function RouteEffects() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    api.post('/api/analytics/event', { type: 'page_view', path: location.pathname }).catch(() => {});
  }, [location.pathname]);
  return null;
}

export default function App() {
  return <>
    <RouteEffects />
    <Header />
    <main id="main-content">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/listing/:id" element={<Listing />} />
        <Route path="/seller/:id" element={<Seller />} />
        <Route path="/sell" element={<Protected><Sell /></Protected>} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/account" element={<Protected><Account /></Protected>} />
        <Route path="/messages" element={<Protected><Messages /></Protected>} />
        <Route path="/admin" element={<Protected><Admin /></Protected>} />
        <Route path="/help" element={<InfoPage type="help" />} />
        <Route path="/safety" element={<InfoPage type="safety" />} />
        <Route path="/about" element={<InfoPage type="about" />} />
        <Route path="/terms" element={<InfoPage type="terms" />} />
        <Route path="/privacy" element={<InfoPage type="privacy" />} />
        <Route path="/contact" element={<InfoPage type="contact" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
    <Footer />
    <SupportChat />
    <MobileBottomNav />
  </>;
}
