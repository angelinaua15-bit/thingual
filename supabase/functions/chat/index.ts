// Supabase Edge Function: AI conversation partner for practising a language in real situations.
const MODEL = Deno.env.get('CHAT_MODEL') ?? 'claude-haiku-5-5';

type Msg = { role: 'user' | 'assistant'; content: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const { messages, scenario, target, native, level } = (await req.json()) as { messages: Msg[]; scenario: string; target: string; native: string; level: string };
    if (!Array.isArray(messages) || !target) return json({ error: 'bad request' }, 400);
    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) return json({ error: 'no_key' });
    const history = messages.slice(-16).map((m) => ({ role: m.role, content: String(m.content).slice(0, 600) }));
    if (!history.length || history[0].role !== 'user') history.unshift({ role: 'user', content: '(start the conversation)' });
    const system =
      `You are a friendly conversation partner in a language-learning app. Role-play this situation: "${scenario}". ` +
      `Speak ONLY in the language with code "${target}", at CEFR level ${level || 'A2'}: short sentences (1–3), everyday words, ask one simple question to keep the dialogue going. Stay in character. ` +
      `Keep it safe and kind for all ages; refuse anything inappropriate and steer back to the situation. ` +
      `If the learner's LAST message has mistakes (grammar, wrong word, unnatural phrasing), give a short correction in the language with code "${native}" (max 2 sentences) including the corrected sentence. If it was fine or there is no learner message yet, correction is null. ` +
      `Also give a translation of your reply into "${native}". ` +
      `Answer with JSON only: {"reply": "...", "translation": "...", "correction": null | "..."}`;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 500, system, messages: history }),
    });
    if (!res.ok) return json({ error: 'api_' + res.status });
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? '{}';
    let parsed: { reply?: string; translation?: string; correction?: string | null } = {};
    try { parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); } catch { parsed = { reply: text }; }
    return json({ reply: parsed.reply ?? '', translation: parsed.translation ?? '', correction: parsed.correction ?? null });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
