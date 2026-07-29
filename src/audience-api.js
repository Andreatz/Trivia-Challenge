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
  return { ...config, configured };
}

let client;

export function audienceClient() {
  const config = audienceConfigStatus();
  if (!config.configured) throw new Error('Audience backend non configurato.');
  if (!globalThis.supabase?.createClient) throw new Error('Client Supabase non disponibile.');
  client ||= globalThis.supabase.createClient(config.supabaseUrl, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 5 } }
  });
  return client;
}

export async function audienceRpc(name, parameters = {}) {
  const { data, error } = await audienceClient().rpc(name, parameters);
  if (error) throw new Error(error.message || `Errore durante ${name}.`);
  return data;
}

export function subscribeToAudience(code, onState, onStatus = () => {}) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  const channel = audienceClient()
    .channel(`audience:${normalizedCode}`)
    .on('broadcast', { event: 'state' }, message => onState(message.payload))
    .subscribe(status => onStatus(status));
  return () => audienceClient().removeChannel(channel);
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
