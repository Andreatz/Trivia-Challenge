const FULLSCREEN_BUTTON_CLASS = 'fullscreen-toggle';

function getStage() {
  return document.querySelector('.ppt-stage');
}

function getFullscreenTarget() {
  return document.getElementById('app') || document.documentElement;
}

function isPresentationFullscreen() {
  const target = getFullscreenTarget();
  return document.fullscreenElement === target;
}

async function toggleStageFullscreen() {
  if (!getStage()) return;
  const target = getFullscreenTarget();

  try {
    if (isPresentationFullscreen()) {
      await document.exitFullscreen();
      return;
    }

    await target.requestFullscreen({ navigationUI: 'hide' });
  } catch (error) {
    console.warn('Fullscreen non disponibile:', error);
  }
}

function syncButtonLabel() {
  const button = document.querySelector(`.${FULLSCREEN_BUTTON_CLASS}`);
  if (!button) return;

  const fullscreen = isPresentationFullscreen();
  const title = fullscreen ? 'Esci da schermo intero' : 'Schermo intero presentazione';
  const label = fullscreen ? 'EXIT' : 'FULL';

  if (button.textContent !== label) button.textContent = label;
  if (button.title !== title) button.title = title;
  if (button.getAttribute('aria-label') !== title) button.setAttribute('aria-label', title);
}

function ensureFullscreenButton() {
  const actions = document.querySelector('.stage-actions');
  if (!actions) return;

  let button = actions.querySelector(`.${FULLSCREEN_BUTTON_CLASS}`);
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = `icon-btn ${FULLSCREEN_BUTTON_CLASS}`;
    button.addEventListener('click', toggleStageFullscreen);
    actions.appendChild(button);
  }

  syncButtonLabel();
}

function setupFullscreenEnhancements() {
  ensureFullscreenButton();

  let scheduled = false;
  const scheduleSync = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      ensureFullscreenButton();
    });
  };

  const app = document.getElementById('app') || document.body;
  const observer = new MutationObserver(scheduleSync);
  observer.observe(app, { childList: true });

  document.addEventListener('fullscreenchange', scheduleSync);
  window.addEventListener('resize', scheduleSync);
  document.addEventListener('keydown', event => {
    const target = event.target;
    const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
    if (isTyping) return;

    if (event.key.toLowerCase() === 'f' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      toggleStageFullscreen();
    }
  });
}

setupFullscreenEnhancements();
