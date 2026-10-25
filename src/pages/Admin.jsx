import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowUpRight, BarChart3, Check, ChevronRight, Copy, Eye, Heart, LineChart, LoaderCircle, MessageCircle, Package, Send, ShieldCheck, ShoppingBag, Sparkles, TrendingUp, Users, WalletCards } from 'lucide-react';
import { api, money, timeAgo } from '../api';
import { useApp } from '../context';
import { Avatar, EmptyState, Modal } from '../components';

export default function Admin() {
  const { user, toast } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [report, setReport] = useState(null);
  const [copied, setCopied] = useState(false);
  const load = () => {
    if (user.role !== 'admin') return;
    api.get('/api/admin/analytics').then(setData).catch((error) => toast(error.message, 'error')).finally(() => setLoading(false));
  };
  useEffect(load, []);
  const generateReport = async () => {
    setSending(true);
    try { const result = await api.post('/api/admin/whatsapp-report', {}); setReport(result); }
    catch (error) { toast(error.message, 'error'); if (error.data?.report) setReport({ report: error.data.report, sent: false }); }
    finally { setSending(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(report.report); setCopied(true); toast('Report copied.'); setTimeout(() => setCopied(false), 2000); }
    catch { toast('Could not access the clipboard. Select the report text to copy it.', 'error'); }
  };
  if (user.role !== 'admin') return <div className="container section"><EmptyState icon={ShieldCheck} title="Admin access only" text="This area contains private marketplace analytics. Sign in with an authorised administrator account to continue." action={<Link to="/account" className="btn btn--primary">Back to my account</Link>} /></div>;
  if (loading || !data) return <div className="detail-loader"><LoaderCircle className="spin" /><span>Crunching marketplace activity…</span></div>;
  const m = data.metrics;
  const maxViews = Math.max(...data.days.map((day) => day.views), 1);
  const points = data.days.map((day, index) => `${45 + index * 102},${185 - (day.views / maxViews) * 130}`).join(' ');
  const metrics = [[Users, m.totalUsers, 'Community members', `+${m.newUsers7d} this week`, 'purple'], [Package, m.activeListings, 'Active listings', `${m.soldListings} marked sold`, 'blue'], [Eye, m.totalViews.toLocaleString(), 'Listing views', 'Across all listings', 'orange'], [Heart, m.totalFavourites, 'Saved favourites', 'Buyer intent signals', 'pink'], [MessageCircle, m.conversations, 'Conversations', 'Buyer–seller connections', 'green']];
  return <div className="admin-page">
    <div className="admin-hero"><div className="container"><div><span className="eyebrow"><Activity /> USELL INTELLIGENCE</span><h1>Marketplace pulse.</h1><p>Live store activity, community growth and practical next steps.</p></div><div className="admin-hero__actions"><span className="demo-data-label">DEMO + LIVE ACTIVITY</span><button className="btn btn--lime" onClick={generateReport} disabled={sending}>{sending ? <LoaderCircle className="spin" /> : <Send />}{sending ? 'Generating…' : 'WhatsApp report'}</button></div></div></div>
    <div className="container admin-content">
      <div className="admin-update"><span><i /> Analytics updated {timeAgo(data.generatedAt)}</span><button onClick={() => { setLoading(true); load(); }}>Refresh data</button></div>
      <div className="metric-grid">{metrics.map(([Icon, value, label, note, color], index) => <div className={`metric-card metric-card--${color}`} key={label}><div><span><Icon /></span><small>0{index + 1}</small></div><strong>{value}</strong><h3>{label}</h3><p>{note}</p></div>)}</div>
      <div className="admin-main-grid">
        <section className="admin-panel admin-chart-panel"><div className="admin-panel__heading"><div><span className="eyebrow">LAST 7 DAYS</span><h2>Marketplace activity</h2></div><span className="chart-legend"><i /> Views & visits</span></div><div className="line-chart"><svg viewBox="0 0 700 235" role="img" aria-label="Seven day activity chart"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6c32c9" stopOpacity=".28" /><stop offset="100%" stopColor="#6c32c9" stopOpacity="0" /></linearGradient></defs>{[55, 100, 145, 190].map((y) => <line key={y} x1="40" x2="665" y1={y} y2={y} stroke="#eceaf0" />)}<polygon points={`45,195 ${points} 657,195`} fill="url(#chartFill)" /><polyline points={points} fill="none" stroke="#6c32c9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{data.days.map((day, index) => { const x = 45 + index * 102; const y = 185 - (day.views / maxViews) * 130; return <g key={day.date}><circle cx={x} cy={y} r="5" fill="#fff" stroke="#6c32c9" strokeWidth="3"><title>{day.views} views</title></circle><text x={x} y="220" textAnchor="middle" className="chart-label">{day.label}</text></g>; })}</svg></div><div className="chart-summary">{data.days.slice(-3).map((day) => <div key={day.date}><span>{day.label}</span><strong>{day.views}</strong><small>{day.searches} searches · {day.messages} messages</small></div>)}</div></section>
        <section className="admin-panel"><div className="admin-panel__heading"><div><span className="eyebrow">CATALOGUE MIX</span><h2>Listings by category</h2></div></div><div className="category-bars">{data.categoryCounts.map((category, index) => <div key={category.name}><div><span>{category.name}</span><strong>{category.value}</strong></div><span className="bar-track"><span className="bar-fill" style={{ width: `${(category.value / Math.max(...data.categoryCounts.map((c) => c.value), 1)) * 100}%` }} /></span></div>)}</div><div className="category-insight"><TrendingUp /><p><strong>{data.categoryCounts[0]?.name}</strong> currently leads the catalogue. Balance visibility with discovery in smaller categories.</p></div></section>
      </div>
      <section className="admin-panel opportunities"><div className="admin-panel__heading"><div><span className="eyebrow"><Sparkles /> SMART RECOMMENDATIONS</span><h2>Where Usell can improve next</h2><p>Generated from current listing, user and engagement patterns.</p></div></div><div className="opportunity-grid">{data.suggestions.map((suggestion, index) => <article key={suggestion}><span>0{index + 1}</span><div><h3>{['Grow with intention', 'Raise listing quality', 'Activate new members', 'Keep improving trust'][index]}</h3><p>{suggestion}</p></div></article>)}</div></section>
      <div className="admin-main-grid admin-main-grid--tables">
        <section className="admin-panel"><div className="admin-panel__heading"><div><span className="eyebrow">COMMUNITY</span><h2>Newest members</h2></div><Users /></div><div className="admin-table">{data.recentUsers.map((member) => <div className="admin-user-row" key={member.id}><Avatar user={member} /><div><strong>{member.name}</strong><span>{member.location || 'Location not added'}</span></div><small>{timeAgo(member.joinedAt)}</small></div>)}</div></section>
        <section className="admin-panel"><div className="admin-panel__heading"><div><span className="eyebrow">CATALOGUE</span><h2>Latest listings</h2></div><ShoppingBag /></div><div className="admin-table">{data.recentListings.map((listing) => <Link to={`/listing/${listing.id}`} className="admin-listing-row" key={listing.id}><img src={listing.images[0]} alt="" /><div><strong>{listing.title}</strong><span>{listing.category} · {money(listing.price)}</span></div><small><Eye />{listing.views}</small><ChevronRight /></Link>)}</div></section>
      </div>
      <section className="whatsapp-card"><div className="whatsapp-card__icon"><MessageCircle /></div><div><span className="eyebrow">ADMIN AUTOMATION</span><h2>Analytics, delivered to your WhatsApp.</h2><p>Generate a concise report with marketplace metrics and improvement opportunities. Automatic delivery uses the Meta WhatsApp Cloud API.</p><div className={`connection-status ${data.whatsapp.configured ? 'connected' : ''}`}><i />{data.whatsapp.configured ? `Cloud API connected · ${data.whatsapp.recipient}` : 'Cloud API credentials not configured'}</div></div><div className="whatsapp-card__actions"><button className="btn btn--primary" onClick={generateReport} disabled={sending}>{sending ? <LoaderCircle className="spin" /> : <Send />}{sending ? 'Generating…' : 'Generate report'}</button>{!data.whatsapp.configured && <small>You can still copy the report or open it in WhatsApp manually.</small>}</div></section>
    </div>
    <Modal open={Boolean(report)} onClose={() => setReport(null)} title={report?.sent ? 'Report sent to WhatsApp' : 'Your WhatsApp report'} className="report-modal"><div className="report-status">{report?.sent ? <><span className="report-success"><Check /></span><p>Delivered through the Meta Cloud API.</p></> : <><span className="report-ready"><BarChart3 /></span><p>Your report is ready. Add server credentials for automatic delivery, or send it manually now.</p></>}</div><pre className="report-preview">{report?.report}</pre><div className="report-actions"><button className="btn btn--outline" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? 'Copied' : 'Copy report'}</button>{report?.whatsappLink && <a className="btn btn--primary" href={report.whatsappLink} target="_blank" rel="noreferrer">Open in WhatsApp <ArrowUpRight /></a>}</div>{!report?.sent && <p className="report-setup">For automatic reports, set <code>WHATSAPP_ACCESS_TOKEN</code> and <code>WHATSAPP_PHONE_NUMBER_ID</code> on the server. Free-form messages follow WhatsApp’s 24-hour rule; an approved template can be configured for reports outside that window.</p>}</Modal>
  </div>;
}
