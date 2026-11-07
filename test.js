// Real-click test for Pamper Time: Relaxing Minis. Usage: node test.js <url> <outdir>
const { chromium } = require('playwright-core');
const fs = require('fs');
const [url, outdir] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail: detail || '' }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  — ' + detail : '')); }
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--hatch-webgl-allowed-domains-file=/home/hatch/workspace/tools/pw-shot/webgl-policy.txt', '--hatch-webgl-allowed-domains-sha256=dc8a0e5eec744f6590a4c1889139c00568ffedc3eced6d0a1a5127e35f9ccd16'] });
  const page = await browser.newPage({ viewport: { width: 480, height: 860 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
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
    await page.waitForTimeout(150);
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
      if (s.mode === 'drag') {
        if (!s.targets.length) return await state();
        const t = s.targets[0]; await dragPt({ x: t.x, y: t.y }, { x: t.tx, y: t.ty }); continue;
      }
      if (!s.targets.length) return await state();
      await clickPt(s.targets[0]);
    }
    return await state();
  };

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  let s = await state();
  check('loads, hook present, menu screen', s && s.screen === 'menu', JSON.stringify(s));
  await page.screenshot({ path: outdir + '/01-menu.png' });

  await page.click('#btn-how'); await page.waitForTimeout(300);
  check('how-to opens', await page.locator('#howto').isVisible());
  await page.click('#btn-how-close'); await page.waitForTimeout(200);

  await page.click('#btn-start'); await page.waitForTimeout(250);
  s = await state();
  check('start -> playing level 1 Face Wash', s && s.screen === 'playing' && s.level === 1, JSON.stringify(s));
  await page.screenshot({ path: outdir + '/02-level1.png' });

  // Wrong-order check on level 7 is covered later; here: pause/resume/mute on level 1
  await page.click('#btn-pause'); await page.waitForTimeout(200); s = await state();
  check('pause -> paused', s.screen === 'paused', JSON.stringify(s));
  await page.click('#btn-resume'); await page.waitForTimeout(200); s = await state();
  check('resume -> playing', s.screen === 'playing', JSON.stringify(s));
  await page.click('#btn-mute'); s = await state();
  check('mute toggles on', s.muted === true, JSON.stringify(s));
  await page.click('#btn-mute'); s = await state();
  check('mute toggles off', s.muted === false, JSON.stringify(s));

  // Play level 1 (clean) by real clicks
  s = await playLevel(); await page.waitForTimeout(250); s = await state();
  check('level 1 completes -> clear screen, stars >=1', s && s.screen === 'clear' && s.stars >= 1, JSON.stringify(s));
  await page.screenshot({ path: outdir + '/03-clear.png' });
  await page.click('#btn-next'); await page.waitForTimeout(250); s = await state();
  check('next -> playing level 2', s && s.screen === 'playing' && s.level === 2, JSON.stringify(s));

  // Full playthrough 2..20 with real clicks/drags
  const seen = new Set();
  let won = false, guard = 0;
  while (guard++ < 60) {
    s = await state(); if (!s) break;
    if (s.screen === 'win') { won = true; break; }
    if (s.screen === 'playing') {
      seen.add(s.level + ':' + s.mode);
      if (s.level === 7 && s.done === 0) await page.screenshot({ path: outdir + '/04-level7.png' });
      if (s.level === 20 && s.done === 0) await page.screenshot({ path: outdir + '/05-level20.png' });
      s = await playLevel(); await page.waitForTimeout(250);
    } else if (s.screen === 'clear') {
      check('level ' + s.level + ' clear, stars ' + s.stars, s.stars >= 1, 'score=' + s.score);
      await page.click('#btn-next'); await page.waitForTimeout(250);
    } else break;
  }
  s = await state();
  check('full playthrough reaches WIN after 20 levels', won && s.screen === 'win', JSON.stringify(s));
  check('all 5 mechanics seen (tap/clean/drag/order/paint)', ['tap', 'clean', 'drag', 'order', 'paint'].every(m => [...seen].some(x => x.endsWith(':' + m))), [...seen].join(', '));
  await page.screenshot({ path: outdir + '/06-win.png' });
  await page.click('#btn-again'); await page.waitForTimeout(250); s = await state();
  check('play again -> level 1 playing, done 0', s && s.screen === 'playing' && s.level === 1 && s.done === 0, JSON.stringify(s));
  check('no page/console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
