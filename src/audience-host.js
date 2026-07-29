import {
  audienceConfigStatus,
  audiencePageUrl,
  audienceRpc,
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
    this.configured = audienceConfigStatus().configured;
    this.session = null;
    this.secret = '';
    this.loading = false;
    this.error = '';
    this.lastSnapshot = '';
    this.pendingSync = null;
    this.pollTimer = null;
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
    this.pollTimer = null;
    this.secret = '';
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
