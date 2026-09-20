import { AddressSearch } from "./address-search.jsx";
import { useState, useEffect, lazy, Suspense } from "react";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CarFront,
  Bike,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Phone,
  Navigation,
  Clock,
  Star,
  Radio,
  AlertTriangle,
} from "lucide-react";
import {
  api,
  useApp,
  useAction,
  Field as BaseField,
  Submit,
  QueryState,
  PageTitle,
  money,
  formData,
} from "./shared.jsx";
import {
  availableVehicleTypes as vehicleTypes,
  activeRideStatuses,
  fareRates,
  locationFresh,
} from "../../shared/transport.js";
import "./transport.css";
const MapComponent = lazy(() => import("./safety-map.jsx"));
const Field = ({ label, ...props }) => (
  <BaseField label={label} aria-label={label} {...props} />
);
const opts = (xs) =>
  xs.map((x) => (
    <option key={x} value={x}>
      {x}
    </option>
  ));
const at = (v) =>
  v
    ? new Date(v).toLocaleString("en-GB", {
        timeZone: "Asia/Dhaka",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not shared yet";
function Map(props) {
  return (
    <Suspense fallback={<p role="status">Loading map…</p>}>
      <MapComponent
        mapLabel="Transport map. Coordinate fields are also available."
        {...props}
      />
    </Suspense>
  );
}
const useTransport = (key, path, poll = false) =>
  useQuery({
    queryKey: ["transport", ...key],
    queryFn: () => api("/transport" + path),
    refetchInterval: poll ? 5000 : false,
  });
function Nav() {
  const { user } = useApp();
  return (
    <nav className="safety-nav" aria-label="Transport navigation">
      <NavLink end to="/transport">
        Request a ride
      </NavLink>
      {user && !user.isAdmin && (
        <>
          <NavLink to="/transport/rides">My rides</NavLink>
          <NavLink to="/transport/drive">Driver space</NavLink>
          <NavLink to="/transport/contact">Emergency contact</NavLink>
        </>
      )}
      {user?.isAdmin && (
        <NavLink to="/admin/transport">Transport moderation</NavLink>
      )}
    </nav>
  );
}
function Notice() {
  return (
    <div className="safety-notice">
      <ShieldCheck size={20} />
      <span>
        University prototype. New fares use road distance. Travel times are estimates, not live traffic.
        Alerts are recorded in the app; no SMS or police dispatch is sent.
      </span>
    </div>
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
          Page {page} of {Math.max(1, data.pages)}
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
function Demo({ value, onChange }) {
  return (
    <label className="safety-check">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />{" "}
      Use fictional demo drivers only
    </label>
  );
}
const locate = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(new Error("Location is unavailable in this browser."));
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = p.coords.latitude,
          lng = p.coords.longitude;
        if (lat < 20 || lat > 27 || lng < 88 || lng > 93)
          return reject(new Error("Choose a location in Bangladesh."));
        resolve({ lat, lng });
      },
      () =>
        reject(
          new Error(
            "Location access failed or was denied. Check browser permission.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
function useTracking(enabled) {
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!enabled) return;
    let stopped = false,
      busy = false;
    const send = async () => {
      if (busy) return;
      busy = true;
      try {
        const p = await locate();
        if (!stopped) {
          await api("/transport/driver/location", {
            method: "PATCH",
            body: { ...p, source: "geolocation" },
          });
          if (!stopped)
            setMessage("Location sent at " + new Date().toLocaleTimeString());
        }
      } catch (e) {
        if (!stopped) setMessage(e.message);
      } finally {
        busy = false;
      }
    };
    send();
    const timer = setInterval(send, 15000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [enabled]);
  return message;
}
function PointFields({ title, value, onChange }) {
  return (
    <div className="transport-point">
      <h3>
        <MapPin size={17} />
        {title}
      </h3>
      <AddressSearch title={title} value={value} onChange={onChange} />

    </div>
  );
}
function DriverCard({ p }) {
  return (
    <article className="transport-driver">
      <div className="transport-avatar">
        <CarFront size={32} />
      </div>
      <div>
        <span className="verified">Application approved</span>
        {p.isDemo && <small className="safety-demo">Fictional driver</small>}
        <h2>
          <Link to={"/transport/drivers/" + p._id}>{p.displayName}</Link>
        </h2>
        <p>
          {p.vehicleType} · <Star size={13} />{" "}
          {p.reviewCount
            ? `${Number(p.rating).toFixed(1)} (${p.reviewCount} reviews)`
            : "No reviews yet"}
        </p>
      </div>
      <Link
        className="transport-arrow"
        aria-label={"View " + p.displayName}
        to={"/transport/drivers/" + p._id}
      >
        <ArrowRight />
      </Link>
    </article>
  );
}
export function TransportHome() {
  const { user, notify } = useApp(),
    navigate = useNavigate(),
    [vehicle, setVehicle] = useState("Car"),
    [pickup, setPickup] = useState({ address: "", lat: "", lng: "" }),
    [dropoff, setDropoff] = useState({ address: "", lat: "", lng: "" }),
    [target, setTarget] = useState("pickup"),
    [demo, setDemo] = useState(false),
    [estimate, setEstimate] = useState(null),
    [page, setPage] = useState(1),
    [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const q = useTransport(
    ["drivers", vehicle, demo, page],
    "/drivers?" + new URLSearchParams({ vehicleType: vehicle, demo, page }),
  );
  const data = () => ({ pickup, dropoff, vehicleType: vehicle });
  const estimateAction = useAction(
    async (body) => ({
      ...(await api("/transport/estimate", { method: "POST", body })),
      inputKey: JSON.stringify(body),
    }),
    setEstimate,
  );
  const requestRide = useAction(
    (body) => api("/transport/rides", { method: "POST", body }),
    (r) => navigate("/transport/rides/" + r._id),
    "Ride request recorded.",
  );
  const change = (fn, v) => {
    fn(v);
    setEstimate(null);
    setRequestKey(crypto.randomUUID());
  };
  return (
    <>
      <Nav />
      <section className="transport-hero">
        <div>
          <span className="eyebrow">YOUR NEXT CHAPTER, A LITTLE CLOSER</span>
          <h1>
            Where would you
            <br />
            like to go?
          </h1>
          <p>
            Choose your ride. Connect with an approved driver. Keep your journey
            in view.
          </p>
          <div className="transport-pills">
            <span>
              <ShieldCheck size={15} /> Reviewed applications
            </span>
            <span>
              <Radio size={15} /> Location updates
            </span>
          </div>
        </div>
        <div className="transport-hero-icon" aria-hidden="true">
          <CarFront size={110} />
          <span>Made for your everyday journeys.</span>
        </div>
      </section>
      <Notice />
      {user?.isAdmin ? (
        <div className="safety-panel">
          <h2>Moderator workspace</h2>
          <p>Use a member account to request or drive rides.</p>
          <Link className="btn primary" to="/admin/transport">
            Review drivers and alerts
          </Link>
        </div>
      ) : (
        <form
          className="transport-request"
          onSubmit={(e) => {
            e.preventDefault();
            if (!user) return navigate("/login?next=/transport");
            if (![pickup, dropoff].every(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))) return notify("Select both addresses from the suggestions, or choose them on the map.", "error");
            estimateAction.mutate(data());
          }}
        >
          <div className="safety-panel">
            <h2>1. Your route</h2>
            <PointFields
              title="Pickup"
              value={pickup}
              onChange={(v) => change(setPickup, v)}
            />
            <PointFields
              title="Dropoff"
              value={dropoff}
              onChange={(v) => change(setDropoff, v)}
            />
            <div className="transport-map-toggle">
              <button
                className={"btn " + (target === "pickup" ? "primary" : "")}
                type="button"
                onClick={() => setTarget("pickup")}
              >
                Set pickup on map
              </button>
              <button
                className={"btn " + (target === "dropoff" ? "primary" : "")}
                type="button"
                onClick={() => setTarget("dropoff")}
              >
                Set dropoff on map
              </button>
              <button
                className="btn"
                type="button"
                onClick={async () => {
                  try {
                    const point = await locate();
                    change(setPickup, { ...point, address: "Current location" });
                  } catch (e) {
                    notify(e.message, "error");
                  }
                }}
              >
                Use my location for pickup
              </button>
            </div>
            <Map
              mapLabel="Ride map. Choose pickup or destination, then click the map to set it."
              route={estimate?.inputKey === JSON.stringify(data()) ? estimate.route : []}
              points={[
                { ...pickup, label: "Pickup", color: "#577e72" },
                { ...dropoff, label: "Dropoff", color: "#925287" },
              ]}
              onPick={(p) =>
                target === "pickup"
                  ? change(setPickup, { ...p, address: "Pickup selected on map" })
                  : change(setDropoff, { ...p, address: "Destination selected on map" })
              }
            />
            <small>
              Calculate your fare to show the road route. Search suggestions and routes: Geoapify / OpenStreetMap.
            </small>

          </div>
          <aside className="safety-panel">
            <h2>2. Choose your ride</h2>
            <p>HerConnect demo rates: base fare + road distance charge, rounded to the nearest taka. No time charge, surge, tolls or extra fees are added.</p>
            <div className="transport-vehicles">
              {vehicleTypes.map((v) => (
                <label key={v} className={vehicle === v ? "selected" : ""}>
                  <input
                    name="vehicleType"
                    type="radio"
                    value={v}
                    checked={vehicle === v}
                    onChange={() => {
                      change(setVehicle, v);
                      setPage(1);
                    }}
                  />
                  {v === "Motorbike" ? <Bike /> : <CarFront />}
                  <span>
                    <strong>{v}</strong>
                    <small>
                      BDT {fareRates[v].base} + {fareRates[v].perKm}/km
                    </small>
                  </span>
                </label>
              ))}
            </div>
            <Demo
              value={demo}
              onChange={(v) => {
                change(setDemo, v);
                setPage(1);
              }}
            />
            {demo && (
              <p className="safety-demo">
                Classroom demo: only fictional drivers can match this request.
              </p>
            )}
            <label className="safety-check">
              <input type="checkbox" required /> I checked both locations and
              understand the estimated fare.
            </label>
            <Submit pending={estimateAction.isPending}>Calculate fare</Submit>
            {estimate && estimate.inputKey === JSON.stringify(data()) && (
              <div className="transport-fare">
                <span>Estimated fare · cash demonstration</span>
                <strong>{money(estimate.fare)}</strong>
                <p>{estimate.distanceKm} km by road · about {estimate.durationMinutes} min</p>
                {estimate.fareBreakdown && <dl className="fare-breakdown">
                  <div><dt>Base fare</dt><dd>{money(estimate.fareBreakdown.base)}</dd></div>
                  <div><dt>Road distance ({estimate.fareBreakdown.distanceMeters} m × BDT {estimate.fareBreakdown.perKm / 100}/km)</dt><dd>{money(estimate.fareBreakdown.distanceCharge)}</dd></div>
                  <div><dt>Rounding to nearest taka</dt><dd>{money(estimate.fareBreakdown.rounding)}</dd></div>
                  <div><dt>Total · BDT</dt><dd>{money(estimate.fare)}</dd></div>
                </dl>}
                <small>These are project rates, not official Uber or Pathao prices. The server checks the quote again when you request the ride.</small>
                <small>Route by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> / OpenStreetMap. {vehicle === "CNG" ? "CNG uses a car-route approximation; local restrictions may differ." : "Travel time does not include live traffic."}</small>
                <button
                  className="btn primary"
                  type="button"
                  disabled={requestRide.isPending || estimateAction.isPending}
                  onClick={() =>
                    requestRide.mutate({ ...data(), demo, requestKey, quotedFare: estimate.fare })
                  }
                >
                  {requestRide.isPending
                    ? "Finding a driver…"
                    : "Request nearest driver"}
                  <ArrowRight size={16} />
                </button>
                <small>
                  Drivers are ranked by proximity within 10 km, not road arrival time. Request expires after 2
                  minutes if unaccepted.
                </small>
              </div>
            )}
            <Link className="transport-text-link" to="/transport/drive">
              Want to drive? Apply here
            </Link>
          </aside>
        </form>
      )}
      <PageTitle
        title="Meet the drivers"
        description="Profile approval reflects a moderator review, not a background-check guarantee."
      />
      <QueryState query={q}>
        {q.data && (
          <>
            <div className="transport-driver-grid">
              {q.data.drivers.map((p) => (
                <DriverCard p={p} key={p._id} />
              ))}
            </div>
            {!q.data.total && (
              <div className="empty">
                <h2>No profiles in this view</h2>
                <p>
                  Try another vehicle type or enable fictional demo drivers.
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
export function TransportDriverDetail() {
  const { id } = useParams(),
    q = useTransport(["public-driver", id], "/drivers/" + id);
  return (
    <>
      <Nav />
      <QueryState query={q}>
        {q.data && (
          <>
            <PageTitle
              title={q.data.displayName}
              description={q.data.vehicleType + " driver profile"}
            />
            <div className="safety-panel">
              {q.data.isDemo && (
                <p className="safety-demo">Fictional demo driver</p>
              )}
              <p>{q.data.bio}</p>
              <p>
                <Star size={16} />{" "}
                {q.data.reviewCount
                  ? Number(q.data.rating).toFixed(1)
                  : "No rating yet"}{" "}
                · {q.data.reviewCount} reviews
              </p>
              <Link className="btn primary" to="/transport">
                Request the nearest eligible driver
              </Link>
              <p>
                Requests match by distance and availability, not by selecting a
                profile.
              </p>
            </div>
            <h2>Passenger reviews</h2>
            <div className="safety-grid">
              {q.data.reviews.map((r) => (
                <article key={r._id} className="safety-card">
                  <strong>{r.rating} / 5</strong>
                  <p>{r.comment || "No written comment."}</p>
                  <small>{at(r.createdAt)}</small>
                  {r.isDemo && (
                    <span className="safety-demo">Fictional review</span>
                  )}
                </article>
              ))}
            </div>
            {!q.data.reviews.length && (
              <div className="empty">No completed-ride reviews yet.</div>
            )}
          </>
        )}
      </QueryState>
    </>
  );
}
function DriverEditor({ profile }) {
  const save = useAction(
    (body) => api("/transport/driver", { method: "PUT", body }),
    null,
    "Driver application submitted.",
  );
  return (
    <form
      className="safety-panel"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(formData(e));
      }}
    >
      <h2>{profile ? "Update your driver application" : "Apply to drive"}</h2>
      <p>
        Changes return your profile to pending review and take you offline. Do
        not use real sensitive identity documents in this classroom prototype.
      </p>
      <Field
        label="Display name"
        name="displayName"
        defaultValue={profile?.displayName || ""}
        required
        minLength={2}
        maxLength={80}
      />
      <Field
        label="About your driving service"
        name="bio"
        as="textarea"
        defaultValue={profile?.bio || ""}
        required
        minLength={20}
        maxLength={1200}
        rows={4}
      />
      <Field
        label="Vehicle type"
        name="vehicleType"
        as="select"
        defaultValue={profile?.vehicleType || "Car"}
      >
        {opts(vehicleTypes)}
      </Field>
      <Field
        label="Vehicle number"
        name="vehicleNumber"
        defaultValue={profile?.vehicleNumber || ""}
        required
        minLength={3}
        maxLength={50}
      />
      <Field
        label="Licence number (private to you and moderators)"
        name="licenseNumber"
        defaultValue={profile?.licenseNumber || ""}
        required
        minLength={3}
        maxLength={80}
      />
      <Submit
        pending={save.isPending}
        disabled={!!profile?.activeRide || profile?.status === "suspended"}
      >
        Submit for review
      </Submit>
    </form>
  );
}
function DemoLocation({ onSend, pending }) {
  const [point, setPoint] = useState({ address: '', lat: '', lng: '' });
  return <form className="transport-demo-location" onSubmit={e => {
    e.preventDefault();
    if (Number.isFinite(point.lat) && Number.isFinite(point.lng)) onSend({ lat: point.lat, lng: point.lng, source: 'demo' });
  }}>
    <p className="safety-demo">Fictional driver: search for a location or select it on the map.</p>
    <AddressSearch title="Demo driver" value={point} onChange={setPoint} />
    <Map point={point} pointLabel="Demo driver location" mapLabel="Choose a demo driver location on the map"
      onPick={p => setPoint({ ...p, address: 'Driver location selected on map' })} />
    <Submit pending={pending} disabled={!Number.isFinite(point.lat) || !Number.isFinite(point.lng)}>Send demo location</Submit>
  </form>;
}
export function TransportDrive() {
  const q = useTransport(["own-driver"], "/driver", true),
    [sharing, setSharing] = useState(false),
    { notify } = useApp();
  const p = q.data?.profile;
  const online = useAction(
    (body) => api("/transport/driver/online", { method: "PATCH", body }),
    (data) => {
      if (!data.profile?.online) setSharing(false);
    },
    "Availability updated.",
  );
  const heartbeat = useAction(
    (body) => api("/transport/driver/location", { method: "PATCH", body }),
    null,
    "Location updated.",
  );
  const trackingMessage = useTracking(
    sharing && !!p && (p.online || !!p.activeRide),
  );
  return (
    <>
      <Nav />
      <PageTitle
        title="Your driver space"
        description="Manage your application, availability and incoming ride."
      />
      <Notice />
      <QueryState query={q}>
        {q.data && (
          <div className="transport-request">
            <div>
              {p && (
                <div className="safety-panel">
                  <h2>Application status</h2>
                  <span className={"status " + p.status}>{p.status}</span>
                  {p.isDemo && (
                    <p className="safety-demo">Fictional demo driver</p>
                  )}
                  <p>
                    {p.reason ||
                      "A moderator reviews your vehicle and application details."}
                  </p>
                  <p>
                    {p.activeRide
                      ? "Assigned to an active ride"
                      : p.online
                        ? "Online"
                        : "Offline"}{" "}
                    ·{" "}
                    {locationFresh(p.currentLocation)
                      ? "Location fresh"
                      : "Location stale or missing"}
                  </p>
                  <small>Last update: {at(p.currentLocation?.updatedAt)}</small>
                  {p.activeRide ? (
                    <Link
                      className="btn primary"
                      to={"/transport/rides/" + p.activeRide}
                    >
                      Open assigned ride <ArrowRight size={16} />
                    </Link>
                  ) : (
                    <button
                      className="btn primary"
                      disabled={online.isPending || p.status !== "approved"}
                      onClick={async () => {
                        if (p.online) {
                          online.mutate({ online: false });
                          return;
                        }
                        try {
                          const location = await locate();
                          online.mutate(
                            { online: true, location, source: "geolocation" },
                            { onSuccess: () => setSharing(true) },
                          );
                        } catch (e) {
                          notify(e.message, "error");
                        }
                      }}
                    >
                      {p.online ? "Go offline" : "Go online with my location"}
                    </button>
                  )}
                  {(p.online || p.activeRide) && (
                    <button
                      className="btn"
                      onClick={() => setSharing((v) => !v)}
                    >
                      {sharing
                        ? "Pause location sharing"
                        : "Start location sharing"}
                    </button>
                  )}
                  <p role="status">
                    {sharing
                      ? trackingMessage || "Waiting for location…"
                      : "Browser location sharing is paused."}
                  </p>
                  <p>
                    Stay on this page or share from your ride page. Locations
                    older than 90 seconds are excluded from matching.
                  </p>
                  {p.isDemo && p.status === "approved" && (
                    <DemoLocation
                      pending={online.isPending || heartbeat.isPending}
                      onSend={(loc) =>
                        p.online || p.activeRide
                          ? heartbeat.mutate(loc)
                          : online.mutate({
                              online: true,
                              location: { lat: loc.lat, lng: loc.lng },
                              source: "demo",
                            })
                      }
                    />
                  )}
                </div>
              )}
              <DriverEditor key={p?._id || "new"} profile={p} />
            </div>
            <aside>
              <div className="safety-panel">
                <Navigation size={36} />
                <h2>Keep your journey visible</h2>
                <p>
                  New requests appear here within about five seconds. You have
                  two minutes to accept. Going offline or closing the page is
                  not a way to end an assigned ride.
                </p>
                <Link className="btn" to="/transport/rides?view=driver">
                  View driver ride history
                </Link>
              </div>
            </aside>
          </div>
        )}
      </QueryState>
    </>
  );
}
export function TransportContact() {
  const q = useTransport(["contact"], "/contact"),
    save = useAction(
      (body) => api("/transport/contact", { method: "PUT", body }),
      null,
      "Emergency contact saved.",
    );
  return (
    <>
      <Nav />
      <PageTitle
        title="Someone you can turn to"
        description="Save one contact for quick access during a ride."
      />
      <Notice />
      <QueryState query={q}>
        {q.data && (
          <form
            key={q.data.name + q.data.phone}
            className="safety-panel transport-contact"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(formData(e));
            }}
          >
            <Field
              label="Contact name"
              name="name"
              defaultValue={q.data.name}
              maxLength={80}
            />
            <Field
              label="Contact phone"
              name="phone"
              defaultValue={q.data.phone}
              pattern="\+?[0-9]{3,15}"
            />
            <p>
              Only you can view this saved contact. Alerts do not automatically
              call or message them. Clear both fields to remove the contact.
            </p>
            <Submit pending={save.isPending}>Save contact</Submit>
          </form>
        )}
      </QueryState>
    </>
  );
}
export function TransportRides() {
  const [view, setView] = useState(() =>
      new URLSearchParams(window.location.search).get("view") === "driver"
        ? "driver"
        : "passenger",
    ),
    [page, setPage] = useState(1),
    q = useTransport(
      ["rides", view, page],
      "/rides?" + new URLSearchParams({ view, page }),
      true,
    );
  return (
    <>
      <Nav />
      <PageTitle
        title="Your journeys"
        description="Track active rides and revisit completed trips."
      />
      <div className="transport-map-toggle">
        <button
          className={"btn " + (view === "passenger" ? "primary" : "")}
          onClick={() => {
            setView("passenger");
            setPage(1);
          }}
        >
          As passenger
        </button>
        <button
          className={"btn " + (view === "driver" ? "primary" : "")}
          onClick={() => {
            setView("driver");
            setPage(1);
          }}
        >
          As driver
        </button>
      </div>
      <QueryState query={q}>
        {q.data && (
          <>
            <div className="safety-grid">
              {q.data.rides.map((r) => (
                <article className="safety-card" key={r._id}>
                  <span className={"status " + r.status}>
                    {r.status.replaceAll("_", " ")}
                  </span>
                  {r.isDemo && (
                    <span className="safety-demo">Fictional demo ride</span>
                  )}
                  <h2>{r.pickup.address}</h2>
                  <p>To {r.dropoff.address}</p>
                  <strong>
                    {money(r.fare)} · {r.vehicleType}
                  </strong>
                  <small>{at(r.createdAt)}</small>
                  <Link className="btn" to={"/transport/rides/" + r._id}>
                    View journey <ArrowRight size={16} />
                  </Link>
                </article>
              ))}
            </div>
            {!q.data.total && (
              <div className="empty">
                <h2>No journeys yet</h2>
                <Link className="btn primary" to="/transport">
                  Request a ride
                </Link>
              </div>
            )}
            <Pager data={q.data} page={page} setPage={setPage} />
          </>
        )}
      </QueryState>
    </>
  );
}
function ResolveAlert({ a }) {
  const action = useAction(
    (body) =>
      api("/transport/alerts/" + a._id + "/resolve", { method: "PATCH", body }),
    null,
    "Alert marked resolved.",
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        action.mutate(formData(e));
      }}
    >
      <Field
        label={"Resolution note " + a._id.slice(-5)}
        name="note"
        required
        minLength={5}
        maxLength={800}
      />
      <Submit pending={action.isPending}>Resolve alert</Submit>
    </form>
  );
}
function RideActions({ r, driver }) {
  const action = useAction(
    (body) =>
      api("/transport/rides/" + r._id + "/status", { method: "PATCH", body }),
    null,
    "Ride updated.",
  );
  return (
    <div className="safety-panel">
      <h2>Ride actions</h2>
      {driver && r.status === "requested" && (
        <button
          className="btn primary"
          disabled={action.isPending}
          onClick={() => action.mutate({ status: "accepted" })}
        >
          Accept ride
        </button>
      )}
      {driver && r.status === "accepted" && (
        <button
          className="btn primary"
          disabled={action.isPending}
          onClick={() => action.mutate({ status: "ongoing" })}
        >
          Start ride
        </button>
      )}
      {driver && r.status === "ongoing" && (
        <button
          className="btn primary"
          disabled={action.isPending}
          onClick={() => action.mutate({ status: "completed" })}
        >
          Complete ride
        </button>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action.mutate({
            status:
              driver && r.status === "requested" ? "rejected" : "cancelled",
            reason: formData(e).reason,
          });
        }}
      >
        <Field
          label="Reason for cancellation or rejection"
          name="reason"
          required
          minLength={5}
          maxLength={400}
        />
        <button className="btn" disabled={action.isPending}>
          {driver && r.status === "requested"
            ? "Reject request"
            : "Cancel ride"}
        </button>
      </form>
    </div>
  );
}
function PanicPanel({ r }) {
  const { user, notify } = useApp(),
    [waiting, setWaiting] = useState(false);
  const panic = useAction(
    (body) =>
      api("/transport/rides/" + r._id + "/panic", { method: "POST", body }),
    null,
    "Alert recorded in the app. No external message was sent.",
  );
  return (
    <div className="transport-panic">
      <h2>
        <AlertTriangle size={22} /> Need urgent help?
      </h2>
      <p>
        Record an alert for the other ride participant and moderators. No
        automatic SMS, call or police dispatch.
      </p>
      <button
        className="btn primary"
        disabled={waiting || panic.isPending}
        onClick={async () => {
          setWaiting(true);
          try {
            const location = await locate();
            panic.mutate({ source: "geolocation", location });
          } catch (e) {
            notify(
              e.message + " You can record the pickup fallback below.",
              "error",
            );
          } finally {
            setWaiting(false);
          }
        }}
      >
        {waiting ? "Getting your location…" : "Record alert at my location"}
      </button>
      <button
        className="btn"
        disabled={panic.isPending}
        onClick={() => panic.mutate({ source: "pickup" })}
      >
        Record alert using pickup location
      </button>
      <small>Pickup fallback is not your confirmed current position.</small>
      <div className="transport-call">
        <a className="btn" href="tel:999">
          <Phone size={16} /> Call 999
        </a>
        {r.emergencyContact?.phone ? (
          <a className="btn" href={"tel:" + r.emergencyContact.phone}>
            <Phone size={16} /> Call {r.emergencyContact.name}
          </a>
        ) : (
          <Link className="btn" to="/transport/contact">
            Save my emergency contact
          </Link>
        )}
      </div>
    </div>
  );
}
function RideReview({ r }) {
  const save = useAction(
    (body) =>
      api("/transport/rides/" + r._id + "/review", { method: "POST", body }),
    null,
    "Review published.",
  );
  return (
    <form
      className="safety-panel"
      onSubmit={(e) => {
        e.preventDefault();
        const d = formData(e);
        save.mutate({ rating: Number(d.rating), comment: d.comment });
      }}
    >
      <h2>How was your journey?</h2>
      <Field label="Rating" name="rating" as="select" defaultValue="5">
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {n} / 5
          </option>
        ))}
      </Field>
      <Field
        label="Your review"
        name="comment"
        as="textarea"
        maxLength={1000}
        rows={3}
      />
      <Submit pending={save.isPending}>Publish ride review</Submit>
    </form>
  );
}
export function TransportRideDetail() {
  const { id } = useParams(),
    { user } = useApp(),
    q = useTransport(["ride", id], "/rides/" + id, true),
    r = q.data,
    driver = r?.driver === user._id,
    [sharing, setSharing] = useState(false),
    trackingMessage = useTracking(
      sharing && driver && activeRideStatuses.includes(r?.status),
    );
  const heartbeat = useAction(
    (body) => api("/transport/driver/location", { method: "PATCH", body }),
    null,
    "Demo location sent.",
  );
  return (
    <>
      <Nav />
      <QueryState query={q}>
        {r && (
          <>
            <PageTitle
              title="Your journey, in view"
              description={r.vehicleType + " · " + at(r.createdAt)}
            />
            <Notice />
            {r.isDemo && (
              <p className="safety-demo">
                Fictional demo ride — not a real transport service.
              </p>
            )}
            <div className="transport-ride-status">
              <span className={"status " + r.status}>
                {r.status.replaceAll("_", " ")}
              </span>
              <strong>{money(r.fare)}</strong>
              <span>{r.distanceKm} km · {r.routeBasis === "road" ? `road route · about ${r.durationMinutes} min` : "legacy straight-line estimate"}</span>
            </div>
            {r.status === "requested" && (
              <p>
                Waiting for the assigned driver. Respond before{" "}
                {at(r.expiresAt)}. This page refreshes every five seconds.
              </p>
            )}
            {r.status === "no_driver_available" && (
              <div className="safety-panel">
                <h2>No driver accepted this request</h2>
                <p>
                  No eligible driver was available, or the request expired. A
                  fresh request is required.
                </p>
                <Link className="btn primary" to="/transport">
                  Try another request
                </Link>
              </div>
            )}
            <div className="transport-request">
              <div className="safety-panel">
                <div className="transport-route-label">
                  <span>Pickup</span>
                  <strong>{r.pickup.address}</strong>
                  <span>Dropoff</span>
                  <strong>{r.dropoff.address}</strong>
                </div>
                <Map
                  route={r.route || []}
                  points={[
                    { ...r.pickup, label: "Pickup", color: "#577e72" },
                    { ...r.dropoff, label: "Dropoff", color: "#925287" },
                    ...(r.driverLiveLocation
                      ? [
                          {
                            ...r.driverLiveLocation,
                            label:
                              "Driver · " + at(r.driverLiveLocation.updatedAt),
                            color: "#516fa2",
                          },
                        ]
                      : []),
                  ]}
                />
                <small>{r.routeBasis === "road" ? "Road route by Geoapify / OpenStreetMap. Travel time is an estimate; CNG uses car routing and rickshaw uses bicycle routing." : "This older/demo ride was stored before road routing. No road geometry is available."}</small>
                {["accepted", "ongoing"].includes(r.status) && (
                  <p role="status">
                    Driver location:{" "}
                    {r.driverLiveLocation
                      ? locationFresh(r.driverLiveLocation)
                        ? "Fresh update"
                        : "Stale — last known position"
                      : "Not yet shared"}{" "}
                    · {at(r.driverLiveLocation?.updatedAt)}
                  </p>
                )}
                <h2>
                  {driver
                    ? "Passenger: " + r.passengerName
                    : r.driverName || "Driver not assigned"}
                </h2>
                {r.vehicleNumber && <p>Vehicle: {r.vehicleNumber}</p>}
                {r.counterpart?.phone && (
                  <a href={"tel:" + r.counterpart.phone}>
                    Call {r.counterpart.name}
                  </a>
                )}
                <h3>Journey timeline</h3>
                <ol className="safety-timeline">
                  {r.history.map((h, i) => (
                    <li key={i}>
                      <strong>{h.status.replaceAll("_", " ")}</strong>
                      <small>{at(h.at)}</small>
                      <p>{h.reason}</p>
                    </li>
                  ))}
                </ol>
              </div>
              <aside>
                {activeRideStatuses.includes(r.status) && (
                  <RideActions key={r.status} r={r} driver={driver} />
                )}{" "}
                {driver && activeRideStatuses.includes(r.status) && (
                  <div className="safety-panel">
                    <h2>Share your position</h2>
                    <button
                      className="btn"
                      onClick={() => setSharing((v) => !v)}
                    >
                      {sharing
                        ? "Pause location sharing"
                        : "Share live location"}
                    </button>
                    <p role="status">
                      {sharing
                        ? trackingMessage || "Waiting for location…"
                        : "Sharing is paused on this page."}
                    </p>
                    {r.ownDriverIsDemo && (
                      <DemoLocation
                        onSend={heartbeat.mutate}
                        pending={heartbeat.isPending}
                      />
                    )}
                  </div>
                )}
                {activeRideStatuses.includes(r.status) && <PanicPanel r={r} />}{" "}
                {r.alerts.map((a) => (
                  <div className="transport-alert" key={a._id}>
                    <h2>
                      {a.status === "active"
                        ? "Active ride alert"
                        : "Resolved ride alert"}
                    </h2>
                    <p>
                      Raised {at(a.location.updatedAt)} ·{" "}
                      {a.location.source === "pickup"
                        ? "Pickup fallback"
                        : "Reported device location"}
                    </p>
                    <p>
                      Coordinates: {a.location.lat}, {a.location.lng}
                    </p>
                    {a.status === "resolved" ? (
                      <p>{a.note}</p>
                    ) : (
                      a.triggeredBy === user._id && <ResolveAlert a={a} />
                    )}
                  </div>
                ))}
                {r.status === "completed" &&
                  r.passenger === user._id &&
                  !r.review && <RideReview r={r} />}{" "}
                {r.review && (
                  <div className="safety-panel">
                    <h2>Ride review · {r.review.rating}/5</h2>
                    <p>{r.review.comment || "No written comment."}</p>
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
function DriverDecision({ p }) {
  const save = useAction(
    (body) =>
      api("/transport/admin/drivers/" + p._id, { method: "PATCH", body }),
    null,
    "Driver decision recorded.",
  );
  return (
    <form
      className="safety-panel"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ ...formData(e), expectedVersion: p.history.length });
      }}
    >
      <h2>{p.displayName}</h2>
      <span className={"status " + p.status}>{p.status}</span>
      {p.isDemo && <p className="safety-demo">Fictional driver</p>}
      <p>
        {p.user?.email} · {p.vehicleType}
      </p>
      <p>
        Vehicle: {p.vehicleNumber} · Licence: {p.licenseNumber}
      </p>
      <p>{p.bio}</p>
      <Field
        label={"Decision for " + p.displayName}
        name="status"
        as="select"
        defaultValue="approved"
      >
        {opts(["approved", "rejected", "suspended"])}
      </Field>
      <Field
        label={"Reason for " + p.displayName}
        name="reason"
        required
        minLength={5}
        maxLength={800}
      />
      <Submit pending={save.isPending}>Save driver decision</Submit>
      <details>
        <summary>Decision history</summary>
        {p.history.map((h, i) => (
          <p key={i}>
            {h.status} · {at(h.at)} · {h.reason}
          </p>
        ))}
      </details>
    </form>
  );
}
export function TransportAdmin() {
  const [tab, setTab] = useState("drivers"),
    [status, setStatus] = useState("pending"),
    [page, setPage] = useState(1),
    q = useTransport(
      ["admin", tab, status, page],
      "/admin/" + tab + "?" + new URLSearchParams({ status, page }),
      true,
    );
  return (
    <>
      <Nav />
      <PageTitle
        title="Transport moderation"
        description="Review driver applications and recorded ride alerts."
      />
      <div className="transport-map-toggle">
        <button
          className={"btn " + (tab === "drivers" ? "primary" : "")}
          onClick={() => {
            setTab("drivers");
            setStatus("pending");
            setPage(1);
          }}
        >
          Driver applications
        </button>
        <button
          className={"btn " + (tab === "alerts" ? "primary" : "")}
          onClick={() => {
            setTab("alerts");
            setStatus("active");
            setPage(1);
          }}
        >
          Ride alerts
        </button>
      </div>
      <Field
        label="Filter status"
        as="select"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          setPage(1);
        }}
      >
        {opts(
          tab === "drivers"
            ? ["pending", "approved", "rejected", "suspended"]
            : ["active", "resolved"],
        )}
      </Field>
      <QueryState query={q}>
        {q.data && (
          <>
            {tab === "drivers" ? (
              <div className="transport-driver-grid">
                {q.data.drivers.map((p) => (
                  <DriverDecision key={p._id + ":" + p.history.length} p={p} />
                ))}
              </div>
            ) : (
              <div className="safety-grid">
                {q.data.alerts.map((a) => (
                  <article className="transport-alert" key={a._id}>
                    <h2>
                      {a.status === "active"
                        ? "Active alert"
                        : "Resolved alert"}
                    </h2>
                    {a.ride?.isDemo && (
                      <span className="safety-demo">Fictional ride</span>
                    )}
                    <p>Reporter: {a.triggeredBy?.name}</p>
                    {a.triggeredBy?.phone && (
                      <a href={"tel:" + a.triggeredBy.phone}>Call reporter</a>
                    )}
                    <p>
                      Ride: {a.ride?.status} · {a.ride?.driverName}
                    </p>
                    <p>
                      Raised {at(a.location.updatedAt)} · {a.location.source}
                    </p>
                    <p>
                      Location: {a.location.lat}, {a.location.lng}
                    </p>
                    <Map
                      point={a.location}
                      pointLabel="Recorded alert location"
                    />
                    {a.status === "active" ? (
                      <ResolveAlert a={a} />
                    ) : (
                      <p>{a.note}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
            {!q.data.total && (
              <div className="empty">No entries in this queue.</div>
            )}
            <Pager data={q.data} page={page} setPage={setPage} />
          </>
        )}
      </QueryState>
    </>
  );
}
