import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Filter, LoaderCircle, Search, SlidersHorizontal, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { EmptyState, ProductCard, ProductGridSkeleton } from '../components';

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(12);
  const [search, setSearch] = useState(params.get('q') || '');
  const [filterOpen, setFilterOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(params.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') || '');
  const queryString = params.toString();
  const conditions = ['New with tags', 'Like new', 'Excellent', 'Good', 'Fair'];
  const categories = ['Women', 'Men', 'Traditional', 'Shoes', 'Bags', 'Accessories'];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'EU 38', 'EU 39', 'EU 40', 'EU 41', 'EU 42', 'One size'];

  useEffect(() => { setSearch(params.get('q') || ''); setMinPrice(params.get('minPrice') || ''); setMaxPrice(params.get('maxPrice') || ''); setVisible(12); }, [queryString]);
  useEffect(() => {
    setLoading(true);
    api.get(`/api/listings?${queryString}${queryString ? '&' : ''}limit=60`).then((data) => { setListings(data.listings); setTotal(data.total); }).catch(() => { setListings([]); setTotal(0); }).finally(() => setLoading(false));
  }, [queryString]);
  useEffect(() => {
    document.body.classList.toggle('no-scroll', filterOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [filterOpen]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next);
  };
  const reset = () => { setParams({}); setFilterOpen(false); };
  const activeFilters = ['category', 'condition', 'size', 'minPrice', 'maxPrice'].filter((key) => params.get(key)).length;
  const title = params.get('q') ? `Results for “${params.get('q')}”` : params.get('category') || (params.get('maxPrice') === '5000' ? 'Under Rs. 5,000' : 'Shop all preloved');

  const filterControls = <>
    <div className="filter-group"><div className="filter-group__title">Category</div><div className="filter-radio-list">{categories.map((category) => <label key={category}><input type="radio" name="category" checked={params.get('category') === category} onChange={() => update('category', params.get('category') === category ? '' : category)} /><span>{category}</span><small>{listings.filter((l) => l.category === category).length || ''}</small></label>)}</div></div>
    <div className="filter-group"><div className="filter-group__title">Condition</div><div className="filter-radio-list">{conditions.map((condition) => <label key={condition}><input type="radio" name="condition" checked={params.get('condition') === condition} onChange={() => update('condition', params.get('condition') === condition ? '' : condition)} /><span>{condition}</span></label>)}</div></div>
    <div className="filter-group"><div className="filter-group__title">Size</div><select value={params.get('size') || ''} onChange={(e) => update('size', e.target.value)}><option value="">All sizes</option>{sizes.map((size) => <option key={size}>{size}</option>)}</select></div>
    <div className="filter-group"><div className="filter-group__title">Price range (PKR)</div><div className="price-inputs"><input type="number" min="0" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} /><span>—</span><input type="number" min="0" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} /></div><button className="btn btn--outline btn--sm btn--full" onClick={() => { const next = new URLSearchParams(params); minPrice ? next.set('minPrice', minPrice) : next.delete('minPrice'); maxPrice ? next.set('maxPrice', maxPrice) : next.delete('maxPrice'); setParams(next); }}>Apply price</button></div>
    <button className="text-link filter-reset" onClick={reset}>Clear all filters <X size={15} /></button>
  </>;

  return <div className="shop-page">
    <div className="shop-hero"><div className="container"><div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight size={14} /><span>Shop</span></div><motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>{title}</motion.h1><p>Real closets. Honest details. Finds worth another story.</p></div></div>
    <div className="container shop-search-row"><form onSubmit={(e) => { e.preventDefault(); update('q', search.trim()); }} className="shop-search"><Search size={20} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by item, brand, colour or city" />{search && <button type="button" className="icon-btn" onClick={() => { setSearch(''); update('q', ''); }}><X size={17} /></button>}<button className="btn btn--dark btn--sm">Search</button></form></div>
    <div className="container category-pills"><button className={!params.get('category') ? 'active' : ''} onClick={() => update('category', '')}>All</button>{categories.map((category) => <button key={category} className={params.get('category') === category ? 'active' : ''} onClick={() => update('category', category)}>{category}</button>)}</div>
    <div className="container shop-layout">
      <aside className="filters-sidebar"><div className="filters-sidebar__head"><strong><SlidersHorizontal size={18} /> Filters</strong>{activeFilters > 0 && <span>{activeFilters}</span>}</div>{filterControls}</aside>
      <section className="shop-results">
        <div className="results-toolbar"><div><button className="btn btn--outline btn--sm mobile-filter-btn" onClick={() => setFilterOpen(true)}><Filter size={17} /> Filters {activeFilters > 0 && <b>{activeFilters}</b>}</button><span className="results-count">{loading ? 'Finding pieces…' : `${total} ${total === 1 ? 'item' : 'items'}`}</span></div><label>Sort by <select value={params.get('sort') || 'newest'} onChange={(e) => update('sort', e.target.value)}><option value="newest">Newest first</option><option value="popular">Most popular</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label></div>
        {(params.get('condition') || params.get('size') || params.get('q')) && <div className="active-chips">{params.get('q') && <button onClick={() => update('q', '')}>“{params.get('q')}” <X size={13} /></button>}{params.get('condition') && <button onClick={() => update('condition', '')}>{params.get('condition')} <X size={13} /></button>}{params.get('size') && <button onClick={() => update('size', '')}>Size {params.get('size')} <X size={13} /></button>}</div>}
        {loading ? <ProductGridSkeleton count={8} /> : listings.length ? <><motion.div className="product-grid product-grid--shop" layout>{listings.slice(0, visible).map((item) => <ProductCard listing={item} key={item.id} />)}</motion.div>{visible < listings.length && <div className="section-center"><button className="btn btn--outline" onClick={() => setVisible((value) => value + 12)}>Load more finds <span>({listings.length - visible} left)</span></button></div>}</> : <EmptyState icon={Search} title="No finds match that combination" text="Try removing a filter, changing the size or searching for something more general. New pieces are listed by the community regularly." action={<button className="btn btn--primary" onClick={reset}>Clear filters</button>} />}
      </section>
    </div>
    <AnimatePresence>{filterOpen && <div className="filter-drawer-layer"><motion.button className="backdrop" onClick={() => setFilterOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.aside className="filter-drawer" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}><div className="filter-drawer__head"><strong>Filters</strong><button className="icon-btn" onClick={() => setFilterOpen(false)}><X /></button></div><div className="filter-drawer__body">{filterControls}</div><button className="btn btn--primary btn--full" onClick={() => setFilterOpen(false)}>Show {total} results</button></motion.aside></div>}</AnimatePresence>
  </div>;
}
