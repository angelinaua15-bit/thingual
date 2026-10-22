// Supabase Edge Function: enrich a word the learner wrote themselves (abstract words, verbs, anything).
// Returns translation, IPA transcription, a memorable association (mnemonic), an example and an emoji.
const MODEL = Deno.env.get('WORD_MODEL') ?? 'claude-haiku-5-5';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const body = (await req.json()) as { word?: string; target?: string; native?: string; translation?: string; level?: string };
    const word = String(body.word ?? '').trim().slice(0, 80);
    const target = String(body.target ?? '').slice(0, 10);
    const native = String(body.native ?? 'en').slice(0, 10);
    if (!word || !target) return json({ error: 'bad request' }, 400);
    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) return json({ error: 'no_key' });
    const system =
      `You help a language learner build a personal vocabulary. The learner studies the language with code "${target}" and speaks the language with code "${native}". ` +
      `They typed a word or short expression; it may be written in either language, possibly misspelled. ` +
      `Work out the intended "${target}" word or expression (correct spelling; for nouns in languages with grammatical gender include the article, e.g. "la libertad", "die Freiheit"). ` +
      `Return: "word" — the ${target} form; "translation" — the most common meaning(s) in ${native}, short (max 4 words, use commas for alternatives); ` +
      `"ipa" — IPA transcription of "word" between slashes, as a native speaker says it; for languages with non-Latin script also fill "roman" with a learner-friendly romanization (else null); ` +
      `"pos" — part of speech written in ${native}, one word; ` +
      `"association" — a vivid, memorable mnemonic in ${native} (1–2 short sentences) that links how the ${target} word SOUNDS or looks to its meaning (sound-alike keyword method, a mini-scene, or a word-root hint); kind and suitable for all ages; ` +
      `"example" — one natural, simple ${target} sentence (CEFR ${body.level || 'A2'}) using the word; "exampleTr" — its ${native} translation; ` +
      `"emoji" — one emoji that best represents the meaning. ` +
      `If the input is not a real word in either language, or is offensive, return {"error":"unknown"}. ` +
      `Answer with JSON only: {"word":"","translation":"","ipa":"","roman":null,"pos":"","association":"","example":"","exampleTr":"","emoji":""}`;
    const user = body.translation ? `Word: ${word}\nMeaning the learner has in mind: ${String(body.translation).slice(0, 80)}` : `Word: ${word}`;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 400, system, messages: [{ role: 'user', content: user }] }),
    });
    if (!res.ok) {
      // log the provider's reason (no secrets in it) so problems with the key, balance or model are visible in Supabase logs
      const detail = (await res.text()).slice(0, 300);
      console.error('anthropic error', res.status, detail);
      return json({ error: 'api_' + res.status, detail });
    }
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? '{}';
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); } catch { console.error('parse', text.slice(0, 200)); return json({ error: 'parse' }); }
    if (parsed.error) return json({ error: String(parsed.error) });
    const s = (k: string, max = 300) => (typeof parsed[k] === 'string' ? (parsed[k] as string).slice(0, max) : '');
    return json({ word: s('word', 80) || word, translation: s('translation', 120), ipa: s('ipa', 80), roman: s('roman', 80) || null, pos: s('pos', 30), association: s('association', 400), example: s('example', 200), exampleTr: s('exampleTr', 200), emoji: s('emoji', 16) });
  } catch (e) {
    console.error('word failed', String(e));
    return json({ error: String(e) }, 500);
  }
});

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
