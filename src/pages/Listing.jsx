import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BadgeCheck, ChevronRight, Flag, Heart, LoaderCircle, MapPin, MessageCircle, Package, Send, Share2, ShieldCheck, ShoppingBag, Star, Truck } from 'lucide-react';
import { api, initials, money, timeAgo } from '../api';
import { useApp } from '../context';
import { Accordion, EmptyState, Modal, ProductCard } from '../components';

export default function Listing() {
  const { id } = useParams();
  const { user, toast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [listing, setListing] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [image, setImage] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState('Hi! Is this still available?');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setLoading(true); setError(''); setImage(0);
    api.get(`/api/listings/${id}`).then((data) => { setListing(data.listing); setSimilar(data.similar); }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [id]);

  const favorite = async () => {
    if (!user) { navigate('/auth', { state: { from: location.pathname } }); return; }
    const before = listing;
    setListing({ ...listing, isFavorite: !listing.isFavorite, favoriteCount: listing.favoriteCount + (listing.isFavorite ? -1 : 1) });
    try { const data = await api.post(`/api/listings/${id}/favorite`, {}); setListing((item) => ({ ...item, ...data })); toast(data.isFavorite ? 'Saved to your favourites.' : 'Removed from your favourites.'); }
    catch (err) { setListing(before); toast(err.message, 'error'); }
  };
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: listing.title, text: `Take a look at ${listing.title} on Usell`, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); toast('Listing link copied.'); }
    } catch { /* The native share sheet may be dismissed. */ }
  };
  const openChat = () => {
    if (!user) { navigate('/auth', { state: { from: location.pathname } }); return; }
    setChatOpen(true);
  };
  const sendMessage = async (event) => {
    event.preventDefault(); setSending(true);
    try { const data = await api.post('/api/conversations', { listingId: id, message }); toast('Message sent to the seller.'); navigate(`/messages?c=${data.conversation.id}`); }
    catch (err) { toast(err.message, 'error'); setSending(false); }
  };

  if (loading) return <div className="detail-loader"><LoaderCircle className="spin" /><span>Opening this find…</span></div>;
  if (error || !listing) return <div className="container section"><EmptyState title="This find has moved on" text={error || 'The listing may have been removed.'} action={<Link className="btn btn--primary" to="/shop">Back to shop</Link>} /></div>;
  const own = user?.id === listing.ownerId;
  const discount = listing.originalPrice > listing.price ? Math.round((1 - listing.price / listing.originalPrice) * 100) : 0;
  return <div className="listing-page">
    <div className="container detail-breadcrumbs"><Link to="/">Home</Link><ChevronRight /><Link to={`/shop?category=${listing.category}`}>{listing.category}</Link><ChevronRight /><span>{listing.title}</span></div>
    <div className="container listing-layout">
      <section className="listing-gallery">
        <div className="listing-gallery__main"><img src={listing.images[image]} alt={`${listing.title}, photo ${image + 1}`} />{listing.status === 'sold' && <span className="sold-overlay">SOLD</span>}<span className="gallery-condition">{listing.condition}</span><span className="gallery-count">{image + 1} / {listing.images.length}</span></div>
        {listing.images.length > 1 && <div className="listing-gallery__thumbs">{listing.images.map((src, index) => <button className={image === index ? 'active' : ''} onClick={() => setImage(index)} key={src}><img src={src} alt={`View ${index + 1}`} /></button>)}</div>}
      </section>
      <section className="listing-info">
        <div className="listing-info__eyebrow"><span>{listing.brand || 'PRELOVED FIND'}</span><span>Listed {timeAgo(listing.createdAt)}</span></div>
        <h1>{listing.title}</h1>
        <div className="listing-price"><strong>{money(listing.price)}</strong>{listing.originalPrice > listing.price && <><del>{money(listing.originalPrice)}</del><span>Save {discount}% vs. original</span></>}</div>
        <div className="listing-facts"><div><span>Size</span><strong>{listing.size}</strong></div><div><span>Condition</span><strong>{listing.condition}</strong></div><div><span>Colour</span><strong>{listing.color || 'See photos'}</strong></div><div><span>Category</span><strong>{listing.subcategory || listing.category}</strong></div></div>
        <div className="listing-location"><MapPin size={18} /><span>{listing.location}</span><i>·</i><Truck size={18} /><span>{listing.shipping}</span></div>
        <div className="listing-actions">{own ? <Link to="/account?tab=listings" className="btn btn--primary btn--lg">Manage your listing <ArrowRight size={18} /></Link> : <button className="btn btn--primary btn--lg" onClick={openChat} disabled={listing.status !== 'active'}><MessageCircle size={19} />{listing.status === 'sold' ? 'Item sold' : 'Chat with seller'}</button>}<button className={`btn btn--outline btn--icon-lg ${listing.isFavorite ? 'is-favorite' : ''}`} onClick={favorite} aria-label="Save item"><Heart fill={listing.isFavorite ? 'currentColor' : 'none'} /></button><button className="btn btn--outline btn--icon-lg" onClick={share} aria-label="Share item"><Share2 /></button></div>
        {!own && listing.status === 'active' && <p className="listing-action-note"><ShieldCheck size={15} /> Chat first. Ask questions. Agree on the details before paying.</p>}
        <Link to={`/seller/${listing.seller.id}`} className="seller-card"><span className="avatar avatar--lg">{initials(listing.seller.name)}</span><div><span>SELLER</span><h3>{listing.seller.name} {listing.seller.verified && <BadgeCheck size={17} />}</h3><p>{listing.seller.location} · Member since {new Date(listing.seller.joinedAt).getFullYear()}</p></div><ChevronRight /></Link>
        <div className="listing-accordions"><Accordion title="Item description" defaultOpen><p>{listing.description}</p></Accordion><Accordion title="Delivery & payment"><p>{listing.shipping}. Delivery and payment are agreed directly between buyer and seller. Usell does not process payments or provide courier services.</p></Accordion><Accordion title="Buy with confidence"><p>Review every photo, ask for measurements or close-ups of wear, and never share an OTP, PIN or password. For local collection, choose a safe public place.</p></Accordion></div>
        <Link to="/contact" className="report-link"><Flag size={15} /> Something not right? Report this listing</Link>
      </section>
    </div>
    <div className="container buyer-note"><ShieldCheck /><div><h3>A little care goes a long way.</h3><p>Keep your conversation on Usell, confirm the item and delivery details, and inspect before you pay whenever possible.</p></div><Link to="/safety">Read our safety guide <ArrowRight size={17} /></Link></div>
    {similar.length > 0 && <section className="section container"><div className="section-heading"><div><span className="eyebrow">KEEP BROWSING</span><h2>You may also like</h2></div><Link className="text-link" to={`/shop?category=${listing.category}`}>More {listing.category.toLowerCase()} <ArrowRight size={17} /></Link></div><div className="product-grid">{similar.map((item) => <ProductCard key={item.id} listing={item} />)}</div></section>}
    <Modal open={chatOpen} onClose={() => !sending && setChatOpen(false)} title="Message the seller">
      <div className="chat-modal-item"><img src={listing.images[0]} alt="" /><div><strong>{listing.title}</strong><span>{money(listing.price)} · Size {listing.size}</span></div></div>
      <div className="chat-modal-seller"><span className="avatar">{initials(listing.seller.name)}</span><span>You're messaging <strong>{listing.seller.name}</strong></span></div>
      <form onSubmit={sendMessage} className="chat-start-form"><label>Your message<textarea rows="4" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} required /></label><div className="quick-message-chips">{['Is this still available?', 'Could you share measurements?', 'Is the price negotiable?'].map((text) => <button type="button" key={text} onClick={() => setMessage(text)}>{text}</button>)}</div><button className="btn btn--primary btn--full btn--lg" disabled={sending || !message.trim()}>{sending ? <LoaderCircle className="spin" /> : <Send size={18} />}{sending ? 'Starting conversation…' : 'Send message'}</button><p>Never share passwords, card PINs or one-time codes.</p></form>
    </Modal>
  </div>;
}
