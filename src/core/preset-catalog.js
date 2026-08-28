export const PRESET_CATALOG_VERSION = 1;
export const PRESETS_STORAGE_KEY = 'trivia-challenge-presets-v1';
export const ANIME_PRESET_ID = 'anime';
export const STAR_WARS_PRESET_ID = 'star-wars';

const clone = value => JSON.parse(JSON.stringify(value));

export function createPresetCatalog(animeDocument, starWarsDocument) {
  return {
    version: PRESET_CATALOG_VERSION,
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

export function preparePresetCatalog(input, { animeDocument, starWarsDocument, prepareDocument }) {
  const fallback = createPresetCatalog(animeDocument, starWarsDocument);
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

  const activePresetId = presets[input.activePresetId] ? input.activePresetId : ANIME_PRESET_ID;
  return { version: PRESET_CATALOG_VERSION, activePresetId, presets };
}

export function updatePresetDocument(catalog, presetId, document) {
  if (!catalog?.presets?.[presetId]) throw new Error(`Preset sconosciuto: ${presetId}`);
  catalog.presets[presetId].document = clone(document);
  catalog.activePresetId = presetId;
  return catalog;
}
