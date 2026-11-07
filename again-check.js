// Verify WIN -> Play Again -> level 1. Usage: node again-check.js
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--hatch-webgl-allowed-domains-file=/home/hatch/workspace/tools/pw-shot/webgl-policy.txt', '--hatch-webgl-allowed-domains-sha256=dc8a0e5eec744f6590a4c1889139c00568ffedc3eced6d0a1a5127e35f9ccd16'] });
  const page = await browser.newPage({ viewport: { width: 480, height: 860 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem('pamper-time-save', JSON.stringify({ stars: {}, unlocked: 20 })); } catch (e) {} });
  const state = () => page.evaluate(() => window.__pamper());
  await page.goto('file:///home/hatch/workspace/playables-inspired/pamper-time/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.click('#btn-levels-open'); await page.waitForTimeout(400);
  await page.locator('#levels .lv').nth(19).click(); await page.waitForTimeout(400);
  // Paint the finale: sweep the paint rect, then tap the 6 sparkles.
  for (let g = 0; g < 10; g++) {
    let s = await state(); if (s.screen !== 'playing') break;
    if (s.paintDone < s.paintTotal * 0.85) {
      const r = s.paintRect, b = await page.locator('#game').boundingBox();
      for (let row = 0; row < 6; row++) {
        const y = b.y + (r.y + r.h * (row + 0.5) / 6) / 100 * b.height;
        const a = { x: b.x + (r.x + 2) / 100 * b.width, y }, c = { x: b.x + (r.x + r.w - 2) / 100 * b.width, y };
        await page.mouse.move(a.x, a.y); await page.mouse.down();
        for (let i = 0; i <= 10; i++) { await page.mouse.move(a.x + (c.x - a.x) * i / 10, a.y); await page.waitForTimeout(40); }
        await page.mouse.up();
      }
      await page.waitForTimeout(100); continue;
    }
    if (s.targets.length) { const t = s.targets[0], b = await page.locator('#game').boundingBox(); await page.mouse.click(b.x + t.x / 100 * b.width, b.y + t.y / 100 * b.height); await page.waitForTimeout(60); continue; }
    break;
  }
  let s = await state();
  console.log('after finale:', s.screen, 'level', s.level);
  if (s.screen !== 'win') { console.log('FAIL not on win screen'); await browser.close(); process.exit(1); }
  await page.click('#btn-again'); await page.waitForTimeout(400);
  s = await state();
  const ok = s.screen === 'playing' && s.level === 1 && s.done === 0;
  console.log(ok ? 'PASS play again -> level 1 playing, done 0' : 'FAIL play again: ' + JSON.stringify(s));
  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
  process.exit(ok && errors.length === 0 ? 0 : 1);
})().catch(e => { console.error('TEST CRASH', e.message.split('\n')[0]); process.exit(2); });
