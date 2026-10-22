// Supabase Edge Function: permanently deletes the caller's account (App Store guideline 5.1.1(v)).
// Removes their photos from storage, then the auth user; database rows cascade.
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: { user }, error } = await admin.auth.getUser(jwt);
    if (error || !user) return json({ error: 'unauthorized' }, 401);
    for (const bucket of ['avatars', 'posts']) {
      const { data: files } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
      if (files?.length) await admin.storage.from(bucket).remove(files.map((f) => `${user.id}/${f.name}`));
    }
    await admin.from('posts').delete().eq('author_id', user.id);
    await admin.from('profiles').delete().eq('id', user.id);
    const { error: delError } = await admin.auth.admin.deleteUser(user.id);
    if (delError) return json({ error: delError.message }, 500);
    return json({ deleted: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
