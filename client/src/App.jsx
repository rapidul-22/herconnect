import { Dashboard } from "./dashboard.jsx";
import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Flower2,
  LayoutDashboard,
  ShoppingBag,
  Heart,
  Package,
  Store,
  UserRound,
  LogOut,
  ArrowUpRight,
  ArrowRight,
  CarFront,
  ShieldCheck,
  HandHeart,
  Menu,
  X,
  Sparkles,
  BadgeCheck,
  Phone,
} from "lucide-react";
import {
  api,
  useApp,
  CartProvider,
  PageTitle,
  ProductGrid,
  QueryState,
  money,
  date,
  useAction,
} from "./shared.jsx";
import { AuthPage, Profile, InfoPage } from "./auth-pages.jsx";
import {
  Marketplace,
  ProductDetail,
  Cart,
  Checkout,
  Orders,
  OrderDetail,
  Wishlist,
  Shop,
} from "./market-pages.jsx";
import { Seller, ProductEditor, Admin } from "./seller-pages.jsx";
import { HiringDirectory, WorkerDetail, WorkerMine, HiringBookings, HiringBookingDetail, HiringComplaints, HiringAdmin } from "./hiring-pages.jsx";
import { SafetyFeed, SafetyNew, SafetyMine, SafetyDetail, SafetyZones, SafetyResources, SafetyAdmin } from "./safety-pages.jsx";
import { TransportHome, TransportDriverDetail, TransportDrive, TransportContact, TransportRides, TransportRideDetail, TransportAdmin } from "./transport-pages.jsx";
export function Logo() {
  return (
    <Link to="/" className="logo">
      <span className="logo-mark">
        <Flower2 size={23} />
      </span>
      <span>
        HerConnect<span className="logo-plus">+</span>
      </span>
    </Link>
  );
}
function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
function Guard({ admin = false }) {
  const { user } = useApp(),
    loc = useLocation();
  if (!user)
    return (
      <Navigate
        replace
        to={"/login?next=" + encodeURIComponent(loc.pathname + loc.search)}
      />
    );
  if (admin && !user.isAdmin) return <Navigate replace to="/dashboard" />;
  return <Outlet />;
}
import SOS from './sos.jsx';
// Outside the page layout so emergency access also works on auth/error screens.
function EmergencyCall() {
  const [showHelp, setShowHelp] = useState(false);
  return <div className="emergency-access">
    {showHelp && <div className="emergency-note">
      <button className="icon-button" aria-label="Dismiss calling information" onClick={() => setShowHelp(false)}><X size={16} /></button>
      <p role="status">If your dialler did not open, call 999 from a phone. HerConnect+ has not placed a call or sent your location.</p>
    </div>}
    <a className="sos-float" href="tel:999" aria-label="SOS: call Bangladesh emergency service 999" title="999: police, fire and ambulance. Opens your device’s calling app." onClick={() => setShowHelp(true)}>
      <Phone size={19} aria-hidden="true" /><span>SOS · Call 999</span>
    </a>
  </div>;
}
function Layout() {
  const { user, cart } = useApp(),
    [menu, setMenu] = useState(false),
    navigate = useNavigate(),
    location = useLocation();
  useEffect(() => setMenu(false), [location.pathname]);
  const queryClient = useQueryClient();
  const logout = useAction(
    () => api("/auth/logout", { method: "POST" }),
    () => {
      queryClient.removeQueries({
        predicate: (q) => q.queryKey[0] !== "session",
      });
      queryClient.setQueryData(["session"], { user: null, csrfToken: null });
      navigate("/login");
    },
  );
  const links = [
    ["/dashboard", LayoutDashboard, "My dashboard"],
    ["/marketplace", ShoppingBag, "Marketplace"],
    ["/hiring", HandHeart, "Services & talent"],
    ["/safety", ShieldCheck, "Safety & support"],
    ["/transport", CarFront, "Safe transport"],
    ["/sos", ShieldCheck, "SOS & trusted contacts"],
    ["/profile", UserRound, "My profile"],
    ...(!user?.isAdmin
      ? [
          ["/wishlist", Heart, "Saved favourites"],
          ["/orders", Package, "My orders"],
          ["/seller", Store, "My shop"],
        ]
      : [["/admin", ShieldCheck, "Shop moderation"], ["/admin/hiring", HandHeart, "Worker moderation"], ["/admin/safety", ShieldCheck, "Safety moderation"], ["/admin/transport", CarFront, "Transport moderation"]]),
  ];
  return (
    <div className="app-layout">
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <Logo />
        <button
          className="mobile-close icon-button"
          aria-label="Close menu"
          onClick={() => setMenu(false)}
        >
          <X />
        </button>
        <div className="sidebar-scroll">
        <p className="nav-caption">{user ? "YOUR ACCOUNT" : "EXPLORE HERCONNECT+"}</p>
        <nav aria-label="Main navigation">
          {(user ? links : links.slice(0, 5)).map(([path, Icon, label]) => (
            <NavLink end={path === "/marketplace"} key={path} to={path}>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        {user && <div className="sidebar-note">
          <Flower2 size={25} />
          <h3>
            Manage your shop.
            <br />
            Reach more customers.
          </h3>
          <p>Keep your products and orders up to date.</p>
          <Link to={user?.isAdmin ? "/admin" : "/seller"}>
            {user?.isAdmin ? "Review applications" : "Start your own shop"}
            <ArrowUpRight size={16} />
          </Link>
        </div>
        }
        </div>
        <div className="sidebar-bottom">
          {user ? (
            <>
              <NavLink to="/profile">
                <span className="avatar">{user.name[0]}</span>
                <span>
                  <strong>{user.name}</strong>
                  <small>
                    {user.isAdmin ? "My profile · Moderator" : "My profile & settings"}
                  </small>
                </span>
              </NavLink>

            </>
          ) : (
            <Link className="btn primary" to="/login">
              Sign in to your space
            </Link>
          )}
        </div>
      </aside>
      {menu && (
        <button
          className="menu-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Open menu"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>
          <span className="topbar-label">
            Work, shopping and support for women
          </span>
          <div className="top-actions">
            <span className="location-tag">Made for Bangladesh</span>
            {user && !user.isAdmin && (
              <Link
                className="bag-button"
                to="/cart"
                aria-label={
                  "Shopping bag, " +
                  cart.reduce((s, i) => s + i.quantity, 0) +
                  " items"
                }
              >
                <ShoppingBag size={20} />
                <span>My bag</span>
                <b>{cart.reduce((s, i) => s + i.quantity, 0)}</b>
              </Link>
            )}
            {user && (
              <button
                type="button"
                className="btn small logout-button"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
              >
                <LogOut size={18} />
                {logout.isPending ? "Logging out…" : "Log out"}
              </button>
            )}
            {!user && (
              <>
                <Link to="/login" className="btn small">Sign in</Link>
                <Link to="/signup" className="btn small primary">Join us</Link>
              </>
            )}
          </div>
        </header>
        <main id="main">
          <Outlet />
        </main>
        <footer>
          <span>
            © {new Date().getFullYear()} HerConnect+ · A platform for women
          </span>
          <div>
            <Link to="/help">Help & FAQs</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
export default function App() {
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => api("/auth/me"),
    retry: 1,
  });
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  const notify = (message, type = "success") => setToast({ message, type });
  if (session.isPending)
    return (
      <div className="boot">
        <Flower2 className="spin" />
        <p>Loading HerConnect+…</p>
        <EmergencyCall />
      </div>
    );
  if (session.isError)
    return (
      <div className="boot">
        <h1>Unable to load HerConnect+</h1>
        <p>Please check your connection and try again.</p>
        <button className="btn primary" onClick={() => session.refetch()}>
          Try again
        </button>
        <EmergencyCall />
      </div>
    );
  return (
    <CartProvider
      key={session.data.user?._id || "guest"}
      user={session.data.user}
      notify={notify}
      base={{}}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <ScrollTop />
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
        <Route path="/reset-password" element={<AuthPage mode="reset" />} />
        <Route element={<Layout />}>
          <Route
            index
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />
          <Route path="sos" element={<SOS />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="help" element={<InfoPage type="help" />} />
          <Route path="privacy" element={<InfoPage type="privacy" />} />
          <Route path="terms" element={<InfoPage type="terms" />} />
          <Route element={<Guard />}>
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="transport" element={<TransportHome />} />
          <Route path="transport/drivers/:id" element={<TransportDriverDetail />} />
          <Route path="safety" element={<SafetyFeed />} />
          <Route path="safety/zones" element={<SafetyZones />} />
          <Route path="safety/resources" element={<SafetyResources />} />
          <Route path="safety/reports/:id" element={<SafetyDetail />} />
          <Route path="hiring" element={<HiringDirectory />} />
          <Route path="hiring/workers/:id" element={<WorkerDetail />} />
          <Route path="marketplace/:id" element={<ProductDetail />} />
          <Route path="shops/:id" element={<Shop />} />

            <Route path="safety/new" element={<SafetyNew />} />
            <Route path="safety/mine" element={<SafetyMine />} />
            <Route path="transport/drive" element={<TransportDrive />} />
            <Route path="transport/contact" element={<TransportContact />} />
            <Route path="transport/rides" element={<TransportRides />} />
            <Route path="transport/rides/:id" element={<TransportRideDetail />} />
            <Route path="coming-soon/:module" element={<Navigate to="/dashboard" replace />} />
            <Route path="profile" element={<Profile />} />
            <Route path="hiring/mine" element={<WorkerMine />} />
            <Route path="hiring/bookings" element={<HiringBookings />} />
            <Route path="hiring/bookings/:id" element={<HiringBookingDetail />} />
            <Route path="hiring/complaints" element={<HiringComplaints />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="seller" element={<Seller />} />
            <Route path="seller/products/new" element={<ProductEditor />} />
            <Route
              path="seller/products/:id/edit"
              element={<ProductEditor />}
            />
          </Route>
          <Route element={<Guard admin />}>
            <Route path="admin" element={<Admin />} />
            <Route path="admin/transport" element={<TransportAdmin />} />
            <Route path="admin/safety" element={<SafetyAdmin />} />
            <Route path="admin/hiring" element={<HiringAdmin />} />
          </Route>
          <Route
            path="*"
            element={
              <div className="empty">
                <h1>Page not found</h1>
                <Link className="btn primary" to="/dashboard">
                  Back to dashboard
                </Link>
              </div>
            }
          />
        </Route>
      </Routes>
      <EmergencyCall />
      {toast && (
        <div
          className={"toast " + toast.type}
          role={toast.type === "error" ? "alert" : "status"}
        >
          <span>{toast.message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={17} />
          </button>
        </div>
      )}
    </CartProvider>
  );
}
