import { useEffect, useRef, useState } from "react";
import * as L from "./vendor/leaflet/leaflet-src.esm.js";
import "./vendor/leaflet/leaflet.css";
export default function SafetyMap({
  point,
  points = [],
  onPick,
  pointLabel = "Selected incident location",
  mapLabel,
  routeLine = false,
}) {
  const host = useRef(null),
    map = useRef(null),
    layer = useRef(null),
    pick = useRef(onPick);
  const [failed, setFailed] = useState(false);
  pick.current = onPick;
  useEffect(() => {
    const m = L.map(host.current, { scrollWheelZoom: false }).setView(
      [23.8103, 90.4125],
      12,
    );
    map.current = m;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
      .on("tileerror", () => setFailed(true))
      .addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("click", (e) =>
      pick.current?.({
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      }),
    );
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    layer.current.clearLayers();
    const all = (point ? [{ ...point, label: pointLabel }] : points).filter(
      (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng),
    );
    all
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .forEach((p) => {
        const marker = L.circleMarker([p.lat, p.lng], {
          radius: p.count ? Math.min(24, 10 + p.count) : 9,
          color: p.color || "#803a67",
          fillColor: p.color || "#c7769c",
          fillOpacity: 0.75,
        }).addTo(layer.current);
        const label = document.createElement("span");
        label.textContent = p.label || `${p.count} reports`;
        marker.bindPopup(label);
      });
    if (routeLine && all.length >= 2)
      L.polyline(
        all.slice(0, 2).map((p) => [p.lat, p.lng]),
        { color: "#9e749d", dashArray: "6 8", weight: 3 },
      ).addTo(layer.current);
    if (point && Number.isFinite(point.lat) && Number.isFinite(point.lng))
      m.panTo([point.lat, point.lng]);
    else if (all.length)
      m.fitBounds(
        all.map((p) => [p.lat, p.lng]),
        { padding: [35, 35], maxZoom: 14 },
      );
  }, [point, points, pointLabel, routeLine]);
  return (
    <div className="safety-map-wrap">
      <div
        ref={host}
        className="safety-map"
        role="region"
        aria-label={
          mapLabel ||
          (onPick
            ? "Incident location map. You can also use the coordinate fields."
            : "Report location map")
        }
      />
      {failed && (
        <p role="status">
          Map tiles could not load. You can still use the coordinates and lists.
        </p>
      )}
      <small>
        Map © OpenStreetMap. Map requests share the viewed area with the tile
        provider.
      </small>
    </div>
  );
}
