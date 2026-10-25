import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, CalendarDays, ChevronRight, LoaderCircle, MapPin, Package, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import { Avatar, EmptyState, ProductCard } from '../components';

export default function Seller() {
  const { id } = useParams();
  const [seller, setSeller] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api.get(`/api/users/${id}`), api.get(`/api/listings?owner=${id}&limit=100`)]).then(([userData, listingData]) => { setSeller(userData.user); setListings(listingData.listings); }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [id]);
  if (loading) return <div className="detail-loader"><LoaderCircle className="spin" /><span>Opening seller profile…</span></div>;
  if (error || !seller) return <div className="container section"><EmptyState title="Seller not found" text={error} action={<Link className="btn btn--primary" to="/shop">Back to shop</Link>} /></div>;
  return <div className="seller-page">
    <div className="seller-hero"><div className="container"><div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight /><span>Seller profile</span></div><div className="seller-hero__profile"><Avatar user={seller} size="avatar--profile" /><div><span className="eyebrow">USELL COMMUNITY SELLER</span><h1>{seller.name} {seller.verified && <BadgeCheck />}</h1><p>{seller.bio || 'Sharing good pieces, one listing at a time.'}</p><div className="seller-hero__meta"><span><MapPin />{seller.location || 'Pakistan'}</span><span><CalendarDays />Member since {new Date(seller.joinedAt).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}</span></div></div><div className="seller-hero__stat"><Package /><strong>{listings.length}</strong><span>active {listings.length === 1 ? 'listing' : 'listings'}</span></div></div></div></div>
    <div className="container seller-trust"><ShieldCheck /><p><strong>Buying from {seller.name.split(' ')[0]}?</strong> Review each listing carefully, use on-site chat and follow the Usell safety guide. Item details and delivery arrangements are provided by the seller.</p><Link to="/safety">Safety tips <ChevronRight /></Link></div>
    <section className="section container"><div className="section-heading"><div><span className="eyebrow">FROM THEIR CLOSET</span><h2>All active listings</h2></div><span className="results-count">{listings.length} items</span></div>{listings.length ? <div className="product-grid">{listings.map((item) => <ProductCard key={item.id} listing={item} />)}</div> : <EmptyState icon={Package} title="No active listings right now" text="This seller’s next find could appear at any time. Browse the rest of the community while you wait." action={<Link className="btn btn--primary" to="/shop">Explore Usell</Link>} />}</section>
  </div>;
}
