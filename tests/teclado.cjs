// Integration checks for the shared keyboard with real focus, selection and layout.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.TANIX_PLAYWRIGHT || 'playwright');
const base = process.env.TANIX_URL || 'http://127.0.0.1:5055';

(async () => {
    const browser = await chromium.launch({ headless: true,
        ...(process.env.TANIX_CHROME ? { executablePath: process.env.TANIX_CHROME } : {}) });
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const keys = () => page.locator('.math-keyboard__key:visible');
        const labels = () => keys().allTextContents();
        const press = async (label) => page.locator('.math-keyboard__key:visible').filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first().click();

        await page.goto(base + '/ecuaciones');
        await page.fill('#input-m', '1'); await page.fill('#input-n', '5');
        await page.click('#btn-generate'); await page.click('#btn-perf-proceder');
        await page.fill('#ecuacion-1', 'x1+x1=2');
        assert.ok((await labels()).includes('x5'));
        assert.ok(!(await labels()).includes('sin'));
        await page.evaluate(() => document.querySelector('#ecuacion-1').setSelectionRange(2, 3));
        await press('Espacio');
        assert.equal(await page.inputValue('#ecuacion-1'), 'x1 x1=2');
        assert.equal(await page.evaluate(() => document.querySelector('#ecuacion-1').selectionStart), 3);
        await page.focus('#ecuacion-1'); await page.keyboard.press('End'); await page.keyboard.press('Space');
        assert.equal(await page.inputValue('#ecuacion-1'), 'x1 x1=2 ');
        await page.fill('#ecuacion-1', '2x1 - 3x2 + 4x3 = 5');
        await page.fill('#ecuacion-1', '0.5×1 + 3.2×2 = 4');
        assert.equal(await page.inputValue('#ecuacion-1'), '0.5x1 + 3.2x2 = 4');
        assert.ok((await labels()).includes('*'));
        await page.fill('#ecuacion-1', '2x1 - 3x2 + 4x3 = 5');
        await page.click('#btn-solve');
        assert.equal(await page.inputValue('#ecuacion-1'), '2x1 - 3x2 + 4x3 = 5');
        await page.fill('#input-n', '2'); await page.dispatchEvent('#input-n', 'change');
        await page.focus('#ecuacion-1');
        assert.ok(!(await labels()).includes('x5'));
        await page.fill('#ecuacion-1', '-.5x1+2x2=-1.25');
        await page.click('#btn-solve');
        assert.equal(await page.inputValue('#ecuacion-1'), '-.5x1+2x2=-1.25');

        await page.goto(base + '/matrices');
        await page.focus('#mat-a'); await press('1'); await press('Espacio'); await press('2');
        await press('Nueva fila'); await press('3'); await press('Espacio'); await press('4');
        assert.equal(await page.inputValue('#mat-a'), '1 2\n3 4');
        await page.focus('#mat-c'); assert.ok(!(await labels()).includes('Nueva fila'));

        await page.goto(base + '/vectores');
        await page.focus('#vec-u'); await press('1'); await press(','); await press('Espacio'); await press('-'); await press('2');
        assert.equal(await page.inputValue('#vec-u'), '1, -2');
        await page.focus('#vec-conjunto'); assert.ok((await labels()).includes('Nueva fila'));

        await page.goto(base + '/conversion');
        await page.focus('#conversion-number');
        await page.selectOption('#conversion-origen', '2'); await page.focus('#conversion-number');
        assert.ok(!(await labels()).includes('2'));
        await page.fill('#conversion-number', '1A');
        await page.selectOption('#conversion-origen', '16'); await page.focus('#conversion-number');
        assert.equal(await page.inputValue('#conversion-number'), '1A');
        assert.ok((await labels()).includes('F'));

        await page.goto(base + '/romanos');
        await page.focus('#romanos-input'); assert.ok(!(await labels()).includes('M'));
        await page.selectOption('#romanos-direccion', 'romano_a_arabigo'); await page.focus('#romanos-input');
        assert.ok((await labels()).includes('M'));
        assert.ok(!(await labels()).includes('9'));

        await page.goto(base + '/raices');
        await page.click('#math-source-toggle');
        await page.focus('#raices-funcion-raw');
        await press('sin');
        assert.equal(await page.inputValue('#raices-funcion-raw'), 'sin()');
        assert.equal(await page.evaluate(() => document.querySelector('#raices-funcion-raw').selectionStart), 4);
        await press('x');
        assert.equal(await page.inputValue('#raices-funcion-raw'), 'sin(x)');
        assert.ok((await page.textContent('#math-preview-render')).includes('sin'));
        await page.focus('#raices-xl'); assert.ok(!(await labels()).includes('sin'));
        await page.focus('#raices-funcion-raw');
        await page.locator('.math-keyboard__close').click();
        assert.equal(await page.locator('.math-keyboard').isVisible(), false);
        await page.locator('.math-keyboard-toggle').click();
        assert.equal(await page.locator('.math-keyboard').isVisible(), true);
        await page.locator('#theme-toggle').click();
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');

        await page.setViewportSize({ width: 390, height: 844 });
        await page.focus('#raices-funcion-raw');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true);
        assert.ok(await page.locator('.math-keyboard').isVisible());
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.click('#math-source-toggle');
        await press('AC');
        await page.getByRole('button',{name:'Fracción',exact:true}).click();
        await press('2'); await press('↓'); await press('3');
        assert.equal(await page.inputValue('#raices-funcion-raw'), '((2)/(3))');
        assert.ok(await page.locator('#raices-funcion-visual .mq-fraction').isVisible());
        await press('AC');
        await page.getByRole('button',{name:'Euler elevado a una potencia',exact:true}).click();
        await press('x'); await press('+'); await press('2');
        assert.equal(await page.inputValue('#raices-funcion-raw'), 'e^(x+2)');
        assert.ok(await page.locator('#raices-funcion-visual .mq-supsub').isVisible());
        const panel = page.locator('.math-keyboard');
        const before = await panel.boundingBox();
        const handle = await page.locator('.math-keyboard__grip').boundingBox();
        await page.mouse.move(handle.x+5,handle.y+5); await page.mouse.down();
        await page.mouse.move(handle.x+5-120, handle.y+5-80, {steps:8}); await page.mouse.up();
        const after = await panel.boundingBox();
        assert.ok(Math.abs(after.x-before.x)>20 || Math.abs(after.y-before.y)>20);
        assert.deepEqual(errors, []);
        console.log('Teclado: seis módulos, cursor, espacios, temas y móvil verificados.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
