import { describe, expect, it } from 'vitest';

import {
  ANIME_PRESET_ID,
  ANIME_SEED_REVISION,
  createPresetCatalog,
  preparePresetCatalog,
  STAR_WARS_PRESET_ID,
  STAR_WARS_SEED_REVISION,
  updatePresetDocument
} from '../src/core/preset-catalog.js';

const document = title => ({ schemaVersion: 3, content: { title }, session: { games: {}, players: [] }, settings: {}, history: [] });

describe('catalogo preset', () => {
  it('acquisisce il documento esistente come Anime e crea Star Wars', () => {
    const catalog = createPresetCatalog(document('Salvataggio attuale'), document('Star Wars'));
    expect(catalog.activePresetId).toBe(ANIME_PRESET_ID);
    expect(catalog.presets[ANIME_PRESET_ID].document.content.title).toBe('Salvataggio attuale');
    expect(catalog.presets[STAR_WARS_PRESET_ID].name).toBe('Star Wars');
  });

  it('mantiene separati i documenti durante il salvataggio', () => {
    const catalog = createPresetCatalog(document('Anime'), document('Star Wars'));
    updatePresetDocument(catalog, STAR_WARS_PRESET_ID, document('Star Wars modificato'));
    expect(catalog.activePresetId).toBe(STAR_WARS_PRESET_ID);
    expect(catalog.presets[ANIME_PRESET_ID].document.content.title).toBe('Anime');
    expect(catalog.presets[STAR_WARS_PRESET_ID].document.content.title).toBe('Star Wars modificato');
  });

  it('ripara soltanto il preset non valido', () => {
    const fallbackAnime = document('Anime fallback');
    const fallbackStarWars = document('Star Wars fallback');
    const catalog = preparePresetCatalog({
      activePresetId: STAR_WARS_PRESET_ID,
      presets: {
        anime: { document: document('Anime salvato') },
        'star-wars': { document: null }
      }
    }, {
      animeDocument: fallbackAnime,
      starWarsDocument: fallbackStarWars,
      prepareDocument: value => {
        if (!value?.content?.title) throw new Error('Documento non valido');
        return value;
      }
    });

    expect(catalog.activePresetId).toBe(STAR_WARS_PRESET_ID);
    expect(catalog.presets.anime.document.content.title).toBe('Anime salvato');
    expect(catalog.presets['star-wars'].document.content.title).toBe('Star Wars fallback');
  });

  it('ripristina il backup Anime una sola volta e sincronizza il layout Star Wars', () => {
    const backupAnime = document('Anime dal backup');
    backupAnime.content.homeLayout = { titleX: 42, menuButtons: { anime: { x: 10 } } };
    const starWarsSeed = document('Star Wars');
    starWarsSeed.content.homeLayout = { titleX: 42 };
    const existing = createPresetCatalog(document('Anime incompleto'), document('Star Wars modificato'));
    existing.activePresetId = STAR_WARS_PRESET_ID;

    const restored = preparePresetCatalog(existing, {
      animeDocument: backupAnime,
      starWarsDocument: starWarsSeed,
      animeSeedRevision: ANIME_SEED_REVISION,
      prepareDocument: value => value
    });

    expect(restored.animeSeedRevision).toBe(ANIME_SEED_REVISION);
    expect(restored.presets.anime.document.content.title).toBe('Anime dal backup');
    expect(restored.presets['star-wars'].document.content.title).toBe('Star Wars modificato');
    expect(restored.presets['star-wars'].document.content.homeLayout).toEqual({ titleX: 42 });

    restored.presets.anime.document.content.title = 'Anime modificato dopo il ripristino';
    const preparedAgain = preparePresetCatalog(restored, {
      animeDocument: backupAnime,
      starWarsDocument: starWarsSeed,
      animeSeedRevision: ANIME_SEED_REVISION,
      prepareDocument: value => value
    });
    expect(preparedAgain.presets.anime.document.content.title).toBe('Anime modificato dopo il ripristino');
  });

  it('aggiorna i contenuti Star Wars una sola volta preservando layout e partita', () => {
    const anime = document('Anime');
    const oldStarWars = document('Star Wars personalizzato');
    oldStarWars.content.homeLayout = { titleX: 61 };
    oldStarWars.content.games = [{ id: 'star-wars-pass', type: 'pass', questions: [{ answer: 'Vecchia' }], layout: { gameRibbon: { x: 9 } }, showOnHome: false }];
    oldStarWars.session.players = [{ id: 'p1', name: 'PLAYER', score: 400 }];
    oldStarWars.history = [{ id: 'h1', points: 400 }];
    const seed = document('Star Wars dal seed');
    seed.content.games = [
      { id: 'star-wars-pass', type: 'pass', questions: [{ answer: 'Nuova' }] },
      { id: 'star-wars-jeopardy', type: 'jeopardy', categories: [] }
    ];
    const existing = createPresetCatalog(anime, oldStarWars);

    const restored = preparePresetCatalog(existing, {
      animeDocument: anime,
      starWarsDocument: seed,
      starWarsSeedRevision: STAR_WARS_SEED_REVISION,
      prepareDocument: value => value
    });

    const restoredDocument = restored.presets[STAR_WARS_PRESET_ID].document;
    expect(restored.starWarsSeedRevision).toBe(STAR_WARS_SEED_REVISION);
    expect(restoredDocument.content.games).toHaveLength(2);
    expect(restoredDocument.content.games[0].questions[0].answer).toBe('Nuova');
    expect(restoredDocument.content.games[0].layout).toEqual({ gameRibbon: { x: 9 } });
    expect(restoredDocument.content.games[0].showOnHome).toBe(false);
    expect(restoredDocument.content.homeLayout).toEqual({ titleX: 61 });
    expect(restoredDocument.session.players[0].score).toBe(400);
    expect(restoredDocument.history).toEqual([{ id: 'h1', points: 400 }]);

    restoredDocument.content.games[0].questions[0].answer = 'Modifica successiva';
    const preparedAgain = preparePresetCatalog(restored, {
      animeDocument: anime,
      starWarsDocument: seed,
      starWarsSeedRevision: STAR_WARS_SEED_REVISION,
      prepareDocument: value => value
    });
    expect(preparedAgain.presets[STAR_WARS_PRESET_ID].document.content.games[0].questions[0].answer).toBe('Modifica successiva');
  });
});
