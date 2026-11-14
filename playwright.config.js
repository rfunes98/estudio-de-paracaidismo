import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
const localBrowser='C:/Users/rober/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
export default defineConfig({
  testDir:'./tests',
  testMatch:'*.spec.js',
  fullyParallel:true,
  workers:2,
  retries:0,
  reporter:'list',
  use:{baseURL:'http://127.0.0.1:4173/curso/',trace:'retain-on-failure',launchOptions:fs.existsSync(localBrowser)?{executablePath:localBrowser}:{}},
  projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}],
  webServer:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI}
});
