import { expect, test } from '@playwright/test';

test('spettatore mobile risponde per immagine e appare nella classifica live', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-720p', 'Il flusso multi-dispositivo viene verificato una volta.');
  test.skip(
    !process.env.AUDIENCE_ADMIN_EMAIL || !process.env.AUDIENCE_ADMIN_PASSWORD,
    'Imposta le credenziali Admin locali per il test integrato.'
  );

  const hostContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const spectatorContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const leaderboardContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const localAudienceConfig = {
    supabaseUrl: 'http://127.0.0.1:54321',
    publishableKey: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
    relayUrl: 'http://127.0.0.1:8787'
  };
  await Promise.all(
    [hostContext, spectatorContext, leaderboardContext].map(context => context.addInitScript(config => {
      globalThis.TRIVIA_ADMIN_TEST_BYPASS = true;
      globalThis.TRIVIA_AUDIENCE_CONFIG = config;
    }, localAudienceConfig))
  );
  const host = await hostContext.newPage();
  const spectator = await spectatorContext.newPage();
  const leaderboard = await leaderboardContext.newPage();
  const runtimeErrors = [];
  const spectatorSockets = [];
  spectator.on('websocket', socket => spectatorSockets.push(socket.url()));
  [host, spectator, leaderboard].forEach(page => {
    page.on('pageerror', error => runtimeErrors.push(error.message));
  });

  try {
    await host.goto('/');
    await host.evaluate(async credentials => {
      const { audienceClient } = await import('/src/audience-api.js');
      const { error } = await audienceClient().auth.signInWithPassword(credentials);
      if (error) throw error;
    }, {
      email: process.env.AUDIENCE_ADMIN_EMAIL,
      password: process.env.AUDIENCE_ADMIN_PASSWORD
    });
    await host.evaluate(() => localStorage.removeItem('trivia-audience-host-v1'));
    await host.reload();
    await host.getByRole('button', { name: 'Spettatori' }).click();
    await host.getByRole('button', { name: 'Crea stanza spettatori' }).click();
    const roomCode = await host.locator('.audience-room-code').innerText();
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
    await expect(host.locator('.audience-host-qr')).toBeVisible();
    await host.screenshot({ path: 'test-results/audience-host-qr.png', fullPage: true });

    await spectator.goto(`/spectator.html?code=${roomCode}`);
    await spectator.getByLabel('Nickname').fill('Alice E2E');
    await spectator.getByRole('button', { name: 'Partecipa' }).click();
    await expect(spectator.getByText('Alice E2E', { exact: true })).toBeVisible();
    await expect(spectator.getByRole('heading', { name: 'In attesa della prossima domanda…' })).toBeVisible();
    await expect(spectator.getByText('LIVE', { exact: true })).toBeVisible();
    expect(spectatorSockets.some(url => url.startsWith('ws://127.0.0.1:8787/'))).toBe(true);
    expect(spectatorSockets.some(url => url.includes('supabase') || url.includes('/realtime/'))).toBe(false);

    await host.getByRole('button', { name: 'Show', exact: true }).click();
    await host.locator('.menu-button', { hasText: 'INDOVINA IL PERSONAGGIO' }).click();
    await host.locator('.guess-tile').nth(0).click();
    await expect(spectator.getByText('Risposta aperta · 1000 punti')).toBeVisible();

    await spectator.reload();
    await expect(spectator.getByText('Alice E2E', { exact: true })).toBeVisible();
    await expect(spectator.getByText('LIVE', { exact: true })).toBeVisible();
    await expect(spectator.getByText('Risposta aperta · 1000 punti')).toBeVisible();

    await spectator.getByLabel('La tua risposta').fill('Ichigo');
    await spectator.getByRole('button', { name: 'Invia risposta' }).click();
    await expect(spectator.getByText('Non è corretta. Potrai riprovare alla prossima immagine.')).toBeVisible();
    await expect(spectator.getByLabel('La tua risposta')).toBeDisabled();

    await host.locator('.guess-tile').nth(1).click();
    await expect(spectator.getByText('Risposta aperta · 500 punti')).toBeVisible();
    await spectator.getByLabel('La tua risposta').fill('Aizen');
    await spectator.getByRole('button', { name: 'Invia risposta' }).click();
    await expect(spectator.getByText('Corretta! +500 punti')).toBeVisible();
    await expect(spectator.locator('.player-score strong')).toHaveText('500');

    await leaderboard.goto(`/leaderboard.html?code=${roomCode}`);
    await expect(leaderboard.getByText('Alice E2E', { exact: true })).toBeVisible();
    await expect(leaderboard.locator('.podium-card').filter({ hasText: 'Alice E2E' })).toContainText('500 pt');
    await expect(leaderboard.getByText('LIVIO', { exact: true })).toHaveCount(0);
    await expect(leaderboard.getByText('MELIA', { exact: true })).toHaveCount(0);
    await expect(leaderboard.getByText('MAGGI', { exact: true })).toHaveCount(0);

    await host.screenshot({ path: 'test-results/audience-host-game.png', fullPage: true });
    await spectator.screenshot({ path: 'test-results/audience-mobile.png', fullPage: true });
    await leaderboard.screenshot({ path: 'test-results/audience-leaderboard.png', fullPage: true });
    expect(runtimeErrors).toEqual([]);
  } finally {
    await hostContext.close();
    await spectatorContext.close();
    await leaderboardContext.close();
  }
});
