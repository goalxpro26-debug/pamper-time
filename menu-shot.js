// Menu screenshot with the correct Hatch WebGL policy flags. Usage: node menu-shot.js
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--hatch-webgl-allowed-domains-file=/home/hatch/workspace/tools/pw-shot/webgl-policy.txt', '--hatch-webgl-allowed-domains-sha256=dc8a0e5eec744f6590a4c1889139c00568ffedc3eced6d0a1a5127e35f9ccd16'] });
  const page = await browser.newPage({ viewport: { width: 480, height: 860 } });
  await page.goto('file:///home/hatch/workspace/playables-inspired/pamper-time/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-shots/01-menu.png' });
  await browser.close();
  console.log('WROTE test-shots/01-menu.png');
})().catch(e => { console.error('CRASH', e.message.split('\n')[0]); process.exit(2); });
