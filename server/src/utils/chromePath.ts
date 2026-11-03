import path from 'path';
import fs from 'fs';

/**
 * Find a Chrome/Chromium executable on this machine.
 * Checks: bundled .chromium → global puppeteer cache → common install paths.
 */
export function findChromePath(): string | undefined {
  const isWin = process.platform === 'win32';
  const exeName = isWin ? 'chrome.exe' : 'chrome';

  function searchCache(cacheRoot: string): string | undefined {
    const chromeDir = path.join(cacheRoot, 'chrome');
    if (!fs.existsSync(chromeDir)) return undefined;
    try {
      const platforms = fs.readdirSync(chromeDir);
      for (const platform of platforms) {
        const platformDir = path.join(chromeDir, platform);
        const versions = fs.readdirSync(platformDir);
        for (const ver of versions) {
          const verDir = path.join(platformDir, ver);
          const candidates = [
            path.join(verDir, 'chrome-win64', 'chrome.exe'),
            path.join(verDir, 'chrome-linux64', 'chrome'),
            path.join(verDir, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
            path.join(verDir, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
          ];
          for (const c of candidates) {
            if (fs.existsSync(c)) return c;
          }
        }
      }
    } catch { /* ignore read errors */ }
    return undefined;
  }

  // 1. Bundled .chromium (packaged app)
  const localCache = path.join(__dirname, '..', '..', '.chromium');
  const local = searchCache(localCache);
  if (local) return local;

  // 2. Global puppeteer cache (~/.cache/puppeteer)
  const homeDir = process.env.USERPROFILE || process.env.HOME || '';
  const globalCache = path.join(homeDir, '.cache', 'puppeteer');
  const globalResult = searchCache(globalCache);
  if (globalResult) return globalResult;

  // 3. Common Windows Chrome install paths
  if (isWin) {
    const commonPaths = [
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ];
    for (const p of commonPaths) {
      if (p && fs.existsSync(p)) return p;
    }
  }

  // 4. Common Linux/Mac paths
  if (!isWin) {
    const commonPaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
    for (const p of commonPaths) {
      if (fs.existsSync(p)) return p;
    }
  }

  return undefined;
}
