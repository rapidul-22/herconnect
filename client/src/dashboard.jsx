import { Link } from 'react-router-dom';
import { ShoppingBag, HandHeart, ShieldCheck, CarFront, ArrowUpRight, Flower2, Sparkles } from 'lucide-react';
import { useApp } from './shared.jsx';
import './dashboard.css';
const modules = [
  { name: 'Marketplace', tag: 'SHOP & SELL', text: 'Browse products from women-led shops, track orders or start selling.', path: '/marketplace', icon: ShoppingBag, tone: 'rose', actions: [['My orders', '/orders'], ['My shop', '/seller']] },
  { name: 'Services & talent', tag: 'BOOK OR OFFER A SERVICE', text: 'Discover creative, technical and everyday services, or offer your own expertise.', path: '/hiring', icon: HandHeart, tone: 'peach', actions: [['My bookings', '/hiring/bookings'], ['My service profile', '/hiring/mine']] },
  { name: 'Safety & support', tag: 'REPORTS & RESOURCES', text: 'Share a concern, explore area reports and find support when you need it.', path: '/safety', icon: ShieldCheck, tone: 'sage', actions: [['My reports', '/safety/mine'], ['Find support', '/safety/resources']] },
  { name: 'Safe transport', tag: 'PLAN A RIDE', text: 'Plan your route, request a ride or apply to drive. Keep your journey in view.', path: '/transport', icon: CarFront, tone: 'lavender', actions: [['My rides', '/transport/rides'], ['My driver profile', '/transport/drive']] },
];
export function Dashboard() {
  const { user } = useApp();
  return <div className="central-home">
    <section className="central-hero">
      <div className="central-intro">
        <span className="eyebrow"><Sparkles size={15} /> HERCONNECT+ FOR WOMEN</span>
        <p className="central-greeting">{user ? `Welcome back, ${user.name.split(' ')[0]}.` : 'Welcome to HerConnect+'}</p>
        <h1>Your plans.<br /><em>One connected place.</em></h1>
        <p>Find products, book a service, check community reports or plan a ride.<br />Choose where to begin.</p>
        <a href="#choose-module" className="btn primary">Explore the modules <ArrowUpRight size={18} /></a>
      </div>
      <div className="central-art" aria-hidden="true">
        <div className="central-ring" /><span className="central-flower"><Flower2 size={74} /></span>
        {modules.map(({ icon: Icon, name }, i) => <span key={name} className={'central-orbit orbit-' + i}><Icon size={26} /></span>)}
        <span className="central-art-note">Shopping · Services · Support · Travel</span>
      </div>
    </section>
    <div className="central-heading" id="choose-module"><div><span className="eyebrow">FOUR WAYS TO CONNECT</span><h2>What would you like to do?</h2></div><p>{user ? "Explore any module with the same account." : "Sign in or join to open a module. One account gives access to all four."}</p></div>
    <section className="central-modules" aria-label="Choose a module">
      {modules.map(({ name, tag, text, path, icon: Icon, tone, actions }, i) => <article key={name} className={'central-card ' + tone}>
        <Link className="central-card-main" to={path} aria-label={'Open ' + name}>
          <div className="central-card-top"><span className="central-icon"><Icon size={28} /></span><span className="central-number">0{i + 1}</span></div>
          <span className="eyebrow">{tag}</span><h3>{name}</h3><p>{text}</p>
          <span className="central-enter">Explore {name.toLowerCase()} <ArrowUpRight size={20} /></span>
        </Link>
        {user && !user.isAdmin && <div className="central-card-actions">{actions.map(([label, to]) => <Link key={to} to={to}>{label}<ArrowUpRight size={14} /></Link>)}</div>}
      </article>)}
    </section>
    <section className="central-account">
      <span className="central-icon"><Flower2 size={30} /></span><div><h2>Manage all four modules with one account.</h2>
      <p>Buy and sell, hire and offer services, report concerns, ride and apply to drive. Your shop, worker and driver profiles stay connected to your existing account. Service profiles need approval before going public.</p></div>
      <Link className="btn" to={user ? '/profile' : '/signup'}>{user ? 'My profile' : 'Create an account'}<ArrowUpRight size={17}/></Link>
    </section>
    {user?.isAdmin && <section className="central-admin"><h2>Moderation workspace</h2><p>Moderation permissions remain separate from member activities.</p><div>{[['Shops','/admin'],['Workers','/admin/hiring'],['Safety','/admin/safety'],['Transport','/admin/transport']].map(([label,path])=><Link key={path} className="btn" to={path}>{label}</Link>)}</div></section>}
  </div>;
}
