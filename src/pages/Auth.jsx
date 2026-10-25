import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useApp } from '../context';
import { Logo } from '../components';
import { api } from '../api';

export default function Auth() {
  const { user, login, register, toast } = useApp();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', location: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => { api.get('/api/meta').then((data) => setDemoMode(Boolean(data.demoMode))).catch(() => {}); }, []);
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/account'} replace />;
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const destination = location.state?.from || '/account';
  const authenticate = async (credentials, isRegister = false) => {
    setLoading(true); setError('');
    try {
      const loggedIn = isRegister ? await register(credentials) : await login(credentials);
      toast(isRegister ? 'Welcome to Usell! Your account is ready.' : `Welcome back, ${loggedIn.name.split(' ')[0]}!`);
      navigate(loggedIn.role === 'admin' && !location.state?.from ? '/admin' : destination, { replace: true });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  const submit = (event) => { event.preventDefault(); authenticate(form, mode === 'register'); };
  const demo = (role) => authenticate(role === 'admin' ? { email: 'admin@usell.app', password: 'admin123' } : { email: 'demo@usell.app', password: 'demo123' });

  return <div className="auth-page">
    <section className="auth-visual"><img src="/images/hero-women.jpg" alt="A shopper with bags enjoying fashion" /><div className="auth-visual__overlay" /><div className="auth-visual__content"><Link to="/" className="auth-back">← Back to Usell</Link><div><span className="hero__kicker"><Sparkles size={15} /> YOUR CLOSET COMMUNITY</span><h2>Good pieces.<br />Good people.<br /><em>Another story.</em></h2><p>Join a marketplace made for finding more value in the fashion that already exists.</p><ul><li><Check />List your preloved pieces for free</li><li><Check />Save finds and chat directly</li><li><Check />Manage everything in one place</li></ul></div><small>Preloved. Reloved. Usell.</small></div></section>
    <section className="auth-form-side"><motion.div className="auth-form-wrap" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      <div className="auth-mobile-logo"><Logo /></div>
      <span className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'COME ON IN'}</span><h1>{mode === 'login' ? 'Sign in to Usell' : 'Create your account'}</h1><p>{mode === 'login' ? 'Your listings, favourites and conversations are waiting.' : 'Buy, sell and save your favourite fashion—all for free.'}</p>
      <div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Sign in</button><button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>Create account</button></div>
      <form onSubmit={submit} className="auth-form">
        {mode === 'register' && <label className="field">Full name<div className="input-with-icon"><UserRound /><input value={form.name} onChange={(e) => set('name', e.target.value)} required minLength={2} placeholder="Your full name" autoComplete="name" /></div></label>}
        <label className="field">Email address<div className="input-with-icon"><Mail /><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required placeholder="you@example.com" autoComplete="email" /></div></label>
        <label className="field">Password<div className="input-with-icon"><LockKeyhole /><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={6} placeholder="At least 6 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
        {mode === 'register' && <label className="field">City / location <span>(optional)</span><input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Lahore, Punjab" autoComplete="address-level2" /></label>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="btn btn--primary btn--lg btn--full" disabled={loading}>{loading ? <LoaderCircle className="spin" /> : <ArrowRight size={18} />}{loading ? 'Just a moment…' : mode === 'login' ? 'Sign in' : 'Create my free account'}</button>
        {mode === 'register' && <small className="auth-terms">By creating an account, you agree to our <Link to="/terms">Terms of use</Link> and <Link to="/privacy">Privacy policy</Link>.</small>}
      </form>
      {demoMode && <><div className="demo-divider"><span>OR TRY THE LIVE DEMO</span></div>
      <div className="demo-buttons"><button className="btn btn--outline" onClick={() => demo('buyer')} disabled={loading}><UserRound size={17} /> Demo buyer</button><button className="btn btn--outline" onClick={() => demo('admin')} disabled={loading}><ShieldCheck size={17} /> Demo admin</button></div>
      <p className="demo-hint">Buyer: demo@usell.app / demo123<br />Admin: admin@usell.app / admin123</p></>}
      <div className="auth-safe"><ShieldCheck /><span><strong>Your account, your details.</strong> We never ask for your password, PIN or OTP in support chat.</span></div>
    </motion.div></section>
  </div>;
}
