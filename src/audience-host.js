import {
  audienceConfigStatus,
  audiencePageUrl,
  audienceRpc,
  publishAudienceState,
  secureToken
} from './audience-api.js';

const STORAGE_KEY = 'trivia-audience-host-v1';

function readStoredHost() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export class AudienceHostController {
  constructor(onChange = () => {}) {
    this.onChange = onChange;
    const config = audienceConfigStatus();
    this.configured = config.configured;
    this.relayConfigured = config.relayConfigured;
    this.relayHealthy = false;
    this.relayWarning = config.relayConfigured
      ? ''
      : 'Relay Cloudflare non configurato: i telefoni useranno il fallback HTTP.';
    this.session = null;
    this.secret = '';
    this.loading = false;
    this.error = '';
    this.lastSnapshot = '';
    this.pendingSync = null;
    this.pollTimer = null;
    this.relayRetryTimer = null;
    this.relayRetryAttempt = 0;
    this.relayPublishing = false;
    this.relayDirty = false;
    this.relayCurrentPromise = null;
  }

  notify() {
    this.onChange(this);
  }

  async init() {
    if (!this.configured) return;
    const stored = readStoredHost();
    if (!stored?.code || !stored?.secret) return;
    this.secret = stored.secret;
    try {
      const session = await audienceRpc('get_audience_session', { p_code: stored.code });
      if (session?.found && session.status !== 'finished') {
        this.session = session;
        this.startPolling();
        this.publishRelay();
      } else {
        this.clearStored();
      }
    } catch (error) {
      this.error = error.message;
    }
    this.notify();
  }

  async create(title) {
    if (!this.configured || this.loading) return;
    this.loading = true;
    this.error = '';
    this.notify();
    try {
      this.secret = secureToken();
      this.session = await audienceRpc('create_audience_session', {
        p_host_secret: this.secret,
        p_title: title
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        code: this.session.code,
        secret: this.secret
      }));
      this.lastSnapshot = '';
      this.startPolling();
      this.publishRelay();
    } catch (error) {
      this.error = error.message;
      this.session = null;
      this.secret = '';
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  scheduleSync(state) {
    if (!this.session || !this.secret || this.session.status === 'finished') return;
    const snapshot = JSON.stringify(state);
    if (snapshot === this.lastSnapshot) return;
    clearTimeout(this.pendingSync);
    this.pendingSync = setTimeout(() => this.sync(state, snapshot), 120);
  }

  async sync(state, snapshot = JSON.stringify(state)) {
    if (!this.session || !this.secret || snapshot === this.lastSnapshot) return;
    try {
      const session = await audienceRpc('sync_audience_session', {
        p_code: this.session.code,
        p_host_secret: this.secret,
        p_state: state
      });
      this.session = session;
      this.lastSnapshot = snapshot;
      this.error = '';
      this.publishRelay();
      this.notify();
    } catch (error) {
      this.error = error.message;
      this.notify();
    }
  }

  async finish() {
    if (!this.session || !this.secret || this.loading) return;
    this.loading = true;
    this.notify();
    try {
      this.session = await audienceRpc('sync_audience_session', {
        p_code: this.session.code,
        p_host_secret: this.secret,
        p_state: {
          status: 'finished',
          gameTitle: '',
          questionKey: '',
          questionType: '',
          prompt: 'La partita è terminata.',
          points: 0,
          revealStep: 0,
          accepting: false,
          answerRules: []
        }
      });
      while (this.relayCurrentPromise) {
        await this.relayCurrentPromise.catch(() => {});
      }
      await this.publishRelay(false);
      this.clearStored();
    } catch (error) {
      this.error = error.message;
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  reset() {
    this.clearStored();
    this.session = null;
    this.error = '';
    this.lastSnapshot = '';
    this.notify();
  }

  clearStored() {
    localStorage.removeItem(STORAGE_KEY);
    clearInterval(this.pollTimer);
    clearTimeout(this.relayRetryTimer);
    this.pollTimer = null;
    this.relayRetryTimer = null;
    this.secret = '';
  }

  async publishRelay(allowRetry = true) {
    if (!this.relayConfigured || !this.session?.code || !this.secret) return;
    if (this.relayPublishing) {
      this.relayDirty = true;
      return;
    }
    this.relayPublishing = true;
    this.relayDirty = false;
    try {
      this.relayCurrentPromise = publishAudienceState(this.session.code, this.secret);
      await this.relayCurrentPromise;
      this.relayHealthy = true;
      this.relayWarning = '';
      this.relayRetryAttempt = 0;
      clearTimeout(this.relayRetryTimer);
      this.relayRetryTimer = null;
    } catch {
      this.relayHealthy = false;
      this.relayWarning = 'Relay Cloudflare temporaneamente non raggiungibile; fallback HTTP attivo.';
      if (allowRetry && !this.relayRetryTimer) {
        const base = Math.min(30_000, 1000 * (2 ** Math.min(this.relayRetryAttempt, 5)));
        this.relayRetryAttempt += 1;
        this.relayRetryTimer = setTimeout(() => {
          this.relayRetryTimer = null;
          this.publishRelay();
        }, base + Math.random() * 1000);
      }
    } finally {
      this.relayCurrentPromise = null;
      this.relayPublishing = false;
      this.notify();
      if (this.relayDirty && this.secret) this.publishRelay(allowRetry);
    }
  }

  startPolling() {
    clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.refresh(), 5000);
  }

  async refresh() {
    if (!this.session?.code || document.hidden) return;
    try {
      const session = await audienceRpc('get_audience_session', { p_code: this.session.code });
      if (session?.found) {
        this.session = session;
        this.notify();
      }
    } catch {
      // Il prossimo polling o sync riproverà senza interrompere la conduzione.
    }
  }

  spectatorUrl() {
    return audiencePageUrl('spectator.html', this.session?.code);
  }

  leaderboardUrl() {
    return audiencePageUrl('leaderboard.html', this.session?.code);
  }
}
