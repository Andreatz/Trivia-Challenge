const FULLSCREEN_BUTTON_CLASS = 'fullscreen-toggle';

function getStage() {
  return document.querySelector('.ppt-stage');
}

function isStageFullscreen() {
  return document.fullscreenElement === getStage();
}

async function toggleStageFullscreen() {
  const stage = getStage();
  if (!stage) return;

  try {
    if (isStageFullscreen()) {
      await document.exitFullscreen();
      return;
    }

    await stage.requestFullscreen({ navigationUI: 'hide' });
  } catch (error) {
    console.warn('Fullscreen non disponibile:', error);
  }
}

function syncButtonLabel() {
  const button = document.querySelector(`.${FULLSCREEN_BUTTON_CLASS}`);
  if (!button) return;
  button.textContent = isStageFullscreen() ? '⛶' : '⛶';
  button.title = isStageFullscreen() ? 'Esci da schermo intero' : 'Schermo intero presentazione';
  button.setAttribute('aria-label', button.title);
}

function ensureFullscreenButton() {
  const actions = document.querySelector('.stage-actions');
  if (!actions || actions.querySelector(`.${FULLSCREEN_BUTTON_CLASS}`)) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = `icon-btn ${FULLSCREEN_BUTTON_CLASS}`;
  button.textContent = '⛶';
  button.title = 'Schermo intero presentazione';
  button.setAttribute('aria-label', button.title);
  button.addEventListener('click', toggleStageFullscreen);
  actions.appendChild(button);
}

function setupFullscreenEnhancements() {
  ensureFullscreenButton();

  const observer = new MutationObserver(() => {
    ensureFullscreenButton();
    syncButtonLabel();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('fullscreenchange', syncButtonLabel);
  document.addEventListener('keydown', event => {
    const target = event.target;
    const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
    if (isTyping) return;

    if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      toggleStageFullscreen();
    }
  });
}

setupFullscreenEnhancements();
