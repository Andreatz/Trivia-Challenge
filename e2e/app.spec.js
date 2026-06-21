import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-initialized')) return;
    localStorage.clear();
    sessionStorage.setItem('e2e-initialized', 'true');
  });
  await page.goto('/');
});

async function horizontalOverflow(page) {
  return page.evaluate(() => ({
    pixels: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    offenders: [...document.querySelectorAll('body *')]
      .map(element => ({
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === 'string' ? element.className : '',
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
        scrollWidth: element.scrollWidth
      }))
      .filter(item => item.left < -1 || item.right > document.documentElement.clientWidth + 1)
      .slice(0, 8)
  }));
}

test('home, punteggio e modalità pubblico funzionano', async ({ page }) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));

  await expect(page.locator('.menu-button')).toHaveCount(11);
  await page.locator('.menu-button', { hasText: 'INDOVINA IL PERSONAGGIO' }).click();
  await expect(page.locator('.guess-tile')).toHaveCount(4);
  await page.locator('.guess-tile').first().click();
  await expect(page.locator('.guess-tile.revealed')).toHaveCount(1);

  await page.getByRole('button', { name: 'Mostra risposta' }).click();
  await page.locator('.player-chip').first().click();
  await page.getByRole('button', { name: 'Corretta +1000' }).click();
  await expect(page.locator('.player-chip').first().locator('strong')).toHaveText('1000');

  await page.getByRole('button', { name: 'PUBBLICO' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-audience', 'public');
  await expect(page.locator('.host-actions')).toBeHidden();
  await page.keyboard.press('h');
  await expect(page.locator('body')).toHaveAttribute('data-audience', 'host');
  expect(runtimeErrors).toEqual([]);
});

test('admin usa il manifest locale e rifiuta import non validi', async ({ page }) => {
  await page.getByRole('button', { name: 'ADMIN' }).click();
  await expect(page.locator('#local-assets option')).toHaveCount(202);

  await page.getByLabel('Titolo evento').evaluate(element => {
    element.value = 'TRIVIA TEST';
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('[data-save-status]')).toHaveText('Modifiche in corso');
  await expect(page.locator('[data-save-status]')).toHaveText('Salvato');
  await page.keyboard.press('Control+z');
  await expect(page.getByLabel('Titolo evento')).toHaveValue('TRIVIA CHALLENGE');

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"games":[]}')
  });
  await expect(page.locator('.toast', { hasText: 'Import fallito' })).toBeVisible();
});

test('migra un import v2 e separa le sezioni persistite', async ({ page }) => {
  await page.getByRole('button', { name: 'ADMIN' }).click();
  const legacy = {
    schemaVersion: 2,
    title: 'EVENTO LEGACY',
    subtitle: 'IMPORT V2',
    players: [{ id: 'legacy-player', name: 'LEGACY', score: 25 }],
    games: [{ id: 'legacy-game', type: 'quote', title: 'Frase legacy', questions: [{ partial: 'A', answer: 'B' }] }],
    library: [], powers: [], history: [], session: { games: {} }
  };
  await page.locator('input[type="file"]').setInputFiles({
    name: 'legacy-v2.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(legacy))
  });
  await expect(page.locator('.toast')).toContainText('Dati importati');
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('trivia-challenge-v3')));
  expect(persisted.schemaVersion).toBe(3);
  expect(persisted.content.title).toBe('EVENTO LEGACY');
  expect(persisted.session.players[0].score).toBe(25);
  expect(persisted.games).toBeUndefined();
});

test('annulla l’ultimo punteggio senza annullare i contenuti', async ({ page }) => {
  await page.locator('.menu-button', { hasText: 'INDOVINA IL PERSONAGGIO' }).click();
  await page.locator('.guess-tile').first().click();
  await page.getByRole('button', { name: 'Mostra risposta' }).click();
  await page.locator('.player-chip').first().click();
  await page.getByRole('button', { name: 'Corretta +1000' }).click();
  await page.getByRole('button', { name: 'ADMIN' }).click();
  await page.getByRole('button', { name: 'Punteggi' }).click();
  await page.getByRole('button', { name: 'Annulla ultimo punteggio' }).click();
  await expect(page.locator('.mega-score').first()).toHaveText('0');
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('trivia-challenge-v3')));
  expect(persisted.content.games).toHaveLength(11);
  expect(persisted.history).toHaveLength(0);
});

test('shell PWA e layout non generano overflow orizzontale', async ({ page }) => {
  await expect.poll(() => page.evaluate(async () => Boolean(await navigator.serviceWorker.ready))).toBe(true);
  const overflow = await horizontalOverflow(page);
  expect(overflow.pixels, JSON.stringify(overflow.offenders)).toBeLessThanOrEqual(1);
});

test('tutti gli undici minigiochi si aprono senza errori runtime', async ({ page }) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));

  for (let index = 0; index < 11; index += 1) {
    await page.locator('.menu-button').nth(index).click();
    await expect(page.locator('.game-shell')).toBeVisible();
    await page.locator('.home-btn').click();
    await expect(page.locator('.menu-button')).toHaveCount(11);
  }
  expect(runtimeErrors).toEqual([]);
});

test('la scorebar supporta otto giocatori', async ({ page }) => {
  await page.getByRole('button', { name: 'ADMIN' }).click();
  for (let index = 4; index <= 8; index += 1) {
    await page.getByPlaceholder('Nome squadra o giocatore').fill(`PLAYER ${index}`);
    await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Show', exact: true }).click();
  await expect(page.locator('.player-chip')).toHaveCount(8);
  const overflow = await horizontalOverflow(page);
  expect(overflow.pixels, JSON.stringify(overflow.offenders)).toBeLessThanOrEqual(1);
});

test('la shell riparte offline dopo il primo caricamento', async ({ page, context }) => {
  await expect.poll(() => page.evaluate(async () => Boolean(await navigator.serviceWorker.ready))).toBe(true);
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.menu-button')).toHaveCount(11);
  } finally {
    await context.setOffline(false);
  }
});

test('home e admin non hanno violazioni WCAG A/AA rilevabili automaticamente', async ({ page }) => {
  const home = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(home.violations).toEqual([]);

  await page.getByRole('button', { name: 'ADMIN' }).click();
  const admin = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(admin.violations).toEqual([]);
});

test('scorebar supporta uno e quattro giocatori', async ({ page }) => {
  await page.getByRole('button', { name: 'ADMIN' }).click();
  await page.getByRole('button', { name: 'Rimuovi' }).first().click();
  await page.getByRole('button', { name: 'Rimuovi' }).first().click();
  await page.getByRole('button', { name: 'Show', exact: true }).click();
  await expect(page.locator('.player-chip')).toHaveCount(1);

  await page.getByRole('button', { name: 'ADMIN' }).click();
  for (let index = 2; index <= 4; index += 1) {
    await page.getByPlaceholder('Nome squadra o giocatore').fill(`PLAYER ${index}`);
    await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Show', exact: true }).click();
  await expect(page.locator('.player-chip')).toHaveCount(4);
});

test('reduced motion disattiva le animazioni non essenziali', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const duration = await page.locator('.stage-content').evaluate(element => getComputedStyle(element).animationDuration);
  expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.01);
});

test('pannello punteggio non ricrea il player audio', async ({ page }) => {
  await page.locator('.menu-button', { hasText: "CHI L'HA DETTO" }).click();
  const audio = page.locator('audio').first();
  await expect(audio).toBeVisible();
  const handle = await audio.elementHandle();
  await page.locator('.player-chip').first().click();
  expect(await handle.evaluate(element => element.isConnected)).toBe(true);
});

test('aiuto tastiera gestisce focus e chiusura', async ({ page }) => {
  await page.locator('.menu-button').first().click();
  await page.keyboard.press('?');
  const dialog = page.getByRole('dialog', { name: 'Scorciatoie host' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('media locale mancante mostra un errore leggibile', async ({ page }) => {
  await page.getByRole('button', { name: 'ADMIN' }).click();
  const broken = {
    schemaVersion: 2,
    players: [{ id: 'p1', name: 'PLAYER', score: 0 }],
    games: [{ id: 'broken', type: 'guess', title: 'Media rotto', rounds: [{ answer: 'A', clues: [{ label: '100', image: 'public/assets/mancante.png' }] }] }],
    history: [], session: { games: {} }
  };
  await page.locator('input[type="file"]').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(broken)) });
  await page.getByRole('button', { name: 'Show', exact: true }).click();
  await page.locator('.menu-button').first().click();
  await page.locator('.guess-tile').first().click();
  await expect(page.getByRole('alert')).toContainText('Media non disponibile');
});

test('refresh ripristina gioco, domanda e reveal', async ({ page }) => {
  await page.locator('.menu-button').first().click();
  await page.locator('.guess-tile').first().click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('trivia-challenge-v3')).session.navigation.screen)).toBe('game');
  await page.reload();
  await expect(page.locator('.game-shell')).toBeVisible();
  await expect(page.locator('.guess-tile.revealed')).toHaveCount(1);
});

test('fullscreen entra ed esce senza perdere la sessione', async ({ page }) => {
  await page.getByRole('button', { name: 'Schermo intero presentazione' }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.getByRole('button', { name: 'Esci da schermo intero' }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  await expect(page.locator('.menu-button')).toHaveCount(11);
});

test('crea tutti i tipi di minigioco dall’editor', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-720p', 'Matrice editor eseguita una volta nel viewport host.');
  await page.getByRole('button', { name: 'ADMIN' }).click();
  const types = ['guess', 'bomb', 'said', 'detail', 'quote', 'chain', 'labors', 'guillotine', 'pass', 'jeopardy', 'sarabanda'];
  for (const [index, type] of types.entries()) {
    await page.locator('#type').selectOption(type);
    await page.locator('#title').fill(`E2E ${type}`);
    await page.getByRole('button', { name: 'Crea minigioco' }).click();
    await expect(page.locator('.saved-game')).toHaveCount(12 + index);
    const card = page.locator('.saved-game', { hasText: `E2E ${type}` }).first();
    await card.getByRole('button', { name: 'Modifica' }).click();
    await page.locator('#title').fill(`E2E ${type} modificato`);
    await page.getByRole('button', { name: 'Salva modifiche' }).click();
    await expect(page.locator('.saved-game', { hasText: `E2E ${type} modificato` })).toHaveCount(1);
  }
});

test('completa il flusso principale di tutti gli undici minigiochi', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-720p', 'Matrice completa eseguita una volta nel viewport host.');
  const open = async name => {
    await page.locator('.menu-button', { hasText: name }).click();
    await page.locator('.player-chip').first().click();
    await page.getByRole('button', { name: 'Chiudi punti rapidi' }).click();
  };
  const home = async () => {
    await page.locator('.home-btn').click();
    await expect(page.locator('.menu-button')).toHaveCount(11);
  };

  await open('INDOVINA IL PERSONAGGIO');
  await page.locator('.guess-tile').first().click();
  await page.getByRole('button', { name: 'Mostra risposta' }).click();
  await page.getByRole('button', { name: /Corretta \+/ }).click();
  await home();

  await open('SCHIVA LA BOMBA');
  await page.locator('.bomb-tile').first().click();
  await page.getByRole('button', { name: 'Mostra bombe' }).click();
  await page.getByRole('button', { name: /Conferma \+/ }).click();
  await home();

  for (const name of ["CHI L'HA DETTO", 'OCCHIO AL DETTAGLIO', 'COMPLETA LA FRASE']) {
    await open(name);
    await page.getByRole('button', { name: 'Mostra risposta' }).click();
    await page.getByRole('button', { name: /Corretta \+/ }).click();
    await home();
  }

  await open('REAZIONE A CATENA');
  await page.getByRole('button', { name: 'Rivela' }).click();
  await page.getByRole('button', { name: /Corretta \+/ }).click();
  await home();

  await open('LE DIECI FATICHE');
  await page.locator('.labors-number').first().click();
  await page.getByRole('button', { name: 'Risposta', exact: true }).click();
  await page.getByRole('button', { name: /Corretta \+/ }).click();
  await home();

  await open('GHIGLIOTTINA');
  await page.getByRole('button', { name: 'Mostra risposta' }).click();
  await page.getByRole('button', { name: /Corretta \+/ }).click();
  await home();

  await open('PASSAPAROLA');
  await page.getByRole('button', { name: /Corretta \+/ }).click();
  await home();

  await open('JEOPARDY');
  await page.locator('.jeopardy-cell').first().click();
  await page.getByRole('button', { name: 'Mostra risposta' }).click();
  await page.getByRole('button', { name: /Corretta \+/ }).click();
  await home();

  await open('SARABANDA');
  await page.getByRole('button', { name: 'Mostra risposta' }).click();
  await page.getByRole('button', { name: 'Risposta completa' }).click();
  const persistedScore = await page.evaluate(() => JSON.parse(localStorage.getItem('trivia-challenge-v3')).session.players[0].score);
  expect(persistedScore).toBeGreaterThan(0);
});
