import { useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  HandHeart,
  ArrowRight,
  MapPin,
  Clock,
  CalendarDays,
  ShieldCheck,
  Search,
  Check,
  BriefcaseBusiness,
} from "lucide-react";
import {
  api,
  useApp,
  useAction,
  money,
  date,
  Field,
  Submit,
  QueryState,
  Empty,
  PageTitle,
  Stars,
  formData,
} from "./shared.jsx";
import "./hiring.css";
const skills = [
  "Cleaning",
  "Cooking",
  "Childcare",
  "Elderly Care",
  "Gardening",
  "Driving",
  "Other",
];
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const minutes = (v) =>
  String(Math.floor(v / 60)).padStart(2, "0") +
  ":" +
  String(v % 60).padStart(2, "0");
const at = (value) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
const initials = (name) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("");
const query = (key, path) => ({
  queryKey: ["hiring", ...key],
  queryFn: () => api("/hiring" + path),
});
function HiringNav() {
  const { user } = useApp();
  return (
    <nav className="hiring-nav" aria-label="Hiring navigation">
      <Link to="/hiring">Find help</Link>
      {user && !user.isAdmin && (
        <>
          <Link to="/hiring/bookings">My bookings</Link>
          <Link to="/hiring/mine">Offer services</Link>
          <Link to="/hiring/complaints">My complaints</Link>
        </>
      )}
      {user?.isAdmin && <Link to="/admin/hiring">Worker moderation</Link>}
    </nav>
  );
}
function Approval() {
  return (
    <span className="verified">
      <ShieldCheck size={15} />
      Application approved
    </span>
  );
}
function WorkerCard({ p }) {
  return (
    <article className="worker-card">
      <div className="worker-card-cover">
        <span className="worker-avatar">{initials(p.displayName)}</span>
        <span className={"status " + (p.available ? "approved" : "pending")}>
          {p.available ? "Taking requests" : "Currently unavailable"}
        </span>
      </div>
      <div className="worker-card-body">
        <Approval />
        {p.isDemo && (
          <small className="hiring-demo-label">Fictional demo profile</small>
        )}
        <Link to={"/hiring/workers/" + p._id}>
          <h2>{p.displayName}</h2>
        </Link>
        <p className="worker-area">
          <MapPin size={15} />
          {p.serviceArea}
        </p>
        <div className="worker-skills">
          {p.skills.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <p className="worker-bio">{p.bio}</p>
        <Stars rating={p.rating} count={p.reviewCount} />
        <div className="worker-card-bottom">
          <div>
            <strong>{money(p.hourlyRate)}</strong>
            <small>per hour · {p.experienceYears} years experience</small>
          </div>
          <Link
            className="btn small"
            to={"/hiring/workers/" + p._id}
            aria-label={"View " + p.displayName}
          >
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function HiringDirectory() {
  const [params, setParams] = useSearchParams();
  const result = useQuery(
    query(["directory", params.toString()], "/workers?" + params),
  );
  const search = (e) => {
    e.preventDefault();
    const data = formData(e);
    setParams(
      Object.fromEntries(Object.entries(data).filter(([, v]) => v !== "")),
    );
  };
  return (
    <>
      <HiringNav />
      <section className="hiring-hero">
        <div>
          <span className="eyebrow">A LITTLE HELP. MORE ROOM FOR LIFE.</span>
          <h1>
            Good help starts
            <br />
            with a connection.
          </h1>
          <p>
            Find home-service providers, explore their experience and request a
            time that works for you.
          </p>
          <div className="hiring-hero-points">
            <span>
              <CalendarDays size={17} />
              Choose your time
            </span>
            <span>
              <HandHeart size={17} />
              Connect directly
            </span>
          </div>
        </div>
        <div className="hiring-hero-art" aria-hidden="true">
          <HandHeart size={90} />
          <span>
            A helping hand,
            <br />
            <em>closer to home.</em>
          </span>
        </div>
      </section>
      <form
        className="hiring-filters panel"
        onSubmit={search}
        key={params.toString()}
      >
        <Field
          label="Name or service area"
          name="q"
          defaultValue={params.get("q") || ""}
          placeholder="e.g. Dhanmondi"
        />
        <Field
          label="Service"
          name="skill"
          as="select"
          defaultValue={params.get("skill") || ""}
        >
          <option value="">All services</option>
          {skills.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Field>
        <Field
          label="Availability"
          name="available"
          as="select"
          defaultValue={params.get("available") || ""}
        >
          <option value="">All approved profiles</option>
          <option value="true">Taking requests</option>
        </Field>
        <Field
          label="Maximum hourly rate"
          name="maxRate"
          as="select"
          defaultValue={params.get("maxRate") || ""}
        >
          <option value="">Any rate</option>
          <option value="20000">BDT 200</option>
          <option value="40000">BDT 400</option>
          <option value="60000">BDT 600</option>
        </Field>
        <Field
          label="Sort"
          name="sort"
          as="select"
          defaultValue={params.get("sort") || "newest"}
        >
          <option value="newest">Recently added</option>
          <option value="price-low">Lowest rate</option>
          <option value="experience">Most experience</option>
        </Field>
        <button className="btn primary" type="submit">
          <Search size={18} />
          Find help
        </button>
      </form>
      <div className="section-heading">
        <h2>{result.data?.total ?? "…"} profiles to explore</h2>
        <button className="link-button" onClick={() => setParams({})}>
          Clear filters
        </button>
      </div>
      <QueryState query={result}>
        {result.data?.workers.length ? (
          <div className="worker-grid">
            {result.data.workers.map((p) => (
              <WorkerCard key={p._id} p={p} />
            ))}
          </div>
        ) : (
          <Empty
            title="No matching profiles"
            description="Try another service or area, or clear your filters."
            to={null}
          />
        )}
      </QueryState>
      {result.data?.pages > 1 && (
        <div className="hiring-pagination">
          <button
            className="btn"
            disabled={result.data.page <= 1}
            onClick={() =>
              setParams({
                ...Object.fromEntries(params),
                page: result.data.page - 1,
              })
            }
          >
            Previous
          </button>
          <span>
            Page {result.data.page} of {result.data.pages}
          </span>
          <button
            className="btn"
            disabled={result.data.page >= result.data.pages}
            onClick={() =>
              setParams({
                ...Object.fromEntries(params),
                page: result.data.page + 1,
              })
            }
          >
            Next
          </button>
        </div>
      )}
      <div className="hiring-disclosure">
        <ShieldCheck />
        <p>
          <strong>Clear expectations, informed choices.</strong> Application
          approval is a profile review, not identity or background verification.
          Discuss the work before accepting. Demo profiles are fictional.
        </p>
      </div>
    </>
  );
}
export function WorkerDetail() {
  const { id } = useParams();
  const result = useQuery(query(["worker", id], "/workers/" + id));
  return (
    <>
      <HiringNav />
      <QueryState query={result}>
        {result.data && <WorkerDetailBody p={result.data} />}
      </QueryState>
    </>
  );
}
function WorkerDetailBody({ p }) {
  const { user } = useApp(),
    navigate = useNavigate();
  const [requestKey] = useState(() => crypto.randomUUID());
  const action = useAction(
    (data) =>
      api("/hiring/bookings", {
        method: "POST",
        body: { ...data, profileId: p._id, requestKey },
      }),
    (b) => navigate("/hiring/bookings/" + b._id),
    "Booking request sent. The worker must accept before the time is reserved.",
  );
  const [start, setStart] = useState(""),
    [end, setEnd] = useState("");
  const hours =
    (new Date(end + ":00+06:00") - new Date(start + ":00+06:00")) / 3600000;
  return (
    <>
      <div className="worker-detail-head">
        <span className="worker-avatar large">{initials(p.displayName)}</span>
        <div>
          <Approval />
          <h1>{p.displayName}</h1>
          <p>
            <MapPin size={16} />
            {p.serviceArea} · {p.experienceYears} years experience
          </p>
          <Stars rating={p.rating} count={p.reviewCount} />
          {p.isDemo && (
            <p className="hiring-demo-label">
              Fictional demo profile and sample feedback
            </p>
          )}
        </div>
      </div>
      <div className="checkout-grid">
        <div>
          <section className="panel hiring-section">
            <h2>A little about my work</h2>
            <p>{p.bio}</p>
            <div className="worker-skills">
              {p.skills.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
            <h3>Usual availability</h3>
            <p>
              {p.weekdays.map((d) => days[d]).join(", ")} ·{" "}
              {minutes(p.dayStart)}–{minutes(p.dayEnd)}
            </p>
            <p>
              All times are Bangladesh time (UTC+06:00).{" "}
              {p.available
                ? "Taking requests."
                : "Not taking requests right now."}
            </p>
            <p className="small-copy">
              Requests do not reserve a slot. The worker checks availability
              when accepting.
            </p>
          </section>
          <section className="panel hiring-section">
            <h2>Feedback from completed bookings</h2>
            {p.reviews.length ? (
              p.reviews.map((r) => (
                <article className="worker-review" key={r._id}>
                  <Stars rating={r.rating} />
                  <p>{r.comment || "A rating was shared."}</p>
                  <small>
                    {date(r.createdAt)} ·{" "}
                    {r.isDemo ? "Demo review" : "Completed booking"}
                  </small>
                </article>
              ))
            ) : (
              <p>
                No reviews yet. Feedback becomes available after a completed
                booking.
              </p>
            )}
          </section>
        </div>
        <form
          className="panel hiring-book-form"
          onSubmit={(e) => {
            e.preventDefault();
            action.mutate(formData(e));
          }}
        >
          <h2>Request a booking</h2>
          <p>
            <strong>{money(p.hourlyRate)}</strong> per hour · Pay directly
          </p>
          <Field label="Service" name="service" as="select">
            {p.skills.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Field>
          <Field
            label="Start (Bangladesh time)"
            name="start"
            type="datetime-local"
            step="1800"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <Field
            label="End (Bangladesh time)"
            name="end"
            type="datetime-local"
            step="1800"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
          <p className="small-copy">
            1–8 hours, same date, in 30-minute steps, within the next 90 days.
          </p>
          <Field
            label="Home address"
            name="address"
            as="textarea"
            required
            minLength={10}
            maxLength={400}
            defaultValue={user?.address || ""}
          />
          <Field
            label="Mobile number"
            name="phone"
            required
            pattern="01[3-9][0-9]{8}"
            defaultValue={user?.phone || ""}
          />
          <Field
            label="Work notes (optional)"
            name="notes"
            as="textarea"
            maxLength={800}
          />
          <p className="hiring-estimate">
            Estimated total{" "}
            <strong>
              {hours >= 1 && hours <= 8
                ? money(Math.round(hours * p.hourlyRate))
                : "Choose times"}
            </strong>
          </p>
          <p className="small-copy">
            The server confirms the quote. Your address and phone are shown to
            the worker only after acceptance. No payment is collected here.
          </p>
          {action.isError && (
            <p role="alert" className="form-error">
              {action.error.message}
            </p>
          )}
          {!user ? (
            <Link
              className="btn primary"
              to={
                "/login?next=" + encodeURIComponent("/hiring/workers/" + p._id)
              }
            >
              Sign in to request
            </Link>
          ) : user.isAdmin ? (
            <p>Moderator accounts cannot book services.</p>
          ) : (
            <Submit
              pending={action.isPending}
              disabled={!p.available || action.isPending}
            >
              Send booking request
              <ArrowRight size={17} />
            </Submit>
          )}
        </form>
      </div>
    </>
  );
}
export function WorkerMine() {
  const { user } = useApp();
  const result = useQuery({
    ...query(["mine"], "/mine"),
    select: (data) => data.profile,
    enabled: !user.isAdmin,
  });
  const toggle = useAction(
    (available) =>
      api("/hiring/mine/availability", {
        method: "PATCH",
        body: { available },
      }),
    null,
    "Availability updated.",
  );
  if (user.isAdmin) return <Navigate to="/admin/hiring" replace />;
  return (
    <>
      <HiringNav />
      <PageTitle
        eyebrow="YOUR SKILLS, YOUR SCHEDULE"
        title="Make room for your next opportunity."
        description="Create a worker profile. Approval is separate from any shop you own."
      />
      <Link className="btn" to="/hiring/bookings?view=worker">
        <BriefcaseBusiness size={18} />
        Manage incoming bookings
      </Link>
      <QueryState query={result}>
        {result.data && (
          <div className="panel hiring-section">
            <div className="row">
              <h2>Application status</h2>
              <span className={"status " + result.data.status}>
                {result.data.status}
              </span>
            </div>
            <p>
              {result.data.reason ||
                "The moderator reviews your submitted profile before it appears publicly."}
            </p>
            {result.data.status !== "suspended" && (
              <button
                className="btn"
                disabled={toggle.isPending}
                onClick={() => toggle.mutate(!result.data.available)}
              >
                {result.data.available
                  ? "Pause new requests"
                  : "Resume new requests"}
              </button>
            )}
          </div>
        )}
        {result.data?.status === "suspended" ? (
          <p>
            Your profile is suspended. Existing bookings remain manageable;
            contact the moderator about this decision.
          </p>
        ) : (
          <WorkerForm
            key={result.data?.updatedAt || "new"}
            profile={result.data}
            user={user}
          />
        )}
      </QueryState>
    </>
  );
}
function WorkerForm({ profile: p, user }) {
  const action = useAction(
    (data) => api("/hiring/mine", { method: "PUT", body: data }),
    null,
    "Profile submitted for review.",
  );
  return (
    <form
      className="panel hiring-profile-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget),
          d = Object.fromEntries(f);
        action.mutate({
          displayName: d.displayName,
          bio: d.bio,
          serviceArea: d.serviceArea,
          experienceYears: Number(d.experienceYears),
          hourlyRate: Math.round(Number(d.rate) * 100),
          skills: f.getAll("skills"),
          weekdays: f.getAll("weekdays").map(Number),
          dayStart: Number(d.dayStart),
          dayEnd: Number(d.dayEnd),
          available: d.available === "on",
        });
      }}
    >
      <h2>
        {p ? "Update your worker profile" : "Tell people about your work"}
      </h2>
      <p>
        Saving profile changes sends the application for review again. Use the
        separate pause/resume button to change availability without
        resubmitting.
      </p>
      <div className="form-two">
        <Field
          label="Public display name"
          name="displayName"
          defaultValue={p?.displayName || user.name}
          required
          minLength={2}
          maxLength={80}
        />
        <Field
          label="Service area"
          name="serviceArea"
          defaultValue={p?.serviceArea}
          placeholder="e.g. Dhanmondi, Dhaka"
          required
          minLength={2}
          maxLength={120}
        />
        <Field
          label="Years of experience"
          name="experienceYears"
          type="number"
          defaultValue={p?.experienceYears || 0}
          min="0"
          max="60"
          required
        />
        <Field
          label="Hourly rate (BDT)"
          name="rate"
          type="number"
          step="0.01"
          defaultValue={p ? p.hourlyRate / 100 : 200}
          min="50"
          max="10000"
          required
        />
      </div>
      <Field
        label="About your work"
        name="bio"
        as="textarea"
        rows={5}
        defaultValue={p?.bio}
        required
        minLength={30}
        maxLength={1500}
      />
      <fieldset className="hiring-options">
        <legend>Services offered (choose at least one)</legend>
        {skills.map((s) => (
          <label key={s}>
            <input
              type="checkbox"
              name="skills"
              value={s}
              defaultChecked={p?.skills.includes(s)}
            />
            {s}
          </label>
        ))}
      </fieldset>
      <fieldset className="hiring-options">
        <legend>Working days (choose at least one)</legend>
        {days.map((d, i) => (
          <label key={d}>
            <input
              type="checkbox"
              name="weekdays"
              value={i}
              defaultChecked={p ? p.weekdays.includes(i) : i !== 5}
            />
            {d}
          </label>
        ))}
      </fieldset>
      <div className="form-two">
        <Field
          label="Daily start time (Bangladesh)"
          name="dayStart"
          as="select"
          defaultValue={p?.dayStart ?? 480}
        >
          {Array.from({ length: 48 }, (_, i) => (
            <option key={i} value={i * 30}>
              {minutes(i * 30)}
            </option>
          ))}
        </Field>
        <Field
          label="Daily end time (Bangladesh)"
          name="dayEnd"
          as="select"
          defaultValue={p?.dayEnd ?? 1080}
        >
          {Array.from({ length: 48 }, (_, i) => (
            <option key={i} value={(i + 1) * 30}>
              {minutes((i + 1) * 30)}
            </option>
          ))}
        </Field>
      </div>
      <label className="hiring-check">
        <input
          type="checkbox"
          name="available"
          defaultChecked={p?.available ?? true}
        />
        Taking new booking requests
      </label>
      {action.isError && (
        <p role="alert" className="form-error">
          {action.error.message}
        </p>
      )}
      <Submit pending={action.isPending}>
        Submit profile for review
        <ArrowRight size={17} />
      </Submit>
    </form>
  );
}
export function HiringBookings() {
  const { user } = useApp();
  const [params] = useSearchParams();
  const view = params.get("view") === "worker" ? "worker" : "customer";
  const result = useQuery({
    ...query(["bookings", view], "/bookings?view=" + view),
    enabled: !user.isAdmin,
  });
  if (user.isAdmin) return <Navigate to="/admin/hiring" replace />;
  return (
    <>
      <HiringNav />
      <PageTitle
        eyebrow="PLANS, MADE CLEAR"
        title={
          view === "worker"
            ? "Your incoming bookings."
            : "Your service bookings."
        }
        description="Requests are confirmed only after worker acceptance. All times are Bangladesh time."
      />
      <div className="hiring-nav">
        <Link
          to="/hiring/bookings"
          aria-current={view === "customer" ? "page" : undefined}
        >
          Bookings I made
        </Link>
        <Link
          to="/hiring/bookings?view=worker"
          aria-current={view === "worker" ? "page" : undefined}
        >
          Requests for my services
        </Link>
      </div>
      <QueryState query={result}>
        {result.data?.length ? (
          <div className="hiring-booking-list">
            {result.data.map((b) => (
              <Link
                className="panel hiring-booking-card"
                to={"/hiring/bookings/" + b._id}
                key={b._id}
              >
                <div>
                  <span className={"status " + b.status}>{b.status}</span>
                  {b.isDemo && (
                    <small className="hiring-demo-label">Demo booking</small>
                  )}
                  <h2>
                    {b.service} with {b.workerName}
                  </h2>
                  <p>
                    <CalendarDays size={16} />
                    {at(b.startAt)} — {at(b.endAt)}
                  </p>
                  <small>Reference {b._id.slice(-8).toUpperCase()}</small>
                </div>
                <div>
                  <strong>{money(b.total)}</strong>
                  <ArrowRight />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            title="No bookings here yet"
            description={
              view === "worker"
                ? "Incoming requests will appear here once customers find your approved profile."
                : "Find a service provider and request your first booking."
            }
            to="/hiring"
            action="Explore profiles"
          />
        )}
      </QueryState>
    </>
  );
}
export function HiringBookingDetail() {
  const { id } = useParams();
  const result = useQuery(query(["booking", id], "/bookings/" + id));
  return (
    <>
      <HiringNav />
      <QueryState query={result}>
        {result.data && <BookingBody b={result.data} />}
      </QueryState>
    </>
  );
}
function BookingBody({ b }) {
  const { user } = useApp();
  const customer = user._id === b.customer,
    worker = user._id === b.worker;
  const ended = +new Date(b.endAt) <= Date.now();
  const action = useAction(
    (data) => api("/hiring/bookings/" + b._id, { method: "PATCH", body: data }),
    null,
    "Booking updated.",
  );
  const review = useAction(
    (data) =>
      api("/hiring/bookings/" + b._id + "/review", {
        method: "POST",
        body: data,
      }),
    null,
    "Review published.",
  );
  const complaint = useAction(
    (data) =>
      api("/hiring/bookings/" + b._id + "/complaint", {
        method: "POST",
        body: data,
      }),
    null,
    "Complaint sent for private moderator review.",
  );
  return (
    <>
      <PageTitle
        eyebrow={"BOOKING " + b._id.slice(-8).toUpperCase()}
        title={b.service + " with " + b.workerName}
        description="Times shown in Bangladesh time (UTC+06:00)."
      />
      <div className="checkout-grid">
        <div>
          <section className="panel hiring-section">
            <span className={"status " + b.status}>{b.status}</span>
            {b.isDemo && (
              <small className="hiring-demo-label">
                Fictional demo booking
              </small>
            )}
            <h2>Your booking details</h2>
            <p>
              <CalendarDays size={18} />
              {at(b.startAt)} — {at(b.endAt)}
            </p>
            <p>
              {b.hours} hours × {money(b.hourlyRate)} ={" "}
              <strong>{money(b.total)}</strong>
            </p>
            <p>
              Quoted price saved when requested. Payment is arranged directly;
              no charge occurs here.
            </p>
            {b.addressVisible ? (
              <>
                <h3>Delivery of service</h3>
                <p className="preserve-lines">{b.address}</p>
                <p>Contact: {b.phone}</p>
                {b.notes && <p className="preserve-lines">Notes: {b.notes}</p>}
              </>
            ) : (
              <p className="hiring-disclosure">
                Customer address and phone are hidden until this booking is
                accepted.
              </p>
            )}
            <h3>Booking history</h3>
            <ol className="hiring-history">
              {b.history.map((h, i) => (
                <li key={i}>
                  <strong>{h.status}</strong> · {at(h.at)}
                  {h.reason && <p>{h.reason}</p>}
                </li>
              ))}
            </ol>
          </section>
          <section className="panel hiring-section">
            <h2>Review</h2>
            {b.review ? (
              <>
                <Stars rating={b.review.rating} />
                <p>{b.review.comment}</p>
                {b.review.isDemo && <small>Demo review</small>}
              </>
            ) : customer && b.status === "completed" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const d = formData(e);
                  review.mutate({ ...d, rating: Number(d.rating) });
                }}
              >
                <Field label="Rating" name="rating" as="select">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} stars
                    </option>
                  ))}
                </Field>
                <Field
                  label="Your feedback (optional)"
                  name="comment"
                  as="textarea"
                  maxLength={1000}
                />
                <Submit pending={review.isPending}>Publish review</Submit>
              </form>
            ) : (
              <p>The customer can review after the booking is completed.</p>
            )}
          </section>
        </div>
        <div>
          <section className="panel hiring-section">
            <h2>Manage booking</h2>
            {worker &&
              b.status === "pending" &&
              +new Date(b.startAt) > Date.now() && (
                <button
                  className="btn primary"
                  disabled={action.isPending}
                  onClick={() => action.mutate({ status: "accepted" })}
                >
                  Accept booking
                  <Check size={17} />
                </button>
              )}
            {customer &&
              b.status === "accepted" &&
              (ended ? (
                <button
                  className="btn primary"
                  disabled={action.isPending}
                  onClick={() => action.mutate({ status: "completed" })}
                >
                  Mark completed
                </button>
              ) : (
                <p>
                  You can mark the job completed after its scheduled end time.
                </p>
              ))}
            {["pending", "accepted"].includes(b.status) && (
              <form
                className="hiring-action-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  action.mutate(formData(e));
                }}
              >
                <Field label="Action" name="status" as="select">
                  <option value="cancelled">Cancel booking</option>
                  {worker && b.status === "pending" && (
                    <option value="rejected">Reject request</option>
                  )}
                </Field>
                <Field
                  label="Reason"
                  name="reason"
                  as="textarea"
                  required
                  minLength={3}
                  maxLength={500}
                />
                <Submit pending={action.isPending}>Save decision</Submit>
              </form>
            )}
            {!["pending", "accepted"].includes(b.status) && (
              <p>This booking is closed.</p>
            )}
            {action.isError && (
              <p className="form-error" role="alert">
                {action.error.message}
              </p>
            )}
          </section>
          {b.acceptedAt && (
            <section className="panel hiring-section">
              <h2>Report a booking concern</h2>
              <p>
                Complaints are private and reviewed by a moderator. Filing a
                report does not automatically penalize either person.
              </p>
              {b.complaint ? (
                <>
                  <span className={"status " + b.complaint.status}>
                    {b.complaint.status}
                  </span>
                  <p>{b.complaint.reason}</p>
                  <p>{b.complaint.adminNote || "Awaiting moderator review."}</p>
                </>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    complaint.mutate(formData(e));
                  }}
                >
                  <Field label="Concern" name="reason" as="select">
                    {[
                      "No-show",
                      "Unsafe behavior",
                      "Payment dispute",
                      "Property damage",
                      "Other",
                    ].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </Field>
                  <Field
                    label="What happened?"
                    name="details"
                    as="textarea"
                    required
                    minLength={10}
                    maxLength={2000}
                  />
                  <Submit pending={complaint.isPending}>
                    Submit complaint
                  </Submit>
                </form>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
export function HiringComplaints() {
  const result = useQuery(query(["complaints"], "/complaints"));
  return (
    <>
      <HiringNav />
      <PageTitle
        title="Your reported concerns."
        description="Only your own submissions appear here. Moderators review each concern."
      />
      <QueryState query={result}>
        {result.data?.length ? (
          result.data.map((c) => (
            <section key={c._id} className="panel hiring-section">
              <span className={"status " + c.status}>{c.status}</span>
              <h2>{c.reason}</h2>
              <p>{c.details}</p>
              <p>{c.adminNote || "Awaiting moderator review."}</p>
              <Link to={"/hiring/bookings/" + c.booking}>View booking</Link>
            </section>
          ))
        ) : (
          <Empty
            title="No complaints submitted"
            description="If a concern arises, use the complaint form on an accepted booking."
            to="/hiring/bookings"
            action="My bookings"
          />
        )}
      </QueryState>
    </>
  );
}
export function HiringAdmin() {
  const [tab, setTab] = useState("workers");
  const result = useQuery(query(["admin", tab], "/admin/" + tab));
  const action = useAction(
    ({ id, ...data }) =>
      api(
        "/hiring/admin/" +
          (tab === "complaints" ? "complaints/" : "workers/") +
          id,
        { method: "PATCH", body: data },
      ),
    null,
    "Moderator decision saved.",
  );
  return (
    <>
      <HiringNav />
      <PageTitle
        eyebrow="WORKER MODERATION"
        title="Review with care."
        description="Worker approval is separate from marketplace approval. Record the reason for every decision."
      />
      <div className="hiring-nav">
        {[
          ["workers", "Applications"],
          ["complaints", "Complaints"],
          ["decisions", "Decision history"],
        ].map(([v, label]) => (
          <button
            key={v}
            className={"btn " + (tab === v ? "primary" : "")}
            onClick={() => setTab(v)}
          >
            {label}
          </button>
        ))}
      </div>
      {action.isError && (
        <p role="alert" className="form-error">
          {action.error.message}
        </p>
      )}
      <QueryState query={result}>
        {result.data?.length ? (
          result.data.map((r) => (
            <section className="panel hiring-section" key={r._id}>
              {tab === "workers" ? (
                <>
                  <div className="row">
                    <h2>{r.displayName}</h2>
                    <span className={"status " + r.status}>{r.status}</span>
                  </div>
                  <p>
                    {r.serviceArea} · {r.skills.join(", ")} ·{" "}
                    {money(r.hourlyRate)}/hour
                  </p>
                  <p>{r.bio}</p>
                  <p>
                    {r.experienceYears} years experience ·{" "}
                    {r.weekdays.map((d) => days[d]).join(", ")} ·{" "}
                    {minutes(r.dayStart)}–{minutes(r.dayEnd)}
                  </p>
                  {r.reason && <p>Last reason: {r.reason}</p>}
                  {r.status === "rejected" ? (
                    <p>Waiting for the worker to resubmit.</p>
                  ) : (
                    <form
                      className="hiring-admin-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        action.mutate({ id: r._id, ...formData(e) });
                      }}
                    >
                      <Field
                        label={"Decision for " + r.displayName}
                        name="status"
                        as="select"
                        key={r.status}
                      >
                        {r.status === "pending" ? (
                          <>
                            <option value="approved">
                              Approve application
                            </option>
                            <option value="rejected">Reject application</option>
                          </>
                        ) : r.status === "approved" ? (
                          <option value="suspended">Suspend profile</option>
                        ) : (
                          <option value="approved">Restore approval</option>
                        )}
                      </Field>
                      <Field
                        label={"Reason for " + r.displayName}
                        name="reason"
                        required
                        minLength={3}
                        maxLength={500}
                      />
                      <Submit pending={action.isPending}>Save decision</Submit>
                    </form>
                  )}
                </>
              ) : tab === "complaints" ? (
                <>
                  <span className={"status " + r.status}>{r.status}</span>
                  <h2>{r.reason}</h2>
                  <p>
                    Filed by {r.filedBy?.name || "Account"} about{" "}
                    {r.against?.name || "Account"}
                  </p>
                  <p>
                    Booking: {r.booking?.workerName} · {r.booking?.service}
                  </p>
                  <p className="preserve-lines">{r.details}</p>
                  {r.adminNote && <p>Previous note: {r.adminNote}</p>}
                  <form
                    className="hiring-admin-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      action.mutate({ id: r._id, ...formData(e) });
                    }}
                  >
                    <Field label="Review outcome" name="status" as="select">
                      <option value="reviewed">Reviewed</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </Field>
                    <Field
                      label="Moderator note"
                      name="adminNote"
                      required
                      minLength={3}
                      maxLength={1000}
                    />
                    <Submit pending={action.isPending}>Record review</Submit>
                  </form>
                </>
              ) : (
                <>
                  <h2>{r.profile?.displayName || "Worker profile"}</h2>
                  <span className={"status " + r.status}>{r.status}</span>
                  <p>{r.reason}</p>
                  <small>{date(r.createdAt)}</small>
                </>
              )}
            </section>
          ))
        ) : (
          <Empty
            title="Nothing waiting here"
            description="New submissions and decisions will appear here."
            to={null}
          />
        )}
      </QueryState>
    </>
  );
}
