// Offline fixture: never calls Geoapify or uses a real API key.
export function mockRoadProvider(t) {
  const original = process.env.GEOAPIFY_API_KEY;
  process.env.GEOAPIFY_API_KEY = 'offline-test-key';
  t.after(() => { if (original === undefined) delete process.env.GEOAPIFY_API_KEY; else process.env.GEOAPIFY_API_KEY = original; });
  return t.mock.method(globalThis, 'fetch', async input => {
    const url = new URL(input);
    if (url.pathname.endsWith('autocomplete')) return {
      ok: true, json: async () => ({ results: [{ country_code: 'bd', formatted: 'Dhanmondi, Dhaka', lat: 23.746, lon: 90.376 }] }),
    };
    const [a, b] = url.searchParams.get('waypoints').split('|').map(p => p.split(',').map(Number));
    return { ok: true, json: async () => ({ features: [{ properties: { distance: 2000, time: 480 },
      geometry: { type: 'MultiLineString', coordinates: [[[a[1],a[0]],[a[1]+.003,(a[0]+b[0])/2],[b[1],b[0]]]] } }] }) };
  });
}
