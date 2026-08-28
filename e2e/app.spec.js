import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    globalThis.TRIVIA_ADMIN_TEST_BYPASS = true;
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

async function showAllAnimeGames(page) {
  await expect(page.locator('.menu-button')).toHaveCount(1);
  await page.evaluate(() => {
    const catalogKey = 'trivia-challenge-presets-v1';
    const documentKey = 'trivia-challenge-v3';
    const catalog = JSON.parse(localStorage.getItem(catalogKey));
    const animeDocument = catalog.presets.anime.document;
    animeDocument.content.games.forEach(game => {
      game.showOnHome = true;
    });
    catalog.activePresetId = 'anime';
    localStorage.setItem(catalogKey, JSON.stringify(catalog));
    localStorage.setItem(documentKey, JSON.stringify(animeDocument));
  });
  await page.reload();
  await expect(page.locator('.menu-button')).toHaveCount(11);
}

test('la pagina host richiede il login Admin', async ({ browser }) => {
  const context = await browser.newContext();
  const loginPage = await context.newPage();
  try {
    await loginPage.goto('/');
    await expect(loginPage.getByRole('heading', { name: 'Accesso Admin' })).toBeVisible();
    await expect(loginPage.getByLabel('Email amministratore')).toBeVisible();
    await expect(loginPage.getByLabel('Password')).toBeVisible();
    await expect(loginPage.locator('.player-chip')).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('home e punteggio simultaneo funzionano senza turno attivo', async ({ page }) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));

  await expect(page.getByRole('button', { name: 'Esci', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'POTERI', exact: true })).toHaveCount(0);
  await expect(page.locator('.menu-button')).toHaveCount(1);
  await page.locator('.menu-button', { hasText: 'INDOVINA IL PERSONAGGIO' }).click();
  await expect(page.locator('.guess-tile')).toHaveCount(4);
  await page.locator('.guess-tile').first().click();
  await expect(page.locator('.guess-tile.revealed')).toHaveCount(1);

  await page.getByRole('button', { name: 'Mostra risposta' }).click();
  await expect(page.getByRole('button', { name: /Corretta \+/ })).toHaveCount(0);
  await page.locator('.player-chip').first().click();
  await expect(page.locator('.quick-score-panel')).toBeVisible();
  await page.getByRole('button', { name: '+1000', exact: true }).click();
  await expect(page.locator('.player-chip').first().locator('strong')).toHaveText('1000');
  await expect(page.getByRole('button', { name: 'PUBBLICO' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'AIUTO' })).toHaveCount(0);
  expect(runtimeErrors).toEqual([]);
});

test('seleziona i preset Anime e Star Wars e usa i nuovi giochi', async ({ page }) => {
  const switcher = page.locator('.preset-switcher');
  await expect(switcher).not.toContainText('PRESET');
  await expect(switcher.getByRole('button', { name: 'Anime', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.menu-button')).toHaveCount(1);
  const animeAppearance = await page.evaluate(() => ({
    stage: getComputedStyle(document.querySelector('.ppt-stage')).backgroundImage,
    button: getComputedStyle(document.querySelector('.menu-button')).backgroundImage
  }));
  const bundledAnime = await page.evaluate(() => JSON.parse(localStorage.getItem('trivia-challenge-presets-v1')).presets.anime.document);
  expect(bundledAnime.content.games).toHaveLength(11);
  expect(bundledAnime.content.games.find(game => game.type === 'guess').rounds).toHaveLength(23);

  await switcher.getByRole('button', { name: 'Star Wars', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-preset', 'star-wars');
  await expect(page.locator('.menu-button')).toHaveCount(5);
  const starWarsAppearance = await page.evaluate(() => ({
    stage: getComputedStyle(document.querySelector('.ppt-stage')).backgroundImage,
    button: getComputedStyle(document.querySelector('.menu-button')).backgroundImage
  }));
  expect(starWarsAppearance).toEqual(animeAppearance);
  await expect(page.locator('.menu-button', { hasText: 'INDOVINA IL PERSONAGGIO: PIXEL' })).toHaveCount(1);
  await expect(page.locator('.menu-button', { hasText: 'INDOVINA IL PERSONAGGIO: INDIZI' })).toHaveCount(1);

  await page.locator('.menu-button', { hasText: 'INDOVINA IL PERSONAGGIO: PIXEL' }).click();
  await expect(page.locator('.pixel-image-frame img')).toHaveCount(1);
  await expect(page.locator('.pixel-image-frame img')).toHaveAttribute('src', 'public/assets/star-wars/pixel/qui-gon-1.png');
  await page.getByRole('button', { name: 'Mostra immagine 2' }).click();
  await expect(page.locator('.pixel-image-frame img')).toHaveAttribute('src', 'public/assets/star-wars/pixel/qui-gon-2.png');

  await page.locator('.home-btn').click();
  await page.locator('.menu-button', { hasText: 'INDOVINA IL PERSONAGGIO: INDIZI' }).click();
  await expect(page.locator('.clue-row')).toHaveCount(10);
  await page.getByRole('button', { name: 'Rivela il primo indizio' }).click();
  await expect(page.locator('.clue-row.revealed')).toHaveCount(1);
  await expect(page.locator('.clue-row').first()).toContainText('66 BBY');

  await page.locator('.home-btn').click();
  await page.locator('.menu-button', { hasText: 'GEOGUESSR' }).click();
  await expect(page.locator('.geoguessr-media img')).toHaveAttribute('src', 'public/assets/star-wars/geoguessr/tatooine.svg');
  await page.getByRole('button', { name: 'Mostra risposta' }).click();
  await expect(page.locator('.geoguessr-answer')).toContainText('Tatooine');

  await page.locator('.home-btn').click();
  await page.locator('.menu-button', { hasText: 'JEOPARDY' }).click();
  await expect(page.locator('.jeopardy-cat')).toHaveCount(5);
  await expect(page.locator('.jeopardy-cat').nth(0)).toContainText('Star Wish');
  await expect(page.locator('.jeopardy-cat').nth(4)).toContainText('Titoli Clickbait');

  await page.locator('.home-btn').click();
  await page.locator('.preset-switcher').getByRole('button', { name: 'Anime', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-preset', 'anime');
  await expect(page.locator('.menu-button')).toHaveCount(1);

  const catalog = await page.evaluate(() => JSON.parse(localStorage.getItem('trivia-challenge-presets-v1')));
  expect(catalog.presets.anime.name).toBe('Anime');
  expect(catalog.presets['star-wars'].document.content.games).toHaveLength(5);
});

test('admin usa il manifest locale e rifiuta import non validi', async ({ page }) => {
  await page.getByRole('button', { name: 'ADMIN' }).click();
  await expect(page.getByRole('button', { name: 'Esci', exact: true })).toBeVisible();
  await expect(page.locator('#local-assets option')).toHaveCount(207);

  const immediateSaveStatus = await page.getByLabel('Titolo evento').evaluate(element => {
    element.value = 'TRIVIA TEST';
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return document.querySelector('[data-save-status]')?.textContent;
  });
  expect(immediateSaveStatus).toBe('Modifiche in corso');
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

test('l’editor salva nome, cognome, soprannomi e alter ego come alias', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-720p', 'Il controllo editoriale viene verificato una volta.');
  await page.getByRole('button', { name: 'ADMIN' }).click();
  const gameCard = page.locator('.saved-game', { hasText: 'Indovina il personaggio' });
  await expect(gameCard).toHaveCount(1);
  await gameCard.getByRole('button', { name: 'Modifica' }).click();

  const aliases = page.getByLabel('Alias accettati (separati da |)', { exact: true });
  await expect(aliases).toHaveCount(1);
  await aliases.fill('Sosuke | Aizen | Capitano Aizen');
  await aliases.press('Tab');
  await expect(page.locator('#json')).toHaveValue(/"acceptedAnswers": \[\s+"Sosuke",\s+"Aizen",\s+"Capitano Aizen"/);

  await page.getByRole('button', { name: 'Salva modifiche' }).click();
  const acceptedAnswers = await page.evaluate(() => {
    const documentState = JSON.parse(localStorage.getItem('trivia-challenge-v3'));
    return documentState.content.games
      .find(game => game.type === 'guess')
      .rounds[0].acceptedAnswers;
  });
  expect(acceptedAnswers).toEqual(['Sosuke', 'Aizen', 'Capitano Aizen']);
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
  await expect(page.locator('.menu-button')).toHaveCount(1);
  const initialState = await page.evaluate(() => {
    const documentState = JSON.parse(localStorage.getItem('trivia-challenge-v3'));
    return {
      historyIds: documentState.history.map(entry => entry.id),
      firstPlayerScore: documentState.session.players[0].score
    };
  });
  await page.locator('.menu-button', { hasText: 'INDOVINA IL PERSONAGGIO' }).click();
  await page.locator('.guess-tile').first().click();
  await page.getByRole('button', { name: 'Mostra risposta' }).click();
  await page.locator('.player-chip').first().click();
  await page.getByRole('button', { name: '+1000', exact: true }).click();
  await page.getByRole('button', { name: 'ADMIN' }).click();
  await page.getByRole('button', { name: 'Punteggi' }).click();
  await page.getByRole('button', { name: 'Annulla ultimo punteggio' }).click();
  await expect(page.locator('.mega-score').first()).toHaveText(String(initialState.firstPlayerScore));
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('trivia-challenge-v3')));
  expect(persisted.content.games).toHaveLength(11);
  expect(persisted.history.map(entry => entry.id)).toEqual(initialState.historyIds);
});

test('shell PWA e layout non generano overflow orizzontale', async ({ page }) => {
  await expect.poll(() => page.evaluate(async () => Boolean(await navigator.serviceWorker.ready))).toBe(true);
  const overflow = await horizontalOverflow(page);
  expect(overflow.pixels, JSON.stringify(overflow.offenders)).toBeLessThanOrEqual(1);
});

test('tutti gli undici minigiochi si aprono senza errori runtime', async ({ page }) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await showAllAnimeGames(page);

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
    await expect(page.locator('.menu-button')).toHaveCount(1);
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

test('dimensioni dei pulsanti giocatore sono modificabili e persistenti', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-720p', 'Il controllo editoriale viene verificato una volta.');
  await page.getByRole('button', { name: 'MODIFICA' }).click();
  const panel = page.locator('.content-editor', { hasText: 'Pulsanti giocatori' });
  await panel.getByLabel('Larghezza px').fill('128');
  await panel.getByLabel('Larghezza px').press('Tab');
  await expect(page.locator('.bottom-scorebar')).toHaveAttribute('style', /--player-button-w:128px/);
  await panel.getByLabel('Altezza px').fill('58');
  await panel.getByLabel('Altezza px').press('Tab');
  await expect(page.locator('.bottom-scorebar')).toHaveAttribute('style', /--player-button-h:58px/);
  await panel.getByLabel('Font rem').fill('0.7');
  await panel.getByLabel('Font rem').press('Tab');
  await expect(page.locator('.bottom-scorebar')).toHaveAttribute('style', /--player-button-font:0.7rem/);
  await panel.getByLabel('Spazio px').fill('8');
  await panel.getByLabel('Spazio px').press('Tab');
  await expect(page.locator('.bottom-scorebar')).toHaveAttribute('style', /--player-button-gap:8px/);
  await page.reload();
  await expect(page.locator('.bottom-scorebar')).toHaveAttribute('style', /--player-button-h:58px/);
});

test('reduced motion disattiva le animazioni non essenziali', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const duration = await page.locator('.stage-content').evaluate(element => getComputedStyle(element).animationDuration);
  expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.01);
});

test('pannello punteggio non ricrea il player audio', async ({ page }) => {
  await showAllAnimeGames(page);
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
  await expect(page.locator('.menu-button')).toHaveCount(1);
});

test('crea tutti i tipi di minigioco dall’editor', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-720p', 'Matrice editor eseguita una volta nel viewport host.');
  await page.getByRole('button', { name: 'ADMIN' }).click();
  const types = ['guess', 'clues', 'geoguessr', 'bomb', 'said', 'detail', 'quote', 'chain', 'labors', 'guillotine', 'pass', 'jeopardy', 'sarabanda'];
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
  await showAllAnimeGames(page);
  const open = async name => {
    await page.locator('.menu-button', { hasText: name }).click();
  };
  const home = async () => {
    await page.locator('.home-btn').click();
    await expect(page.locator('.menu-button')).toHaveCount(11);
  };

  await open('INDOVINA IL PERSONAGGIO');
  await page.locator('.guess-tile').first().click();
  await page.getByRole('button', { name: 'Mostra risposta' }).click();
  await home();

  await open('SCHIVA LA BOMBA');
  await page.locator('.bomb-tile').first().click();
  await page.getByRole('button', { name: 'Mostra bombe' }).click();
  await home();

  for (const name of ["CHI L'HA DETTO", 'OCCHIO AL DETTAGLIO', 'COMPLETA LA FRASE']) {
    await open(name);
    await page.getByRole('button', { name: 'Mostra risposta' }).click();
    await home();
  }

  await open('REAZIONE A CATENA');
  await page.getByRole('button', { name: 'Rivela' }).click();
  await home();

  await open('LE DIECI FATICHE');
  await page.locator('.labors-number').first().click();
  await page.getByRole('button', { name: 'Risposta', exact: true }).click();
  await home();

  await open('GHIGLIOTTINA');
  await page.getByRole('button', { name: 'Mostra risposta' }).click();
  await home();

  await open('PASSAPAROLA');
  await page.getByRole('button', { name: 'Corretta', exact: true }).click();
  await home();

  await open('JEOPARDY');
  await page.locator('.jeopardy-cell').first().click();
  await page.getByRole('button', { name: 'Mostra risposta' }).click();
  await home();

  await open('SARABANDA');
  await page.getByRole('button', { name: 'Mostra risposta' }).click();
  await expect(page.getByRole('button', { name: /\+\d+/ })).toHaveCount(0);
  const persistedScore = await page.evaluate(() => JSON.parse(localStorage.getItem('trivia-challenge-v3')).session.players[0].score);
  expect(persistedScore).toBe(0);
});
