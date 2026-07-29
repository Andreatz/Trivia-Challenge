import { audienceClient } from './audience-api.js';

const app = document.getElementById('app');
const client = audienceClient();
const localTestBypass = globalThis.TRIVIA_ADMIN_TEST_BYPASS === true
  && ['127.0.0.1', 'localhost'].includes(globalThis.location.hostname);
let appLoaded = false;

function element(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  });
  children.flat().filter(child => child != null).forEach(child => {
    node.append(child instanceof globalThis.Node ? child : document.createTextNode(String(child)));
  });
  return node;
}

function setFormBusy(form, busy) {
  form.querySelectorAll('input,button').forEach(control => {
    control.disabled = busy;
  });
  form.querySelector('button').textContent = busy ? 'Accesso in corso…' : 'Accedi';
}

async function isAuthorizedAdmin() {
  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) return false;

  const { data, error } = await client.rpc('is_audience_admin');
  if (error || data !== true) return false;
  return sessionData.session.user?.is_anonymous !== true;
}

async function signOut() {
  await client.auth.signOut({ scope: 'local' });
  globalThis.location.reload();
}

async function loadApp() {
  if (appLoaded) return;
  appLoaded = true;
  document.body.classList.remove('admin-login-view');
  app.replaceChildren();
  globalThis.TRIVIA_ADMIN_AUTH = Object.freeze({ signOut });
  await import('./app.js');
  await import('./fullscreen.js');
}

function renderLogin(message = '') {
  document.body.classList.add('admin-login-view');
  const email = element('input', {
    id: 'admin-email',
    name: 'email',
    type: 'email',
    autocomplete: 'username',
    required: '',
    placeholder: 'admin@example.com'
  });
  const password = element('input', {
    id: 'admin-password',
    name: 'password',
    type: 'password',
    autocomplete: 'current-password',
    required: '',
    minlength: '8',
    placeholder: 'Password'
  });
  const feedback = element('p', {
    class: 'admin-login-feedback',
    role: 'alert',
    'aria-live': 'polite'
  }, message);
  const form = element('form', {
    class: 'admin-login-form',
    onsubmit: async event => {
      event.preventDefault();
      feedback.textContent = '';
      setFormBusy(form, true);
      try {
        const { error } = await client.auth.signInWithPassword({
          email: email.value.trim(),
          password: password.value
        });
        if (error) throw error;
        if (!await isAuthorizedAdmin()) {
          await client.auth.signOut({ scope: 'local' });
          throw new Error('Questo account non è autorizzato come amministratore.');
        }
        await loadApp();
      } catch (error) {
        feedback.textContent = error.message || 'Accesso non riuscito.';
        password.value = '';
        password.focus();
      } finally {
        if (!appLoaded) setFormBusy(form, false);
      }
    }
  },
  element('label', { for: 'admin-email' }, 'Email amministratore'),
  email,
  element('label', { for: 'admin-password' }, 'Password'),
  password,
  element('button', { type: 'submit', class: 'btn primary' }, 'Accedi'),
  feedback);

  app.replaceChildren(
    element('main', { class: 'admin-login-shell' },
      element('section', { class: 'admin-login-card', 'aria-labelledby': 'admin-login-title' },
        element('div', { class: 'kicker' }, 'TRIVIA CHALLENGE'),
        element('h1', { id: 'admin-login-title' }, 'Accesso Admin'),
        element('p', { class: 'muted' }, 'La regia del gioco è riservata all’amministratore. Gli spettatori entrano dal QR senza account.'),
        form
      )
    )
  );
  email.focus();
}

async function bootstrap() {
  if (localTestBypass) {
    await loadApp();
    return;
  }

  try {
    if (await isAuthorizedAdmin()) {
      await loadApp();
      return;
    }
    const { data } = await client.auth.getSession();
    if (data.session) await client.auth.signOut({ scope: 'local' });
    renderLogin();
  } catch {
    renderLogin('Impossibile verificare l’accesso. Controlla la connessione e riprova.');
  }
}

bootstrap();
