import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Camera, Check, CheckCircle2, ImagePlus, Info, LoaderCircle, MapPin, PackageCheck, ShieldCheck, Sparkles, Tag, Trash2, UploadCloud, X } from 'lucide-react';
import { api, money } from '../api';
import { useApp } from '../context';

const initialForm = { title: '', description: '', category: '', subcategory: '', brand: '', size: '', condition: '', color: '', price: '', originalPrice: '', shipping: 'Nationwide delivery' };
const conditions = [['New with tags', 'Unused, original tags attached'], ['Like new', 'Worn once or twice, no visible wear'], ['Excellent', 'Very light signs of careful use'], ['Good', 'Normal wear, fully usable'], ['Fair', 'Noticeable wear, honestly described']];

export default function Sell() {
  const { user, toast } = useApp();
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState([]);
  const [form, setForm] = useState({ ...initialForm, location: user.location || '' });
  const [dragging, setDragging] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(null);
  const inputRef = useRef(null);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const addFiles = (fileList) => {
    const files = Array.from(fileList);
    const valid = files.filter((file) => {
      if (!file.type.startsWith('image/')) { toast(`${file.name} is not an image.`, 'error'); return false; }
      if (file.size > 6 * 1024 * 1024) { toast(`${file.name} is larger than 6 MB.`, 'error'); return false; }
      return true;
    });
    const room = 5 - photos.length;
    if (valid.length > room) toast('You can add up to 5 photos per listing.', 'error');
    setPhotos((items) => [...items, ...valid.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  };
  const next = () => {
    if (step === 0 && !photos.length) return toast('Add at least one clear photo to continue.', 'error');
    if (step === 1) {
      if (!form.title.trim() || !form.category || !form.size || !form.condition || form.description.trim().length < 20) return toast('Complete the required details and add a description of at least 20 characters.', 'error');
    }
    setStep((value) => Math.min(value + 1, 2));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const publish = async () => {
    if (!Number(form.price) || !form.location.trim()) return toast('Add a valid price and your item location.', 'error');
    setPublishing(true);
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    photos.forEach((photo) => data.append('images', photo.file));
    try { const result = await api.post('/api/listings', data); setPublished(result.listing); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch (error) { toast(error.message, 'error'); }
    finally { setPublishing(false); }
  };

  if (published) return <div className="container publish-success"><motion.div initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="publish-success__icon"><Check /></motion.div><span className="eyebrow">IT'S LIVE</span><h1>Your find is ready for<br />its next story.</h1><p>Your listing is now public. Buyers can discover it in search and message you directly.</p><div className="publish-success__card"><img src={published.images[0]} alt={published.title} /><div><strong>{published.title}</strong><span>{money(published.price)} · {published.condition}</span></div><CheckCircle2 /></div><div className="publish-success__actions"><Link to={`/listing/${published.id}`} className="btn btn--primary btn--lg">View my listing <ArrowRight size={18} /></Link><Link to="/account?tab=listings" className="btn btn--outline btn--lg">Manage listings</Link></div><button className="text-link" onClick={() => { setPublished(null); setPhotos([]); setForm({ ...initialForm, location: user.location || '' }); setStep(0); }}>List another item</button></div>;

  return <div className="sell-page">
    <div className="sell-heading container"><span className="eyebrow">SELL ON USELL — IT'S FREE</span><h1>Make space. Pass it on.</h1><p>A few good photos and honest details are all you need.</p></div>
    <div className="container sell-stepper">{[['Photos', Camera], ['Details', Tag], ['Price & publish', Sparkles]].map(([label, Icon], index) => <button key={label} className={`${step === index ? 'active' : ''} ${step > index ? 'complete' : ''}`} onClick={() => index < step && setStep(index)}><span>{step > index ? <Check /> : <Icon />}</span><div><small>STEP {index + 1}</small><strong>{label}</strong></div>{index < 2 && <i />}</button>)}</div>
    <div className="container sell-layout">
      <section className="sell-form-card">
        {step === 0 && <motion.div key="photos" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }}>
          <div className="sell-form-title"><span>01</span><div><h2>Show it from its best side</h2><p>Add 1–5 photos. Your first photo becomes the cover.</p></div></div>
          <div className={`photo-dropzone ${dragging ? 'is-dragging' : ''}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}>
            <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            {photos.length === 0 ? <button type="button" onClick={() => inputRef.current.click()}><span className="photo-dropzone__icon"><UploadCloud /></span><strong>Drop your photos here</strong><p>or <u>choose from your device</u></p><small>JPG, PNG or WEBP · Up to 6 MB each</small></button> : <div className="photo-previews">{photos.map((photo, index) => <div className={`photo-preview ${index === 0 ? 'photo-preview--cover' : ''}`} key={photo.url}><img src={photo.url} alt={`Upload ${index + 1}`} />{index === 0 && <span>COVER PHOTO</span>}<button onClick={() => setPhotos((items) => items.filter((item) => item.url !== photo.url))} aria-label="Remove photo"><Trash2 /></button></div>)}{photos.length < 5 && <button className="add-photo-tile" onClick={() => inputRef.current.click()}><ImagePlus /><span>Add photo</span><small>{5 - photos.length} remaining</small></button>}</div>}
          </div>
          <div className="photo-tips"><h3><Camera size={18} /> Photos that help items sell</h3><div><span><Check />Use natural daylight</span><span><Check />Show the front and back</span><span><Check />Capture labels and any wear</span></div></div>
        </motion.div>}
        {step === 1 && <motion.div key="details" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }}>
          <div className="sell-form-title"><span>02</span><div><h2>Tell buyers about it</h2><p>Honest, specific details build confidence and save questions.</p></div></div>
          <div className="form-grid">
            <label className="field field--full">Listing title <b>*</b><input value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={90} placeholder="e.g. Zara satin midi dress" /><small>{form.title.length}/90</small></label>
            <label className="field">Brand <input value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="e.g. Zara (optional)" /></label>
            <label className="field">Colour <input value={form.color} onChange={(e) => set('color', e.target.value)} placeholder="e.g. Emerald green" /></label>
            <label className="field">Category <b>*</b><select value={form.category} onChange={(e) => set('category', e.target.value)}><option value="">Choose a category</option>{['Women', 'Men', 'Traditional', 'Shoes', 'Bags', 'Accessories'].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="field">Type <input value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} placeholder="e.g. Dresses, Sneakers" /></label>
            <label className="field">Size <b>*</b><select value={form.size} onChange={(e) => set('size', e.target.value)}><option value="">Select size</option>{['XS', 'S', 'M', 'L', 'XL', 'XXL', 'EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'One size'].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="field">Item location <b>*</b><input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="City, Province" /></label>
            <label className="field field--full">Description <b>*</b><textarea rows="5" value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={1500} placeholder="Describe the fit, fabric, measurements, how often it was used, and any flaws buyers should know about…" /><small>{form.description.length}/1500 · Minimum 20 characters</small></label>
          </div>
          <fieldset className="condition-picker"><legend>Condition <b>*</b></legend><div>{conditions.map(([name, description]) => <label className={form.condition === name ? 'selected' : ''} key={name}><input type="radio" name="condition" value={name} checked={form.condition === name} onChange={() => set('condition', name)} /><span className="condition-radio">{form.condition === name && <Check />}</span><span><strong>{name}</strong><small>{description}</small></span></label>)}</div></fieldset>
        </motion.div>}
        {step === 2 && <motion.div key="price" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }}>
          <div className="sell-form-title"><span>03</span><div><h2>Price it. Publish it.</h2><p>Choose a fair price and tell buyers where the item is.</p></div></div>
          <div className="price-form"><label className="field">Your selling price (PKR) <b>*</b><div className="big-price-input"><span>Rs.</span><input type="number" min="1" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0" /></div></label><label className="field">Original retail price (optional)<div className="normal-price-input"><span>Rs.</span><input type="number" min="0" value={form.originalPrice} onChange={(e) => set('originalPrice', e.target.value)} placeholder="0" /></div><small>Helps buyers understand the value. Only add a price you know.</small></label></div>
          <div className="form-grid delivery-fields"><label className="field">Item location <b>*</b><div className="input-with-icon"><MapPin /><input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="City, Province" /></div></label><label className="field">Delivery availability<select value={form.shipping} onChange={(e) => set('shipping', e.target.value)}><option>Nationwide delivery</option><option>Nationwide & international</option><option>Local pickup only</option><option>Pickup or delivery</option></select></label></div>
          <div className="listing-review"><h3><PackageCheck /> Before you publish</h3><ul><li><Check />My photos show the actual item clearly.</li><li><Check />I have described its condition and any flaws honestly.</li><li><Check />I will agree on delivery and payment safely with the buyer.</li></ul><p><ShieldCheck /> By publishing, you confirm this item belongs to you and follows the <Link to="/terms">Usell terms</Link>.</p></div>
        </motion.div>}
        <div className="sell-form-actions">{step > 0 ? <button className="btn btn--outline" onClick={() => setStep(step - 1)} disabled={publishing}><ArrowLeft size={17} /> Back</button> : <Link className="text-link" to="/help">Need help?</Link>}{step < 2 ? <button className="btn btn--primary btn--lg" onClick={next}>Continue <ArrowRight size={18} /></button> : <button className="btn btn--primary btn--lg" onClick={publish} disabled={publishing}>{publishing ? <LoaderCircle className="spin" /> : <Sparkles size={18} />}{publishing ? 'Publishing your item…' : 'Publish listing'}</button>}</div>
      </section>
      <aside className="sell-preview"><div className="sell-preview__sticky"><span className="eyebrow">LIVE PREVIEW</span><div className="preview-card"><div className="preview-card__image">{photos[0] ? <img src={photos[0].url} alt="Listing preview" /> : <div><Camera /><span>Your cover photo</span></div>}<span>{form.condition || 'YOUR ITEM'}</span></div><div className="preview-card__body"><small>{form.brand || 'BRAND'} {form.size && `· SIZE ${form.size}`}</small><h3>{form.title || 'Your listing title'}</h3><strong>{form.price ? money(form.price) : 'Rs. —'}</strong><p><span className="avatar avatar--xs">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>{user.name}</p></div></div><div className="sell-help"><Info /><div><strong>Good to know</strong><p>Publishing is free. Usell does not take a payment or arrange delivery—you and the buyer agree on those details directly.</p></div></div></div></aside>
    </div>
  </div>;
}
