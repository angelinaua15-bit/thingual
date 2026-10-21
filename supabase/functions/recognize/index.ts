// Supabase Edge Function: recognise the object in a cropped photo and map it to a concept id.
// Deploy:  supabase functions deploy recognize
// Secret:  supabase secrets set ANTHROPIC_API_KEY=...
// The photo fragment is processed in memory and never stored (spec §4, §8).

const MODEL = Deno.env.get('VISION_MODEL') ?? 'claude-haiku-5-5';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const { image, concepts } = (await req.json()) as { image: string; concepts: string[] };
    if (!image || !Array.isArray(concepts)) return json({ error: 'image and concepts are required' }, 400);
    if (image.length > 4_000_000) return json({ error: 'image too large' }, 413);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
              {
                type: 'text',
                text:
                  `Which single object is the main subject of this photo? Choose from this list of ids: ${concepts.join(', ')}. ` +
                  'Reply with JSON only: {"concept": "<id or null>", "confidence": <0..1>, "alternatives": ["<id>", "<id>"]}. ' +
                  'Use null when none of the ids fit.',
              },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return json({ concept: null, confidence: 0, alternatives: [] }, 200);
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? '{}';
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    const valid = (id: unknown) => typeof id === 'string' && concepts.includes(id);
    return json({
      concept: valid(parsed.concept) ? parsed.concept : null,
      confidence: Number(parsed.confidence) || 0,
      alternatives: (parsed.alternatives ?? []).filter(valid).slice(0, 3),
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
