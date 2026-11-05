// Comprueba las funciones originales con Chromium. Requiere Flask en :5055.
const {chromium}=require(process.env.TANIX_PLAYWRIGHT || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
    const browser=await chromium.launch({headless:true,...(process.env.TANIX_CHROME ? {executablePath:process.env.TANIX_CHROME}: {})});
    try {
        const page=await browser.newPage({viewport:{width:1280,height:900}});
        const errores=[];page.on('pageerror',e=>errores.push(e.message));
        await page.addInitScript(()=>{
            window.__etiquetas=[];
            const original=CanvasRenderingContext2D.prototype.fillText;
            CanvasRenderingContext2D.prototype.fillText=function(t,...args){window.__etiquetas.push(String(t));return original.call(this,t,...args);};
        });
        const base=process.env.TANIX_URL || 'http://127.0.0.1:5055';
        for(let i=0;i<30;i++){try{await page.goto(base+'/raices');break;}catch(e){if(i===29)throw e;await new Promise(r=>setTimeout(r,200));}}
        const grafica=page.waitForResponse(r=>r.url().endsWith('/api/raices/evaluar'));
        await page.fill('#raices-funcion-raw','x^2=2');await page.fill('#raices-xl','0');await page.fill('#raices-xu','2');await page.fill('#raices-error','0.001');await grafica;
        assert.equal(await page.evaluate(()=>window.__etiquetas.includes('raíz')),false);
        await page.click('#raices-submit');await page.waitForSelector('#raices-results:not(.hidden)');
        assert.ok((await page.textContent('#raices-results')).includes('1.41421356'));
        assert.equal(await page.evaluate(()=>window.__etiquetas.includes('raíz')),true);
        await page.fill('#raices-funcion-raw','x^2-4');assert.equal(await page.locator('#raices-results').isVisible(),false);
        assert.equal(await page.locator('[id^="tanix-"]').count(),0);
        await page.setViewportSize({width:390,height:844});await page.locator('#graph-canvas').scrollIntoViewIfNeeded();
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+2));
        await page.goto(base+'/matrices');await page.fill('#mat-a','3');await page.click('#btn-mat-inversa');await page.click('#btn-perf-proceder');
        await page.waitForSelector('#mat-results:not(.hidden)');assert.ok((await page.textContent('#mat-results')).includes('0.3333'));
        const identidad=n=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>Number(i===j)).join(' ')).join('\n');
        await page.fill('#mat-a',identidad(10));await page.click('#btn-mat-determinante');assert.equal(await page.locator('#det-met-cofactores').isEnabled(),true);
        await page.check('#det-met-cofactores');await page.click('#btn-det-calcular');await page.click('#btn-perf-proceder');
        await page.waitForSelector('.det-resultado-final__valor');assert.equal((await page.textContent('.det-resultado-final__valor')).trim(),'1');
        await page.goto(base+'/ecuaciones');await page.fill('#input-m','1');await page.fill('#input-n','1');await page.click('#btn-generate');await page.click('#btn-perf-proceder');
        await page.fill('#ecuacion-1','x1+x1=2');await page.click('#btn-solve');await page.waitForSelector('#results:not(.hidden)');
        assert.ok((await page.textContent('#results')).includes('Correcto'));assert.deepEqual(errores,[]);
        console.log('Chromium: cálculo original, gráfica, inversa y cofactores 10×10 superados.');
    } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
