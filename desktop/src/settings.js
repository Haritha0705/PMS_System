// Settings kept on this PC only. The database connection and the login-token
// secrets are encrypted with the Windows account's key (safeStorage).
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function read() {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
  } catch {
    return {};
  }
}

function write(settings) {
  fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2), { mode: 0o600 });
}

const encrypt = (value) => safeStorage.encryptString(value).toString('base64');

function decrypt(value) {
  try {
    return value ? safeStorage.decryptString(Buffer.from(value, 'base64')) : '';
  } catch {
    return ''; // Created under another Windows account: ask for it again
  }
}

function getDatabaseUrl() {
  return decrypt(read().databaseUrl);
}

function saveDatabaseUrl(url) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('This computer cannot store the connection securely.');
  }
  write({ ...read(), databaseUrl: encrypt(url) });
}

/** Secrets that sign login tokens: created once per PC, never shared. */
function getTokenSecrets() {
  const settings = read();
  const jwtSecret = decrypt(settings.jwtSecret) || crypto.randomBytes(48).toString('hex');
  const refreshSecret = decrypt(settings.refreshSecret) || crypto.randomBytes(48).toString('hex');
  write({ ...settings, jwtSecret: encrypt(jwtSecret), refreshSecret: encrypt(refreshSecret) });
  return { jwtSecret, refreshSecret };
}

/** Returns an error message, or null when the connection text looks right. */
function validateDatabaseUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    if ((protocol === 'postgresql:' || protocol === 'postgres:') && hostname) return null;
  } catch {
    // Reported below
  }
  return 'Please enter a connection that starts with postgresql://';
}

module.exports = { getDatabaseUrl, saveDatabaseUrl, getTokenSecrets, validateDatabaseUrl };
