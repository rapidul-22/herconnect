import { EvidencePanel } from "./evidence-panel.jsx";
import { useState, lazy, Suspense } from "react";
import { Link, NavLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  MapPin,
  Phone,
  ArrowRight,
  LocateFixed,
  EyeOff,
} from "lucide-react";
import {
  api,
  useApp,
  useAction,
  Field as BaseField,
  Submit,
  QueryState,
  PageTitle,
  formData,
  date,
} from "./shared.jsx";
import {
  reportCategories,
  resourceTypes,
  reportStatuses,
} from "../../shared/safety.js";
const MapComponent = lazy(() => import("./safety-map.jsx"));
function SafetyMap(props) {
  return (
    <Suspense fallback={<p role="status">Loading map…</p>}>
      <MapComponent {...props} />
    </Suspense>
  );
}
import "./safety.css";
const Field = ({ label, ...props }) => (
  <BaseField label={label} aria-label={label} {...props} />
);
const options = (xs, empty) => (
  <>
    {empty && <option value="">{empty}</option>}
    {xs.map((x) => (
      <option key={x} value={x}>
        {x}
      </option>
    ))}
  </>
);
const useSafety = (key, path) =>
  useQuery({ queryKey: ["safety", ...key], queryFn: () => api(path) });
const at = (v) =>
  new Date(v).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    dateStyle: "medium",
    timeStyle: "short",
  });
function SafetyNav() {
  const { user } = useApp();
  return (
    <nav className="safety-nav" aria-label="Safety navigation">
      <NavLink end to="/safety">
        Community reports
      </NavLink>
      <NavLink to="/safety/zones">Area insights</NavLink>
      <NavLink to="/safety/resources">Find support</NavLink>
      {user && <NavLink to="/safety/mine">My reports</NavLink>}
      {user?.isAdmin && <NavLink to="/admin/safety">Moderation</NavLink>}
    </nav>
  );
}
function Notice() {
  return (
    <div className="safety-notice">
      <ShieldCheck size={20} />
      <span>
        This is a community reporting service. Reports are not sent to emergency
        responders. For immediate danger in Bangladesh, call{" "}
        <a href="tel:999">999</a>.
      </span>
    </div>
  );
}
function Demo({ value, onChange }) {
  return (
    <label className="safety-check">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />{" "}
      Show fictional demo data only
    </label>
  );
}
function Pager({ data, page, setPage }) {
  return (
    data && (
      <div className="safety-pager">
        <button
          className="btn"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span>
          Page {page} of {Math.max(1, data.pages)} · {data.total} reports
        </span>
        <button
          className="btn"
          disabled={page >= data.pages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    )
  );
}
function ReportCard({ r }) {
  return (
    <article className="safety-card">
      <div className="safety-card-top">
        <span className="safety-category">{r.category}</span>
        <span className={"status " + r.status}>{r.status}</span>
      </div>
      {r.isDemo && (
        <small className="safety-demo">Fictional demonstration report</small>
      )}
      {r.hidden && <small>Hidden from public view</small>}
      <h2>
        <Link to={"/safety/reports/" + r._id}>{r.location.address}</Link>
      </h2>
      <p className="safety-excerpt">{r.description}</p>
      <div className="safety-meta">
        <span>
          {r.isAnonymous && <EyeOff size={14} />} {r.reporterName}
        </span>
        <span>{date(r.occurredAt)}</span>
      </div>
      <Link className="safety-more" to={"/safety/reports/" + r._id}>
        View report <ArrowRight size={16} />
      </Link>
    </article>
  );
}
export function SafetyFeed() {
  const [category, setCategory] = useState(""),
    [area, setArea] = useState(""),
    [demo, setDemo] = useState(true),
    [page, setPage] = useState(1);
  const qs = new URLSearchParams({
      page,
      demo,
      ...(category ? { category } : {}),
      area,
    }),
    q = useSafety(["feed", qs.toString()], "/reports?" + qs);
  return (
    <>
      <SafetyNav />
      <section className="safety-hero">
        <div>
          <span className="eyebrow">COMMUNITY SAFETY & SUPPORT</span>
          <h1>
            Report a concern.
            <br />Find support.
          </h1>
          <p>
            Read community reports, record an incident, or look up support
            contacts.
          </p>
          <Link className="btn primary" to="/safety/new">
            Share a report <ArrowRight size={17} />
          </Link>
        </div>
        <div className="safety-hero-art" aria-hidden="true">
          <ShieldCheck size={82} />
          <span>Reports · Area insights · Support</span>
        </div>
      </section>
      <Notice />
      <div className="safety-shortcuts">
        <Link to="/safety/zones">
          <MapPin /> Explore report hotspots <ArrowRight />
        </Link>
        <Link to="/safety/resources">
          <Phone /> Find help resources <ArrowRight />
        </Link>
      </div>
      <PageTitle
        title="Community reports"
        description="Community submissions, not independently verified incidents."
      />
      <div className="safety-filters">
        <Field
          label="Category"
          as="select"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          {options(reportCategories, "All categories")}
        </Field>
        <Field
          label="Search area"
          placeholder="e.g. Dhanmondi"
          value={area}
          maxLength={80}
          onChange={(e) => {
            setArea(e.target.value);
            setPage(1);
          }}
        />
        <Demo
          value={demo}
          onChange={(v) => {
            setDemo(v);
            setPage(1);
          }}
        />
      </div>
      <QueryState query={q}>
        {q.data && (
          <>
            {q.data.reports.length ? (
              <div className="safety-grid">
                {q.data.reports.map((r) => (
                  <ReportCard key={r._id} r={r} />
                ))}
              </div>
            ) : (
              <div className="empty">
                <h2>No reports found</h2>
                <p>
                  Try another filter, or use the demo toggle to explore
                  fictional examples.
                </p>
              </div>
            )}
            <Pager data={q.data} page={page} setPage={setPage} />
          </>
        )}
      </QueryState>
    </>
  );
}
function LocateButton({ onLocation }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={() => {
          if (!navigator.geolocation) {
            setError("Location is unavailable. Enter coordinates manually.");
            return;
          }
          setBusy(true);
          setError("");
          navigator.geolocation.getCurrentPosition(
            (p) => {
              setBusy(false);
              if (
                p.coords.latitude < 20 ||
                p.coords.latitude > 27 ||
                p.coords.longitude < 88 ||
                p.coords.longitude > 93
              ) {
                setError("Choose a location in Bangladesh.");
                return;
              }
              onLocation({
                lat: Number(p.coords.latitude.toFixed(6)),
                lng: Number(p.coords.longitude.toFixed(6)),
              });
            },
            () => {
              setBusy(false);
              setError(
                "Location access failed or was denied. Enter coordinates manually.",
              );
            },
            { timeout: 10000 },
          );
        }}
      >
        <LocateFixed size={16} />
        {busy ? "Locating…" : "Use my location"}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
export function SafetyNew() {
  const navigate = useNavigate(),
    [params] = useSearchParams(),
    rideId = params.get('ride'),
    [created, setCreated] = useState(null),
    [point, setPoint] = useState({ lat: 23.8103, lng: 90.4125 }),
    [picked, setPicked] = useState(false),
    [anonymous, setAnonymous] = useState(true),
    [key] = useState(() => crypto.randomUUID());
  const pick = (p) => {
    setPoint(p);
    setPicked(true);
  };
  const save = useAction(
    (body) => api("/reports", { method: "POST", body }),
    (r) => setCreated(r),
    "Report submitted. You can now add private photos.",
  );
  if (created) return <>
    <PageTitle title="Report saved. Add your photos." description="Your report is already saved. Photos are optional and upload one at a time. A failed upload does not delete your report; retry here or from My reports." />
    <div className="safety-panel">
      <EvidencePanel report={created} onDone={async () => setCreated(await api('/reports/' + created._id))} />
      <Link className="btn primary" to={'/safety/reports/' + created._id}>Done — view report</Link>
      {rideId && <Link className="btn" to={'/transport/rides/' + rideId}>Back to journey</Link>}
    </div>
  </>;
  return (
    <>
      <SafetyNav />
      <PageTitle
        eyebrow={rideId ? "TRANSPORT INCIDENT" : "REPORT AN INCIDENT"}
        title="Tell us what happened"
        description="Your report can help others make informed choices."
      />
      <Notice />
      <form
        className="safety-form"
        onSubmit={(e) => {
          e.preventDefault();
          const d = formData(e);
          save.mutate({
            category: d.category,
            description: d.description,
            personDetails: d.personDetails, witnessNotes: d.witnessNotes,
            location: { ...point, address: d.address },
            occurredAt: new Date(d.occurredAt + ":00+06:00").toISOString(),
            isAnonymous: anonymous,
            requestKey: key,
            ...(rideId ? { transportRide: rideId } : {}),
          });
        }}
      >
        <div className="safety-panel">
          <h2>1. The incident</h2>
          <div className="safety-fields">
            <Field label="Category" name="category" as="select" required>
              {options(reportCategories, "Choose a category")}
            </Field>
            <Field
              label="When did it happen? (Bangladesh time)"
              name="occurredAt"
              type="datetime-local"
              required
              max={new Date(Date.now() + 21600000).toISOString().slice(0, 16)}
            />
          </div>
          <Field
            label="Describe the concern"
            name="description"
            as="textarea"
            minLength={20}
            maxLength={2000}
            required
            rows={5}
            hint="Public text: do not include names of other people, phone numbers, home addresses, or identifying details."
            placeholder="Describe what happened and any useful context…"
          />
        </div>
        <div className="safety-panel">
          <h2>2. Choose the location</h2>
          <Field
            label="Public area or landmark"
            name="address"
            required
            minLength={3}
            maxLength={160}
            placeholder="Area or public landmark, not a private home address"
          />
          <p>
            Tap the map or enter coordinates. Public coordinates are
            approximate; you and moderators can see the exact point.
          </p>
          <SafetyMap point={point} onPick={pick} />
          <div className="safety-fields">
            <Field
              label="Latitude"
              type="number"
              min={20}
              max={27}
              step="any"
              required
              value={point.lat}
              onChange={(e) =>
                pick({
                  ...point,
                  lat: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
            />
            <Field
              label="Longitude"
              type="number"
              min={88}
              max={93}
              step="any"
              required
              value={point.lng}
              onChange={(e) =>
                pick({
                  ...point,
                  lng: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
            />
          </div>
          <LocateButton onLocation={pick} />
          {!picked && (
            <p>Select or confirm the incident location before submitting.</p>
          )}
          <label className="safety-check">
            <input
              type="checkbox"
              checked={picked}
              onChange={(e) => setPicked(e.target.checked)}
              required
            />{" "}
            This point is the incident location.
          </label>
        </div>
        <div className="safety-panel">
          <h2>3. Private supporting details</h2>
          <p>Only you and moderators can see these details. Describe what you observed; a report is an allegation, not a finding of guilt. The next step lets you attach incident, person or vehicle photos privately (up to three).</p>
          <Field label="Person involved: name if known, appearance, clothing, vehicle, relationship" name="personDetails" as="textarea" maxLength={1500} rows={4} />
          <Field label="Witnesses and additional context (private)" name="witnessNotes" as="textarea" maxLength={1000} rows={3} />
          <h2>4. Your privacy</h2>
          <label className="safety-check">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />{" "}
            Hide my name from the public
          </label>
          <p>
            {anonymous
              ? "Your account identity is hidden from other visitors."
              : "Your display name will appear publicly with this report."}{" "}
            Your account remains linked internally and is visible to moderators.
            Text and area are public even when your name is hidden.
          </p>
          <label className="safety-check">
            <input type="checkbox" required /> I understand this is a public
            community report, not an emergency request.
          </label>
          <Submit pending={save.isPending}>Save report & add photos</Submit>
        </div>
      </form>
    </>
  );
}
export function SafetyMine() {
  const [page, setPage] = useState(1),
    q = useSafety(["mine", page], "/reports/mine?page=" + page);
  return (
    <>
      <SafetyNav />
      <PageTitle
        title="My reports"
        description="Track your submissions and read private moderation updates."
      >
        <Link className="btn primary" to="/safety/new">
          New report
        </Link>
      </PageTitle>
      <QueryState query={q}>
        {q.data && (
          <>
            {!q.data.total && (
              <div className="empty">
                You have not submitted any reports yet.
              </div>
            )}
            <div className="safety-grid">
              {q.data.reports.map((r) => (
                <ReportCard r={r} key={r._id} />
              ))}
            </div>
            <Pager data={q.data} page={page} setPage={setPage} />
          </>
        )}
      </QueryState>
    </>
  );
}
function ModerationForm({ r }) {
  const [status, setStatus] = useState(r.status);
  const action = useAction(
    (body) => api("/reports/" + r._id + "/status", { method: "PATCH", body }),
    null,
    "Report updated.",
  );
  return (
    <form
      className="safety-panel"
      onSubmit={(e) => {
        e.preventDefault();
        const d = formData(e);
        action.mutate({
          status,
          hidden: d.hidden === "on",
          note: d.note,
          expectedVersion: r.history.length,
        });
      }}
    >
      <h2>Moderator decision</h2>
      <Field
        label="Status"
        name="status"
        as="select"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        {options(
          reportStatuses.filter(
            (s, i) =>
              i >= reportStatuses.indexOf(r.status) &&
              i <= reportStatuses.indexOf(r.status) + 1,
          ),
        )}
      </Field>
      <label className="safety-check">
        <input name="hidden" type="checkbox" defaultChecked={r.hidden} /> Hide
        this report from public view and hotspots
      </label>
      <Field
        label="Private note for reporter and moderators"
        name="note"
        as="textarea"
        minLength={5}
        maxLength={800}
        required
        rows={3}
      />
      <Submit pending={action.isPending}>Save decision</Submit>
    </form>
  );
}
export function SafetyDetail() {
  const { id } = useParams(),
    { user } = useApp(),
    q = useSafety(["report", id], "/reports/" + id);
  return (
    <>
      <SafetyNav />
      <QueryState query={q}>
        {q.data && (
          <>
            <PageTitle
              eyebrow={q.data.category}
              title={q.data.location.address}
              description={"Incident: " + at(q.data.occurredAt)}
            />
            <Notice />
            <div className="safety-detail">
              <div className="safety-panel">
                <span className={"status " + q.data.status}>
                  {q.data.status}
                </span>
                {q.data.isDemo && (
                  <p className="safety-demo">Fictional demonstration report</p>
                )}
                <p className="safety-prose">{q.data.description}</p>
                <p>Reported by {q.data.reporterName}</p>
                {q.data.hidden && (
                  <p>This report is hidden from public view.</p>
                )}
                <p>
                  Community submission. Status reflects platform review, not
                  emergency-service action.
                </p>
                <SafetyMap point={q.data.location} />
                <small>
                  {q.data.history
                    ? "Exact location (private access)"
                    : "Approximate public location"}
                  : {q.data.location.lat}, {q.data.location.lng}
                </small>
              </div>
              <aside>
                {q.data.history && (
                  <div className="safety-panel">
                    <h2>Private supporting details</h2>
                    {q.data.transportRide && <p>Linked journey: {String(q.data.transportRide).slice(-8)} (private reference)</p>}
                    <p className="safety-prose">{q.data.personDetails || 'No person details provided.'}</p>
                    <p className="safety-prose">{q.data.witnessNotes}</p>
                    <EvidencePanel report={q.data} onDone={() => q.refetch()} canEdit={String(q.data.reporter?._id || q.data.reporter) === String(user?._id)} />
                    <h2>Private updates</h2>
                    {user?.isAdmin && (
                      <p>
                        Reporter: {q.data.reporter?.name} ·{" "}
                        {q.data.reporter?.email}
                      </p>
                    )}
                    <ol className="safety-timeline">
                      {q.data.history.map((h, i) => (
                        <li key={i}>
                          <strong>
                            {h.status} {h.hidden ? "· hidden" : ""}
                          </strong>
                          <small>{at(h.at)}</small>
                          <p>{h.note}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {user?.isAdmin && q.data.history && (
                  <ModerationForm key={q.data.history.length} r={q.data} />
                )}
                <Link className="btn" to="/safety/resources">
                  Find support resources
                </Link>
              </aside>
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
export function SafetyZones() {
  const [demo, setDemo] = useState(true),
    q = useSafety(["zones", demo], "/zones/unsafe?demo=" + demo);
  return (
    <>
      <SafetyNav />
      <PageTitle
        title="Area insights"
        description="Where recent community reports form groups."
      />
      <Notice />
      <Demo value={demo} onChange={setDemo} />
      <p>
        At least 3 reports within a 500-metre neighbourhood, from the past 180
        days. Connected groups may extend further. These are report patterns,
        not verified crime statistics. No hotspot does not mean an area is safe.
      </p>
      <QueryState query={q}>
        {q.data && (
          <>
            {demo && (
              <p className="safety-demo">
                Fictional demonstration — not actual incidents or unsafe areas.
              </p>
            )}
            <div className="safety-stats">
              <div>
                <strong>{q.data.zones.length}</strong> report clusters
              </div>
              <div>
                <strong>{q.data.sampleSize}</strong> recent reports analysed
              </div>
              <div>
                <strong>180</strong> day window
              </div>
            </div>
            {q.data.limited && (
              <p role="status">
                Results use only the latest 2,000 eligible reports.
              </p>
            )}
            <p className="zone-legend"><strong>Red:</strong> high report activity (score ≥10) · <strong>Amber:</strong> elevated (≥5) · <strong>Purple:</strong> cluster. Approximate 500 m circles, not verified unsafe boundaries.</p>
            <details><summary>How the score works</summary><p>Assault 5, stalking 4, harassment 3, verbal abuse and unsafe-area concerns 2, other 1. Reports from the last 7 days receive full weight; 8–30 days 60%, 31–90 days 30%, 91–180 days 10%. At least three nearby reports are needed. Duplicate or false reports can bias these indicators. Demo reports are always separate.</p></details>
            <SafetyMap points={q.data.zones} />
            <div className="safety-grid">
              {q.data.zones.map((z) => (
                <article className="safety-card" key={z.id}>
                  <h2>{z.level || "Report cluster"} · {z.id}</h2><p>Weighted score: {z.score} · latest report {at(z.latestAt)}</p>
                  <p>
                    {z.count} reports · near {z.lat}, {z.lng}
                  </p>
                  {Object.entries(z.categories).map(([c, n]) => (
                    <p key={c}>
                      {c}: {n}
                    </p>
                  ))}
                </article>
              ))}
            </div>
            {!q.data.zones.length && (
              <div className="empty">
                Not enough nearby reports to form a cluster.
              </div>
            )}
          </>
        )}
      </QueryState>
    </>
  );
}
function ResourceForm({ resource, onDone }) {
  const save = useAction(
    (body) =>
      api("/resources" + (resource ? "/" + resource._id : ""), {
        method: resource ? "PUT" : "POST",
        body,
      }),
    onDone,
    "Resource saved.",
  );
  return (
    <form
      className="safety-panel"
      onSubmit={(e) => {
        e.preventDefault();
        const d = formData(e);
        save.mutate({
          ...d,
          lat: d.lat === "" ? null : Number(d.lat),
          lng: d.lng === "" ? null : Number(d.lng),
          available24x7: d.available24x7 === "on",
          isVerifiedInfo: d.isVerifiedInfo === "on",
        });
      }}
    >
      <h2>{resource ? "Edit resource" : "Add support resource"}</h2>
      <Field
        label="Name"
        name="name"
        defaultValue={resource?.name || ""}
        required
        minLength={3}
        maxLength={120}
      />
      <Field
        label="Type"
        name="type"
        as="select"
        defaultValue={resource?.type || resourceTypes[0]}
      >
        {options(resourceTypes)}
      </Field>
      <Field
        label="Phone (leave empty if unknown)"
        name="phone"
        defaultValue={resource?.phone || ""}
        pattern="\+?[0-9]{3,15}"
      />
      <Field
        label="Address / coverage area"
        name="address"
        defaultValue={resource?.address || ""}
        required
        minLength={3}
        maxLength={200}
      />
      <div className="safety-fields">
        <Field
          label="Latitude (optional)"
          name="lat"
          type="number"
          step="any"
          min={20}
          max={27}
          defaultValue={resource?.lat ?? ""}
        />
        <Field
          label="Longitude (optional)"
          name="lng"
          type="number"
          step="any"
          min={88}
          max={93}
          defaultValue={resource?.lng ?? ""}
        />
      </div>
      <label className="safety-check">
        <input
          name="available24x7"
          type="checkbox"
          defaultChecked={resource?.available24x7 || false}
        />{" "}
        Available 24 hours
      </label>
      <label className="safety-check">
        <input
          name="isVerifiedInfo"
          type="checkbox"
          defaultChecked={resource?.isVerifiedInfo || false}
        />{" "}
        I verified these details against the source below
      </label>
      <Field
        label="Verification source (HTTPS URL)"
        name="sourceUrl"
        type="url"
        defaultValue={resource?.sourceUrl || ""}
      />
      <Submit pending={save.isPending}>Save resource</Submit>
      <button className="btn" type="button" onClick={onDone}>
        Cancel
      </button>
    </form>
  );
}
export function SafetyResources() {
  const { user } = useApp(),
    [type, setType] = useState(""),
    [term, setTerm] = useState(""),
    [demo, setDemo] = useState(true),
    [near, setNear] = useState(null),
    [editing, setEditing] = useState(undefined);
  const qs = new URLSearchParams({
      q: term,
      demo,
      ...(type ? { type } : {}),
      ...(near || {}),
    }),
    q = useSafety(["resources", qs.toString()], "/resources?" + qs);
  const remove = useAction(
    (id) => api("/resources/" + id, { method: "DELETE" }),
    null,
    "Resource deleted.",
  );
  return (
    <>
      <SafetyNav />
      <PageTitle
        title="Support directory"
        description="Find support contacts and nearby facilities."
      >
        {user?.isAdmin && (
          <button className="btn primary" onClick={() => setEditing(null)}>
            Add resource
          </button>
        )}
      </PageTitle>
      <Notice />
      {editing !== undefined && (
        <ResourceForm
          key={editing?._id || "new"}
          resource={editing}
          onDone={() => setEditing(undefined)}
        />
      )}
      <div className="safety-filters">
        <Field
          label="Resource type"
          as="select"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {options(resourceTypes, "All types")}
        </Field>
        <Field
          label="Search name or area"
          value={term}
          maxLength={80}
          onChange={(e) => setTerm(e.target.value)}
        />
        <Demo value={demo} onChange={setDemo} />
      </div>
      <div className="safety-location-tools">
        <LocateButton onLocation={setNear} />
        {near && (
          <button className="btn" onClick={() => setNear(null)}>
            Clear distance sorting
          </button>
        )}
      </div>
      <details className="safety-panel">
        <summary>Enter a location manually for distance sorting</summary>
        <form
          key={near ? `${near.lat},${near.lng}` : "manual"}
          onSubmit={(e) => {
            e.preventDefault();
            const d = formData(e);
            setNear({ lat: Number(d.lat), lng: Number(d.lng) });
          }}
        >
          <div className="safety-fields">
            <Field
              label="Your latitude"
              name="lat"
              type="number"
              min={20}
              max={27}
              step="any"
              required
              defaultValue={near?.lat ?? ""}
            />
            <Field
              label="Your longitude"
              name="lng"
              type="number"
              min={88}
              max={93}
              step="any"
              required
              defaultValue={near?.lng ?? ""}
            />
          </div>
          <button className="btn" type="submit">
            Sort by distance
          </button>
        </form>
      </details>
      <p>
        Distance is straight-line, not travel time. Unverified and fictional
        contacts cannot be called from this page.
      </p>
      <QueryState query={q}>
        {q.data && (
          <>
            {q.data.limited && (
              <p>Showing the first 200 matches. Narrow your search.</p>
            )}
            <div className="safety-grid">
              {q.data.resources.map((r) => (
                <article className="safety-card" key={r._id}>
                  <span className="safety-category">{r.type}</span>
                  <h2>{r.name}</h2>
                  <p>{r.address}</p>
                  <p>
                    {r.available24x7
                      ? "24-hour service listed"
                      : "Hours not confirmed"}
                    {r.distanceKm != null
                      ? ` · ${r.distanceKm.toFixed(1)} km away`
                      : ""}
                  </p>
                  <p
                    className={
                      r.isVerifiedInfo && !r.isDemo ? "verified" : "safety-demo"
                    }
                  >
                    {r.isDemo
                      ? "Fictional demo — not a real service"
                      : r.isVerifiedInfo
                        ? "Source checked " + date(r.verifiedAt)
                        : "Contact details not verified"}
                  </p>
                  {r.sourceUrl && (
                    <a href={r.sourceUrl} target="_blank" rel="noreferrer">
                      View information source
                    </a>
                  )}
                  {r.isVerifiedInfo && !r.isDemo && r.phone ? (
                    <a className="btn primary" href={"tel:" + r.phone}>
                      <Phone size={16} /> Call {r.phone}
                    </a>
                  ) : (
                    <p>Calling unavailable until details are verified.</p>
                  )}
                  {user?.isAdmin && (
                    <div className="safety-actions">
                      <button className="btn" onClick={() => setEditing(r)}>
                        Edit
                      </button>
                      <button
                        className="btn"
                        disabled={remove.isPending}
                        onClick={() => {
                          if (window.confirm("Delete this directory entry?"))
                            remove.mutate(r._id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
            {!q.data.resources.length && (
              <div className="empty">
                No matching resources. Try another filter or ask a moderator to
                add sourced contacts.
              </div>
            )}
          </>
        )}
      </QueryState>
    </>
  );
}
export function SafetyAdmin() {
  const [status, setStatus] = useState(""),
    [demo, setDemo] = useState(true),
    [page, setPage] = useState(1),
    qs = new URLSearchParams({ demo, page, ...(status ? { status } : {}) }),
    q = useSafety(["admin", qs.toString()], "/reports/admin?" + qs);
  return (
    <>
      <SafetyNav />
      <PageTitle
        title="Safety moderation"
        description="Review reports, protect privacy, and record decisions."
      >
        <Link className="btn" to="/safety/resources">
          Manage help resources
        </Link>
      </PageTitle>
      <div className="safety-filters">
        <Field
          label="Status"
          as="select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          {options(reportStatuses, "All statuses")}
        </Field>
        <Demo
          value={demo}
          onChange={(v) => {
            setDemo(v);
            setPage(1);
          }}
        />
      </div>
      <QueryState query={q}>
        {q.data && (
          <>
            {!q.data.total && (
              <div className="empty">No reports match this queue.</div>
            )}
            <div className="safety-grid">
              {q.data.reports.map((r) => (
                <ReportCard key={r._id} r={r} />
              ))}
            </div>
            <Pager data={q.data} page={page} setPage={setPage} />
          </>
        )}
      </QueryState>
    </>
  );
}
