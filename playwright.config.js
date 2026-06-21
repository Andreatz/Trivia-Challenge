import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 2,
  timeout: 45_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium-720p', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'chromium-1080p', use: { ...devices['Desktop Chrome HiDPI'], viewport: { width: 1920, height: 1080 } } },
    { name: 'chromium-1440p', use: { ...devices['Desktop Chrome HiDPI'], viewport: { width: 2560, height: 1440 } } },
    { name: 'chromium-mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }
  ],
  webServer: {
    command: 'python -m http.server 4174 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'ignore',
    timeout: 30_000
  }
});
