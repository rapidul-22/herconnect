import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Flower2,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Logo } from "./App.jsx";
import {
  api,
  useApp,
  useAction,
  Field,
  Submit,
  PageTitle,
  formData,
} from "./shared.jsx";
export function AuthPage({ mode }) {
  const { user } = useApp(),
    navigate = useNavigate(),
    [params] = useSearchParams(),
    [show, setShow] = useState(false),
    [message, setMessage] = useState("");
  const query = useQueryClient();
  const labels = {
    login: [
      "Welcome back.",
      "Your space, your people, your possibilities.",
      "Sign in",
    ],
    signup: [
      "A space for you.",
      "Join a community of women making things happen.",
      "Create your account",
    ],
    forgot: [
      "Let’s get you back in.",
      "Enter your email to request a password reset.",
      "Send reset link",
    ],
    reset: [
      "A fresh start.",
      "Choose a new password for your account.",
      "Reset password",
    ],
  };
  const [title, description, button] = labels[mode];
  const action = useAction(
    (data) =>
      api(
        "/auth/" +
          ({ forgot: "forgot-password", reset: "reset-password" }[mode] ||
            mode),
        { method: "POST", body: data },
      ),
    (data) => {
      if (mode === "forgot") {
        setMessage(data.message);
        return;
      }
      if (mode === "reset") {
        navigate("/login");
        return;
      }
      query.removeQueries({ predicate: (q) => q.queryKey[0] !== "session" });
      query.setQueryData(["session"], data);
      const next = params.get("next");
      navigate(
        next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard",
      );
    },
    mode === "reset"
      ? "Password updated. Sign in with your new password."
      : undefined,
  );
  if (user && ["login", "signup"].includes(mode))
    return <Navigate to="/dashboard" replace />;
  function submit(e) {
    e.preventDefault();
    const data = formData(e);
    if (mode === "reset") data.token = params.get("token") || "";
    action.mutate(data);
  }
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <Logo />
        <div>
          <span className="eyebrow">HERCONNECT+</span>
          <h1>
            Good things
            <br />
            begin with
            <br />
            <em>connection.</em>
          </h1>
          <p>
            Find your everyday favourites.
            <br />
            Build something of your own.
            <br />
            Feel a little more connected.
          </p>
        </div>
        <div className="auth-photo">
          <img
            src="/images/ceramic.jpg"
            alt="Handmade pottery with a warm natural finish"
          />
          <span>
            For her ideas.
            <br />
            For her everyday.
          </span>
        </div>
        <small>Made for women. Open to possibilities.</small>
      </section>
      <main id="main" className="auth-form-side">
        <Link to="/marketplace" className="back-link">
          <ArrowLeft size={16} />
          Back to explore
        </Link>
        <div className="auth-form">
          <div className="auth-flower">
            <Flower2 size={29} />
          </div>
          <h2>{title}</h2>
          <p>{description}</p>
          {message ? (
            <div className="notice">
              <Check size={22} />
              <p>{message}</p>
              <Link to="/login">Back to sign in</Link>
            </div>
          ) : (
            <form onSubmit={submit} key={mode}>
              {mode === "signup" && (
                <Field
                  label="Your full name"
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="e.g. Nadia Akter"
                />
              )}
              {mode !== "reset" && (
                <Field
                  label="Email address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
              )}
              {mode === "signup" && (
                <Field
                  label="Mobile number"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  pattern="01[3-9][0-9]{8}"
                  required
                  placeholder="01712345678"
                  hint="An 11-digit Bangladeshi mobile number."
                />
              )}
              {mode !== "forgot" && (
                <div className="password-field">
                  <Field
                    label={mode === "reset" ? "New password" : "Password"}
                    name="password"
                    type={show ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={mode === "login" ? undefined : 10}
                    maxLength={72}
                    required
                    placeholder={
                      mode === "login"
                        ? "Enter your password"
                        : "At least 10 characters"
                    }
                  />
                  <button
                    type="button"
                    className="show-password"
                    aria-label={show ? "Hide password" : "Show password"}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}
              {mode === "login" && (
                <Link className="forgot" to="/forgot-password">
                  Forgot password?
                </Link>
              )}
              {mode === "signup" && (
                <p className="small-copy">
                  By creating an account, you agree to our{" "}
                  <Link to="/terms">terms</Link> and{" "}
                  <Link to="/privacy">privacy notice</Link>.
                </p>
              )}
              {action.isError && (
                <p className="form-error" role="alert">
                  {action.error.message}
                </p>
              )}
              <Submit pending={action.isPending}>
                {button}
                <ArrowRight size={18} />
              </Submit>
            </form>
          )}
          {mode === "login" && (
            <p className="auth-switch">
              New here? <Link to="/signup">Create an account</Link>
            </p>
          )}
          {mode === "signup" && (
            <p className="auth-switch">
              Already part of the community? <Link to="/login">Sign in</Link>
            </p>
          )}
          <div className="auth-trust">
            <ShieldCheck size={16} />
            Your password is protected. Your space is personal.
          </div>
        </div>
        <span className="auth-copyright">
          © {new Date().getFullYear()} HerConnect+
        </span>
      </main>
    </div>
  );
}
export function Profile() {
  const { user } = useApp(),
    navigate = useNavigate();
  const update = useAction(
    (data) => api("/auth/profile", { method: "PATCH", body: data }),
    null,
    "Your profile is updated.",
  );
  const password = useAction(
    (data) => api("/auth/change-password", { method: "POST", body: data }),
    () => navigate("/login"),
    "Password changed. Please sign in again.",
  );
  return (
    <>
      <PageTitle
        eyebrow="YOUR ACCOUNT"
        title="A little about you."
        description="Keep your details up to date for a smoother experience."
      />
      <div className="profile-grid">
        <form
          className="panel form-panel"
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate(formData(e));
          }}
        >
          <h2>Personal details</h2>
          <Field
            label="Full name"
            name="name"
            defaultValue={user.name}
            required
            minLength={2}
            maxLength={80}
          />
          <Field
            label="Email"
            value={user.email}
            readOnly
            hint="Your login email cannot be changed in this release."
          />
          <Field
            label="Mobile number"
            name="phone"
            defaultValue={user.phone}
            pattern="01[3-9][0-9]{8}"
            placeholder="01712345678"
            required
          />
          <Field
            as="textarea"
            rows={3}
            label="Default delivery address"
            name="address"
            defaultValue={user.address}
            maxLength={400}
          />
          <Submit pending={update.isPending}>Save changes</Submit>
        </form>
        <form
          className="panel form-panel"
          onSubmit={(e) => {
            e.preventDefault();
            password.mutate(formData(e));
          }}
        >
          <h2>Password & security</h2>
          <p>Changing your password signs you out of all devices.</p>
          <Field
            label="Current password"
            type="password"
            autoComplete="current-password"
            name="currentPassword"
            required
          />
          <Field
            label="New password"
            type="password"
            autoComplete="new-password"
            name="password"
            required
            minLength={10}
            maxLength={72}
            hint="Use at least 10 characters."
          />
          <Submit pending={password.isPending}>Update password</Submit>
        </form>
      </div>
    </>
  );
}
export function InfoPage({ type }) {
  const content = {
    help: {
      title: "A little help, right here.",
      items: [
        [
          "How do I place an order?",
          "Add products from different shops to your bag. Use each shop’s checkout button to place a separate order with your delivery details. Delivery costs BDT 60 per shop order. Orders use cash on delivery. This course prototype does not dispatch a real courier.",
        ],
        [
          "Can I cancel an order?",
          "Yes, while it is pending or confirmed. Open My orders, select the order and provide a reason. Once shipped, cancellation is unavailable in this release.",
        ],
        [
          "How do I open a shop?",
          "Create an account, open My shop, submit your shop details, and add your products. A moderator must approve your application before products appear publicly.",
        ],
        [
          "Why are some reviews marked Demo?",
          "Sample reviews and sample sellers are fictional records included to demonstrate the marketplace. New reviews require a delivered order.",
        ],
        [
          "Are transport and safety services available?",
          "Not yet. Those modules are planned. HerConnect+ currently provides the marketplace only and does not offer emergency response.",
        ],
        [
          "I forgot my password.",
          "Use Forgot password on the sign-in page. Local development prints the reset link in the API terminal; a configured email service sends it to your inbox.",
        ],
      ],
    },
    privacy: {
      title: "Your privacy matters.",
      items: [
        [
          "Information we store",
          "Your name, email, password hash, mobile number, delivery address, saved products, shop details, orders and reviews. Session tokens are stored hashed.",
        ],
        [
          "Who can see what?",
          "Approved shop details, products and review display names are public. Only you and the seller handling your order can access its delivery details through the app. Moderators review seller applications.",
        ],
        [
          "Images and sample content",
          "Sample product photos are bundled stock images. Seller uploads are stored on the application server. Demo shops and reviews are fictional.",
        ],
        [
          "Cookies and local storage",
          "A required HTTP-only cookie keeps you signed in. Your bag is saved on the current device per account. No advertising trackers are included.",
        ],
        [
          "Deletion and support",
          "This prototype has no self-service account deletion. Ask the project operator for data removal. Do not submit real sensitive identity documents.",
        ],
      ],
    },
    terms: {
      title: "A few clear ground rules.",
      items: [
        [
          "Educational prototype",
          "HerConnect+ Release 1 demonstrates women-focused commerce for a university project. Sample products, seller identities and sample reviews are fictional.",
        ],
        [
          "Purchases and delivery",
          "Prices use Bangladeshi taka. The demonstration checkout adds BDT 60 per order and uses cash on delivery. No online payment or automatic courier booking occurs.",
        ],
        [
          "Fair participation",
          "Do not impersonate sellers, submit misleading listings, misuse other members’ information or manipulate reviews. Moderator approval indicates application review, not a guarantee of product quality.",
        ],
        [
          "Reviews and cancellations",
          "You may review an item after your order is delivered. Only pending and confirmed orders may be cancelled; supply an accurate reason.",
        ],
        [
          "Other services",
          "Safe transport, safety reporting and domestic worker hiring are not available in this release.",
        ],
      ],
    },
  }[type];
  return (
    <>
      <PageTitle eyebrow="HERCONNECT+" title={content.title} />
      <div className="prose panel">
        {content.items.map(([title, body]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </section>
        ))}
      </div>
    </>
  );
}
