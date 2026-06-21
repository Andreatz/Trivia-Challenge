import { defineConfig } from 'eslint/config';

const browserGlobals = {
  Blob: 'readonly', CSS: 'readonly', FileReader: 'readonly', HTMLInputElement: 'readonly', HTMLSelectElement: 'readonly', HTMLTextAreaElement: 'readonly',
  MutationObserver: 'readonly', URL: 'readonly', clearInterval: 'readonly', clearTimeout: 'readonly', confirm: 'readonly', document: 'readonly', fetch: 'readonly',
  localStorage: 'readonly', navigator: 'readonly', requestAnimationFrame: 'readonly', setInterval: 'readonly', setTimeout: 'readonly', structuredClone: 'readonly', window: 'readonly', console: 'readonly'
};

export default defineConfig([
  {
    ignores: ['node_modules/**', 'playwright-report/**', 'test-results/**', 'public/assets/**', 'public/reference-images/**']
  },
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: browserGlobals },
    rules: {
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.mjs', 'e2e/**/*.js', '*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { console: 'readonly', process: 'readonly', Buffer: 'readonly', URL: 'readonly', Event: 'readonly', localStorage: 'readonly', sessionStorage: 'readonly', navigator: 'readonly', document: 'readonly', getComputedStyle: 'readonly' } },
    rules: { 'no-undef': 'error', 'no-unreachable': 'error', 'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }] }
  },
  {
    files: ['service-worker.js'],
    languageOptions: { globals: { self: 'readonly', caches: 'readonly', fetch: 'readonly', URL: 'readonly' } }
  }
]);
