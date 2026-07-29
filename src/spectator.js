import {
  audienceConfigStatus,
  audiencePageUrl,
  audienceRpc,
  roomCodeFromUrl,
  secureToken,
  subscribeToAudience
} from './audience-api.js';

const root = document.getElementById('audience-app');
const state = {
  code: roomCodeFromUrl(),
  session: null,
  participant: null,
  secret: '',
  loading: false,
  message: '',
  messageType: '',
  attemptedKey: '',
  correctQuestionKey: '',
  realtimeStatus: ''
};
let unsubscribe = null;
let fallbackTimer = null;

function element(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value == null || value === false) return;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'value') node.value = value;
    else node.setAttribute(key, value === true ? '' : value);
  });
  children.flat().forEach(child => {
    if (child != null) node.append(child.nodeType ? child : document.createTextNode(child));
  });
  return node;
}

function participantStorageKey(code) {
  return `trivia-audience-participant:${code}`;
}

function readParticipantSecret(code) {
  try {
    return JSON.parse(localStorage.getItem(participantStorageKey(code)) || 'null')?.secret || '';
  } catch {
    return '';
  }
}

function brand() {
  return element('header', { class: 'audience-brand' },
    element('span', { class: 'audience-kicker' }, 'TRIVIA CHALLENGE'),
    element('h1', {}, 'Modalità spettatore')
  );
}

function connectionBadge() {
  const connected = state.realtimeStatus === 'SUBSCRIBED';
  return element('span', {
    class: `connection-badge ${connected ? 'online' : ''}`,
    title: connected ? 'Aggiornamenti in tempo reale attivi' : 'Connessione in aggiornamento'
  }, connected ? 'LIVE' : 'CONNESSIONE…');
}

function codeForm() {
  const input = element('input', {
    name: 'code',
    inputmode: 'text',
    autocomplete: 'off',
    autocapitalize: 'characters',
    maxlength: '6',
    placeholder: 'ABC123',
    'aria-label': 'Codice partita'
  });
  return element('form', {
    class: 'audience-card audience-form',
    onsubmit: event => {
      event.preventDefault();
      const code = input.value.trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(code)) {
        state.message = 'Inserisci il codice di 6 caratteri mostrato dall’host.';
        state.messageType = 'error';
        render();
        return;
      }
      const url = new URL(globalThis.location.href);
      url.searchParams.set('code', code);
      globalThis.location.assign(url);
    }
  },
    element('div', { class: 'card-icon' }, '#'),
    element('h2', {}, 'Inserisci il codice'),
    element('p', { class: 'audience-muted' }, 'Lo trovi sullo schermo principale o vicino al QR code.'),
    input,
    element('button', { class: 'audience-button primary', type: 'submit' }, 'Entra nella partita')
  );
}

function joinForm() {
  const nickname = element('input', {
    name: 'nickname',
    autocomplete: 'nickname',
    maxlength: '24',
    minlength: '2',
    placeholder: 'Il tuo nickname',
    'aria-label': 'Nickname'
  });
  return element('form', {
    class: 'audience-card audience-form',
    onsubmit: event => join(event, nickname.value)
  },
    element('div', { class: 'room-code' }, `STANZA ${state.code}`),
    element('h2', {}, state.session?.title || 'Trivia Challenge'),
    element('p', { class: 'audience-muted' }, 'Scegli un nickname unico. Sarà visibile nella classifica finale.'),
    nickname,
    element('button', {
      class: 'audience-button primary',
      type: 'submit',
      disabled: state.loading
    }, state.loading ? 'Accesso…' : 'Partecipa'),
    element('a', { class: 'text-link', href: 'spectator.html' }, 'Usa un altro codice')
  );
}

async function join(event, rawNickname) {
  event.preventDefault();
  const nickname = rawNickname.trim();
  if (nickname.length < 2) {
    state.message = 'Il nickname deve contenere almeno 2 caratteri.';
    state.messageType = 'error';
    render();
    return;
  }
  state.loading = true;
  state.message = '';
  render();
  const secret = secureToken();
  try {
    const result = await audienceRpc('join_audience_session', {
      p_code: state.code,
      p_nickname: nickname,
      p_participant_secret: secret
    });
    if (!result?.ok) {
      const messages = {
        nickname_taken: 'Questo nickname è già stato scelto. Provane un altro.',
        invalid_nickname: 'Usa da 2 a 24 lettere, numeri, spazi, punti, trattini o underscore.',
        room_not_found: 'La stanza non esiste o la partita è terminata.',
        room_full: 'La stanza ha raggiunto il numero massimo di partecipanti.'
      };
      throw new Error(messages[result?.reason] || 'Non è stato possibile entrare.');
    }
    state.secret = secret;
    state.participant = result.participant;
    state.session = result.session;
    localStorage.setItem(participantStorageKey(state.code), JSON.stringify({ secret }));
    subscribe();
  } catch (error) {
    state.message = error.message;
    state.messageType = 'error';
  } finally {
    state.loading = false;
    render();
  }
}

function responseKey() {
  return `${state.session?.questionKey || ''}:${state.session?.revealStep || 0}`;
}

function gameView() {
  const session = state.session;
  const participant = state.participant;
  const finished = session?.status === 'finished';
  const alreadyAttempted = state.attemptedKey === responseKey();
  const alreadyCorrect = Boolean(state.correctQuestionKey)
    && state.correctQuestionKey === session?.questionKey;
  const canAnswer = session?.accepting && !finished && !alreadyAttempted && !alreadyCorrect;
  const input = element('input', {
    name: 'answer',
    autocomplete: 'off',
    maxlength: '160',
    placeholder: 'Scrivi la tua risposta…',
    disabled: !canAnswer,
    'aria-label': 'La tua risposta'
  });
  const form = element('form', {
    class: 'answer-form',
    onsubmit: event => submitAnswer(event, input.value)
  },
    input,
    element('button', {
      class: 'audience-button primary answer-button',
      type: 'submit',
      disabled: !canAnswer || state.loading
    }, state.loading ? 'Invio…' : 'Invia risposta')
  );

  let statusText = 'In attesa della prossima domanda…';
  if (finished) statusText = 'Partita terminata!';
  else if (alreadyCorrect) statusText = 'Risposta corretta: attendi la prossima domanda.';
  else if (alreadyAttempted && session?.questionType === 'guess') statusText = 'Tentativo usato. Attendi la prossima immagine.';
  else if (alreadyAttempted) statusText = 'Hai già risposto a questa domanda.';
  else if (session?.accepting) statusText = `Risposta aperta · ${session.points} punti`;
  else if (session?.questionType === 'guess' && !session?.revealStep) statusText = 'Attendi la prima immagine.';

  return element('div', { class: 'spectator-game' },
    element('section', { class: 'player-strip' },
      element('div', {},
        element('small', {}, 'GIOCATORE'),
        element('strong', {}, participant.nickname)
      ),
      element('div', { class: 'player-score' },
        element('small', {}, 'PUNTI'),
        element('strong', {}, String(participant.score || 0))
      )
    ),
    element('section', { class: `audience-card question-card ${session?.accepting ? 'open' : ''}` },
      element('div', { class: 'question-meta' },
        element('span', {}, session?.gameTitle || 'Trivia Challenge'),
        connectionBadge()
      ),
      element('h2', {}, session?.prompt || 'In attesa della prossima domanda…'),
      element('p', { class: 'answer-status' }, statusText),
      state.message
        ? element('div', { class: `audience-message ${state.messageType}` }, state.message)
        : null,
      finished
        ? element('a', {
            class: 'audience-button primary',
            href: audiencePageUrl('leaderboard.html', state.code)
          }, 'Guarda la classifica finale')
        : form
    ),
    !finished
      ? element('p', { class: 'final-ranking-note' }, 'La classifica sarà disponibile al termine della partita.')
      : null
  );
}

async function submitAnswer(event, rawAnswer) {
  event.preventDefault();
  const answer = rawAnswer.trim();
  if (!answer || state.loading) return;
  state.loading = true;
  state.message = '';
  render();
  try {
    const result = await audienceRpc('submit_audience_answer', {
      p_code: state.code,
      p_participant_secret: state.secret,
      p_answer: answer
    });
    if (!result?.ok) {
      const messages = {
        already_answered: 'Hai già usato il tentativo disponibile.',
        already_correct: 'Hai già risposto correttamente.',
        answers_closed: 'Le risposte sono state chiuse.',
        participant_not_found: 'Sessione del partecipante non valida: rientra con il nickname.'
      };
      throw new Error(messages[result?.reason] || 'La risposta non è stata accettata.');
    }
    state.attemptedKey = responseKey();
    state.participant.score = result.score;
    state.participant.correctAnswers = result.correctAnswers;
    if (result.result === 'correct') {
      state.correctQuestionKey = state.session.questionKey;
      state.message = `Corretta! +${result.pointsAwarded} punti`;
      state.messageType = 'success';
    } else {
      state.message = state.session.questionType === 'guess'
        ? 'Non è corretta. Potrai riprovare alla prossima immagine.'
        : 'Risposta non corretta.';
      state.messageType = 'error';
    }
  } catch (error) {
    state.message = error.message;
    state.messageType = 'error';
  } finally {
    state.loading = false;
    render();
  }
}

function subscribe() {
  unsubscribe?.();
  unsubscribe = subscribeToAudience(
    state.code,
    payload => {
      const previousKey = responseKey();
      state.session = payload;
      if (responseKey() !== previousKey) {
        state.message = '';
        state.messageType = '';
      }
      render();
    },
    status => {
      state.realtimeStatus = status;
      clearTimeout(fallbackTimer);
      if (status !== 'SUBSCRIBED') scheduleFallbackRefresh(true);
      render();
    }
  );
}

function scheduleFallbackRefresh(initial = false) {
  clearTimeout(fallbackTimer);
  const delay = initial
    ? 2000 + Math.random() * 3000
    : 15000 + Math.random() * 15000;
  fallbackTimer = setTimeout(async () => {
    if (state.realtimeStatus === 'SUBSCRIBED' || document.hidden) return;
    await refreshSession();
    scheduleFallbackRefresh(false);
  }, delay);
}

async function refreshSession() {
  if (!state.code) return;
  try {
    const session = await audienceRpc('get_audience_session', { p_code: state.code });
    if (!session?.found) throw new Error('Stanza non trovata.');
    state.session = session;
    render();
  } catch (error) {
    state.message = error.message;
    state.messageType = 'error';
    render();
  }
}

function render() {
  const configured = audienceConfigStatus().configured;
  const children = [
    brand(),
    !configured
      ? element('section', { class: 'audience-card setup-card' },
          element('h2', {}, 'Backend da configurare'),
          element('p', {}, 'Inserisci URL e chiave pubblicabile Supabase in src/audience-config.js.')
        )
      : !state.code
        ? codeForm()
        : state.participant
          ? gameView()
          : joinForm(),
    state.message && !state.participant
      ? element('div', { class: `audience-message ${state.messageType}` }, state.message)
      : null
  ];
  root.replaceChildren(...children.filter(Boolean));
}

async function init() {
  render();
  if (!audienceConfigStatus().configured || !state.code) return;
  state.secret = readParticipantSecret(state.code);
  if (state.secret) {
    try {
      const result = await audienceRpc('get_audience_participant', {
        p_code: state.code,
        p_participant_secret: state.secret
      });
      if (result?.ok) {
        state.participant = result.participant;
        state.session = result.session;
        subscribe();
        render();
        return;
      }
      localStorage.removeItem(participantStorageKey(state.code));
      state.secret = '';
    } catch {
      state.secret = '';
    }
  }
  await refreshSession();
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.participant) refreshSession();
});
window.addEventListener('beforeunload', () => {
  clearTimeout(fallbackTimer);
  unsubscribe?.();
});

init();
