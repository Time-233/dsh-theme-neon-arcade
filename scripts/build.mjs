import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {tokens} from '../src/palette.mjs';
import {stars, scene} from '../src/arcade-art.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readText = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n?/g, '\n');
const font = fs.readFileSync(path.join(root, 'assets/Silkscreen-Regular.ttf')).toString('base64');
let css = readText('src/theme.css').replace('__PIXEL_FONT__', `data:font/ttf;base64,${font}`);
for(const mode of ['dark','light']) {
  for(const [name,generate] of [['stars',stars],['scene',scene]]) {
    const svg=generate(mode);
    fs.writeFileSync(path.join(root, `assets/arcade-${name}-${mode}.svg`),svg);
    css=css.replace(`__ARCADE_${name.toUpperCase()}_${mode.toUpperCase()}__`, () => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
  }
}
const client = readText('src/client.js')
  .replace('__THEME_CSS__', () => JSON.stringify(css))
  .replace('__THEME_TOKENS__', () => JSON.stringify(tokens))
  .replace('__AIR_BATTLE_RUNTIME__', () => readText('src/air-battle.mjs').replace(/^export /gm, ''))
  .replace('__PIG_SLING_RUNTIME__', () => readText('src/pig-sling.mjs').replace(/^import .*;\n/gm,'').replace(/^export /gm,''))
  .replace('__FRUIT_SLICE_RUNTIME__', () => readText('src/fruit-slice.mjs').replace(/^import .*;\n/gm,'').replace(/^export /gm,''));
fs.writeFileSync(path.join(root, 'client.js'), client);
console.log(`Built native client: ${Buffer.byteLength(client)} bytes; ${Object.keys(tokens).length} semantic tokens; embedded font, pixel scenes and three games.`);
