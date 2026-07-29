import { DurableObject } from 'cloudflare:workers';

const CODE_PATTERN = /^[A-Z0-9]{6}$/;
const SECRET_PATTERN = /^[a-f0-9]{64}$/;
const TICKET_PATTERN = /^[A-Za-z0-9_-]{20,300}\.[A-Za-z0-9_-]{20,100}$/;
const MAX_BODY_BYTES = 4096;
const TICKET_TTL_MS = 60_000;

function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers
    }
  });
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function corsHeaders(origin) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin'
  };
}

function validatedOrigin(request, env) {
  const origin = request.headers.get('origin') || '';
  return allowedOrigins(env).includes(origin) ? origin : '';
}

function roomRoute(pathname) {
  const match = pathname.match(/^\/rooms\/([A-Z0-9]{6})\/(ticket|socket|publish)$/);
  return match ? { code: match[1], action: match[2] } : null;
}

async function requestJson(request) {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_BODY_BYTES) throw new Response('Payload troppo grande.', { status: 413 });
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new Response('Payload troppo grande.', { status: 413 });
  try {
    return JSON.parse(text);
  } catch {
    throw new Response('JSON non valido.', { status: 400 });
  }
}

function relayConfigured(env) {
  return /^https?:\/\/[^/]+$/i.test(String(env.SUPABASE_URL || ''))
    && String(env.SUPABASE_PUBLISHABLE_KEY || '').length >= 20
    && String(env.RELAY_SIGNING_SECRET || '').length >= 32;
}

async function supabaseRpc(env, name, parameters) {
  if (!relayConfigured(env)) throw new Response('Relay non configurato.', { status: 503 });
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(parameters)
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const message = String(detail?.message || '');
    if (message.includes('invalid_host_credentials')) {
      throw new Response('Credenziali host non valide.', { status: 401 });
    }
    throw new Response('Backend Supabase non disponibile.', { status: 502 });
  }
  return response.json();
}

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlBytes(value) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function signingKey(env, usages) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.RELAY_SIGNING_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages
  );
}

async function createTicket(env, code, participantId) {
  const payload = base64Url(new TextEncoder().encode(JSON.stringify({
    room: code,
    participantId,
    expiresAt: Date.now() + TICKET_TTL_MS,
    nonce: base64Url(crypto.getRandomValues(new Uint8Array(16)))
  })));
  const signature = await crypto.subtle.sign(
    'HMAC',
    await signingKey(env, ['sign']),
    new TextEncoder().encode(payload)
  );
  return `${payload}.${base64Url(new Uint8Array(signature))}`;
}

async function verifyTicket(env, code, ticket) {
  if (!TICKET_PATTERN.test(ticket)) return false;
  const [payload, signature] = ticket.split('.');
  const validSignature = await crypto.subtle.verify(
    'HMAC',
    await signingKey(env, ['verify']),
    base64UrlBytes(signature),
    new TextEncoder().encode(payload)
  );
  if (!validSignature) return false;
  try {
    const claims = JSON.parse(new TextDecoder().decode(base64UrlBytes(payload)));
    return claims.room === code
      && /^[a-f0-9-]{36}$/i.test(String(claims.participantId || ''))
      && Number.isFinite(claims.expiresAt)
      && claims.expiresAt >= Date.now()
      && claims.expiresAt <= Date.now() + TICKET_TTL_MS
      ? claims
      : false;
  } catch {
    return false;
  }
}

async function issueTicket(request, env, code, origin) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, corsHeaders(origin));
  const body = await requestJson(request);
  const participantSecret = String(body?.participantSecret || '');
  if (!SECRET_PATTERN.test(participantSecret)) {
    return json({ error: 'invalid_participant_secret' }, 400, corsHeaders(origin));
  }
  const result = await supabaseRpc(env, 'get_audience_participant', {
    p_code: code,
    p_participant_secret: participantSecret
  });
  if (!result?.ok) return json({ error: 'participant_not_found' }, 401, corsHeaders(origin));

  const ticket = await createTicket(env, code, result.participant.id);
  return json({ ticket, expiresIn: TICKET_TTL_MS / 1000 }, 200, corsHeaders(origin));
}

async function openSocket(request, env, code) {
  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
  if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
    return json({ error: 'websocket_upgrade_required' }, 426);
  }
  const ticket = new URL(request.url).searchParams.get('ticket') || '';
  const claims = await verifyTicket(env, code, ticket);
  if (!claims) return json({ error: 'invalid_ticket' }, 401);

  const room = env.AUDIENCE_ROOMS.getByName(code);
  const participantId = encodeURIComponent(claims.participantId);
  return room.fetch(`https://room.internal/socket?participant=${participantId}`, {
    headers: { upgrade: 'websocket' }
  });
}

async function publishState(request, env, code, origin) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, corsHeaders(origin));
  const body = await requestJson(request);
  const hostSecret = String(body?.hostSecret || '');
  if (!SECRET_PATTERN.test(hostSecret)) {
    return json({ error: 'invalid_host_secret' }, 400, corsHeaders(origin));
  }

  const snapshot = await supabaseRpc(env, 'get_audience_relay_snapshot', {
    p_code: code,
    p_host_secret: hostSecret
  });
  const room = env.AUDIENCE_ROOMS.getByName(code);
  const response = await room.fetch('https://room.internal/publish', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(snapshot)
  });
  const result = await response.json();
  return json({ ...result, state: snapshot }, response.status, corsHeaders(origin));
}

export class AudienceRoom extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/socket') {
      const participantId = url.searchParams.get('participant') || '';
      const participantTag = `participant:${participantId}`;
      for (const existingSocket of this.ctx.getWebSockets(participantTag)) {
        existingSocket.close(4001, 'Connessione sostituita');
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server, ['spectator', participantTag]);
      server.serializeAttachment({ participantId, connectedAt: Date.now() });

      const currentState = await this.ctx.storage.get('state');
      if (currentState) {
        server.send(JSON.stringify({ type: 'state', payload: currentState }));
      }
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/publish' && request.method === 'POST') {
      const state = await request.json();
      if (!state || !CODE_PATTERN.test(String(state.code || ''))) {
        return json({ error: 'invalid_state' }, 400);
      }
      await this.ctx.storage.put('state', state);
      const message = JSON.stringify({ type: 'state', payload: state });
      let delivered = 0;
      for (const socket of this.ctx.getWebSockets('spectator')) {
        try {
          socket.send(message);
          delivered += 1;
        } catch {
          // Cloudflare rimuove automaticamente le connessioni non piÃ¹ valide.
        }
      }
      return json({ ok: true, delivered });
    }

    return json({ error: 'not_found' }, 404);
  }

  webSocketMessage(socket) {
    socket.close(1008, 'Canale di sola lettura');
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({
        ok: true,
        configured: relayConfigured(env) && allowedOrigins(env).length > 0
      });
    }

    const route = roomRoute(url.pathname);
    if (!route || !CODE_PATTERN.test(route.code)) return json({ error: 'not_found' }, 404);

    const origin = validatedOrigin(request, env);
    if (!origin) return json({ error: 'origin_not_allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });

    try {
      if (route.action === 'ticket') return await issueTicket(request, env, route.code, origin);
      if (route.action === 'socket') return await openSocket(request, env, route.code);
      return await publishState(request, env, route.code, origin);
    } catch (error) {
      if (error instanceof Response) {
        const message = await error.text();
        return json({ error: message || 'relay_error' }, error.status, corsHeaders(origin));
      }
      return json({ error: 'relay_error' }, 500, corsHeaders(origin));
    }
  }
};
