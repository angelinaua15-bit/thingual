// Supabase Edge Function: checks a photo before it is published to the map / feed.
// Uses the same ANTHROPIC_API_KEY secret as `recognize`. The photo is processed in memory and not stored.
const MODEL = Deno.env.get('MODERATION_MODEL') ?? Deno.env.get('VISION_MODEL') ?? 'claude-haiku-5-5';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const { image } = (await req.json()) as { image: string };
    if (!image) return json({ error: 'image required' }, 400);
    if (image.length > 4_000_000) return json({ error: 'image too large' }, 413);
    const key = Deno.env.get('ANTHROPIC_API_KEY');
    // without a key we can't check — don't block people from posting
    if (!key) return json({ allowed: true, checked: false });
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 120,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            {
              type: 'text',
              text:
                'You moderate photos for a public, all-ages language-learning app where people share photos of everyday objects. ' +
                'Reject the photo if it contains: nudity or sexual content; graphic violence, blood or injury; weapons shown threateningly; drugs; hate symbols; ' +
                'identity documents, bank cards, or readable personal data (addresses, phone numbers); a clearly identifiable child as the main subject; or content meant to shock or harass. ' +
                'Everyday objects, food, animals, places, landscapes and ordinary people in the background are fine. ' +
                'Reply with JSON only: {"allowed": true|false, "reason": "<short reason in English or empty>"}',
            },
          ],
        }],
      }),
    });
    if (!res.ok) return json({ allowed: true, checked: false });
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? '{}';
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    return json({ allowed: parsed.allowed !== false, reason: String(parsed.reason ?? ''), checked: true });
  } catch (e) {
    return json({ allowed: true, checked: false, error: String(e) });
  }
});

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
