import { AUDIENCE_CONFIG } from './audience-config.js';

function runtimeConfig() {
  return {
    ...AUDIENCE_CONFIG,
    ...(globalThis.TRIVIA_AUDIENCE_CONFIG || {})
  };
}

export function audienceConfigStatus() {
  const config = runtimeConfig();
  const configured = (
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl)
    || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/i.test(config.supabaseUrl)
  )
    && config.publishableKey
    && !config.publishableKey.includes('YOUR_');
  const relayConfigured = (
    /^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(config.relayUrl)
    || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/i.test(config.relayUrl)
  )
    && !config.relayUrl.includes('YOUR_');
  return { ...config, configured, relayConfigured };
}

let client;

export function audienceClient() {
  const config = audienceConfigStatus();
  if (!config.configured) throw new Error('Audience backend non configurato.');
  if (!globalThis.supabase?.createClient) throw new Error('Client Supabase non disponibile.');
  client ||= globalThis.supabase.createClient(config.supabaseUrl, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
  return client;
}

export async function audienceRpc(name, parameters = {}) {
  const { data, error } = await audienceClient().rpc(name, parameters);
  if (error) throw new Error(error.message || `Errore durante ${name}.`);
  return data;
}

function relayEndpoint(path) {
  const config = audienceConfigStatus();
  if (!config.relayConfigured) throw new Error('Relay Cloudflare non configurato.');
  return `${config.relayUrl.replace(/\/+$/, '')}${path}`;
}

async function relayJson(path, body) {
  const response = await fetch(relayEndpoint(path), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Relay Cloudflare non disponibile.');
  return result;
}

export function publishAudienceState(code, hostSecret) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  return relayJson(`/rooms/${normalizedCode}/publish`, { hostSecret });
}

export function subscribeToAudience(
  code,
  participantSecret,
  onState,
  onStatus = () => {}
) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  const config = audienceConfigStatus();
  if (!config.relayConfigured) {
    onStatus('UNAVAILABLE');
    return () => {};
  }

  let socket = null;
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let generation = 0;
  let stopped = false;

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer) return;
    const base = Math.min(30_000, 1000 * (2 ** Math.min(reconnectAttempt, 5)));
    const delay = base + Math.random() * Math.min(3000, base);
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  const connect = async () => {
    if (stopped) return;
    const currentGeneration = ++generation;
    onStatus('CONNECTING');
    try {
      const { ticket } = await relayJson(`/rooms/${normalizedCode}/ticket`, {
        participantSecret
      });
      if (stopped || currentGeneration !== generation) return;

      const url = new URL(relayEndpoint(`/rooms/${normalizedCode}/socket`));
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.searchParams.set('ticket', ticket);
      const nextSocket = new globalThis.WebSocket(url);
      socket = nextSocket;

      nextSocket.addEventListener('open', () => {
        if (nextSocket !== socket || stopped) return;
        reconnectAttempt = 0;
        onStatus('SUBSCRIBED');
      });
      nextSocket.addEventListener('message', event => {
        if (nextSocket !== socket || stopped) return;
        try {
          const message = JSON.parse(event.data);
          if (message?.type === 'state' && message.payload) onState(message.payload);
        } catch {
          // Un messaggio non valido viene ignorato senza interrompere il canale.
        }
      });
      nextSocket.addEventListener('error', () => {
        if (nextSocket === socket && !stopped) onStatus('ERROR');
      });
      nextSocket.addEventListener('close', () => {
        if (nextSocket !== socket) return;
        socket = null;
        if (stopped) return;
        onStatus('CLOSED');
        scheduleReconnect();
      });
    } catch {
      if (stopped || currentGeneration !== generation) return;
      onStatus('ERROR');
      scheduleReconnect();
    }
  };

  connect();
  return () => {
    stopped = true;
    generation += 1;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    socket?.close(1000, 'Pagina chiusa');
    socket = null;
  };
}

export function secureToken() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
}

export function roomCodeFromUrl() {
  return new globalThis.URLSearchParams(globalThis.location.search).get('code')?.trim().toUpperCase() || '';
}

export function audiencePageUrl(page, code) {
  const url = new URL(page, globalThis.location.href);
  url.search = '';
  url.hash = '';
  if (code) url.searchParams.set('code', code);
  return url.href;
}
