import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(pkg.name, 'dsh-theme-neon-arcade');
assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
assert.equal(pkg.dsh?.bundle?.patch, './cordis.patch.yml');
const patch = fs.readFileSync(path.join(root, pkg.dsh.bundle.patch), 'utf8');
assert.match(patch, /- insert:/);
assert.match(patch, /name: dsh-theme-neon-arcade/);
assert.equal(pkg.dsh.client.platform, 'web');
assert.equal(Object.keys(pkg.dependencies || {}).length, 0);
for (const key of ['install', 'postinstall', 'preinstall', 'prepare']) {
  assert.equal(pkg.scripts?.[key], undefined, `${key} must not be needed for a prebuilt install`);
}
const screenshots = JSON.parse(fs.readFileSync(path.join(root, 'screenshots.json'), 'utf8'));
assert.ok(screenshots.length >= 1 && screenshots.length <= 8);
for (const screenshot of screenshots) {
  assert.ok(!screenshot.startsWith('/') && !screenshot.split('/').includes('..'));
  assert.ok(fs.existsSync(path.join(root, screenshot)), `Screenshot not found: ${screenshot}`);
}
const clientPath = path.join(root, 'client.js');
const before = fs.readFileSync(clientPath);
const build = spawnSync(process.execPath, ['scripts/build.mjs'], {cwd: root, encoding: 'utf8'});
assert.equal(build.status, 0, build.stderr);
assert.deepEqual(fs.readFileSync(clientPath), before, 'Committed client.js must match a fresh build');
const client = before.toString('utf8');
assert.ok(!/__THEME_CSS__|__THEME_TOKENS__|__AIR_BATTLE_RUNTIME__|__PIXEL_FONT__|__ARCADE_[A-Z_]+__/.test(client), 'Unresolved build placeholders');
assert.ok(client.includes("runtime !== 'desktop'"), 'Desktop guard must be present');
new vm.Script(client, {filename: 'client.js'});
// cmd is only used for the npm shim; file operations stay in Node.
const npm = process.platform === 'win32'
  ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm.cmd pack --dry-run --json --ignore-scripts'], {cwd: root, encoding: 'utf8'})
  : spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {cwd: root, encoding: 'utf8'});
assert.equal(npm.status, 0, npm.stderr);
const [pack] = JSON.parse(npm.stdout);
const files = new Set(pack.files.map(file => file.path));
for (const file of ['package.json', 'index.js', 'client.js', 'cordis.patch.yml', 'icon.svg', 'screenshots.json', 'assets/icon-180.png', 'assets/Silkscreen-Regular.ttf', 'assets/Silkscreen-OFL.txt', 'README.md', 'LICENSE', 'CHANGELOG.md', 'docs/screenshots/theme.png', 'docs/screenshots/air-battle.png', 'scripts/build.mjs', 'src/client.js', 'src/theme.css']) {
  assert.ok(files.has(file), `Missing from tarball: ${file}`);
}
for (const file of files) {
  assert.ok(!/(^|\/)(node_modules|\.git|dist|work)(\/|$)/.test(file), `Unexpected packed file: ${file}`);
  assert.ok(!/\.tgz$|(^|\/)\.env(?:\.|$)/.test(file), `Unexpected packed file: ${file}`);
}
const {name, apply} = await import('../index.js');
assert.equal(name, pkg.name);
assert.equal(typeof apply, 'function');
console.log(`PASS: installable dsh.bundle, deterministic client, offline assets, licenses and ${files.size} packed files (${pack.size} bytes).`);
