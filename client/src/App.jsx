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
        to={"/login?next=" + encodeURIComponent(loc.pathname)}
      />
    );
  if (admin && !user.isAdmin) return <Navigate replace to="/dashboard" />;
  return <Outlet />;
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
    ["/hiring", HandHeart, "Worker hiring"],
    ["/safety", ShieldCheck, "Safety & support"],
    ["/transport", CarFront, "Safe transport"],
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
        <p className="nav-caption">YOUR EVERYDAY SPACE</p>
        <nav>
          {links.map(([path, Icon, label]) => (
            <NavLink end={path === "/marketplace"} key={path} to={path}>
              <Icon size={19} />
              {label}
              {path === "/marketplace" && <span className="nav-new">NEW</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <Flower2 size={25} />
          <h3>
            Small businesses.
            <br />
            Meaningful beginnings.
          </h3>
          <p>A little support goes a long way.</p>
          <Link to={user?.isAdmin ? "/admin" : "/seller"}>
            {user?.isAdmin ? "Review applications" : "Start your own shop"}
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          {user ? (
            <>
              <NavLink to="/profile">
                <span className="avatar">{user.name[0]}</span>
                <span>
                  <strong>{user.name}</strong>
                  <small>
                    {user.isAdmin ? "Moderator" : "Your personal space"}
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
            A little more connected. A little more you.
          </span>
          <div className="top-actions">
            <span className="location-tag">Made for Bangladesh</span>
            {!user?.isAdmin && (
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
              <Link to="/signup" className="btn small primary">
                Join us
              </Link>
            )}
          </div>
        </header>
        <main id="main">
          <Outlet />
        </main>
        <footer>
          <span>
            © {new Date().getFullYear()} HerConnect+ · Built around her.
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
function Dashboard() {
  const { user } = useApp();
  const products = useQuery({
    queryKey: ["products", "dashboard"],
    queryFn: () => api("/products"),
  });
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: () => api("/orders"),
    enabled: !user.isAdmin,
  });
  const modules = [
    {
      name: "Marketplace",
      desc: "Discover thoughtful finds from women-led shops.",
      icon: ShoppingBag,
      tone: "rose",
      live: true,
      path: "/marketplace",
    },
    {
      name: "Safe transport",
      live: true,
      path: "/transport",
      desc: "A more confident way to get where you need to go.",
      icon: CarFront,
      tone: "lavender",
    },
    {
      name: "Safety & support",
      live: true,
      path: "/safety",
      desc: "A space to report concerns and find help.",
      icon: ShieldCheck,
      tone: "sage",
    },
    {
      name: "Worker hiring",
      desc: "Explore service providers and request help for your home.",
      live: true,
      path: "/hiring",
      icon: HandHeart,
      tone: "peach",
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow="YOUR HERCONNECT+"
        title={`Hello, ${user.name.split(" ")[0]}.`}
        description="Your everyday essentials, brought a little closer."
      />
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">A COMMUNITY THAT GROWS WITH YOU</span>
          <h2>
            Her ideas.
            <br />
            Your next favourite.
          </h2>
          <p>
            Meet independent makers. Find something special.{" "}
            <br />
            Make a difference with your everyday choices.
          </p>
          <Link className="btn primary" to="/marketplace">
            Explore the marketplace
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="hero-photo">
          <img src="/images/ceramic.jpg" alt="Handcrafted ceramic cup" />
          <span className="photo-note">
            Thoughtfully made.
            <br />
            <em>Personally chosen.</em>
          </span>
        </div>
      </section>
      <div className="section-heading">
        <h2>Your world, connected</h2>
        <span>Four services. One space.</span>
      </div>
      <div className="module-grid">
        {modules.map((m, i) => (
          <Link
            key={m.name}
            to={m.live ? m.path : "/coming-soon/" + i}
            className={"module " + m.tone}
          >
            <div className="module-top">
              <span className="module-icon">
                <m.icon size={25} />
              </span>
              <span className={"status " + (m.live ? "approved" : "pending")}>
                {m.live ? "Explore now" : "Coming next"}
              </span>
            </div>
            <h3>{m.name}</h3>
            <p>{m.desc}</p>
            <ArrowUpRight className="module-arrow" size={19} />
          </Link>
        ))}
      </div>
      {!user.isAdmin && (
        <div className="stats-strip">
          <Link to="/orders">
            <Package />
            <span>
              <strong>
                {orders.data?.filter(
                  (o) => !["cancelled", "delivered"].includes(o.status),
                ).length ?? "—"}
              </strong>
              Active orders
            </span>
            <ArrowRight />
          </Link>
          <Link to="/wishlist">
            <Heart />
            <span>
              <strong>{user.wishlist.length}</strong>Saved favourites
            </span>
            <ArrowRight />
          </Link>
          <Link to="/seller">
            <Store />
            <span>
              <strong>
                {user.shop.status === "none"
                  ? "Your next chapter"
                  : user.shop.status}
              </strong>
              {user.shop.status === "none"
                ? "Open your own shop"
                : "Shop application"}
            </span>
            <ArrowRight />
          </Link>
        </div>
      )}
      <div className="section-heading">
        <h2>A few lovely discoveries</h2>
        <Link to="/marketplace">
          View all finds
          <ArrowRight size={17} />
        </Link>
      </div>
      <QueryState query={products}>
        {products.data && (
          <ProductGrid products={products.data.products.slice(0, 4)} />
        )}
      </QueryState>
    </>
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
        <p>Opening your space…</p>
      </div>
    );
  if (session.isError)
    return (
      <div className="boot">
        <h1>Let’s get connected.</h1>
        <p>{session.error.message}</p>
        <p>Start the API and confirm your MongoDB connection.</p>
        <button className="btn primary" onClick={() => session.refetch()}>
          Try again
        </button>
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
                to={session.data.user ? "/dashboard" : "/marketplace"}
                replace
              />
            }
          />
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
          <Route path="help" element={<InfoPage type="help" />} />
          <Route path="privacy" element={<InfoPage type="privacy" />} />
          <Route path="terms" element={<InfoPage type="terms" />} />
          <Route element={<Guard />}>
            <Route path="safety/new" element={<SafetyNew />} />
            <Route path="safety/mine" element={<SafetyMine />} />
            <Route path="transport/drive" element={<TransportDrive />} />
            <Route path="transport/contact" element={<TransportContact />} />
            <Route path="transport/rides" element={<TransportRides />} />
            <Route path="transport/rides/:id" element={<TransportRideDetail />} />
            <Route path="dashboard" element={<Dashboard />} />
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
                <h1>This page wandered off.</h1>
                <Link className="btn primary" to="/dashboard">
                  Back to your space
                </Link>
              </div>
            }
          />
        </Route>
      </Routes>
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
