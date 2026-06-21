function showUpdateNotice(registration) {
  if (document.querySelector('.pwa-update')) return;
  const notice = document.createElement('div');
  notice.className = 'pwa-update';
  notice.setAttribute('role', 'status');
  notice.innerHTML = '<span>Aggiornamento pronto</span><button type="button">Applica dopo la partita</button>';
  notice.querySelector('button').addEventListener('click', () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' }));
  document.body.append(notice);
}

if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').then(registration => {
      if (registration.waiting && navigator.serviceWorker.controller) showUpdateNotice(registration);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdateNotice(registration);
        });
      });
    }).catch(error => console.warn('Modalità offline non disponibile:', error));
  });
}
