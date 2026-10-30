import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const releaseTag = process.env.RELEASE_TAG;
if (releaseTag && releaseTag !== `v${pkg.version}`) throw Error(`Tag ${releaseTag} does not match package version ${pkg.version}`);
const out = path.join(root, 'dist');
fs.mkdirSync(out, {recursive: true});
const build = spawnSync(process.execPath, ['scripts/build.mjs'], {cwd: root, stdio: 'inherit'});
if (build.status !== 0) throw Error('Build failed');
const result = process.platform === 'win32'
  ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm.cmd pack --json --ignore-scripts --pack-destination dist'], {cwd: root, encoding: 'utf8'})
  : spawnSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', 'dist'], {cwd: root, encoding: 'utf8'});
if (result.status !== 0) throw Error(result.stderr || result.stdout || 'npm pack failed');
const [pack] = JSON.parse(result.stdout);
const stable = `${pkg.name}.tgz`;
fs.copyFileSync(path.join(out, pack.filename), path.join(out, stable));
const hash = createHash('sha256').update(fs.readFileSync(path.join(out, stable))).digest('hex');
fs.writeFileSync(path.join(out, 'SHA256SUMS.txt'), `${hash}  ${stable}\n${hash}  ${pack.filename}\n`);
console.log(`Created dist/${stable}, dist/${pack.filename} and dist/SHA256SUMS.txt`);
