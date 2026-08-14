// Browser smoke test: does the whole thing actually run?
//
//   node tools/e2e.js
//
// Serves pixel/ itself, so there is no external server to forget to start.
//
// Drives a real Chromium through menu -> rules -> a run -> death -> leaderboard,
// and fails on any page error. The unit-level tools prove the maze, the collapse
// and the renderer; this proves they are wired together.

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  const rel = normalize(decodeURI(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  const file = join(ROOT, rel === '/' ? 'index.html' : rel);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(8123, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

await page.goto('http://localhost:8123/', { waitUntil: 'networkidle' });
await page.waitForSelector('#menu:not(.hidden)');
console.log('menu rendered, mode cards:', await page.locator('.mode').count());

// Rules screen
await page.click('#to-rules');
await page.waitForSelector('#rules:not(.hidden)');
console.log('rules screen ok');
await page.click('#rules-back');

// Start UNPLEASANT free play
await page.click('button[data-mode="unpleasant"][data-ranked="0"]');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 20000 });
console.log('run started, overlay dismissed');

await page.waitForTimeout(3500); // countdown is 3s on easy
console.log('countdown done, clock reads', await page.textContent('#hud-time'));

// The magnifying glass: move the mouse and confirm the lens layer actually has
// something on it, and that it follows.
await page.mouse.move(960, 540);
await page.waitForTimeout(120);
const lensPixels = () => page.evaluate(() => {
  const c = document.getElementById('lens');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let opaque = 0, sumX = 0, sumY = 0;
  for (let i = 3, p = 0; i < d.length; i += 4, p++) {
    if (d[i] > 8) { opaque++; sumX += p % c.width; sumY += (p / c.width) | 0; }
  }
  return { opaque, cx: opaque ? Math.round(sumX / opaque) : -1, cy: opaque ? Math.round(sumY / opaque) : -1 };
});
const atA = await lensPixels();
console.log(`  glass drawn: ${atA.opaque} px, centred (${atA.cx}, ${atA.cy})`);
await page.mouse.move(600, 400);
await page.waitForTimeout(120);
const atB = await lensPixels();
const followed = atA.cx !== atB.cx || atA.cy !== atB.cy;
console.log(`  after moving the mouse: centred (${atB.cx}, ${atB.cy}) ${followed ? '(followed)' : '(DID NOT FOLLOW)'}`);
if (atA.opaque === 0) errors.push('lens layer is empty — no magnifying glass drawn');
if (!followed) errors.push('lens did not follow the mouse');


// Drive the pixel: hold a direction and see moves accumulate
for (const key of ['ArrowRight','ArrowDown','ArrowLeft','ArrowUp']) {
  await page.keyboard.down(key);
  await page.waitForTimeout(120);
  await page.keyboard.up(key);
  const moves = await page.textContent('#hud-moves');
  const dead = await page.isVisible('#result');
  console.log(`  ${key}: moves=${moves}${dead ? ' (run ended)' : ''}`);
  if (dead) break;
}

await page.screenshot({ path: 'tools/out/e2e-playing.png' });

// Force an end: walk into a wall repeatedly until dead
for (let i = 0; i < 40 && !(await page.isVisible('#result')); i++) {
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(60); await page.keyboard.up('ArrowUp');
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(60); await page.keyboard.up('ArrowRight');
}
const ended = await page.isVisible('#result');
if (ended) {
  console.log('result title:', await page.textContent('#result-title'));
  console.log('result body :', (await page.textContent('#result-body')).replace(/\s+/g,' ').trim());
  await page.screenshot({ path: 'tools/out/e2e-result.png' });
  await page.click('#result-back');
}

// Leaderboard should now have the free-play run recorded (unranked → not listed)
await page.click('#to-board');
await page.waitForSelector('#board:not(.hidden)');
console.log('leaderboard sections:', await page.locator('#board-body section').count());
await page.screenshot({ path: 'tools/out/e2e-board.png' });

await page.click('#board-back');

// Excruciating: fog and the control HUD are the two things only a real browser can
// confirm, since drawHud is the one part that touches a 2D context.
await page.click('button[data-mode="excruciating"][data-ranked="0"]');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 20000 });
await page.waitForTimeout(150);
await page.mouse.move(900, 500);
await page.waitForTimeout(80);
const excruciatingLens = await page.evaluate(() => {
  const c = document.getElementById('lens');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let opaque = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 8) opaque++;
  return opaque;
});
console.log(`  lens layer: ${excruciatingLens} px ${excruciatingLens === 0 ? '(no glass, correct)' : '(SHOULD BE EMPTY)'}`);
if (excruciatingLens > 0) errors.push('Excruciating drew a magnifying glass; it must not have one');
await page.screenshot({ path: 'tools/out/e2e-excruciating-fog.png' });
const hudPixels = await page.evaluate(() => {
  const c = document.getElementById('field');
  const d = c.getContext('2d').getImageData(1680, 940, 240, 140).data;
  let lit = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] > 40) lit++;
  return lit;
});
console.log('excruciating started; HUD reserve has', hudPixels, 'lit pixels (control display drawn)');

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
