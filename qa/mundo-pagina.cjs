// Captura de la página real con el mundo encendido (?q=high fuerza WebGL por software), en 6 tramos.
const fs = require('fs'); fs.mkdirSync('qa/out/mundo-pagina', { recursive: true });
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  for (const [n, vp] of [['escritorio', { width: 1280, height: 800 }], ['telefono', { width: 390, height: 844, deviceScaleFactor: 1 }]]) {
    const p = await b.newPage({ viewport: vp });
    const errs = []; p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(() => { try { localStorage.setItem('ocean-v3-intro-at', String(Date.now())) } catch {} });
    await p.goto((process.argv[2] || 'http://localhost:5175/').replace(/\/?$/, '/') + '?q=high', { waitUntil: 'networkidle' }); await p.waitForTimeout(6000);
    console.log(n, await p.evaluate(() => document.documentElement.className + ' ' + (document.documentElement.dataset.worldStill || '')));
    for (const t of ['espacio', 'satelite', 'agua', 'maquina', 'emerge', 'cumbre']) {
      await p.evaluate((t) => { const el = document.querySelector(`[data-tramo="${t}"]`); window.scrollTo(0, el.getBoundingClientRect().top + scrollY + 40) }, t);
      await p.waitForTimeout(5000);
      await p.screenshot({ path: `qa/out/mundo-pagina/${n}-${t}.png` });
    }
    console.log(n, 'errores', errs.slice(0, 5));
    await p.close();
  }
  await b.close();
})();
