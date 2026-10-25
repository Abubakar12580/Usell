import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCheck, ChevronRight, LoaderCircle, MessageCircle, MoreVertical, Search, Send, ShieldCheck, ShoppingBag } from 'lucide-react';
import { api, money, timeAgo } from '../api';
import { useApp } from '../context';
import { Avatar, EmptyState } from '../components';

export default function Messages() {
  const { user, toast } = useApp();
  const [params, setParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(params.get('c') || '');
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const endRef = useRef(null);

  const loadConversations = () => api.get('/api/conversations').then((data) => {
    setConversations(data.conversations);
    if (!selectedId && data.conversations.length) { setSelectedId(data.conversations[0].id); setParams({ c: data.conversations[0].id }, { replace: true }); }
    return data.conversations;
  }).catch((error) => toast(error.message, 'error')).finally(() => setLoading(false));
  useEffect(() => { loadConversations(); }, []);
  useEffect(() => {
    if (!selectedId) { setConversation(null); return; }
    setThreadLoading(true);
    api.get(`/api/conversations/${selectedId}`).then((data) => setConversation(data.conversation)).catch((error) => toast(error.message, 'error')).finally(() => setThreadLoading(false));
  }, [selectedId]);
  useEffect(() => {
    if (!selectedId) return;
    const timer = setInterval(() => api.get(`/api/conversations/${selectedId}`).then((data) => setConversation(data.conversation)).catch(() => {}), 12000);
    return () => clearInterval(timer);
  }, [selectedId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation?.messages.length]);
  const select = (id) => { setSelectedId(id); setParams({ c: id }); };
  const send = async (event) => {
    event?.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const data = await api.post(`/api/conversations/${selectedId}/messages`, { message });
      setConversation(data.conversation); setMessage('');
      setConversations((items) => items.map((item) => item.id === selectedId ? data.conversation : item).sort((a, b) => new Date(b.lastMessage?.createdAt) - new Date(a.lastMessage?.createdAt)));
    } catch (error) { toast(error.message, 'error'); }
    finally { setSending(false); }
  };
  const filtered = conversations.filter((item) => `${item.otherUser?.name} ${item.listing?.title}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="messages-page">
    <div className="container messages-heading"><div><span className="eyebrow">YOUR CONVERSATIONS</span><h1>Messages</h1><p>Ask questions, share details and agree on the next step.</p></div><div className="message-safety"><ShieldCheck /><span>Keep chats on Usell.<br /><strong>Never share an OTP or PIN.</strong></span></div></div>
    <div className="container messages-shell">
      <aside className={`conversations-list ${selectedId ? 'hide-on-mobile' : ''}`}><div className="conversations-list__head"><h2>Inbox <span>{conversations.length}</span></h2><div><Search /><input placeholder="Search messages" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div><div className="conversations-list__body">{loading ? <div className="center-loader"><LoaderCircle className="spin" /></div> : filtered.length ? filtered.map((item) => <button className={`conversation-item ${selectedId === item.id ? 'active' : ''}`} onClick={() => select(item.id)} key={item.id}><Avatar user={item.otherUser} /><div className="conversation-item__body"><div><strong>{item.otherUser?.name}</strong><span>{timeAgo(item.lastMessage?.createdAt)}</span></div><small>{item.listing?.title || 'Listing unavailable'}</small><p>{item.lastMessage?.senderId === user.id && 'You: '}{item.lastMessage?.text || 'Start the conversation'}</p></div>{item.unreadCount > 0 && <b>{item.unreadCount}</b>}<img src={item.listing?.images[0]} alt="" /></button>) : <div className="inbox-empty"><MessageCircle /><p>{search ? 'No conversations match your search.' : 'No conversations yet.'}</p>{!search && <Link to="/shop">Find something you like</Link>}</div>}</div></aside>
      <section className={`message-thread ${!selectedId ? 'hide-on-mobile' : ''}`}>
        {!selectedId ? <EmptyState icon={MessageCircle} title="Your messages live here" text="Open a listing and tap “Chat with seller” to start a conversation." action={<Link to="/shop" className="btn btn--primary">Browse fashion</Link>} /> : threadLoading || !conversation ? <div className="center-loader"><LoaderCircle className="spin" /></div> : <>
          <header className="thread-header"><button className="icon-btn thread-back" onClick={() => { setSelectedId(''); setParams({}); }}><ArrowLeft /></button><Avatar user={conversation.otherUser} /><Link to={`/seller/${conversation.otherUser.id}`}><strong>{conversation.otherUser.name}</strong><span>{conversation.otherUser.verified ? 'Verified community member' : 'Usell community member'}</span></Link><Link className="btn btn--outline btn--sm thread-view-item" to={`/listing/${conversation.listing?.id}`}>View item <ChevronRight /></Link></header>
          {conversation.listing && <Link to={`/listing/${conversation.listing.id}`} className="thread-listing"><img src={conversation.listing.images[0]} alt="" /><div><small>ABOUT THIS LISTING</small><strong>{conversation.listing.title}</strong><span>{money(conversation.listing.price)}</span></div><span className={`status-badge status-badge--${conversation.listing.status}`}>{conversation.listing.status}</span><ChevronRight /></Link>}
          <div className="thread-messages"><div className="thread-start"><ShieldCheck /><span>This is the start of your conversation about <strong>{conversation.listing?.title}</strong>.</span></div>{conversation.messages.map((item) => <div className={`message-row ${item.senderId === user.id ? 'message-row--mine' : ''}`} key={item.id}>{item.senderId !== user.id && <Avatar user={conversation.otherUser} size="avatar--xs" />}<div className="message-bubble"><p>{item.text}</p><span>{timeAgo(item.createdAt)}{item.senderId === user.id && <CheckCheck />}</span></div></div>)}<div ref={endRef} /></div>
          <form className="thread-composer" onSubmit={send}><textarea value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Write a message…" rows="1" maxLength={1000} /><button className="btn btn--primary" disabled={!message.trim() || sending}>{sending ? <LoaderCircle className="spin" /> : <Send />}<span>Send</span></button><small>Enter to send · Shift + Enter for a new line</small></form>
        </>}
      </section>
    </div>
  </div>;
}
