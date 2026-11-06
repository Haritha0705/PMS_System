// electron-builder leaves node_modules out of extra resources, so the server's
// run-time packages are copied in here, before the installer is made.
const fs = require('fs');
const path = require('path');

exports.default = async function afterPack({ appOutDir }) {
  const from = path.join(__dirname, '..', '.stage', 'server', 'node_modules');
  const to = path.join(appOutDir, 'resources', 'server', 'node_modules');
  fs.cpSync(from, to, { recursive: true, verbatimSymlinks: true });
  if (!fs.existsSync(path.join(to, 'fastify', 'package.json'))) {
    throw new Error('Server packages were not copied into the app');
  }
};
