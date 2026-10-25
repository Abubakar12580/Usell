import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { api, getToken, setToken as persistToken } from './api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((items) => [...items, { id, message, type }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4200);
  }, []);

  useEffect(() => {
    if (!getToken()) { setAuthLoading(false); return; }
    api.get('/api/auth/me').then((data) => setUser(data.user)).catch(() => persistToken(null)).finally(() => setAuthLoading(false));
  }, []);

  const saveAuth = useCallback((data) => {
    persistToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);
  const login = useCallback(async (credentials) => saveAuth(await api.post('/api/auth/login', credentials)), [saveAuth]);
  const register = useCallback(async (details) => saveAuth(await api.post('/api/auth/register', details)), [saveAuth]);
  const logout = useCallback(() => { persistToken(null); setUser(null); toast('You have been signed out.'); }, [toast]);

  return <AppContext.Provider value={{ user, setUser, authLoading, login, register, logout, toast }}>
    {children}
    <div className="toast-stack" aria-live="polite">
      <AnimatePresence>
        {toasts.map((item) => <motion.div key={item.id} className={`toast toast--${item.type}`} initial={{ opacity: 0, y: 20, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}>
          {item.type === 'error' ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}
          <span>{item.message}</span>
          <button onClick={() => setToasts((all) => all.filter((toastItem) => toastItem.id !== item.id))} aria-label="Dismiss notification"><X size={16} /></button>
        </motion.div>)}
      </AnimatePresence>
    </div>
  </AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
