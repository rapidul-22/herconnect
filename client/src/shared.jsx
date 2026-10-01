import { createContext, useContext, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Heart,
  Star,
  BadgeCheck,
  ShoppingBag,
  LoaderCircle,
  X,
  ArrowRight,
} from "lucide-react";
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
let csrfToken = null;
export async function api(path, options = {}) {
  const isForm = options.body instanceof FormData;
  const response = await fetch("/api" + path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(!isForm && options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...options.headers,
    },
    body: options.body
      ? isForm
        ? options.body
        : JSON.stringify(options.body)
      : undefined,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The service is temporarily unavailable. Please try again.",
    );
  }
  if (!response.ok) throw new Error(data.error || "Request failed.");
  if (Object.hasOwn(data, "csrfToken")) csrfToken = data.csrfToken;
  return data;
}
export const money = (n) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: n % 100 ? 2 : 0,
  }).format(n / 100);
export const date = (value) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const categories = [
  "Handicrafts",
  "Clothing",
  "Beauty",
  "Home",
  "Food",
  "Other",
];
export const formData = (e) =>
  Object.fromEntries(new FormData(e.currentTarget));
export function useAction(fn, onSuccess, message) {
  const query = useQueryClient(),
    { notify } = useApp();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (data) => {
      await onSuccess?.(data);
      await query.invalidateQueries();
      if (message) notify(message);
    },
    onError: (e) => notify(e.message, "error"),
  });
}
export function Field({ label, hint, as: Tag = "input", ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <Tag {...props} />
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Submit({ pending, children, ...props }) {
  return (
    <button className="btn primary" type="submit" disabled={pending} {...props}>
      {pending ? <LoaderCircle className="spin" size={18} /> : null}
      {pending ? "Please wait…" : children}
    </button>
  );
}
export function QueryState({ query, children }) {
  if (query.isPending)
    return (
      <div className="loading" role="status">
        <LoaderCircle className="spin" />
        Loading…
      </div>
    );
  if (query.isError)
    return (
      <div className="empty" role="alert">
        <h2>We couldn’t load this.</h2>
        <p>{query.error.message}</p>
        <button className="btn" onClick={() => query.refetch()}>
          Try again
        </button>
      </div>
    );
  return children;
}
export function Empty({
  title,
  description,
  to = "/marketplace",
  action = "Explore the marketplace",
}) {
  return (
    <div className="empty">
      <ShoppingBag size={36} />
      <h2>{title}</h2>
      <p>{description}</p>
      {to && (
        <Link className="btn primary" to={to}>
          {action}
          <ArrowRight size={17} />
        </Link>
      )}
    </div>
  );
}
export function Badge({ children = "Approved shop" }) {
  return (
    <span className="verified">
      <BadgeCheck size={15} />
      {children}
    </span>
  );
}
export function Stars({ rating, count }) {
  return (
    <span className="stars">
      <Star size={14} fill="currentColor" />
      {rating ? Number(rating).toFixed(1) : "New"}
      {count !== undefined && <span className="muted">({count})</span>}
    </span>
  );
}
export function PageTitle({ eyebrow, title, description, children }) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function ProductCard({ product: p }) {
  const { user, addToCart } = useApp(),
    navigate = useNavigate();
  const saved = user?.wishlist?.includes(p._id);
  const save = useAction(() => api("/wishlist/" + p._id, { method: "POST" }));
  return (
    <article className="product-card">
      <div className="product-image">
        <Link to={"/marketplace/" + p._id}>
          <img src={p.image} alt={p.name} loading="lazy" />
        </Link>
        <span className="product-category">{p.category}</span>
        {!user?.isAdmin && (
          <button
            className={"heart " + (saved ? "saved" : "")}
            aria-label={(saved ? "Unsave " : "Save ") + p.name}
            aria-pressed={saved || false}
            disabled={save.isPending}
            onClick={() => (user ? save.mutate() : navigate("/login"))}
          >
            <Heart size={18} fill={saved ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      <div className="product-body">
        <div className="product-shop">
          <span>{p.seller?.shop?.name}</span>
          <BadgeCheck size={14} />
        </div>
        <Link className="product-name" to={"/marketplace/" + p._id}>
          {p.name}
        </Link>
        <Stars rating={p.rating} count={p.reviewCount} />
        <div className="product-bottom">
          <strong>{money(p.price)}</strong>
          {!user?.isAdmin && (
            <button
              className="add"
              disabled={!p.stock || user?._id === p.seller?._id}
              onClick={() => addToCart(p)}
              aria-label={"Add " + p.name + " to bag"}
            >
              <ShoppingBag size={16} />
              {p.stock ? "Add" : "Sold out"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
export function ProductGrid({ products }) {
  return products.length ? (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p._id} product={p} />
      ))}
    </div>
  ) : (
    <Empty
      title="Nothing here just yet"
      description="Try another category or a different search."
      to={null}
    />
  );
}
export function CartProvider({ children, user, notify, base }) {
  const key = "herconnect-cart-" + (user?._id || "guest");
  const [cart, setCart] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value)
        ? value.filter(
            (i) => i?._id && Number.isInteger(i.quantity) && i.quantity > 0,
          )
        : [];
    } catch {
      return [];
    }
  });
  const navigate = useNavigate();
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(cart));
  }, [cart, key]);
  const addToCart = (p, quantity = 1) => {
    if (!user)
      return navigate(
        "/login?next=" + encodeURIComponent("/marketplace/" + p._id),
      );
    if (user.isAdmin) return notify("Moderator accounts cannot shop.", "error");
    if (user._id === p.seller._id)
      return notify("You cannot buy your own products.", "error");
    const current = cart.find((i) => i._id === p._id);
    if ((current?.quantity || 0) + quantity > Math.min(p.stock, 50))
      return notify("That quantity is not available.", "error");
    setCart((old) =>
      current
        ? old.map((i) =>
            i._id === p._id ? { ...i, quantity: i.quantity + quantity } : i,
          )
        : [
            ...old,
            {
              _id: p._id,
              name: p.name,
              image: p.image,
              price: p.price,
              stock: p.stock,
              seller: p.seller,
              quantity,
            },
          ],
    );
    notify("Added to your bag.");
  };
  return (
    <AppContext.Provider
      value={{ ...base, user, notify, cart, setCart, addToCart }}
    >
      {children}
    </AppContext.Provider>
  );
}
