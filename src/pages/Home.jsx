import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BadgeCheck, Camera, Check, ChevronRight, MessagesSquare, PackageCheck, Recycle, SearchCheck, ShieldCheck, Sparkles, Tag, WalletCards } from 'lucide-react';
import { api } from '../api';
import { ProductCard, ProductGridSkeleton, Reveal, SectionHeading } from '../components';

const slides = [
  { kicker: 'THE CLOSET EDIT — 2026', title: <>GOOD STYLE.<br />ANOTHER STORY.</>, text: 'Discover feel-good fashion from closets across the country. Preloved, still so much to love.', image: '/images/hero-women.jpg', cta: 'Shop fresh finds', to: '/shop', secondary: true },
  { kicker: 'MAKE SPACE. MAKE MONEY.', title: <>YOUR CLOSET HAS<br />MORE TO GIVE.</>, text: 'Snap it. List it. Pass it on. Selling the pieces you no longer wear is simple and free.', image: '/images/hero-closet.jpg', cta: 'Start selling', to: '/sell' },
  { kicker: 'FIND YOUR NEXT FAVOURITE', title: <>NEW TO YOU.<br />BETTER FOR EVERYONE.</>, text: 'Everyday staples, occasion looks and one-of-a-kind finds—all in one friendly marketplace.', image: '/images/hero-men.jpg', cta: 'Explore Usell', to: '/shop' }
];

const categories = [
  ['Women', '/images/editorial-women.jpg'], ['Men', '/images/editorial-men.jpg'], ['Traditional', '/images/traditional.jpg'],
  ['Shoes', '/images/sneakers.jpg'], ['Bags', '/images/handbag.jpg'], ['Accessories', '/images/watch.jpg'], ['Just in', '/images/thrift-rack.jpg']
];

function Hero() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setActive((value) => (value + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [paused]);
  const slide = slides[active];
  const go = (direction) => setActive((active + direction + slides.length) % slides.length);
  return <section className="hero" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-label="Usell highlights">
    <div className="hero__slide">
      <AnimatePresence mode="sync"><motion.img key={slide.image} src={slide.image} alt="Preloved fashion on Usell" className="hero__image" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ opacity: { duration: .6 }, scale: { duration: 1.3 } }} /></AnimatePresence>
      <div className="hero__shade" />
      <div className="hero__content"><AnimatePresence mode="wait"><motion.div key={active} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: .5 }}>
        <span className="hero__kicker"><Sparkles size={15} />{slide.kicker}</span><h1>{slide.title}</h1><p>{slide.text}</p>
        <div className="hero__buttons"><Link className="btn btn--lime btn--lg" to={slide.to}>{slide.cta}<ArrowRight size={19} /></Link>{slide.secondary && <Link className="btn btn--glass btn--lg" to="/sell">Sell your style</Link>}</div>
      </motion.div></AnimatePresence></div>
      <div className="hero__arrows"><button onClick={() => go(-1)} aria-label="Previous slide"><ArrowLeft /></button><button onClick={() => go(1)} aria-label="Next slide"><ArrowRight /></button></div>
      <div className="hero__dots">{slides.map((_, index) => <button key={index} className={index === active ? 'active' : ''} onClick={() => setActive(index)} aria-label={`Go to slide ${index + 1}`} />)}</div>
      <span className="hero__counter">0{active + 1} / 0{slides.length}</span>
    </div>
  </section>;
}

export default function Home() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readMore, setReadMore] = useState(false);
  useEffect(() => { api.get('/api/listings?limit=16').then((data) => setListings(data.listings)).catch(() => {}).finally(() => setLoading(false)); }, []);
  const mostWanted = [...listings].sort((a, b) => b.views - a.views).slice(0, 4);
  const budget = listings.filter((item) => item.price <= 5000).slice(0, 4);
  return <>
    <Hero />
    <section className="category-stories container" aria-label="Shop categories">
      {categories.map(([name, image], index) => <motion.div key={name} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .2 + index * .06 }}><Link to={name === 'Just in' ? '/shop?sort=newest' : `/shop?category=${name}`} className="category-story"><span className="category-story__image"><img src={image} alt="" /></span><span>{name}</span></Link></motion.div>)}
    </section>

    <Reveal className="closet-banner container"><span>THE PRELOVED MARKETPLACE</span><h2>YOUR NEXT FAVOURITE<br /><em>IS ALREADY OUT THERE.</em></h2><p>Less waste. More style. Better stories.</p></Reveal>

    <section className="section container">
      <SectionHeading eyebrow="FRESH FROM THE COMMUNITY" title="New on the rail" link="/shop?sort=newest" />
      {loading ? <ProductGridSkeleton /> : <div className="product-grid">{listings.slice(0, 4).map((item, i) => <ProductCard listing={item} key={item.id} priority={i < 2} />)}</div>}
      <div className="section-center"><Link className="btn btn--outline" to="/shop">See all fashion <ArrowRight size={17} /></Link></div>
    </section>

    <Reveal className="wide-promo container">
      <Link to="/shop?sort=popular" className="wide-promo__link"><img src="/images/clothes-rail.jpg" alt="Curated preloved clothes on a rail" /><div className="wide-promo__shade" /><div className="wide-promo__content"><span className="eyebrow">THE EDIT EVERYONE'S BROWSING</span><h2>Good finds don't stay<br />on the rail for long.</h2><span className="btn btn--light">Shop most wanted <ArrowRight size={18} /></span></div><div className="wide-promo__stamp"><span>PRE</span><span>LOVED</span><small>RELoved · 2026</small></div></Link>
    </Reveal>

    <section className="section container">
      <SectionHeading eyebrow="THE COMMUNITY WISHLIST" title="Most wanted" link="/shop?sort=popular" linkText="Shop popular" />
      {loading ? <ProductGridSkeleton /> : <div className="product-grid">{mostWanted.map((item) => <ProductCard listing={item} key={item.id} />)}</div>}
    </section>

    <section className="promise-strip"><div className="container promise-strip__grid">
      {[[BadgeCheck, 'Free to list', 'No listing fee. More in your pocket.'], [MessagesSquare, 'Direct conversations', 'Chat with buyers and sellers on-site.'], [SearchCheck, 'Find your fit', 'Search by size, brand, condition and price.'], [Recycle, 'Style in circulation', 'Give good pieces a longer life.']].map(([Icon, title, text], index) => <Reveal className="promise-item" delay={index * .08} key={title}><span><Icon /></span><div><h3>{title}</h3><p>{text}</p></div></Reveal>)}
    </div></section>

    <section className="section container">
      <SectionHeading eyebrow="LITTLE LUXURIES, SMALLER PRICE TAGS" title="Preloved under Rs. 5,000" link="/shop?maxPrice=5000" linkText="Shop the edit" />
      {loading ? <ProductGridSkeleton /> : <div className="product-grid">{budget.map((item) => <ProductCard listing={item} key={item.id} />)}</div>}
    </section>

    <section className="section container editorial-section">
      <SectionHeading eyebrow="SHOP YOUR WAY" title="A find for every mood" />
      <div className="editorial-grid">
        {[
          ['Everyday icons', 'Women', '/images/editorial-women.jpg', 'Easy pieces. Endless outfits.'],
          ['Street staples', 'Men', '/images/editorial-men.jpg', 'The fits you reach for daily.'],
          ['Festive & formal', 'Traditional', '/images/traditional.jpg', 'Made for memorable moments.'],
          ['Finishing touches', 'Accessories', '/images/editorial-accessories.jpg', 'Small details. Big difference.']
        ].map(([title, category, image, text], index) => <Reveal key={title} delay={index * .07} className="editorial-card"><Link to={`/shop?category=${category}`}><img src={image} alt={title} /><div className="editorial-card__overlay" /><div className="editorial-card__content"><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p><b>Shop now <ArrowRight size={16} /></b></div></Link></Reveal>)}
      </div>
    </section>

    <section className="section how-section"><div className="container">
      <SectionHeading eyebrow="SIMPLE BY DESIGN" title="From your closet to theirs" />
      <div className="how-grid">
        {[[Camera, 'Snap & list', 'Add a few clear photos, tell us about your item and choose your price. Listing takes just a few minutes.'], [MessagesSquare, 'Chat & agree', 'Interested buyers message you directly. Answer questions and agree on delivery and payment together.'], [PackageCheck, 'Pass it on', 'Complete the sale safely, mark your item sold and enjoy a little more space—and money—for what’s next.']].map(([Icon, title, text], index) => <Reveal className="how-card" delay={index * .1} key={title}><span className="how-card__number">0{index + 1}</span><div className="how-card__icon"><Icon /></div><h3>{title}</h3><p>{text}</p>{index === 0 && <Link to="/sell">Create your first listing <ArrowRight size={16} /></Link>}</Reveal>)}
      </div>
    </div></section>

    <Reveal className="container seller-cta"><div className="seller-cta__pattern" /><div><span className="eyebrow">READY WHEN YOU ARE</span><h2>Make space.<br />Make someone’s day.</h2><p>That thing you never wear? It could be exactly what someone else is looking for.</p><Link to="/sell" className="btn btn--lime btn--lg">Sell on Usell—it's free <ArrowRight size={19} /></Link></div><div className="seller-cta__image"><img src="/images/thrift-rack.jpg" alt="Preloved clothes waiting for a new owner" /><span><Tag /> YOUR CLOSET<br />CALLED.</span></div></Reveal>

    <section className="section container seo-section"><span className="eyebrow">WHY USELL</span><h2>Fashion feels better when it keeps going.</h2><p>Usell is a people-powered marketplace for preloved clothes, shoes, bags and accessories. We make it easy to clear the pieces you no longer use, discover something you’ll genuinely love, and deal directly with another real person.</p>{readMore && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><p>Create a free account, upload your item photos and add honest details about size, condition and price. Your listing appears in public search, where buyers can save it and start an on-site conversation with you.</p><p>Usell does not process payments or provide delivery. Buyers and sellers agree on those details directly, so always read our safety guidance, inspect items carefully and never share sensitive financial information.</p></motion.div>}<button className="text-link" onClick={() => setReadMore(!readMore)}>{readMore ? 'Read less' : 'Read more about how Usell works'} <ChevronRight className={readMore ? 'rotate-90' : ''} size={17} /></button></section>

    <section className="container popular-searches"><span className="eyebrow">POPULAR SEARCHES</span><div>{[['Denim jackets', '/shop?q=denim+jackets'], ['Evening dresses', '/shop?q=evening+dresses'], ['Nike shoes', '/shop?q=nike+shoes'], ['Traditional wear', '/shop?category=Traditional'], ['Bags under 5000', '/shop?category=Bags&maxPrice=5000'], ['Men’s shirts', '/shop?category=Men&q=shirt'], ['Like new', '/shop?condition=Like+new']].map(([term, to]) => <Link key={term} to={to}>{term}<ArrowRight size={14} /></Link>)}</div></section>
  </>;
}
