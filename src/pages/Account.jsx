import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart3, Check, ChevronRight, CircleDollarSign, Eye, Heart, LayoutDashboard, LoaderCircle, LogOut, MessageCircle, MoreHorizontal, Package, Pencil, Plus, Settings, ShieldCheck, ShoppingBag, Sparkles, Trash2, UserRound } from 'lucide-react';
import { api, money, timeAgo } from '../api';
import { useApp } from '../context';
import { Avatar, EmptyState, Modal, ProductCard } from '../components';

export default function Account() {
  const { user, setUser, logout, toast } = useApp();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const [listings, setListings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [profile, setProfile] = useState({ name: user.name, location: user.location || '', whatsapp: user.whatsapp || '', bio: user.bio || '' });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get(`/api/listings?owner=${user.id}&limit=100`), api.get('/api/favorites'), api.get('/api/conversations')]).then(([listingData, favoriteData, conversationData]) => {
      setListings(listingData.listings); setFavorites(favoriteData.listings); setConversations(conversationData.conversations);
    }).catch((error) => toast(error.message, 'error')).finally(() => setLoading(false));
  }, [user.id, toast]);
  useEffect(load, [load]);
  const setTab = (value) => setParams(value === 'overview' ? {} : { tab: value });
  const updateStatus = async (item, status) => {
    try { const data = await api.patch(`/api/listings/${item.id}`, { status }); setListings((items) => items.map((entry) => entry.id === item.id ? data.listing : entry)); toast(status === 'sold' ? 'Nice one! Your item is marked as sold.' : 'Your listing is active again.'); }
    catch (error) { toast(error.message, 'error'); }
  };
  const remove = async () => {
    setDeleting(true);
    try { await api.delete(`/api/listings/${deleteItem.id}`); setListings((items) => items.filter((item) => item.id !== deleteItem.id)); setDeleteItem(null); toast('Listing removed.'); }
    catch (error) { toast(error.message, 'error'); }
    finally { setDeleting(false); }
  };
  const saveProfile = async (event) => {
    event.preventDefault(); setSaving(true);
    try { const data = await api.patch('/api/auth/me', profile); setUser(data.user); toast('Profile settings saved.'); }
    catch (error) { toast(error.message, 'error'); }
    finally { setSaving(false); }
  };
  const active = listings.filter((item) => item.status === 'active');
  const sold = listings.filter((item) => item.status === 'sold');
  const unread = conversations.reduce((sum, item) => sum + item.unreadCount, 0);
  const views = listings.reduce((sum, item) => sum + item.views, 0);

  const tabs = [['overview', LayoutDashboard, 'Overview'], ['listings', Package, 'My listings'], ['favorites', Heart, 'Favourites'], ['settings', Settings, 'Profile settings']];
  return <div className="account-page">
    <div className="account-top"><div className="container"><div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight /><span>My account</span></div><div className="account-welcome"><div><span className="eyebrow">YOUR USELL</span><h1>{tab === 'overview' ? `Hello, ${user.name.split(' ')[0]}.` : tabs.find(([id]) => id === tab)?.[2]}</h1><p>{tab === 'overview' ? 'Here’s what’s happening with your closet today.' : 'Everything you need, right where you left it.'}</p></div><Link to="/sell" className="btn btn--lime"><Plus /> Sell an item</Link></div></div></div>
    <div className="container account-layout">
      <aside className="account-sidebar"><div className="account-profile"><Avatar user={user} size="avatar--xl" /><div><strong>{user.name}</strong><span>{user.email}</span></div>{user.verified && <span className="verified-label"><ShieldCheck /> Verified</span>}</div><nav>{tabs.map(([id, Icon, label]) => <button className={tab === id ? 'active' : ''} key={id} onClick={() => setTab(id)}><Icon />{label}{id === 'listings' && <b>{listings.length}</b>}{id === 'favorites' && <b>{favorites.length}</b>}<ChevronRight /></button>)}<Link to="/messages"><MessageCircle />Messages{unread > 0 && <b>{unread}</b>}<ChevronRight /></Link>{user.role === 'admin' && <Link to="/admin"><BarChart3 />Admin analytics<ChevronRight /></Link>}</nav><button className="logout-btn" onClick={() => { logout(); navigate('/'); }}><LogOut /> Sign out</button></aside>
      <section className="account-content">
        {loading ? <div className="account-loading"><LoaderCircle className="spin" /><p>Loading your account…</p></div> : <>
          {tab === 'overview' && <>
            <div className="account-stats">{[[Package, active.length, 'Active listings', 'listings'], [CircleDollarSign, sold.length, 'Items sold', 'listings'], [Eye, views.toLocaleString(), 'Total listing views', 'listings'], [Heart, favorites.length, 'Saved finds', 'favorites']].map(([Icon, value, label, target]) => <button key={label} onClick={() => setTab(target)}><span><Icon /></span><div><strong>{value}</strong><small>{label}</small></div><ChevronRight /></button>)}</div>
            <div className="account-panel"><div className="account-panel__heading"><div><h2>Your recent listings</h2><p>Keep your closet fresh and your buyers informed.</p></div><button className="text-link" onClick={() => setTab('listings')}>View all <ArrowRightIcon /></button></div>{listings.length ? <div className="dashboard-listings">{listings.slice(0, 3).map((item) => <DashboardListing key={item.id} item={item} updateStatus={updateStatus} onDelete={setDeleteItem} />)}</div> : <EmptyState icon={Package} title="Your rail is ready" text="List the pieces you no longer wear and give them another story." action={<Link to="/sell" className="btn btn--primary">Create a listing</Link>} />}</div>
            <div className="account-two-col"><div className="account-panel"><div className="account-panel__heading"><div><h2>Latest conversations</h2><p>Buyers and sellers, all in one place.</p></div></div>{conversations.length ? conversations.slice(0, 3).map((item) => <Link className="conversation-preview" to={`/messages?c=${item.id}`} key={item.id}><Avatar user={item.otherUser} /><div><strong>{item.otherUser.name}</strong><p>{item.lastMessage?.text}</p></div><span>{timeAgo(item.lastMessage?.createdAt)}</span>{item.unreadCount > 0 && <b>{item.unreadCount}</b>}</Link>) : <p className="muted-panel-text">No conversations yet. Your messages will appear here.</p>}<Link to="/messages" className="btn btn--outline btn--full">Open messages</Link></div><div className="account-panel account-tip"><span><Sparkles /></span><h2>A stronger listing starts with honesty.</h2><p>Add measurements, show any signs of wear and reply promptly. Clear details help everyone make better decisions.</p><Link to="/help">Read our selling guide <ArrowRightIcon /></Link></div></div>
          </>}
          {tab === 'listings' && <div className="account-panel"><div className="account-panel__heading"><div><h2>My listings</h2><p>{active.length} active · {sold.length} sold · {views.toLocaleString()} total views</p></div><Link to="/sell" className="btn btn--primary btn--sm"><Plus /> New listing</Link></div>{listings.length ? <div className="dashboard-listings">{listings.map((item) => <DashboardListing key={item.id} item={item} updateStatus={updateStatus} onDelete={setDeleteItem} detailed />)}</div> : <EmptyState icon={Package} title="No listings yet" text="Your first preloved piece is only a few photos away." action={<Link to="/sell" className="btn btn--primary">List an item</Link>} />}</div>}
          {tab === 'favorites' && <div className="account-panel account-panel--transparent"><div className="account-panel__heading"><div><h2>Your saved finds</h2><p>{favorites.length} {favorites.length === 1 ? 'piece' : 'pieces'} worth another look.</p></div><Link to="/shop" className="text-link">Keep browsing <ArrowRightIcon /></Link></div>{favorites.length ? <div className="product-grid product-grid--account">{favorites.map((item) => <ProductCard key={item.id} listing={item} onFavoriteChange={(id, result) => !result.isFavorite && setFavorites((items) => items.filter((entry) => entry.id !== id))} />)}</div> : <EmptyState icon={Heart} title="Nothing saved yet" text="Tap the heart on any listing and it will be waiting for you here." action={<Link to="/shop" className="btn btn--primary">Find something to love</Link>} />}</div>}
          {tab === 'settings' && <div className="account-panel settings-panel"><div className="account-panel__heading"><div><h2>Profile settings</h2><p>This information helps buyers and sellers know who they’re talking to.</p></div></div><form onSubmit={saveProfile}><div className="settings-avatar"><Avatar user={user} size="avatar--xl" /><div><strong>{user.name}</strong><span>Member since {new Date(user.joinedAt).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}</span></div></div><div className="form-grid"><label className="field">Full name<input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required /></label><label className="field">Email address<input value={user.email} disabled /><small>Email cannot be changed in this demo.</small></label><label className="field">Location<input value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} placeholder="City, Province" /></label><label className="field">WhatsApp number <span>(optional)</span><input value={profile.whatsapp} onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })} placeholder="+92…" /></label><label className="field field--full">Short bio<textarea rows="4" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} maxLength={300} placeholder="Tell the community a little about your style…" /></label></div><button className="btn btn--primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Check />}{saving ? 'Saving…' : 'Save changes'}</button></form></div>}
        </>}
      </section>
    </div>
    <Modal open={Boolean(deleteItem)} onClose={() => !deleting && setDeleteItem(null)} title="Remove this listing?"><div className="confirm-modal"><span className="confirm-modal__icon"><Trash2 /></span><p><strong>{deleteItem?.title}</strong> will disappear from public search. This cannot be undone.</p><div><button className="btn btn--outline" onClick={() => setDeleteItem(null)}>Keep listing</button><button className="btn btn--danger" onClick={remove} disabled={deleting}>{deleting ? 'Removing…' : 'Yes, remove it'}</button></div></div></Modal>
  </div>;
}

function ArrowRightIcon() { return <ChevronRight size={17} />; }

function DashboardListing({ item, updateStatus, onDelete, detailed = false }) {
  return <article className="dashboard-listing"><Link to={`/listing/${item.id}`} className="dashboard-listing__image"><img src={item.images[0]} alt={item.title} /></Link><div className="dashboard-listing__main"><div><span className={`status-badge status-badge--${item.status}`}>{item.status}</span><Link to={`/listing/${item.id}`}><h3>{item.title}</h3></Link><p>{item.category} · Size {item.size} · Listed {timeAgo(item.createdAt)}</p></div><strong>{money(item.price)}</strong></div><div className="dashboard-listing__stats"><span><Eye />{item.views}</span><span><Heart />{item.favoriteCount}</span></div><div className="dashboard-listing__actions">{item.status === 'active' ? <button className="btn btn--outline btn--sm" onClick={() => updateStatus(item, 'sold')}><Check /> Mark sold</button> : item.status === 'sold' ? <button className="btn btn--outline btn--sm" onClick={() => updateStatus(item, 'active')}>Relist item</button> : null}<button className="icon-btn danger-icon" onClick={() => onDelete(item)} aria-label={`Remove ${item.title}`}><Trash2 /></button></div></article>;
}
