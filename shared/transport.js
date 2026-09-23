import { distanceKm } from "./safety.js";
export const vehicleTypes = ["Car", "CNG", "Motorbike", "Rickshaw"];
// Keep legacy values readable in stored profiles and rides. New requests use availableVehicleTypes.
export const availableVehicleTypes = ["Car", "CNG", "Motorbike"];
export const activeRideStatuses = ["requested", "accepted", "ongoing"];
export const fareRates = {
  Car: { base: 80, perKm: 30 },
  CNG: { base: 50, perKm: 22 },
  Motorbike: { base: 30, perKm: 15 },
  Rickshaw: { base: 20, perKm: 12 },
};
export const locationFresh = (p, now = Date.now()) =>
  !!p?.updatedAt &&
  +new Date(p.updatedAt) <= now &&
  now - new Date(p.updatedAt) <= 90000;
export function fareQuote(pickup, dropoff, vehicleType) {
  const km = distanceKm(pickup, dropoff),
    rate = fareRates[vehicleType];
  if (!rate || !Number.isFinite(km) || km < 0.1 || km > 100)
    throw new Error("Choose points between 0.1 and 100 km apart.");
  return {
    distanceKm: Math.round(km * 100) / 100,
    fare: Math.round(rate.base + rate.perKm * km) * 100,
  };
}
export function canRideTransition(ride, actor, next) {
  const passenger = String(ride.passenger) === String(actor),
    driver = !!ride.driver && String(ride.driver) === String(actor);
  if (next === "cancelled")
    return (passenger || driver) && activeRideStatuses.includes(ride.status);
  if (!driver) return false;
  return (
    (ride.status === "requested" && ["accepted", "rejected"].includes(next)) ||
    (ride.status === "accepted" && next === "ongoing") ||
    (ride.status === "ongoing" && next === "completed")
  );
}
export function nearestDrivers(profiles, pickup, now = Date.now()) {
  return profiles
    .filter(
      (p) =>
        p.status === "approved" &&
        p.online &&
        !p.activeRide &&
        locationFresh(p.currentLocation, now),
    )
    .map((p) => ({
      ...p,
      pickupDistanceKm: distanceKm(p.currentLocation, pickup),
    }))
    .filter((p) => p.pickupDistanceKm <= 10)
    .sort(
      (a, b) =>
        a.pickupDistanceKm - b.pickupDistanceKm ||
        String(a._id).localeCompare(String(b._id)),
    );
}
