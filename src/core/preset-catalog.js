export const PRESET_CATALOG_VERSION = 1;
export const PRESETS_STORAGE_KEY = 'trivia-challenge-presets-v1';
export const ANIME_PRESET_ID = 'anime';
export const STAR_WARS_PRESET_ID = 'star-wars';
export const ANIME_SEED_REVISION = 'anime-backup-2026-08-28-v1';

const clone = value => JSON.parse(JSON.stringify(value));

export function createPresetCatalog(animeDocument, starWarsDocument, animeSeedRevision = '') {
  return {
    version: PRESET_CATALOG_VERSION,
    animeSeedRevision,
    activePresetId: ANIME_PRESET_ID,
    presets: {
      [ANIME_PRESET_ID]: {
        id: ANIME_PRESET_ID,
        name: 'Anime',
        theme: 'anime',
        document: clone(animeDocument)
      },
      [STAR_WARS_PRESET_ID]: {
        id: STAR_WARS_PRESET_ID,
        name: 'Star Wars',
        theme: 'star-wars',
        document: clone(starWarsDocument)
      }
    }
  };
}

export function preparePresetCatalog(input, { animeDocument, starWarsDocument, animeSeedRevision = '', prepareDocument }) {
  const fallback = createPresetCatalog(animeDocument, starWarsDocument, animeSeedRevision);
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fallback;

  const sourcePresets = input.presets && typeof input.presets === 'object' ? input.presets : {};
  const presets = {};
  for (const fallbackPreset of Object.values(fallback.presets)) {
    const candidate = sourcePresets[fallbackPreset.id];
    try {
      presets[fallbackPreset.id] = {
        ...fallbackPreset,
        ...(candidate && typeof candidate === 'object' ? candidate : {}),
        id: fallbackPreset.id,
        name: fallbackPreset.name,
        theme: fallbackPreset.theme,
        document: prepareDocument(candidate?.document || fallbackPreset.document)
      };
    } catch {
      presets[fallbackPreset.id] = fallbackPreset;
    }
  }

  if (animeSeedRevision && input.animeSeedRevision !== animeSeedRevision) {
    presets[ANIME_PRESET_ID].document = prepareDocument(animeDocument);
    const sharedHomeLayout = starWarsDocument?.content?.homeLayout;
    if (sharedHomeLayout && presets[STAR_WARS_PRESET_ID]?.document?.content) {
      presets[STAR_WARS_PRESET_ID].document.content.homeLayout = clone(sharedHomeLayout);
    }
  }

  const activePresetId = presets[input.activePresetId] ? input.activePresetId : ANIME_PRESET_ID;
  return { version: PRESET_CATALOG_VERSION, animeSeedRevision, activePresetId, presets };
}

export function updatePresetDocument(catalog, presetId, document) {
  if (!catalog?.presets?.[presetId]) throw new Error(`Preset sconosciuto: ${presetId}`);
  catalog.presets[presetId].document = clone(document);
  catalog.activePresetId = presetId;
  return catalog;
}
