import {
  audienceConfigStatus,
  audienceRpc,
  roomCodeFromUrl,
  subscribeToAudience
} from './audience-api.js';

const root = document.getElementById('leaderboard-app');
const state = {
  code: roomCodeFromUrl(),
  session: null,
  rows: [],
  loading: false,
  error: '',
  updatedAt: null
};
let timer = null;
let unsubscribe = null;

function element(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value == null || value === false) return;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value === true ? '' : value);
  });
  children.flat().forEach(child => {
    if (child != null) node.append(child.nodeType ? child : document.createTextNode(child));
  });
  return node;
}

function codeForm() {
  const input = element('input', {
    name: 'code',
    maxlength: '6',
    placeholder: 'ABC123',
    autocomplete: 'off',
    'aria-label': 'Codice partita'
  });
  return element('form', {
    class: 'audience-card leaderboard-code-form',
    onsubmit: event => {
      event.preventDefault();
      const code = input.value.trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(code)) return;
      const url = new URL(globalThis.location.href);
      url.searchParams.set('code', code);
      globalThis.location.assign(url);
    }
  },
    element('h2', {}, 'Apri una classifica'),
    input,
    element('button', { class: 'audience-button primary', type: 'submit' }, 'Mostra')
  );
}

function podiumCard(row, index) {
  const labels = ['1°', '2°', '3°'];
  return element('article', { class: `podium-card place-${index + 1}` },
    element('span', { class: 'podium-rank' }, labels[index]),
    element('strong', {}, row.nickname),
    element('b', {}, `${row.score} pt`),
    element('small', {}, `${row.correctAnswers} risposte corrette`)
  );
}

function leaderboardView() {
  const podium = state.rows.slice(0, 3);
  const remaining = state.rows.slice(3);
  return element('div', { class: 'leaderboard-shell' },
    element('header', { class: 'leaderboard-header' },
      element('div', {},
        element('span', { class: 'audience-kicker' }, 'TRIVIA CHALLENGE'),
        element('h1', {}, state.session?.status === 'finished' ? 'Classifica finale' : 'Classifica spettatori')
      ),
      element('div', { class: 'leaderboard-meta' },
        element('span', { class: 'room-code' }, `STANZA ${state.code}`),
        element('span', {}, `${state.session?.participantCount || state.rows.length} partecipanti`)
      )
    ),
    podium.length
      ? element('section', { class: 'podium' }, ...podium.map(podiumCard))
      : null,
    element('section', { class: 'leaderboard-table-wrap' },
      element('div', { class: 'leaderboard-table-head' },
        element('span', {}, 'POS'),
        element('span', {}, 'NICKNAME'),
        element('span', {}, 'CORRETTE'),
        element('span', {}, 'PUNTI')
      ),
      state.rows.length
        ? element('div', { class: 'leaderboard-rows' },
            ...remaining.map(row => element('div', { class: 'leaderboard-row' },
              element('span', { class: 'rank' }, String(row.rank)),
              element('strong', {}, row.nickname),
              element('span', {}, String(row.correctAnswers)),
              element('b', {}, String(row.score))
            ))
          )
        : element('div', { class: 'empty-leaderboard' }, 'In attesa dei partecipanti…')
    ),
    element('footer', { class: 'leaderboard-footer' },
      element('span', {}, state.session?.gameTitle || 'In attesa della prossima domanda'),
      element('span', {}, state.updatedAt
        ? `Aggiornata alle ${state.updatedAt.toLocaleTimeString('it-IT')}`
        : 'Connessione…')
    )
  );
}

function render() {
  root.replaceChildren(
    !audienceConfigStatus().configured
      ? element('section', { class: 'audience-card setup-card' },
          element('h2', {}, 'Backend da configurare'),
          element('p', {}, 'Inserisci URL e chiave pubblicabile Supabase in src/audience-config.js.')
        )
      : !state.code
        ? codeForm()
        : state.error && !state.session
          ? element('section', { class: 'audience-card setup-card' },
              element('h2', {}, 'Classifica non disponibile'),
              element('p', {}, state.error),
              element('a', { class: 'audience-button', href: 'leaderboard.html' }, 'Cambia codice')
            )
          : leaderboardView()
  );
}

async function refresh() {
  if (state.loading || document.hidden) return;
  state.loading = true;
  try {
    const result = await audienceRpc('get_audience_leaderboard', {
      p_code: state.code,
      p_limit: 5000
    });
    if (!result?.ok) throw new Error('Stanza non trovata.');
    state.session = result.session;
    state.rows = result.leaderboard || [];
    state.updatedAt = new Date();
    state.error = '';
    if (state.session?.status === 'finished') {
      clearInterval(timer);
      timer = null;
      unsubscribe?.();
      unsubscribe = null;
    }
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
}

async function init() {
  render();
  if (!audienceConfigStatus().configured || !state.code) return;
  await refresh();
  if (state.session?.status !== 'finished') {
    unsubscribe = subscribeToAudience(state.code, payload => {
      state.session = payload;
      refresh();
    });
    timer = setInterval(refresh, 2500);
  }
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refresh();
});
window.addEventListener('beforeunload', () => {
  clearInterval(timer);
  unsubscribe?.();
});

init();
