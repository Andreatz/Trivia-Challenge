function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createGameContracts(definitions, renderers = {}) {
  return Object.fromEntries(Object.keys(definitions).map(type => [type, Object.freeze({
    normalize(game) {
      const normalized = clone(game || {});
      normalized.type = type;
      normalized.title ||= definitions[type].label;
      normalized.menuTitle ||= normalized.title.toUpperCase();
      normalized.layout ||= {};
      normalized.customElements ||= [];
      normalized.showOnHome = normalized.showOnHome !== false;
      return normalized;
    },
    render(game, context) {
      const renderer = renderers[type];
      if (typeof renderer !== 'function') throw new Error(`Renderer non registrato per ${type}.`);
      return renderer(game, context);
    },
    reset() {
      return {};
    },
    getResult(progress = {}) {
      return progress.result ?? {
        status: progress.status || (progress.completed ? 'completed' : 'pending'),
        completed: !!progress.completed
      };
    }
  })]));
}
