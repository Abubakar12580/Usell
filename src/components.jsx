import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Search, UserRound, Heart, MessageCircle, Plus, Menu, X, ChevronDown, ChevronRight,
  ArrowRight, Home as HomeIcon, ShoppingBag, Sparkles, Send, Bot, LoaderCircle,
  Check, Tag, ShieldCheck, Headphones, Trash2
} from 'lucide-react';
import { api, initials, money, timeAgo } from './api';
import { useApp } from './context';

export function Logo({ light = false }) {
  return <Link to="/" className={`brand-logo ${light ? 'brand-logo--light' : ''}`} aria-label="Usell home">
    <span className="brand-logo__mark">u</span><span className="brand-logo__word">sell<span>.</span></span>
    <small>PRELOVED FASHION</small>
  </Link>;
}

const navCategories = [
  ['Women', 'Dresses, co-ords & more', '/images/editorial-women.jpg'],
  ['Men', 'Shirts, jackets & essentials', '/images/editorial-men.jpg'],
  ['Traditional', 'Occasionwear with another story', '/images/traditional.jpg'],
  ['Shoes', 'Sneakers, heels & everyday pairs', '/images/sneakers.jpg'],
  ['Bags', 'Bags worth carrying forward', '/images/handbag.jpg'],
  ['Accessories', 'The finishing touches', '/images/watch.jpg']
];

function SearchPanel({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      const path = query.trim() ? `/api/listings?q=${encodeURIComponent(query.trim())}&limit=5` : '/api/listings?featured=true&limit=4';
      fetch(path, { signal: controller.signal }).then((res) => res.json()).then((data) => setResults(data.listings || [])).catch(() => {}).finally(() => setLoading(false));
    }, 220);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  const submit = (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
    onClose();
  };
  return <motion.div className="search-panel" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
    <div className="container search-panel__inner">
      <form className="search-panel__form" onSubmit={submit}>
        <Search size={25} />
        <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dresses, Nike, size M, Lahore…" aria-label="Search listings" />
        {query && <button type="button" className="icon-btn" onClick={() => setQuery('')} aria-label="Clear search"><X size={18} /></button>}
        <button className="btn btn--dark btn--sm" type="submit">Search</button>
      </form>
      <div className="search-panel__content">
        <div className="search-panel__topline">
          <span className="eyebrow">{query ? `Search results` : 'Popular right now'}</span>
          {!query && <div className="trending-searches"><Link to="/shop?q=denim" onClick={onClose}>Denim</Link><Link to="/shop?q=dress" onClick={onClose}>Dresses</Link><Link to="/shop?q=nike" onClick={onClose}>Nike</Link></div>}
        </div>
        {loading ? <div className="search-loading"><LoaderCircle className="spin" /> Finding good pieces…</div> : results.length ? <div className="search-results">
          {results.map((item) => <Link to={`/listing/${item.id}`} onClick={onClose} className="search-result" key={item.id}>
            <img src={item.images[0]} alt="" />
            <span><strong>{item.title}</strong><small>{item.brand} · {item.size} · {item.condition}</small></span>
            <b>{money(item.price)}</b><ChevronRight size={18} />
          </Link>)}
        </div> : <EmptyState icon={Search} title="No close matches yet" text="Try a broader item name, brand or category." />}
      </div>
    </div>
  </motion.div>;
}

export function Header() {
  const { user } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const location = useLocation();
  useEffect(() => { setMobileOpen(false); setSearchOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    document.body.classList.toggle('no-scroll', mobileOpen || searchOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [mobileOpen, searchOpen]);
  useEffect(() => {
    if (!user) { setUnread(0); return; }
    const load = () => api.get('/api/conversations').then((data) => setUnread(data.conversations.reduce((sum, c) => sum + c.unreadCount, 0))).catch(() => {});
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [user, location.pathname]);
  useEffect(() => {
    const escape = (event) => { if (event.key === 'Escape') { setSearchOpen(false); setMobileOpen(false); } };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);

  return <>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <div className="site-top">
      <div className="announcement" aria-label="Usell announcements"><div className="announcement__track">
        {[0, 1].map((group) => <div className="announcement__group" key={group} aria-hidden={group === 1}>
          <span>GOOD STYLE. ANOTHER STORY.</span><i>•</i><span>FREE TO LIST</span><i>•</i><Link to="/sell">CLEAR YOUR CLOSET <ArrowRight size={13} /></Link><i>•</i><span>PRELOVED, NOT OVERLOOKED</span><i>•</i>
        </div>)}
      </div></div>
      <header className="site-header">
        <div className="container site-header__wrapper">
          <button className="icon-btn mobile-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu /></button>
          <nav className="desktop-nav" aria-label="Main navigation">
            <NavLink to="/">Home</NavLink>
            <div className="nav-dropdown"><NavLink to="/shop">Shop <ChevronDown size={13} /></NavLink>
              <div className="mega-menu">
                <div className="mega-menu__links"><span className="eyebrow">Shop by category</span>
                  {navCategories.map(([name, desc]) => <Link key={name} to={`/shop?category=${name}`}><strong>{name}</strong><small>{desc}</small></Link>)}
                </div>
                <Link to="/shop?sort=newest" className="mega-menu__feature"><img src="/images/thrift-rack.jpg" alt="Preloved clothes on a rack" /><span>Freshly listed <ArrowRight size={17} /></span></Link>
              </div>
            </div>
            <NavLink to="/shop?category=Women">Women</NavLink>
            <NavLink to="/shop?category=Men">Men</NavLink>
            <NavLink to="/shop?category=Traditional">Traditional</NavLink>
          </nav>
          <Logo />
          <div className="header-actions">
            <button className="icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search"><Search /></button>
            <Link className="icon-btn desktop-action" to={user ? '/account' : '/auth'} aria-label={user ? 'My account' : 'Sign in'}><UserRound /></Link>
            <Link className="icon-btn desktop-action" to={user ? '/account?tab=favorites' : '/auth'} aria-label="Favourites"><Heart /></Link>
            <Link className="icon-btn desktop-action badge-parent" to={user ? '/messages' : '/auth'} aria-label="Messages"><MessageCircle />{unread > 0 && <span className="action-badge">{unread}</span>}</Link>
            <Link to="/sell" className="btn btn--primary btn--sell"><Plus size={17} /> Sell an item</Link>
          </div>
        </div>
      </header>
    </div>
    <AnimatePresence>
      {searchOpen && <><motion.button className="backdrop search-backdrop" aria-label="Close search" onClick={() => setSearchOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><SearchPanel onClose={() => setSearchOpen(false)} /></>}
      {mobileOpen && <><motion.button className="backdrop" onClick={() => setMobileOpen(false)} aria-label="Close menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.aside className="mobile-drawer" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: .25 }}>
        <div className="mobile-drawer__head"><Logo /><button className="icon-btn" onClick={() => setMobileOpen(false)}><X /></button></div>
        <Link to="/sell" className="btn btn--primary btn--full"><Plus size={18} /> Sell an item</Link>
        <nav className="mobile-nav">
          <NavLink to="/">Home <ChevronRight /></NavLink><NavLink to="/shop">Shop all <ChevronRight /></NavLink>
          <span className="eyebrow">Categories</span>
          {navCategories.map(([name]) => <NavLink key={name} to={`/shop?category=${name}`}>{name}<ChevronRight /></NavLink>)}
          <span className="eyebrow">Your Usell</span>
          <NavLink to={user ? '/account' : '/auth'}>{user ? 'My account' : 'Sign in / Register'}<ChevronRight /></NavLink>
          <NavLink to={user ? '/messages' : '/auth'}>Messages{unread > 0 && <b className="menu-count">{unread}</b>}<ChevronRight /></NavLink>
          <NavLink to={user ? '/account?tab=favorites' : '/auth'}>Favourites<ChevronRight /></NavLink>
          <NavLink to="/help">Help & support<ChevronRight /></NavLink>
        </nav>
        <div className="mobile-drawer__foot"><ShieldCheck size={18} /> Buy thoughtfully. Sell honestly.</div>
      </motion.aside></>}
    </AnimatePresence>
  </>;
}

export function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setStatus('loading');
    try { const data = await api.post('/api/newsletter', { email }); setStatus(data.message); setEmail(''); }
    catch (error) { setStatus(error.message); }
  };
  return <footer className="site-footer">
    <div className="container footer-newsletter">
      <div><span className="eyebrow">THE USELL EDIT</span><h2>Good finds, straight to your inbox.</h2><p>New drops, selling tips and fresh reasons to love preloved.</p></div>
      <div><form onSubmit={submit} className="newsletter-form"><input type="email" required placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" /><button className="btn btn--lime" disabled={status === 'loading'}>{status === 'loading' ? 'Joining…' : 'Keep me posted'} <ArrowRight size={17} /></button></form>{status && status !== 'loading' && <p className="form-status" role="status">{status}</p>}</div>
    </div>
    <div className="container footer-grid">
      <div className="footer-brand"><Logo light /><p>A people-powered marketplace giving good clothes and fashion pieces their next story.</p><div className="footer-pill"><span>●</span> Made for more mindful closets</div></div>
      <div><h3>Shop</h3><Link to="/shop">All fashion</Link><Link to="/shop?category=Women">Women</Link><Link to="/shop?category=Men">Men</Link><Link to="/shop?category=Traditional">Traditional</Link><Link to="/shop?category=Shoes">Shoes & accessories</Link></div>
      <div><h3>Sell</h3><Link to="/sell">List an item</Link><Link to="/account">Seller dashboard</Link><Link to="/help">Selling guide</Link><Link to="/safety">Safety tips</Link></div>
      <div><h3>Support</h3><Link to="/help">Help centre</Link><Link to="/contact">Contact us</Link><Link to="/about">About Usell</Link><Link to="/terms">Terms of use</Link><Link to="/privacy">Privacy policy</Link></div>
    </div>
    <div className="container footer-bottom"><span>© {new Date().getFullYear()} Usell. All rights reserved.</span><span>Preloved. Reloved. <b>Usell.</b></span></div>
  </footer>;
}

export function ProductCard({ listing, onFavoriteChange, priority = false }) {
  const { user, toast } = useApp();
  const [item, setItem] = useState(listing);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => setItem(listing), [listing]);
  const favorite = async (event) => {
    event.preventDefault(); event.stopPropagation();
    if (!user) { toast('Sign in to save your favourite finds.', 'error'); navigate('/auth', { state: { from: location.pathname + location.search } }); return; }
    if (busy) return;
    setBusy(true);
    const previous = item;
    setItem({ ...item, isFavorite: !item.isFavorite, favoriteCount: item.favoriteCount + (item.isFavorite ? -1 : 1) });
    try { const result = await api.post(`/api/listings/${item.id}/favorite`, {}); setItem((current) => ({ ...current, ...result })); onFavoriteChange?.(item.id, result); }
    catch (error) { setItem(previous); toast(error.message, 'error'); }
    finally { setBusy(false); }
  };
  const discount = item.originalPrice > item.price ? Math.round((1 - item.price / item.originalPrice) * 100) : 0;
  const isNew = Date.now() - new Date(item.createdAt).getTime() < 172800000;
  return <motion.article className="product-card" layout initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }} transition={{ duration: .4 }}>
    <Link to={`/listing/${item.id}`} className="product-card__link">
      <div className="product-card__image-wrap">
        <img src={item.images[0]} alt={item.title} loading={priority ? 'eager' : 'lazy'} className="product-card__image" />
        <div className="product-card__badges"><span className="badge badge--light">{isNew ? 'JUST IN' : item.condition.toUpperCase()}</span>{discount > 0 && <span className="badge badge--purple">-{discount}%</span>}</div>
        <button className={`favorite-btn ${item.isFavorite ? 'is-favorite' : ''}`} onClick={favorite} aria-label={item.isFavorite ? 'Remove from favourites' : 'Save to favourites'}><Heart fill={item.isFavorite ? 'currentColor' : 'none'} /></button>
        <span className="product-card__quick">View item <ArrowRight size={16} /></span>
      </div>
      <div className="product-card__info">
        <div className="product-card__meta"><span>{item.brand || 'Unbranded'}</span><span>Size {item.size}</span></div>
        <h3>{item.title}</h3>
        <div className="product-card__price"><strong>{money(item.price)}</strong>{item.originalPrice > item.price && <del>{money(item.originalPrice)}</del>}</div>
        <div className="product-card__seller"><span className="avatar avatar--xs">{initials(item.seller?.name)}</span><span>{item.seller?.name}</span><span className="dot-separator">·</span><span>{item.location?.split(',')[0]}</span></div>
      </div>
    </Link>
  </motion.article>;
}

export function SectionHeading({ eyebrow, title, link, linkText = 'View all', light = false }) {
  return <div className={`section-heading ${light ? 'section-heading--light' : ''}`}><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{link && <Link to={link} className="text-link">{linkText} <ArrowRight size={18} /></Link>}</div>;
}

export function Reveal({ children, className = '', delay = 0 }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: .65, delay, ease: [.22, .61, .36, 1] }}>{children}</motion.div>;
}

export function Avatar({ user, size = '' }) {
  return <span className={`avatar ${size}`}>{user?.avatar ? <img src={user.avatar} alt="" /> : initials(user?.name)}</span>;
}

export function EmptyState({ icon: Icon = ShoppingBag, title, text, action }) {
  return <div className="empty-state"><span className="empty-state__icon"><Icon /></span><h3>{title}</h3><p>{text}</p>{action}</div>;
}

export function PageLoader() {
  return <div className="page-loader"><Logo /><LoaderCircle className="spin" /><p>Getting your Usell ready…</p></div>;
}

export function ProductGridSkeleton({ count = 4 }) {
  return <div className="product-grid">{Array.from({ length: count }, (_, i) => <div className="product-skeleton" key={i}><div className="skeleton skeleton-image" /><div className="skeleton skeleton-line skeleton-line--sm" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line skeleton-line--price" /></div>)}</div>;
}

export function Modal({ open, onClose, title, children, className = '' }) {
  useEffect(() => {
    if (!open) return;
    const escape = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open, onClose]);
  return <AnimatePresence>{open && <div className="modal-layer" role="dialog" aria-modal="true" aria-label={title}><motion.button className="backdrop" onClick={onClose} aria-label="Close dialog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.div className={`modal ${className}`} initial={{ opacity: 0, y: 25, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: .98 }}><div className="modal__header"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button></div>{children}</motion.div></div>}</AnimatePresence>;
}

export function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return <div className={`accordion ${open ? 'is-open' : ''}`}><button onClick={() => setOpen(!open)} aria-expanded={open}><span>{title}</span><Plus /></button><AnimatePresence initial={false}>{open && <motion.div className="accordion__body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}><div>{children}</div></motion.div>}</AnimatePresence></div>;
}

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([{ id: 'welcome', role: 'bot', text: 'Hi! I’m your Usell assistant. Ask me about buying, selling, your account, safety or anything else on the site.' }]);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending, open]);
  const send = async (text) => {
    const message = (text || input).trim();
    if (!message || sending) return;
    setInput(''); setMessages((items) => [...items, { id: Date.now(), role: 'user', text: message }]); setSending(true);
    try {
      const result = await api.post('/api/support/chat', { message });
      setMessages((items) => [...items, { id: Date.now() + 1, role: 'bot', text: result.answer, link: result.link, label: result.label }]);
    } catch (error) { setMessages((items) => [...items, { id: Date.now() + 1, role: 'bot', text: error.message }]); }
    finally { setSending(false); }
  };
  return <>
    <motion.button className={`support-launcher ${open ? 'is-open' : ''}`} onClick={() => setOpen(!open)} aria-label={open ? 'Close support chat' : 'Ask Usell support'} whileTap={{ scale: .94 }}>
      {open ? <X /> : <><span className="support-launcher__icon"><Sparkles /></span><span>Ask Usell</span><i /></>}
    </motion.button>
    <AnimatePresence>{open && <motion.section className="support-chat" initial={{ opacity: 0, y: 25, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: .97 }} aria-label="Usell support chat">
      <header className="support-chat__header"><span className="support-avatar"><Bot /></span><div><strong>Usell assistant</strong><span><i /> Online · marketplace help</span></div><button className="icon-btn" onClick={() => setOpen(false)}><X size={19} /></button></header>
      <div className="support-chat__scope"><ShieldCheck size={14} /> Answers are limited to Usell topics</div>
      <div className="support-chat__messages">
        {messages.map((message) => <div className={`chat-bubble chat-bubble--${message.role}`} key={message.id}>{message.text}{message.link && <Link to={message.link} onClick={() => setOpen(false)}>{message.label || 'Open page'} <ArrowRight size={14} /></Link>}</div>)}
        {sending && <div className="chat-bubble chat-bubble--bot typing"><i /><i /><i /></div>}<div ref={endRef} />
      </div>
      {messages.length < 3 && <div className="support-chat__quick">{['How do I sell?', 'How do I contact a seller?', 'Safety tips'].map((text) => <button key={text} onClick={() => send(text)}>{text}</button>)}</div>}
      <form className="support-chat__form" onSubmit={(e) => { e.preventDefault(); send(); }}><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about Usell…" maxLength={500} /><button className="btn btn--primary" disabled={!input.trim() || sending} aria-label="Send message"><Send size={18} /></button></form>
      <small className="support-chat__note">Never share your password, card PIN or OTP.</small>
    </motion.section>}</AnimatePresence>
  </>;
}

export function MobileBottomNav() {
  const { user } = useApp();
  return <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
    <NavLink to="/"><HomeIcon /><span>Home</span></NavLink>
    <NavLink to="/shop"><Search /><span>Search</span></NavLink>
    <NavLink to="/sell" className="mobile-sell"><span><Plus /></span><b>Sell</b></NavLink>
    <NavLink to={user ? '/messages' : '/auth'}><MessageCircle /><span>Chats</span></NavLink>
    <NavLink to={user ? '/account' : '/auth'}><UserRound /><span>Account</span></NavLink>
  </nav>;
}

export { Trash2, Tag, Headphones, Check };
