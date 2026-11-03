const path = require('path');

/**
 * Puppeteer configuration — downloads Chrome into server/.chromium
 * so it can be bundled with the Electron app.
 */
module.exports = {
  cacheDirectory: path.join(__dirname, '.chromium'),
};
