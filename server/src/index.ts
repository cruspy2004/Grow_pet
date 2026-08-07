import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Env = {
  DB: D1Database;
  APP_ORIGIN: string;
  MAGIC_LINK_TTL_SECONDS: string;
  SNAPSHOT_MAX_BYTES: string;
  MAGIC_LINK_SIGNING_KEY?: string;
  RESEND_API_KEY?: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: (origin) => origin,
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['authorization', 'content-type']
}));

app.get('/', (c) => c.json({ ok: true, service: 'grow-buddy', version: 1 }));

// ---------- helpers ----------

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

function newShareCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
}

async function requireUser(c: any): Promise<{ id: string; email: string } | null> {
  const auth = c.req.header('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000);
  const row = await c.env.DB.prepare(
    'SELECT u.id AS id, u.email AS email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?1'
  ).bind(token).first<{ id: string; email: string }>();
  if (!row) return null;
  c.executionCtx.waitUntil(
    c.env.DB.prepare('UPDATE sessions SET last_seen_at = ?1 WHERE token = ?2').bind(now, token).run()
  );
  return row;
}

async function sendMagicLinkEmail(env: Env, email: string, code: string) {
  if (!env.RESEND_API_KEY) {
    console.log(`[dev] magic link for ${email}: ${code}`);
    return;
  }
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Grow Buddy <no-reply@growbuddy.app>',
        to: [email],
        subject: 'Your Grow Buddy sign-in code',
        text: `Your Grow Buddy sign-in code is: ${code}\n\nIt expires in 15 minutes.`
      })
    });
  } catch (error) {
    console.error('magic-link email failed', error);
  }
}

// ---------- auth ----------

app.post('/v1/auth/magic-link', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return c.json({ error: 'invalid_email' }, 400);
  }
  const code = newShareCode();
  const now = Math.floor(Date.now() / 1000);
  const ttl = Math.max(60, Number(c.env.MAGIC_LINK_TTL_SECONDS) || 900);
  await c.env.DB.prepare(
    'INSERT INTO magic_codes (code, email, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)'
  ).bind(code, email, now, now + ttl).run();
  await sendMagicLinkEmail(c.env, email, code);
  return c.json({ ok: true });
});

app.post('/v1/auth/verify', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body?.email || '').trim().toLowerCase();
  const code = String(body?.code || '').trim().toUpperCase();
  if (!email || !code) return c.json({ error: 'invalid_input' }, 400);
  const now = Math.floor(Date.now() / 1000);
  const row = await c.env.DB.prepare(
    'SELECT code, email, expires_at, consumed_at FROM magic_codes WHERE code = ?1 AND email = ?2'
  ).bind(code, email).first<{ code: string; email: string; expires_at: number; consumed_at: number | null }>();
  if (!row) return c.json({ error: 'invalid_code' }, 401);
  if (row.consumed_at) return c.json({ error: 'code_used' }, 401);
  if (row.expires_at < now) return c.json({ error: 'code_expired' }, 401);
  await c.env.DB.prepare('UPDATE magic_codes SET consumed_at = ?1 WHERE code = ?2').bind(now, code).run();

  let user = await c.env.DB.prepare('SELECT id, email FROM users WHERE email = ?1')
    .bind(email).first<{ id: string; email: string }>();
  if (!user) {
    const id = newId('u');
    await c.env.DB.prepare('INSERT INTO users (id, email, created_at) VALUES (?1, ?2, ?3)')
      .bind(id, email, now).run();
    user = { id, email };
  }
  const token = newId('t');
  await c.env.DB.prepare(
    'INSERT INTO sessions (token, user_id, created_at, last_seen_at) VALUES (?1, ?2, ?3, ?3)'
  ).bind(token, user.id, now).run();
  return c.json({ token, user });
});

app.post('/v1/auth/logout', async (c) => {
  const auth = c.req.header('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (token) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?1').bind(token).run();
  }
  return c.json({ ok: true });
});

// ---------- shares ----------

app.post('/v1/shares', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: 'unauthenticated' }, 401);
  const body = await c.req.json().catch(() => ({}));
  const goalLabel = String(body?.goalLabel || body?.goalId || '').slice(0, 120);
  const code = newShareCode();
  const now = Math.floor(Date.now() / 1000);
  await c.env.DB.prepare(
    'INSERT INTO shares (code, owner_user_id, goal_label, created_at) VALUES (?1, ?2, ?3, ?4)'
  ).bind(code, user.id, goalLabel, now).run();
  await c.env.DB.prepare(
    'INSERT INTO share_participants (share_code, user_id, joined_at) VALUES (?1, ?2, ?3)'
  ).bind(code, user.id, now).run();
  return c.json({ ok: true, code });
});

app.post('/v1/shares/:code/join', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: 'unauthenticated' }, 401);
  const code = c.req.param('code');
  const share = await c.env.DB.prepare('SELECT code, owner_user_id, goal_label FROM shares WHERE code = ?1')
    .bind(code).first<{ code: string; owner_user_id: string; goal_label: string }>();
  if (!share) return c.json({ error: 'not_found' }, 404);
  const now = Math.floor(Date.now() / 1000);
  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO share_participants (share_code, user_id, joined_at) VALUES (?1, ?2, ?3)'
  ).bind(code, user.id, now).run();
  const ownerRow = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?1')
    .bind(share.owner_user_id).first<{ email: string }>();
  return c.json({
    ok: true,
    code,
    goalLabel: share.goal_label,
    friendLabel: ownerRow?.email || ''
  });
});

app.get('/v1/shares/:code/snapshot', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: 'unauthenticated' }, 401);
  const code = c.req.param('code');
  const participant = await c.env.DB.prepare(
    'SELECT 1 FROM share_participants WHERE share_code = ?1 AND user_id = ?2'
  ).bind(code, user.id).first();
  if (!participant) return c.json({ error: 'forbidden' }, 403);
  const row = await c.env.DB.prepare('SELECT payload, reported_at FROM snapshots WHERE share_code = ?1')
    .bind(code).first<{ payload: string; reported_at: number }>();
  if (!row) return c.json({ shareCode: code, snapshot: null });
  return c.json({ shareCode: code, reportedAt: row.reported_at, ...JSON.parse(row.payload) });
});

app.post('/v1/shares/:code/snapshot', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: 'unauthenticated' }, 401);
  const code = c.req.param('code');
  const share = await c.env.DB.prepare('SELECT owner_user_id FROM shares WHERE code = ?1')
    .bind(code).first<{ owner_user_id: string }>();
  if (!share) return c.json({ error: 'not_found' }, 404);
  if (share.owner_user_id !== user.id) return c.json({ error: 'not_owner' }, 403);
  const raw = await c.req.text();
  const maxBytes = Math.max(1024, Number(c.env.SNAPSHOT_MAX_BYTES) || 8192);
  if (raw.length > maxBytes) return c.json({ error: 'payload_too_large' }, 413);
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { return c.json({ error: 'invalid_json' }, 400); }
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    goalName: String(parsed.goalName || ''),
    actual: Number(parsed.actual) || 0,
    ideal: Number(parsed.ideal) || 0,
    actualRatio: Number(parsed.actualRatio) || 0,
    idealRatio: Number(parsed.idealRatio) || 0,
    isBehind: Boolean(parsed.isBehind),
    isComplete: Boolean(parsed.isComplete)
  });
  await c.env.DB.prepare(
    'INSERT INTO snapshots (share_code, reported_at, payload) VALUES (?1, ?2, ?3) ' +
    'ON CONFLICT(share_code) DO UPDATE SET reported_at = ?2, payload = ?3'
  ).bind(code, now, payload).run();
  return c.json({ ok: true });
});

app.get('/v1/me/shares', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: 'unauthenticated' }, 401);
  const rows = await c.env.DB.prepare(
    'SELECT s.code AS code, s.owner_user_id AS owner, s.goal_label AS goalLabel ' +
    'FROM share_participants p JOIN shares s ON s.code = p.share_code WHERE p.user_id = ?1'
  ).bind(user.id).all();
  return c.json({ shares: rows.results || [] });
});

app.delete('/v1/shares/:code', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: 'unauthenticated' }, 401);
  const code = c.req.param('code');
  const share = await c.env.DB.prepare('SELECT owner_user_id FROM shares WHERE code = ?1')
    .bind(code).first<{ owner_user_id: string }>();
  if (!share) return c.json({ error: 'not_found' }, 404);
  if (share.owner_user_id !== user.id) return c.json({ error: 'not_owner' }, 403);
  await c.env.DB.prepare('DELETE FROM shares WHERE code = ?1').bind(code).run();
  return c.json({ ok: true });
});

export default app;
