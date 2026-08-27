import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.capsula.app',
  appName: 'Capsula',
  webDir: 'dist',
};

// Live-reload dev sessions only. Set CAP_DEV_SERVER before running
// `npx cap run` to point the app at your PC's Vite dev server instead of
// a bundled build — see the Live-Reload Dev Session Workflow.
// This is never written into the file itself, so nothing here goes stale
// or needs updating when your network changes.
if (process.env.CAP_DEV_SERVER) {
  config.server = {
    url: process.env.CAP_DEV_SERVER,
    cleartext: true,
  };
}

export default config;
