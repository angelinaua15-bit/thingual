// Chapter list of a LibriVox audiobook from the Internet Archive, relayed with CORS and caching.
// Only identifiers that look like archive.org items are accepted.
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^[A-Za-z0-9._-]{3,100}$/.test(id)) return json({ error: 'bad id' }, 400);
  const res = await fetch(`https://archive.org/metadata/${id}/files`);
  if (!res.ok) return json({ error: 'archive ' + res.status }, 502);
  const data = await res.json();
  const result = (data.result ?? [])
    .filter((f) => typeof f.name === 'string' && f.name.toLowerCase().endsWith('.mp3'))
    .map((f) => ({ name: f.name, format: f.format, title: f.title, length: f.length, track: f.track }));
  return json({ result }, 200, 'public, max-age=86400, s-maxage=604800');
}

const json = (body, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': cache, 'access-control-allow-origin': '*' } });
