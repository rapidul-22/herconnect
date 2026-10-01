import { useRef, useState, useEffect } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  ArrowRight,
  Store,
  Package,
  Check,
  Clock3,
  Upload,
  Pencil,
  Archive,
  X,
  ShieldCheck,
  Flower2,
} from "lucide-react";
import {
  api,
  useApp,
  useAction,
  PageTitle,
  QueryState,
  Empty,
  Field,
  Submit,
  money,
  date,
  categories,
  formData,
} from "./shared.jsx";
export function Seller() {
  const { user } = useApp(),
    status = user.shop.status;
  const products = useQuery({
    queryKey: ["seller-products"],
    queryFn: () => api("/seller/products"),
    enabled:
      ["pending", "approved", "rejected"].includes(status) && !user.isAdmin,
  });
  const application = useAction(
    (data) => api("/seller/apply", { method: "POST", body: data }),
    null,
    "Application submitted. You can now add draft products.",
  );
  const [archiving, setArchiving] = useState(null);
  const archive = useAction(
    (id) => api("/seller/products/" + id, { method: "DELETE" }),
    () => setArchiving(null),
    "Product archived.",
  );
  if (user.isAdmin) return <Navigate to="/admin" />;
  return (
    <>
      <PageTitle
        eyebrow="MADE BY YOU"
        title={status === "none" ? "Open your shop" : user.shop.name}
        description={
          status === "none"
            ? "Add your shop details and submit an application to start selling."
            : "Manage products, stock and customer orders."
        }
      >
        {status !== "none" && (
          <span className={"status " + status}>{status}</span>
        )}
      </PageTitle>
      {(status === "none" || status === "rejected") && (
        <div className="seller-application">
          <div className="seller-story">
            <Flower2 size={40} />
            <h2>
              Introduce your shop.
              <br />
              List your products.
            </h2>
            <p>
              Submit your shop details for review. Once a moderator approves your
              application, customers can browse your products.
            </p>
            <ul>
              <li>
                <Check size={18} />
                One account for shopping and selling
              </li>
              <li>
                <Check size={18} />
                Your own product and order workspace
              </li>
              <li>
                <Check size={18} />A clear review before you go public
              </li>
            </ul>
          </div>
          <form
            className="panel form-panel"
            onSubmit={(e) => {
              e.preventDefault();
              application.mutate(formData(e));
            }}
          >
            <h2>
              {status === "rejected"
                ? "Update your application"
                : "Let’s meet your shop"}
            </h2>
            {status === "rejected" && (
              <p className="notice">Moderator note: {user.shop.reason}</p>
            )}
            <Field
              label="Shop name"
              name="name"
              defaultValue={user.shop.name}
              required
              minLength={3}
              maxLength={80}
              placeholder="e.g. Mati & Me"
            />
            <Field
              label="City / district"
              name="city"
              defaultValue={user.shop.city}
              required
              minLength={2}
              maxLength={80}
              placeholder="e.g. Dhaka"
            />
            <Field
              as="textarea"
              label="Your story"
              name="story"
              defaultValue={user.shop.story}
              rows={4}
              required
              minLength={30}
              maxLength={1000}
              placeholder="What do you make? What makes your shop personal?"
            />
            <p className="small-copy">
              HerConnect+ is designed to support women entrepreneurs. Share
              accurate shop details. No identity document is required for this
              prototype.
            </p>
            <Submit pending={application.isPending}>
              Send application
              <ArrowRight size={17} />
            </Submit>
          </form>
        </div>
      )}
      {status === "pending" && (
        <div className="notice">
          <Clock3 size={20} />
          <div>
            <strong>Your application is being reviewed.</strong>
            <p>
              You can add draft products now. They become public after approval.
            </p>
          </div>
        </div>
      )}
      {status === "suspended" && (
        <div className="notice">
          <ShieldCheck />
          <div>
            <strong>Your shop is temporarily restricted.</strong>
            <p>{user.shop.reason}</p>
            <p>
              Existing orders remain accessible. Contact your project moderator
              for review.
            </p>
          </div>
        </div>
      )}
      {status !== "none" && (
        <>
          <div className="seller-actions">
            <Link className="btn" to="/orders?view=sales">
              <Package size={18} />
              Manage sales
            </Link>
            {["pending", "approved", "rejected"].includes(status) && (
              <Link className="btn primary" to="/seller/products/new">
                <Plus size={18} />
                Add a product
              </Link>
            )}
            {status === "approved" && (
              <Link className="text-link" to={"/shops/" + user._id}>
                Visit your shop
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
          {status !== "suspended" && (
            <QueryState query={products}>
              {products.data?.length ? (
                <div className="inventory-grid">
                  {products.data.map((p) => (
                    <article className="inventory-card" key={p._id}>
                      <img src={p.image} alt={p.name} />
                      <div>
                        <span
                          className={
                            "status " + (p.active ? "approved" : "cancelled")
                          }
                        >
                          {p.active
                            ? status === "approved"
                              ? "Public"
                              : "Draft"
                            : "Archived"}
                        </span>
                        <h3>{p.name}</h3>
                        <p>
                          {money(p.price)} · {p.stock} in stock
                        </p>
                        <div className="inventory-actions">
                          <Link
                            className="btn small"
                            to={"/seller/products/" + p._id + "/edit"}
                          >
                            <Pencil size={15} />
                            Edit
                          </Link>
                          {p.active && (
                            <button
                              className="btn small"
                              onClick={() => setArchiving(p)}
                            >
                              <Archive size={15} />
                              Archive
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  title="Your first product starts here"
                  description="Add a photograph and the details that make your product special."
                  to="/seller/products/new"
                  action="Add your first product"
                />
              )}
            </QueryState>
          )}
        </>
      )}
      <Confirm
        open={!!archiving}
        title="Archive this product?"
        onClose={() => setArchiving(null)}
      >
        <p>
          {archiving?.name} will disappear from public browsing. Existing orders
          stay intact. You can reactivate it from Edit.
        </p>
        <button
          className="btn primary"
          disabled={archive.isPending}
          onClick={() => archive.mutate(archiving._id)}
        >
          Archive product
        </button>
      </Confirm>
    </>
  );
}
export function Confirm({ open, title, onClose, children }) {
  const ref = useRef(null);
  // Native dialog handles keyboard focus, Escape and the modal backdrop without a custom focus trap.
  useEffect(() => {
    if (open && !ref.current.open) ref.current.showModal();
    if (!open && ref.current.open) ref.current.close();
  }, [open]);
  return (
    <dialog ref={ref} onCancel={onClose}>
      <div className="dialog-title">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ProductEditor() {
  const { id } = useParams(),
    { user } = useApp(),
    navigate = useNavigate();
  const query = useQuery({
    queryKey: ["seller-products"],
    queryFn: () => api("/seller/products"),
    enabled: !!id,
  });
  if (
    !["pending", "approved", "rejected"].includes(user.shop.status) ||
    user.isAdmin
  )
    return <Navigate to="/seller" />;
  if (id)
    return (
      <QueryState query={query}>
        {query.data &&
          (query.data.find((p) => p._id === id) ? (
            <ProductForm
              key={id}
              product={query.data.find((p) => p._id === id)}
            />
          ) : (
            <Empty
              title="Product not found"
              description="This listing is unavailable or belongs to another shop."
              to="/seller"
              action="Back to my shop"
            />
          ))}
      </QueryState>
    );
  return <ProductForm />;
}
function ProductForm({ product }) {
  const [image, setImage] = useState(product?.image || ""),
    navigate = useNavigate();
  const upload = useAction(
    (file) => {
      const data = new FormData();
      data.append("image", file);
      return api("/seller/uploads", { method: "POST", body: data });
    },
    (data) => setImage(data.image),
    "Photo uploaded.",
  );
  const action = useAction(
    (data) =>
      api("/seller/products" + (product ? "/" + product._id : ""), {
        method: product ? "PATCH" : "POST",
        body: {
          ...data,
          image,
          price: Math.round(Number(data.price) * 100),
          active: data.active === "on",
          ...(product
            ? { stockDelta: Number(data.stockDelta) }
            : { stock: Number(data.stock) }),
        },
      }),
    () => navigate("/seller"),
    "Product saved.",
  );
  return (
    <>
      <PageTitle
        eyebrow="YOUR SHOP"
        title={product ? "Edit product" : "Add a product"}
        description={
          product
            ? "Update the details and keep your inventory current."
            : "Add clear photos, an accurate description, price and stock quantity."
        }
      />
      <form
        className="product-form"
        onSubmit={(e) => {
          e.preventDefault();
          action.mutate(formData(e));
        }}
      >
        <div className="panel upload-panel">
          {image ? (
            <img className="upload-preview" src={image} alt="Product preview" />
          ) : (
            <div className="upload-empty">
              <Upload size={40} />
              <h3>A picture tells your story.</h3>
              <p>JPEG, PNG or WebP · up to 5 MB</p>
            </div>
          )}
          <Field
            label={upload.isPending ? "Uploading…" : "Upload product photo"}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={upload.isPending}
            onChange={(e) =>
              e.target.files[0] && upload.mutate(e.target.files[0])
            }
          />
          <p className="small-copy">
            Use a clear photo you own or have permission to use. Your image is
            resized for the shop.
          </p>
        </div>
        <div className="panel form-panel">
          <Field
            label="Product name"
            name="name"
            defaultValue={product?.name}
            minLength={3}
            maxLength={120}
            required
            placeholder="e.g. Everyday stoneware mug"
          />
          <div className="form-two">
            <Field
              as="select"
              label="Category"
              name="category"
              defaultValue={product?.category || "Handicrafts"}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Field>
            <Field
              label="Price (BDT)"
              type="number"
              name="price"
              defaultValue={product ? product.price / 100 : ""}
              min="1"
              max="1000000"
              step="0.01"
              required
            />
          </div>
          <Field
            label={
              product
                ? `Adjust stock (currently ${product.stock})`
                : "Starting stock"
            }
            name={product ? "stockDelta" : "stock"}
            type="number"
            defaultValue={product ? 0 : 10}
            min={product ? -100000 : 0}
            max={100000}
            required
            hint={
              product
                ? "Enter +5 to add five, or -2 to remove two. Leave 0 to keep current stock."
                : "Number of pieces ready to sell."
            }
          />
          <Field
            as="textarea"
            label="Description"
            name="description"
            defaultValue={product?.description}
            rows={4}
            required
            minLength={20}
            maxLength={3000}
          />
          <Field
            label="Materials & dimensions"
            name="materials"
            defaultValue={product?.materials}
            required
            minLength={2}
            maxLength={300}
          />
          <Field
            as="textarea"
            label="Care instructions / ingredients"
            name="care"
            defaultValue={product?.care}
            rows={2}
            required
            minLength={2}
            maxLength={500}
          />
          <label className="checkbox">
            <input
              name="active"
              type="checkbox"
              defaultChecked={product ? product.active : true}
            />
            Keep this product active after shop approval
          </label>
          {action.isError && (
            <p className="form-error">{action.error.message}</p>
          )}
          <div className="form-actions">
            <Link className="btn" to="/seller">
              Cancel
            </Link>
            <Submit
              pending={action.isPending || upload.isPending}
              disabled={!image || action.isPending || upload.isPending}
            >
              Save product
            </Submit>
          </div>
        </div>
      </form>
    </>
  );
}
export function Admin() {
  const [tab, setTab] = useState("sellers"),
    [decision, setDecision] = useState(null);
  const query = useQuery({
    queryKey: ["admin", tab],
    queryFn: () => api("/admin/" + tab),
  });
  const action = useAction(
    (data) =>
      api(
        "/admin/" +
          (decision.type === "product" ? "products/" : "sellers/") +
          decision.id,
        {
          method: decision.type === "product" ? "DELETE" : "PATCH",
          body: decision.type === "product" ? { reason: data.reason } : data,
        },
      ),
    () => setDecision(null),
    "Moderation decision saved.",
  );
  return (
    <>
      <PageTitle
        eyebrow="MODERATION"
        title="Shop moderation"
        description="Review shop applications, manage listings and keep a record of decisions."
      />
      <div className="category-tabs admin-tabs">
        {[
          ["sellers", "Shop applications"],
          ["products", "Product moderation"],
          ["audits", "Decision history"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <QueryState query={query}>
        {query.data?.length ? (
          <div className="moderation-list">
            {query.data.map((r) =>
              tab === "sellers" ? (
                <article className="panel moderation-card" key={r._id}>
                  <div>
                    <div className="row">
                      <h2>{r.shop.name}</h2>
                      <span className={"status " + r.shop.status}>
                        {r.shop.status}
                      </span>
                    </div>
                    <p>
                      {r.name} · {r.email} · {r.shop.city}
                    </p>
                    <p>{r.shop.story}</p>
                    {r.shop.reason && (
                      <small>Last decision: {r.shop.reason}</small>
                    )}
                  </div>
                  <button
                    className="btn primary"
                    onClick={() =>
                      setDecision({
                        id: r._id,
                        type: "seller",
                        name: r.shop.name,
                        status: r.shop.status,
                      })
                    }
                  >
                    Review
                    <ArrowRight size={17} />
                  </button>
                </article>
              ) : tab === "products" ? (
                <article className="panel moderation-product" key={r._id}>
                  <img src={r.image} alt={r.name} />
                  <div>
                    <h3>{r.name}</h3>
                    <p>
                      {r.seller?.shop?.name} · {money(r.price)}
                    </p>
                    <span
                      className={
                        "status " + (r.active ? "approved" : "cancelled")
                      }
                    >
                      {r.active ? "Active" : "Archived"}
                    </span>
                  </div>
                  {r.active && (
                    <button
                      className="btn"
                      onClick={() =>
                        setDecision({
                          id: r._id,
                          type: "product",
                          name: r.name,
                        })
                      }
                    >
                      Archive
                    </button>
                  )}
                </article>
              ) : (
                <article className="panel" key={r._id}>
                  <div className="row">
                    <h3>{r.action}</h3>
                    <small>{date(r.createdAt)}</small>
                  </div>
                  <p>
                    {r.seller?.shop?.name || r.product?.name} · {r.admin?.name}
                  </p>
                  <p>{r.reason}</p>
                </article>
              ),
            )}
          </div>
        ) : (
          <Empty
            title="All clear for now"
            description="New applications and decisions will appear here."
            to={null}
          />
        )}
      </QueryState>
      <Confirm
        open={!!decision}
        title={decision?.name || "Review"}
        onClose={() => setDecision(null)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            action.mutate(formData(e));
          }}
        >
          {decision?.type === "seller" && (
            <Field as="select" label="Decision" name="status" key={decision.id}>
              {(
                {
                  pending: ["approved", "rejected"],
                  approved: ["suspended"],
                  suspended: ["approved"],
                  rejected: ["approved"],
                }[decision.status] || []
              ).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Field>
          )}
          <Field
            as="textarea"
            label="Reason for this decision"
            name="reason"
            required
            minLength={3}
            maxLength={500}
            rows={3}
          />
          <Submit pending={action.isPending}>Save decision</Submit>
        </form>
      </Confirm>
    </>
  );
}
