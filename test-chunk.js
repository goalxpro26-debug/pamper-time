// Chunked real-click test: seed the game's own save (unlocked=20), open the
// level-select grid, play levels START..END with real mouse input, report.
// Usage: node test-chunk.js <url> <outdir> <start> <end>
const { chromium } = require('playwright-core');
const fs = require('fs');
const [url, outdir, startArg, endArg] = process.argv.slice(2);
const START = parseInt(startArg || '1', 10), END = parseInt(endArg || '20', 10);
fs.mkdirSync(outdir, { recursive: true });
const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail: detail || '' }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  — ' + detail : '')); }
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--hatch-webgl-allowed-domains-file=/home/hatch/workspace/tools/pw-shot/webgl-policy.txt', '--hatch-webgl-allowed-domains-sha256=dc8a0e5eec744f6590a4c1889139c00568ffedc3eced6d0a1a5127e35f9ccd16'] });
  const page = await browser.newPage({ viewport: { width: 480, height: 860 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
  await page.addInitScript(() => { try { localStorage.setItem('pamper-time-save', JSON.stringify({ stars: {}, unlocked: 20 })); } catch (e) {} });
  const state = () => page.evaluate(() => window.__pamper ? window.__pamper() : null);
  const box = async () => page.locator('#game').boundingBox();
  const toPx = async (pt) => { const b = await box(); return { x: b.x + pt.x / 100 * b.width, y: b.y + pt.y / 100 * b.height }; };
  const clickPt = async (pt) => { const p = await toPx(pt); await page.mouse.click(p.x, p.y); await page.waitForTimeout(30); };
  const dragPt = async (a, b2) => { const p1 = await toPx(a), p2 = await toPx(b2); await page.mouse.move(p1.x, p1.y); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(p1.x + (p2.x - p1.x) * i / 10, p1.y + (p2.y - p1.y) * i / 10); await page.waitForTimeout(50); } await page.mouse.up(); await page.waitForTimeout(50); };
  const paintSweep = async () => {
    const s = await state(); if (!s || !s.paintRect) return;
    const r = s.paintRect, b = await box();
    const px = (x, y) => ({ x: b.x + x / 100 * b.width, y: b.y + y / 100 * b.height });
    for (let row = 0; row < 6; row++) {
      const y = r.y + r.h * (row + 0.5) / 6;
      const a = px(r.x + 2, y), c = px(r.x + r.w - 2, y);
      await page.mouse.move(a.x, a.y); await page.mouse.down();
      for (let i = 0; i <= 10; i++) { await page.mouse.move(a.x + (c.x - a.x) * i / 10, a.y); await page.waitForTimeout(40); }
      await page.mouse.up();
    }
    await page.waitForTimeout(100);
  };
  const playLevel = async () => {
    for (let guard = 0; guard < 120; guard++) {
      const s = await state();
      if (!s || s.screen !== 'playing') return s;
      if (s.mode === 'paint') {
        if (s.paintDone < s.paintTotal * 0.85) { await paintSweep(); continue; }
        if (s.targets.length) { await clickPt(s.targets[0]); continue; }
        return await state();
      }
      if (s.mode === 'drag') { if (!s.targets.length) return await state(); const t = s.targets[0]; await dragPt({ x: t.x, y: t.y }, { x: t.tx, y: t.ty }); continue; }
      if (!s.targets.length) return await state();
      await clickPt(s.targets[0]);
    }
    return await state();
  };

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  let s = await state();
  check('loads, seeded save shows 20 unlocked', s && s.unlocked === 20, JSON.stringify(s && s.unlocked));
  await page.click('#btn-levels-open'); await page.waitForTimeout(400);
  await page.locator('#levels .lv').nth(START - 1).click(); await page.waitForTimeout(400);
  s = await state();
  check('level select -> playing level ' + START, s && s.screen === 'playing' && s.level === START, JSON.stringify(s && { level: s.level, name: s.levelName, mode: s.mode }));
  for (let lv = START; lv <= END; lv++) {
    s = await state();
    if (s.screen === 'win') { check('reached WIN at level ' + lv, lv === 20, JSON.stringify(s)); break; }
    if (s.screen !== 'playing') { check('level ' + lv + ' is playing', false, JSON.stringify(s)); break; }
    if (lv === 10) await page.screenshot({ path: outdir + '/10-level10.png' });
    if (lv === 20) await page.screenshot({ path: outdir + '/20-level20.png' });
    s = await playLevel(); await page.waitForTimeout(300); s = await state();
    if (lv === 20) {
      check('level 20 completes -> WIN screen', s && s.screen === 'win', JSON.stringify(s));
      await page.screenshot({ path: outdir + '/21-win.png' });
      break;
    }
    check('level ' + lv + ' (' + (s.levelName || '') + ') clear, stars>=1', s && s.screen === 'clear' && s.stars >= 1, JSON.stringify(s && { stars: s.stars, score: s.score }));
    await page.click('#btn-next'); await page.waitForTimeout(300);
  }
  check('no page/console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e.message.split('\n')[0]); process.exit(2); });
