import { groupCart, removeOrderedItems } from "./cart.js";
import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  SlidersHorizontal,
  Heart,
  ShoppingBag,
  Truck,
  ShieldCheck,
  BadgeCheck,
  MapPin,
  Minus,
  Plus,
  Trash2,
  Check,
  Package,
  Star,
  CreditCard,
  LockKeyhole,
  Flower2,
} from "lucide-react";
import {
  api,
  useApp,
  useAction,
  money,
  date,
  categories,
  Field,
  Submit,
  QueryState,
  Empty,
  Badge,
  Stars,
  PageTitle,
  ProductGrid,
  formData,
} from "./shared.jsx";
export function Marketplace() {
  const [params, setParams] = useSearchParams(),
    [search, setSearch] = useState(params.get("q") || "");
  const query = useQuery({
    queryKey: ["products", params.toString()],
    queryFn: () => api("/products?" + params.toString()),
  });
  const change = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };
  return (
    <>
      <div className="market-heading">
        <div>
          <div className="eyebrow">THE HERCONNECT+ MARKETPLACE</div>
          <h1>
            Made by her.
            <br className="mobile-only" /> <em>Loved by you.</em>
          </h1>
          <p>Shop clothing, food, homeware and handmade products from women-led businesses.</p>
        </div>
        <Link className="text-link" to="/seller">
          Open your shop
          <ArrowUpRightIcon />
        </Link>
      </div>
      <section className="market-banner">
        <div>
          <span className="eyebrow">HANDMADE COLLECTION</span>
          <h2>
            Made with skill.
            <br />
            Chosen by you.
          </h2>
          <p>
            Browse handmade homeware and gifts
            <br />
            from independent sellers.
          </p>
          <button
            className="btn primary"
            onClick={() => {
              change("category", "Handicrafts");
              document
                .getElementById("catalog")
                .scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Shop handcrafted finds
            <ArrowRight size={17} />
          </button>
        </div>
        <div className="banner-images">
          <img
            className="banner-main"
            src="/images/ceramic.jpg"
            alt="Handcrafted ceramic cup"
          />
          <img
            className="banner-side"
            src="/images/candle.jpg"
            alt="A candle in a glass jar"
          />
          <span className="round-note">
            independent
            <br />
            <em>makers</em>
            <Heart size={18} />
          </span>
        </div>
      </section>
      <div className="trust-row">
        <span>
          <BadgeCheck size={18} />
          Reviewed seller applications
        </span>
        <span>
          <Truck size={18} />
          Cash on delivery
        </span>
        <span>
          <Heart size={18} />A space for women-led shops
        </span>
      </div>
      <section id="catalog" className="catalog">
        <div className="catalog-tools">
          <form
            className="search-box"
            onSubmit={(e) => {
              e.preventDefault();
              change("q", search.trim());
            }}
          >
            <Search size={19} />
            <input
              aria-label="Search products"
              placeholder="Find your next favourite…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={80}
            />
            <button type="submit" aria-label="Search">
              <ArrowRight size={18} />
            </button>
          </form>
          <label className="sort-label">
            Sort by
            <select
              aria-label="Sort products"
              value={params.get("sort") || "newest"}
              onChange={(e) => change("sort", e.target.value)}
            >
              <option value="newest">Newest finds</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </label>
        </div>
        <div className="filter-row">
          <div className="category-tabs">
            {["All finds", ...categories].map((c, i) => (
              <button
                key={c}
                className={
                  (params.get("category") || "All finds") === c ? "active" : ""
                }
                onClick={() => change("category", i ? c : "")}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="price-filter">
            <SlidersHorizontal size={16} />
            <select
              aria-label="Maximum price"
              value={params.get("maxPrice") || ""}
              onChange={(e) => change("maxPrice", e.target.value)}
            >
              <option value="">Any price</option>
              <option value="50000">Under BDT 500</option>
              <option value="100000">Under BDT 1,000</option>
              <option value="200000">Under BDT 2,000</option>
            </select>
          </label>
        </div>
        <div className="catalog-count">
          <span>
            {query.data
              ? `${query.data.total} products`
              : "Finding your favourites…"}
          </span>
          {params.size > 0 && (
            <button
              className="link-button"
              onClick={() => {
                setParams({});
                setSearch("");
              }}
            >
              Clear filters
            </button>
          )}
          <small>Sample listings & reviews are labelled demo.</small>
        </div>
        <QueryState query={query}>
          {query.data && <ProductGrid products={query.data.products} />}
        </QueryState>
        {query.data?.pages > 1 && (
          <div className="pagination">
            <button
              className="btn"
              disabled={query.data.page === 1}
              onClick={() => change("page", String(query.data.page - 1))}
            >
              Previous
            </button>
            <span>
              Page {query.data.page} of {query.data.pages}
            </span>
            <button
              className="btn"
              disabled={query.data.page === query.data.pages}
              onClick={() => change("page", String(query.data.page + 1))}
            >
              Next
            </button>
          </div>
        )}
      </section>
      <section className="seller-invite">
        <div>
          <Flower2 size={30} />
          <h2>Ready to sell your products?</h2>
          <p>Apply for a shop, add your products and manage orders from one place.</p>
        </div>
        <Link className="btn" to="/seller">
          Open your shop
          <ArrowRight size={17} />
        </Link>
      </section>
    </>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={17} style={{ transform: "rotate(-40deg)" }} />;
}
export function ProductDetail() {
  const { id } = useParams(),
    { user, addToCart } = useApp(),
    [quantity, setQuantity] = useState(1),
    navigate = useNavigate();
  const query = useQuery({
    queryKey: ["product", id],
    queryFn: () => api("/products/" + id),
  });
  const save = useAction(() => api("/wishlist/" + id, { method: "POST" }));
  const p = query.data;
  return (
    <QueryState query={query}>
      {p && (
        <>
          <Link className="back-link" to="/marketplace">
            <ArrowLeft size={16} />
            Back to all finds
          </Link>
          <div className="detail-grid">
            <div className="detail-image">
              <img src={p.image} alt={p.name} />
              {p.demoKey && (
                <span className="demo-label">
                  Demo listing · illustrative photo
                </span>
              )}
            </div>
            <div className="detail-copy">
              <div className="eyebrow">{p.category}</div>
              <h1>{p.name}</h1>
              <div className="detail-rating">
                <Stars rating={p.rating} count={p.reviewCount} />
                <a href="#reviews">Read the reviews</a>
              </div>
              <div className="detail-price">{money(p.price)}</div>
              <p className="detail-description">{p.description}</p>
              <Link to={"/shops/" + p.seller._id} className="seller-mini">
                <span className="avatar">{p.seller.shop.name[0]}</span>
                <div>
                  <strong>{p.seller.shop.name}</strong>
                  <span>
                    <MapPin size={13} />
                    {p.seller.shop.city}
                  </span>
                </div>
                <Badge />
              </Link>
              <div className="stock-note">
                {p.stock > 0 ? (
                  <>
                    <span className="stock-dot" />
                    {p.stock < 6 ? `Only ${p.stock} left` : "In stock"} · Ready
                    for your everyday
                  </>
                ) : (
                  "Currently sold out"
                )}
              </div>
              {!user?.isAdmin && (
                <>
                  <div className="purchase-row">
                    <div className="quantity">
                      <button
                        aria-label="Decrease quantity"
                        disabled={quantity <= 1}
                        onClick={() => setQuantity(quantity - 1)}
                      >
                        <Minus size={16} />
                      </button>
                      <span>{quantity}</span>
                      <button
                        aria-label="Increase quantity"
                        disabled={quantity >= Math.min(p.stock, 50)}
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button
                      className="btn primary grow"
                      disabled={!p.stock || user?._id === p.seller._id}
                      onClick={() => addToCart(p, quantity)}
                    >
                      <ShoppingBag size={18} />
                      Add to bag
                    </button>
                    <button
                      className="btn"
                      aria-label="Save product"
                      disabled={save.isPending}
                      onClick={() =>
                        user ? save.mutate() : navigate("/login")
                      }
                    >
                      <Heart
                        size={20}
                        fill={
                          user?.wishlist?.includes(id) ? "currentColor" : "none"
                        }
                      />
                    </button>
                  </div>
                  {user?._id === p.seller._id && (
                    <p className="small-copy">
                      This is your listing. Manage it in My shop.
                    </p>
                  )}
                </>
              )}
              <div className="delivery-note">
                <Truck size={21} />
                <div>
                  <strong>Cash on delivery · BDT 60 per order</strong>
                  <p>
                    One shop per checkout. Delivery is simulated in this
                    prototype.
                  </p>
                </div>
              </div>
              <details open>
                <summary>Materials & details</summary>
                <p>{p.materials}</p>
              </details>
              <details>
                <summary>Care instructions & ingredients</summary>
                <p>{p.care}</p>
              </details>
              <details>
                <summary>Ordering & cancellation</summary>
                <p>
                  Cancel from My orders while pending or confirmed. Shipped
                  items cannot be cancelled. This educational prototype does not
                  dispatch real deliveries.
                </p>
              </details>
            </div>
          </div>
          <section className="reviews-section" id="reviews">
            <div className="section-heading">
              <h2>Words from the community</h2>
              <Stars rating={p.rating} count={p.reviewCount} />
            </div>
            <p className="muted">
              New reviews come from delivered purchases. Seeded examples are
              marked “Demo review”.
            </p>
            <div className="review-grid">
              {p.reviews.map((r) => (
                <article key={r._id} className="review">
                  <div className="review-top">
                    <span className="avatar">{r.name[0]}</span>
                    <div>
                      <strong>{r.name}</strong>
                      <small>{date(r.createdAt)}</small>
                    </div>
                    <Stars rating={r.rating} />
                  </div>
                  <p>{r.comment}</p>
                  <span className={r.isDemo ? "demo-text" : "verified"}>
                    {r.isDemo ? "Demo review" : "Delivered purchase"}
                  </span>
                </article>
              ))}
            </div>
            {!p.reviews.length && (
              <p className="notice">
                The first review could be yours. Reviews open after delivery.
              </p>
            )}
          </section>
        </>
      )}
    </QueryState>
  );
}
export function Wishlist() {
  const query = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => api("/wishlist"),
  });
  return (
    <>
      <PageTitle
        eyebrow="YOUR FAVOURITES"
        title="Saved products"
        description="Products you saved for later."
      />
      <QueryState query={query}>
        {query.data?.length ? (
          <ProductGrid products={query.data} />
        ) : (
          <Empty
            title="Make room for your favourites"
            description="Tap a heart on a product to save it here."
          />
        )}
      </QueryState>
    </>
  );
}
export function Shop() {
  const { id } = useParams(),
    query = useQuery({
      queryKey: ["shop", id],
      queryFn: () => api("/shops/" + id),
    });
  return (
    <QueryState query={query}>
      {query.data && (
        <>
          <div className="shop-heading">
            <div className="shop-avatar">{query.data.seller.shop.name[0]}</div>
            <div>
              <Badge />
              <h1>{query.data.seller.shop.name}</h1>
              <span className="muted">{query.data.seller.shop.city}</span>
              <p>{query.data.seller.shop.story}</p>
            </div>
          </div>
          <div className="section-heading">
            <h2>From this shop</h2>
            <span>{query.data.products.length} finds</span>
          </div>
          <ProductGrid products={query.data.products} />
        </>
      )}
    </QueryState>
  );
}
export function Cart() {
  const { cart, setCart } = useApp();
  const groups = groupCart(cart);
  const update = (id, quantity) =>
    setCart((old) => old.map((i) => (i._id === id ? { ...i, quantity } : i)));
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  return (
    <>
      <PageTitle
        eyebrow="YOUR ORDER"
        title="Your shopping bag."
        description="Review your items and check out separately for each shop."
      />
      {cart.length ? (
        <div className="checkout-grid">
          <div>
            <div className="shop-cart-label">
              <StoreIcon />
              {groups.length} {groups.length === 1 ? "shop" : "shops"} in your bag
              <button className="link-button" onClick={() => setCart([])}>
                Clear bag
              </button>
            </div>
            {groups.map(({ seller, items }) => (
              <section className="cart-shop" key={seller._id} aria-label={seller.shop.name}>
                <h2>{seller.shop.name}</h2>
                {items.map((i) => (
              <article className="cart-item" key={i._id}>
                <Link to={"/marketplace/" + i._id}>
                  <img src={i.image} alt={i.name} />
                </Link>
                <div>
                  <Link to={"/marketplace/" + i._id}>
                    <h3>{i.name}</h3>
                  </Link>
                  <p>{money(i.price)} each</p>
                  <div className="quantity">
                    <button
                      aria-label={"Decrease " + i.name}
                      disabled={i.quantity <= 1}
                      onClick={() => update(i._id, i.quantity - 1)}
                    >
                      <Minus size={14} />
                    </button>
                    <span>{i.quantity}</span>
                    <button
                      aria-label={"Increase " + i.name}
                      disabled={i.quantity >= Math.min(i.stock, 50)}
                      onClick={() => update(i._id, i.quantity + 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div className="cart-item-end">
                  <strong>{money(i.price * i.quantity)}</strong>
                  <button
                    className="icon-button"
                    aria-label={"Remove " + i.name}
                    onClick={() =>
                      setCart((old) => old.filter((p) => p._id !== i._id))
                    }
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
                ))}
                <div className="shop-checkout">
                  <p>
                    Shop total: <strong>{money(items.reduce((sum, i) => sum + i.price * i.quantity, 0) + 6000)}</strong>
                    <small>Includes {money(6000)} delivery</small>
                  </p>
                  <Link className="btn primary" to={"/checkout?shop=" + seller._id}>
                    Checkout {seller.shop.name}<ArrowRight size={18} />
                  </Link>
                </div>
              </section>
            ))}
            <Link className="back-link" to="/marketplace">
              <ArrowLeft size={16} />
              Find something else
            </Link>
          </div>
          <div className="panel summary-card">
            <h2>Order details</h2>
            <div>
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div>
              <span>Delivery ({groups.length} {groups.length === 1 ? "shop" : "shops"})</span>
              <strong>{money(6000 * groups.length)}</strong>
            </div>
            <div className="summary-total">
              <span>Total estimate</span>
              <strong>{money(subtotal + 6000 * groups.length)}</strong>
            </div>
            <p className="small-copy">
              Choose a shop’s checkout button to place its order. Each shop has a separate order and delivery fee. Other items stay in your bag. Prices and stock are checked at checkout.
            </p>
          </div>
        </div>
      ) : (
        <Empty
          title="Your bag is empty"
          description="Browse the marketplace and add a product to get started."
        />
      )}
    </>
  );
}
function StoreIcon() {
  return <ShoppingBag size={19} />;
}
export function Checkout() {
  const { cart } = useApp();
  const [params] = useSearchParams();
  const shopId = params.get("shop") || cart[0]?.seller._id || "";
  return <ShopCheckout key={shopId} shopId={shopId} />;
}
function ShopCheckout({ shopId }) {
  const { user, cart: entireCart, setCart } = useApp(),
    navigate = useNavigate();
  const cart = entireCart.filter((item) => item.seller._id === shopId);
  const [requestKey] = useState(() => crypto.randomUUID());
  const action = useAction(
    (shipping) =>
      api("/orders", {
        method: "POST",
        body: {
          items: cart.map((i) => ({ productId: i._id, quantity: i.quantity })),
          shipping,
          requestKey,
        },
      }),
    (order) => {
      setCart((old) => removeOrderedItems(old, order.items));
      navigate("/orders/" + order._id + "?placed=1");
    },
    "Your order is placed.",
  );
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  return (
    <>
      <PageTitle
        eyebrow="ALMOST YOURS"
        title="The finishing touches."
        description={cart.length ? `Order from ${cart[0].seller.shop.name}. Other shops’ items stay in your bag.` : "Choose a shop from your bag to continue."}
      />
      {cart.length ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            action.mutate(formData(e));
          }}
          className="checkout-grid"
        >
          <div className="panel form-panel">
            <h2>
              <MapPin size={22} />
              Delivery details
            </h2>
            <div className="form-two">
              <Field
                label="Full name"
                name="name"
                defaultValue={user.name}
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
              />
              <Field
                label="Mobile number"
                name="phone"
                defaultValue={user.phone}
                required
                pattern="01[3-9][0-9]{8}"
                autoComplete="tel"
              />
            </div>
            <Field
              as="textarea"
              label="Full address"
              name="address"
              defaultValue={user.address}
              required
              minLength={10}
              maxLength={400}
              rows={3}
              placeholder="House, road, area and any helpful directions"
              autoComplete="street-address"
            />
            <Field
              label="City / district"
              name="city"
              required
              minLength={2}
              maxLength={80}
              placeholder="e.g. Dhaka"
              autoComplete="address-level2"
            />
            <div className="payment-option">
              <CreditCard />
              <div>
                <strong>Cash on delivery</strong>
                <p>
                  No online payment is collected. This prototype records the
                  order but does not arrange a real delivery.
                </p>
              </div>
              <Check />
            </div>
            {action.isError && (
              <p className="form-error" role="alert">
                {action.error.message}
              </p>
            )}
          </div>
          <div className="panel summary-card">
            <h2>{cart[0].seller.shop.name}</h2>
            <Link className="back-link" to="/cart">Back to all bag items</Link>
            {cart.map((i) => (
              <div className="mini-order-item" key={i._id}>
                <img src={i.image} alt="" />
                <span>
                  {i.name}
                  <small>Quantity {i.quantity}</small>
                </span>
                <strong>{money(i.quantity * i.price)}</strong>
              </div>
            ))}
            <div>
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div>
              <span>Delivery</span>
              <strong>BDT 60</strong>
            </div>
            <div className="summary-total">
              <span>Total estimate</span>
              <strong>{money(subtotal + 6000)}</strong>
            </div>
            <Submit pending={action.isPending}>
              Place order
              <ArrowRight size={18} />
            </Submit>
            <span className="small-copy">
              <LockKeyhole size={13} /> Your details are shared only for this
              order.
            </span>
          </div>
        </form>
      ) : (
        <Empty
          title="No items for this shop"
          description="Return to your bag to choose another shop or add more products."
          to="/cart"
          action="Back to my bag"
        />
      )}
    </>
  );
}
export function Orders() {
  const [params, setParams] = useSearchParams(),
    sales = params.get("view") === "sales",
    query = useQuery({
      queryKey: ["orders", sales],
      queryFn: () => api("/orders" + (sales ? "?sales=true" : "")),
    });
  const [status, setStatus] = useState("all"),
    { user } = useApp();
  const filtered = query.data?.filter(
    (o) => status === "all" || o.status === status,
  );
  return (
    <>
      <PageTitle
        eyebrow={sales ? "YOUR SHOP" : "YOUR PURCHASES"}
        title={
          sales
            ? "Every order, a new connection."
            : "My orders"
        }
        description={
          sales
            ? "Keep your customers updated, one step at a time."
            : "Follow each find from your bag to your door."
        }
      />
      <div className="order-controls">
        <div className="category-tabs">
          <button
            className={!sales ? "active" : ""}
            onClick={() => setParams({})}
          >
            My purchases
          </button>
          {user.shop.status !== "none" && (
            <button
              className={sales ? "active" : ""}
              onClick={() => setParams({ view: "sales" })}
            >
              Shop sales
            </button>
          )}
        </div>
        <select
          aria-label="Filter order status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {[
            "all",
            "pending",
            "confirmed",
            "shipped",
            "delivered",
            "cancelled",
          ].map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s}
            </option>
          ))}
        </select>
      </div>
      <QueryState query={query}>
        {filtered?.length ? (
          <div className="order-list">
            {filtered.map((o) => (
              <Link className="order-card" key={o._id} to={"/orders/" + o._id}>
                <div className="order-card-top">
                  <div>
                    <strong>Order #{o._id.slice(-6).toUpperCase()}</strong>
                    <small>
                      {date(o.createdAt)} · {o.seller.shop.name}
                    </small>
                  </div>
                  <span className={"status " + o.status}>{o.status}</span>
                </div>
                <div className="order-card-bottom">
                  <div className="order-thumbs">
                    {o.items.slice(0, 3).map((i) => (
                      <img key={i.product} src={i.image} alt={i.name} />
                    ))}
                  </div>
                  <span>
                    {o.items.reduce((s, i) => s + i.quantity, 0)} item(s)
                  </span>
                  <strong>{money(o.total)}</strong>
                  <ArrowRight size={20} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            title="No orders here yet"
            description={
              sales
                ? "Your next customer could be just around the corner."
                : "Find something you love to start your first order."
            }
          />
        )}
      </QueryState>
    </>
  );
}
export function OrderDetail() {
  const { id } = useParams(),
    { user } = useApp(),
    [params] = useSearchParams(),
    [cancel, setCancel] = useState(false);
  const query = useQuery({
    queryKey: ["order", id],
    queryFn: () => api("/orders/" + id),
  });
  const action = useAction(
    (data) => api("/orders/" + id + "/status", { method: "PATCH", body: data }),
    () => setCancel(false),
    "Order updated.",
  );
  const o = query.data,
    isSeller = o?.seller._id === user._id;
  const next = {
    pending: "confirmed",
    confirmed: "shipped",
    shipped: "delivered",
  }[o?.status];
  return (
    <QueryState query={query}>
      {o && (
        <>
          <Link
            to={isSeller ? "/orders?view=sales" : "/orders"}
            className="back-link"
          >
            <ArrowLeft size={16} />
            Back to orders
          </Link>
          {params.get("placed") && (
            <div className="success-banner">
              <Check />
              Your order is in. Thank you for supporting a small shop.
            </div>
          )}
          <PageTitle
            eyebrow={"ORDER #" + o._id.slice(-6).toUpperCase()}
            title={
              o.status === "cancelled"
                ? "Order cancelled."
                : "Track your order"
            }
            description={
              "Placed " + date(o.createdAt) + " · " + o.seller.shop.name
            }
          >
            <span className={"status " + o.status}>{o.status}</span>
          </PageTitle>
          <div className="checkout-grid">
            <div>
              <div className="panel order-progress">
                {o.history.map((h, i) => (
                  <div key={i}>
                    <span className="step-dot">
                      <Check size={12} />
                    </span>
                    <div>
                      <strong>{h.status}</strong>
                      <small>
                        {date(h.at)}
                        {h.reason ? " · " + h.reason : ""}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
              {o.items.map((i) => (
                <div key={i.product} className="panel order-line">
                  <div className="mini-order-item">
                    <img src={i.image} alt={i.name} />
                    <span>
                      <strong>{i.name}</strong>
                      <small>
                        {money(i.unitPrice)} × {i.quantity}
                      </small>
                    </span>
                    <strong>{money(i.unitPrice * i.quantity)}</strong>
                  </div>
                  {!isSeller &&
                    o.status === "delivered" &&
                    (o.reviewedProducts.includes(i.product) ? (
                      <p className="verified">
                        <Check size={15} />
                        Your review is shared. Thank you!
                      </p>
                    ) : (
                      <ReviewForm orderId={id} productId={i.product} />
                    ))}
                </div>
              ))}
            </div>
            <div className="panel summary-card">
              <h2>Order details</h2>
              <div>
                <span>Subtotal</span>
                <strong>{money(o.subtotal)}</strong>
              </div>
              <div>
                <span>Delivery</span>
                <strong>{money(o.deliveryFee)}</strong>
              </div>
              <div className="summary-total">
                <span>Total · COD</span>
                <strong>{money(o.total)}</strong>
              </div>
              <section className="shipping-details">
                <strong>Delivery to</strong>
                <p>
                  {o.shipping.name}
                  <br />
                  {o.shipping.phone}
                  <br />
                  {o.shipping.address}
                  <br />
                  {o.shipping.city}
                </p>
              </section>
              {isSeller && next && (
                <button
                  className="btn primary"
                  disabled={action.isPending}
                  onClick={() => action.mutate({ status: next })}
                >
                  Mark {next}
                  <ArrowRight size={17} />
                </button>
              )}
              {["pending", "confirmed"].includes(o.status) &&
                (!cancel ? (
                  <button className="btn" onClick={() => setCancel(true)}>
                    Cancel order
                  </button>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      action.mutate({ status: "cancelled", ...formData(e) });
                    }}
                  >
                    <Field
                      label="Reason for cancellation"
                      name="reason"
                      required
                      minLength={3}
                      maxLength={500}
                    />
                    <Submit pending={action.isPending}>
                      Confirm cancellation
                    </Submit>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => setCancel(false)}
                    >
                      Keep order
                    </button>
                  </form>
                ))}
            </div>
          </div>
        </>
      )}
    </QueryState>
  );
}
function ReviewForm({ orderId, productId }) {
  const [open, setOpen] = useState(false);
  const action = useAction(
    (data) =>
      api("/orders/" + orderId + "/reviews", {
        method: "POST",
        body: { ...data, productId, rating: Number(data.rating) },
      }),
    () => setOpen(false),
    "Your review is shared.",
  );
  return open ? (
    <form
      className="review-form"
      onSubmit={(e) => {
        e.preventDefault();
        action.mutate(formData(e));
      }}
    >
      <Field as="select" label="Your rating" name="rating" defaultValue="5">
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {n} star{n === 1 ? "" : "s"}
          </option>
        ))}
      </Field>
      <Field
        as="textarea"
        label="How was your find?"
        name="comment"
        minLength={10}
        maxLength={1000}
        required
        rows={3}
      />
      <Submit pending={action.isPending}>Share review</Submit>
    </form>
  ) : (
    <button className="btn small" onClick={() => setOpen(true)}>
      <Star size={16} />
      Write a review
    </button>
  );
}
