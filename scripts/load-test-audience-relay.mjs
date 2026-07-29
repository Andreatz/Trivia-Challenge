import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const adminEmail = process.env.AUDIENCE_ADMIN_EMAIL;
const adminPassword = process.env.AUDIENCE_ADMIN_PASSWORD;
const relayUrl = process.env.AUDIENCE_RELAY_URL || 'http://127.0.0.1:8787';
const origin = process.env.AUDIENCE_APP_ORIGIN || 'http://127.0.0.1:5173';
const clients = Number.parseInt(process.env.CLIENTS || '500', 10);
const concurrency = Number.parseInt(process.env.CONCURRENCY || '40', 10);

if (!supabaseUrl || !publishableKey || !adminEmail || !adminPassword) {
  throw new Error('Imposta SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, AUDIENCE_ADMIN_EMAIL e AUDIENCE_ADMIN_PASSWORD.');
}
if (!Number.isInteger(clients) || clients < 1 || clients > 5000) {
  throw new Error('CLIENTS deve essere compreso tra 1 e 5000.');
}

const publicDatabase = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const adminDatabase = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const randomSecret = () => [...globalThis.crypto.getRandomValues(new Uint8Array(32))]
  .map(value => value.toString(16).padStart(2, '0'))
  .join('');

const { error: signInError } = await adminDatabase.auth.signInWithPassword({
  email: adminEmail,
  password: adminPassword
});
assert.ifError(signInError);

const { data: isAdmin, error: adminCheckError } = await adminDatabase.rpc('is_audience_admin');
assert.ifError(adminCheckError);
assert.equal(isAdmin, true);

async function rpc(name, parameters, { asAdmin = false } = {}) {
  const database = asAdmin ? adminDatabase : publicDatabase;
  const { data, error } = await database.rpc(name, parameters);
  assert.ifError(error);
  return data;
}

async function relay(path, body) {
  const response = await globalThis.fetch(`${relayUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin
    },
    body: JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`${response.status} ${result.error || 'relay_error'}`);
  return result;
}

async function mapLimit(values, limit, task) {
  const results = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await task(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

const hostSecret = randomSecret();
const room = await rpc('create_audience_session', {
  p_host_secret: hostSecret,
  p_title: `Load test ${clients}`
}, { asAdmin: true });
await relay(`/rooms/${room.code}/publish`, { hostSecret });

const participants = await mapLimit(
  Array.from({ length: clients }, (_, index) => index),
  concurrency,
  async index => {
    const secret = randomSecret();
    const joined = await rpc('join_audience_session', {
      p_code: room.code,
      p_nickname: `Load${String(index + 1).padStart(4, '0')}`,
      p_participant_secret: secret
    });
    assert.equal(joined.ok, true);
    return { secret };
  }
);

let delivered = 0;
const sockets = [];
const startedAt = globalThis.performance.now();
try {
  await mapLimit(participants, concurrency, async participant => {
    const { ticket } = await relay(`/rooms/${room.code}/ticket`, {
      participantSecret: participant.secret
    });
    const socketUrl = new URL(`${relayUrl}/rooms/${room.code}/socket`);
    socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    socketUrl.searchParams.set('ticket', ticket);
    const socket = new WebSocket(socketUrl, { origin });
    sockets.push(socket);
    socket.on('message', raw => {
      try {
        const message = JSON.parse(String(raw));
        if (message?.payload?.questionKey === 'load:question:1') delivered += 1;
      } catch {
        // Il test conteggia soltanto gli eventi di stato validi.
      }
    });
    await new Promise((resolve, reject) => {
      const timeout = globalThis.setTimeout(() => reject(new Error('Timeout apertura WebSocket.')), 30_000);
      socket.once('open', () => {
        globalThis.clearTimeout(timeout);
        resolve();
      });
      socket.once('error', error => {
        globalThis.clearTimeout(timeout);
        reject(error);
      });
    });
  });

  await rpc('sync_audience_session', {
    p_code: room.code,
    p_host_secret: hostSecret,
    p_state: {
      status: 'live',
      gameTitle: 'Load test',
      questionKey: 'load:question:1',
      questionType: 'guess',
      prompt: 'Immagine 1',
      points: 1000,
      revealStep: 1,
      accepting: true,
      answerRules: [{ answer: 'Test', points: 1000 }]
    }
  }, { asAdmin: true });
  const publishResult = await relay(`/rooms/${room.code}/publish`, { hostSecret });

  const deliveryDeadline = Date.now() + 30_000;
  while (delivered < clients && Date.now() < deliveryDeadline) {
    await new Promise(resolve => globalThis.setTimeout(resolve, 25));
  }
  assert.equal(delivered, clients);
  assert.equal(publishResult.delivered, clients);

  const elapsed = Math.round(globalThis.performance.now() - startedAt);
  console.log(`Audience relay load OK · ${clients} WebSocket · ${delivered} consegne · ${elapsed} ms`);
} finally {
  sockets.forEach(socket => socket.close());
  await rpc('sync_audience_session', {
    p_code: room.code,
    p_host_secret: hostSecret,
    p_state: {
      status: 'finished',
      gameTitle: '',
      questionKey: '',
      questionType: '',
      prompt: 'Load test terminato',
      points: 0,
      revealStep: 0,
      accepting: false,
      answerRules: []
    }
  }, { asAdmin: true }).catch(() => {});
  await relay(`/rooms/${room.code}/publish`, { hostSecret }).catch(() => {});
}
