// Approximate, city-level location from Vercel's edge network (no GPS, no permission prompt).
// Used so posts can appear on the world map even when the browser blocks geolocation.
export const config = { runtime: 'edge' };

export default function handler(req) {
  const h = req.headers;
  const dec = (v) => { try { return v ? decodeURIComponent(v) : null; } catch { return v; } };
  const body = {
    city: dec(h.get('x-vercel-ip-city')),
    country: h.get('x-vercel-ip-country'),
    lat: h.get('x-vercel-ip-latitude') ? Number(h.get('x-vercel-ip-latitude')) : null,
    lng: h.get('x-vercel-ip-longitude') ? Number(h.get('x-vercel-ip-longitude')) : null,
  };
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' },
  });
}
