import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, Check, ChevronRight, CircleHelp, LoaderCircle, Mail, MessageCircle, Package, Search, Send, ShieldCheck, ShoppingBag, Sparkles, UserRound } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context';
import { Accordion, EmptyState } from '../components';

const faqs = [
  ['How do I create an account?', 'Tap the account icon or “Sign in”, then choose Create account. Enter your name, email and a password of at least 6 characters. Your account gives you access to listings, favourites, messages and profile settings.'],
  ['Is it free to sell on Usell?', 'Yes. Creating an account and publishing listings is currently free. Usell does not charge a listing fee in this version. Delivery costs or payment-provider charges are separate and must be agreed between buyer and seller.'],
  ['How many photos can I upload?', 'You can upload between 1 and 5 images per listing. Each image can be up to 6 MB. Use clear, original photos of the actual item and show any signs of wear.'],
  ['How do I contact a seller?', 'Open the listing and tap “Chat with seller”. Sign in, write your message and send. Your conversation will be stored in Messages so you can return to it later.'],
  ['Does Usell handle payment or delivery?', 'No. Usell currently connects buyers and sellers but does not process payments, provide courier services or guarantee delivery. Agree on those details directly and follow the safety guide.'],
  ['Can I return an item?', 'Returns are not automatically managed by Usell. Ask questions before buying and agree on any return terms directly with the seller. If an item is materially misrepresented, contact the Usell team with the listing details.'],
  ['How do I mark an item as sold?', 'Go to Account → My listings and choose “Mark sold”. If you relist the item later, choose “Relist item”. You can also remove a listing permanently from the same area.'],
  ['Who can see my listing?', 'Active listings are publicly visible on the web, including to visitors without an account. Your email, password and private WhatsApp details are not shown on your public seller profile.'],
  ['How does the support assistant work?', 'The floating Usell assistant answers questions about site features, buying, selling, accounts and marketplace safety. It intentionally does not answer unrelated topics. It cannot access your private password or complete a transaction for you.']
];

const policyContent = {
  terms: {
    eyebrow: 'THE AGREEMENT', title: 'Terms of use', intro: 'Clear expectations make a better community. These terms explain how to use Usell responsibly.',
    sections: [
      ['1. What Usell does', 'Usell provides an online peer-to-peer marketplace where people can publish preloved fashion listings, discover items and communicate. Usell is not the seller of community-listed items and does not take ownership of them.'],
      ['2. Your account', 'You must provide accurate registration details, keep your password secure and be responsible for activity in your account. Do not impersonate another person or create an account for fraudulent activity.'],
      ['3. Honest listings', 'Only list fashion items you own and are allowed to sell. Use photos of the actual item and describe its brand, size, condition, flaws and price honestly. Counterfeit, unsafe, stolen or prohibited items are not allowed.'],
      ['4. Buying, selling and payment', 'Buyers and sellers communicate and agree on price, payment, delivery and any return arrangement directly. Usell does not currently process payments, provide delivery or guarantee a transaction. Never share passwords, PINs or OTPs.'],
      ['5. Respect and safety', 'Do not harass, scam, spam or mislead other users. Keep conversations relevant to the listing. We may restrict accounts or remove content that threatens community safety or violates these terms.'],
      ['6. Marketplace content', 'You retain ownership of the photos and text you upload, and give Usell permission to display them as needed to operate and promote your listing on the platform. Do not upload content you do not have the right to use.'],
      ['7. Availability and changes', 'Features may change as Usell improves. We may update these terms and will show the latest version on this page. Continued use after an update means you accept the revised terms.']
    ]
  },
  privacy: {
    eyebrow: 'YOUR INFORMATION', title: 'Privacy policy', intro: 'Your information should be handled with care. Here is what Usell stores and why.',
    sections: [
      ['1. Information you provide', 'We store account details such as your name, email, optional location and bio; listing details and uploaded photos; favourites; buyer–seller messages; support questions; and contact-form submissions.'],
      ['2. How information is used', 'Information is used to operate accounts, publish listings, enable search and messaging, maintain marketplace safety, answer support requests and generate aggregate analytics and improvement reports.'],
      ['3. What other people can see', 'Active listings, your public name, optional public location, bio, verification status and active seller listings can be viewed by site visitors. Your email, password and private WhatsApp field are not included in public seller profiles.'],
      ['4. Analytics and WhatsApp reports', 'Marketplace metrics and operational recommendations are available only to authorised administrators. WhatsApp delivery, when configured, uses Meta’s WhatsApp Cloud API and is subject to Meta’s own terms and privacy practices.'],
      ['5. Passwords and sensitive data', 'Passwords are stored as secure hashes, not readable plain text. Never send card PINs, passwords or one-time codes in listings, messages or support chat.'],
      ['6. Your choices', 'You can update your profile and remove your listings from your account. For questions about your information or a deletion request, use the Contact page and include the email associated with your account.'],
      ['7. This demonstration build', 'The included demo accounts and listings are sample content. Do not place real sensitive financial or identity information in a demonstration deployment. Production deployments should add managed backups, rate limiting, monitoring and a reviewed data-retention policy.']
    ]
  }
};

export function InfoPage({ type }) {
  const { toast } = useApp();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setSending(true);
    try { const result = await api.post('/api/contact', form); setSent(result.message); setForm({ name: '', email: '', message: '' }); }
    catch (error) { toast(error.message, 'error'); }
    finally { setSending(false); }
  };
  if (type === 'contact') return <div className="info-page contact-page"><InfoHero eyebrow="TALK TO USELL" title="How can we help?" text="Ask a question, report a listing concern or share an idea for the community." /><div className="container contact-layout"><section className="contact-details"><span className="contact-icon"><MessageCircle /></span><h2>A real person will read your message.</h2><p>Include the listing title or a clear description of what happened. Never include your password, card PIN or one-time code.</p><div className="contact-points"><span><Check />Account and listing help</span><span><Check />Marketplace safety concerns</span><span><Check />Feedback and improvement ideas</span></div><div className="contact-assistant"><Sparkles /><div><strong>Need a quick site answer?</strong><p>The Ask Usell button in the corner can help with buying, selling and site features.</p></div></div></section><section className="contact-form-card"><h2>Send a message</h2><p>Complete the form and your message will be saved for the Usell team.</p>{sent ? <div className="contact-success"><span><Check /></span><h3>{sent}</h3><p>You can send another message below if you need to add anything.</p><button className="btn btn--outline" onClick={() => setSent('')}>Send another message</button></div> : <form onSubmit={submit}><label className="field">Your name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label className="field">Email address<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="So the team can reply" /></label><label className="field">How can we help?<textarea rows="6" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required maxLength={1500} placeholder="Tell us what you need help with…" /></label><button className="btn btn--primary btn--lg btn--full" disabled={sending}>{sending ? <LoaderCircle className="spin" /> : <Send />}{sending ? 'Sending…' : 'Send to Usell'}</button></form>}</section></div></div>;
  if (policyContent[type]) {
    const content = policyContent[type];
    return <div className="info-page"><InfoHero eyebrow={content.eyebrow} title={content.title} text={content.intro} /><div className="container policy-layout"><aside><span>Last updated</span><strong>October 25, 2026</strong><Link to="/contact">Have a question? <ArrowRight /></Link></aside><div className="policy-content">{content.sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}</div></div></div>;
  }
  if (type === 'about') return <div className="info-page about-page"><InfoHero eyebrow="WHY WE EXIST" title="Good style deserves another story." text="Usell helps people turn underused fashion into value—and helps someone else find their next favourite." /><div className="container about-image"><img src="/images/hero-closet.jpg" alt="A curated clothing store with garments on rails" /><span>PRELOVED.<br />RELOVED.</span></div><div className="container about-story"><div><span className="eyebrow">THE IDEA</span><h2>Less “what do I do with this?”<br />More “who will love this next?”</h2></div><div><p>Closets everywhere hold pieces that no longer get the attention they deserve. At the same time, someone else is searching for exactly that style, size or finishing touch.</p><p>Usell brings those people together with simple listings, useful search and direct conversations. No complicated storefront. No need to be a professional seller. Just honest pieces and real people.</p></div></div><div className="container about-values">{[[ShoppingBag, 'People before inventory', 'Every listing starts with a real person and something worth passing on.'], [ShieldCheck, 'Honesty builds confidence', 'Clear photos, accurate condition notes and safer conversations matter.'], [Sparkles, 'More life in every piece', 'Resale keeps useful fashion in circulation and out of the forgotten pile.']].map(([Icon, title, text]) => <article key={title}><Icon /><h3>{title}</h3><p>{text}</p></article>)}</div><div className="container about-cta"><h2>Your closet could be someone’s favourite find.</h2><div><Link className="btn btn--lime" to="/sell">Start selling <ArrowRight /></Link><Link className="btn btn--glass" to="/shop">Explore the marketplace</Link></div></div></div>;
  if (type === 'safety') return <div className="info-page"><InfoHero eyebrow="BUY & SELL WITH CARE" title="Safety is always in style." text="A few simple habits can make every Usell conversation and transaction safer." /><div className="container safety-grid">{[[MessageCircle, 'Keep conversations on Usell', 'Use the built-in chat so your listing context and conversation stay together. Be cautious if someone pressures you to move immediately.'], [Search, 'Check before you commit', 'Review all photos, ask for measurements and close-ups, and confirm flaws, delivery and total cost before paying.'], [UserRound, 'Meet thoughtfully', 'For local collection, choose a busy public place where possible. Bring someone with you and avoid sharing your home address unnecessarily.'], [ShieldCheck, 'Protect sensitive information', 'Never share your password, card PIN or OTP. Usell support will never ask for them. Do not click suspicious payment links.'], [Package, 'Describe and package honestly', 'Sellers should disclose wear, provide genuine photos and pack the agreed item carefully. Keep proof of postage when using a courier.'], [CircleHelp, 'If something feels wrong, pause', 'Stop the conversation or payment. Save relevant details and use the Contact page to report your concern to the Usell team.']].map(([Icon, title, text], index) => <article key={title}><span>0{index + 1}</span><Icon /><h2>{title}</h2><p>{text}</p></article>)}</div><div className="container safety-bottom"><ShieldCheck /><div><h2>Need to report a concern?</h2><p>Send the listing title and a factual description. Do not include sensitive financial details.</p></div><Link to="/contact" className="btn btn--primary">Contact Usell <ArrowRight /></Link></div></div>;
  return <div className="info-page help-page"><InfoHero eyebrow="USELL HELP CENTRE" title="Let’s get you sorted." text="Straightforward answers for buying, selling and everything in between." /><div className="container help-shortcuts">{[[Camera, 'Sell an item', 'Photos, details and pricing', '/sell'], [Search, 'Find a piece', 'Search, filters and favourites', '/shop'], [ShieldCheck, 'Stay safe', 'Smart buying and selling habits', '/safety']].map(([Icon, title, text, to]) => <Link to={to} key={title}><Icon /><div><h3>{title}</h3><p>{text}</p></div><ArrowRight /></Link>)}</div><div className="container faq-layout"><div><span className="eyebrow">FREQUENTLY ASKED</span><h2>Your questions,<br />answered.</h2><p>Can’t find what you need?</p><Link to="/contact" className="text-link">Send us a message <ArrowRight /></Link></div><div className="faq-list">{faqs.map(([question, answer], index) => <Accordion key={question} title={question} defaultOpen={index === 0}><p>{answer}</p></Accordion>)}</div></div></div>;
}

function InfoHero({ eyebrow, title, text }) {
  return <div className="info-hero"><div className="container"><div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight /><span>{title}</span></div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div></div>;
}

export function NotFound() {
  return <div className="container section"><EmptyState title="That page has left the closet" text="The link may be old or the page may have moved. There are plenty of fresh finds waiting back in the shop." action={<Link to="/shop" className="btn btn--primary">Back to Usell <ArrowRight /></Link>} /></div>;
}
