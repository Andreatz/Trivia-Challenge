import { describe, expect, it, vi } from 'vitest';
import { GAME_DEFINITIONS, GAME_TYPES } from '../src/core/game-registry.js';
import { createGameContracts } from '../src/core/game-contracts.js';

describe('contratto comune dei giochi', () => {
  const renderer = vi.fn(game => game.type);
  const renderers = Object.fromEntries([...GAME_TYPES].map(type => [type, renderer]));
  const contracts = createGameContracts(GAME_DEFINITIONS, renderers);

  it('espone normalize, render, reset e getResult per ogni tipo', () => {
    for (const type of GAME_TYPES) {
      expect(Object.keys(contracts[type]).sort()).toEqual(['getResult', 'normalize', 'render', 'reset']);
      const normalized = contracts[type].normalize({ id: `game-${type}`, type });
      expect(normalized.title).toBeTruthy();
      expect(contracts[type].render(normalized)).toBe(type);
      expect(contracts[type].reset()).toEqual({});
      expect(contracts[type].getResult({ completed: true }).completed).toBe(true);
    }
  });
});
