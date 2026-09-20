import { fareRates, availableVehicleTypes } from '../shared/transport.js';
import { distanceKm } from '../shared/safety.js';
import { fail } from './auth.js';
const cache = new Map();
// One API process for the course app; a shared cache is useful only for multi-server deployment.
async function provider(path, params) {
  const apiKey = process.env.GEOAPIFY_API_KEY?.trim();
  if (!apiKey) fail(503, 'Address search and road routing need GEOAPIFY_API_KEY on the server.');
  const url = new URL('https://api.geoapify.com/v1/' + path);
  url.search = new URLSearchParams({ ...params, apiKey });
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if ([401, 403].includes(response.status)) fail(503, 'Address service is not configured correctly. Ask the project owner to check the server Geoapify key and its restrictions.');
    if (response.status === 429) fail(503, 'Address service usage limit reached. Please try again later or choose a map point.');
    if (!response.ok) fail(503, 'Map service unavailable or its usage limit was reached. Please try later.');
    return await response.json();
  } catch (error) {
    if (error.status) throw error;
    // Never expose the request URL, provider response, or API key in errors/logs.
    fail(503, 'Could not reach the map service. Please retry.');
  }
}
export async function addressSuggestions(query) {
  const data = await provider('geocode/autocomplete', {
    text: query, filter: 'countrycode:bd', limit: '8', format: 'json',
  });
  if (!Array.isArray(data.results)) fail(502, 'Address search returned an invalid response.');
  return data.results.filter(p => p.country_code === 'bd' && Number.isFinite(p.lat) && Number.isFinite(p.lon))
    .map(p => ({ address: String(p.formatted || p.address_line1 || '').slice(0, 160), lat: p.lat, lng: p.lon }))
    .filter(p => p.address.length >= 3 && p.lat >= 20 && p.lat <= 27 && p.lng >= 88 && p.lng <= 93);
}
export const routeModes = { Car: 'drive', CNG: 'drive', Motorbike: 'motorcycle', Rickshaw: 'bicycle' };
export async function roadQuote(pickup, dropoff, vehicle) {
  if (!availableVehicleTypes.includes(vehicle)) fail(400, 'Choose Car, CNG or Motorbike.');
  const direct = distanceKm(pickup, dropoff);
  if (direct < 0.1 || direct > 100) fail(400, 'Choose points between 0.1 and 100 km apart.');
  const key = JSON.stringify([pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, vehicle]);
  const cached = cache.get(key);
  if (cached && cached.until > Date.now()) return cached.value;
  const mode = routeModes[vehicle];
  const data = await provider('routing', {
    waypoints: `${pickup.lat},${pickup.lng}|${dropoff.lat},${dropoff.lng}`,
    mode, units: 'metric', format: 'geojson',
  });
  const feature = data.features?.[0], p = feature?.properties;
  if (!feature) fail(422, 'No road route found. Move the points closer to an accessible road.');
  const lines = feature.geometry?.type === 'MultiLineString' ? feature.geometry.coordinates
    : feature.geometry?.type === 'LineString' ? [feature.geometry.coordinates] : null;
  if (!Array.isArray(lines) || !lines.length || !lines.every(line => Array.isArray(line) && line.length >= 2 && line.every(point =>
    Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
    Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90)) ||
    !Number.isFinite(p?.distance) || !Number.isFinite(p?.time) || p.time <= 0) {
    fail(502, 'Map service returned an invalid route. Please retry.');
  }
  if (lines.reduce((n, line) => n + line.length, 0) > 20000) fail(502, "The returned route is too detailed. Choose a shorter route.");
  const km = p.distance / 1000;
  if (km < 0.1 || km > 100) fail(422, 'The road route must be between 0.1 and 100 km. Choose a closer destination.');
  const first = lines[0][0], last = lines.at(-1).at(-1);
  if (distanceKm(pickup, { lat: first[1], lng: first[0] }) > 0.5 ||
      distanceKm(dropoff, { lat: last[1], lng: last[0] }) > 0.5) {
    fail(422, 'A selected point is too far from a routable road. Move it closer and try again.');
  }
  const base = fareRates[vehicle].base * 100;
  const perKm = fareRates[vehicle].perKm * 100;
  const distanceCharge = Math.round(perKm * km);
  const fare = Math.round((base + distanceCharge) / 100) * 100;
  const value = {
    distanceKm: Math.round(km * 100) / 100,
    durationMinutes: Math.max(1, Math.round(p.time / 60)),
    fare,
    fareBreakdown: { base, perKm, distanceMeters: p.distance, distanceCharge, rounding: fare - base - distanceCharge },
    route: lines.map(line => line.map(([lng, lat]) => [lat, lng])),
    routeBasis: 'road', routeProvider: 'Geoapify', routingMode: mode,
  };
  for (const [k, item] of cache) if (item.until <= Date.now()) cache.delete(k);
  if (cache.size >= 256) cache.delete(cache.keys().next().value);
  cache.set(key, { until: Date.now() + 5 * 60000, value });
  return value;
}
