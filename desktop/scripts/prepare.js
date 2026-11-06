#!/usr/bin/env node
// Prepares what the desktop app ships: the built client, the built server with only
// the packages it needs at run time, and Chrome for Windows (used to make PDFs).
// No .env file is ever copied, so no secret can end up in the installer.
//   node scripts/prepare.js         everything, for the Windows installer
//   node scripts/prepare.js --dev   only the client, for trying the app on this computer
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const desktop = path.join(__dirname, '..');
const root = path.join(desktop, '..');
const clientDir = path.join(root, 'client');
const serverDir = path.join(root, 'server');
const stage = path.join(desktop, '.stage');
const stageServer = path.join(stage, 'server');
const chromeCache = path.join(desktop, '.cache', 'chromium');

// Needed only to build or develop, not to run. Removing them saves about 300 MB.
// .bin holds command shortcuts, which the running app never uses and which would point at removed packages.
const NOT_NEEDED_AT_RUN_TIME = ['.bin', 'typescript', 'prisma', '@prisma/engines', '@faker-js', '@types'];

function run(command, args, cwd) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  execFileSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
}

function buildClient() {
  run('npx', ['tsc', '-b'], clientDir);
  run('npx', ['vite', 'build', '--mode', 'desktop', '--outDir', path.join(stage, 'client'), '--emptyOutDir'], clientDir);
}

function buildServer() {
  run('npm', ['run', 'build'], serverDir);
  fs.rmSync(stageServer, { recursive: true, force: true });
  fs.mkdirSync(stageServer, { recursive: true });

  const copyFilter = (source) => !/[\\/](__tests__|__mocks__|scripts)([\\/]|$)/.test(source) && !source.endsWith('.map');
  fs.cpSync(path.join(serverDir, 'dist'), path.join(stageServer, 'dist'), { recursive: true, filter: copyFilter });
  for (const file of ['package.json', 'package-lock.json']) {
    fs.copyFileSync(path.join(serverDir, file), path.join(stageServer, file));
  }

  // --ignore-scripts: packages must not download or compile things for this computer
  run('npm', ['ci', '--omit=dev', '--ignore-scripts', '--os=win32', '--cpu=x64', '--no-audit', '--no-fund'], stageServer);

  // The generated database client is plain JavaScript and WebAssembly, so it runs on any system
  fs.cpSync(path.join(serverDir, 'node_modules', '.prisma'), path.join(stageServer, 'node_modules', '.prisma'), { recursive: true });
  for (const name of NOT_NEEDED_AT_RUN_TIME) {
    fs.rmSync(path.join(stageServer, 'node_modules', name), { recursive: true, force: true });
  }
}

function addWindowsChrome() {
  const hasChrome = fs.existsSync(path.join(chromeCache, 'chrome')) &&
    fs.readdirSync(path.join(chromeCache, 'chrome')).some((dir) => dir.startsWith('win64-'));
  if (!hasChrome) {
    run('npx', ['puppeteer', 'browsers', 'install', 'chrome', '--platform', 'win64', '--path', chromeCache], stageServer);
  }
  fs.cpSync(chromeCache, path.join(stageServer, '.chromium'), { recursive: true });
}

/** Stops the build if anything secret was picked up. */
function checkNoSecrets() {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.chromium') walk(full);
      } else if (entry.name === '.env' || /npg_[A-Za-z0-9]{6,}/.test(fs.readFileSync(full, 'latin1'))) {
        found.push(full);
      }
    }
  };
  walk(stage);
  if (found.length > 0) throw new Error(`Secrets found in the build:\n${found.join('\n')}`);
}

const devOnly = process.argv.includes('--dev');
buildClient();
if (!devOnly) {
  buildServer();
  addWindowsChrome();
}
checkNoSecrets();
console.log('\nPrepared desktop files in desktop/.stage');
