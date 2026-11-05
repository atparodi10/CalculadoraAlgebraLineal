// Pruebas opcionales con Chromium real. Arrancar Flask en :5055 antes de ejecutar.
const {chromium}=require(process.env.TANIX_PLAYWRIGHT || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
(async()=>{
    const browser=await chromium.launch({headless:true,...(process.env.TANIX_CHROME ? {executablePath:process.env.TANIX_CHROME}: {})});
    const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
    const page=await context.newPage();const errores=[];page.on('pageerror',e=>errores.push(e.message));
    await page.addInitScript(()=>{
        window.__etiquetas=[];
        const original=CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText=function(t,...args){window.__etiquetas.push(String(t));return original.call(this,t,...args);};
    });
    const base=process.env.TANIX_URL || 'http://127.0.0.1:5055';
    // Espera acotada al arranque del servidor en CI.
    for(let i=0;i<30;i++){try{await page.goto(base+'/raices');break;}catch(e){if(i===29)throw e;await new Promise(r=>setTimeout(r,200));}}
    await page.fill('#raices-funcion-raw','x^2=2');await page.fill('#raices-xl','0');await page.fill('#raices-xu','2');await page.fill('#raices-error','0.001');
    await page.waitForResponse(r=>r.url().endsWith('/api/raices/evaluar'));
    assert.equal(await page.evaluate(()=>window.__etiquetas.includes('raíz')),false);
    await page.click('#raices-submit');await page.waitForSelector('#raices-results:not(.hidden)');
    assert.ok((await page.textContent('#raices-results')).includes('1.414214'));
    assert.equal(await page.evaluate(()=>window.__etiquetas.includes('raíz')),true);
    await page.click('.tanix-herramientas summary');await page.selectOption('#tanix-precision','10');
    assert.ok((await page.textContent('#raices-results')).includes('1.41421356'));
    const descarga=page.waitForEvent('download');await page.click('#tanix-csv');const archivo=await descarga;
    assert.equal(archivo.suggestedFilename(),'Lineal_Tanix_procedimiento.csv');
    const csv=await fs.readFile(await archivo.path(),'utf8');assert.ok(csv.includes('Lineal Tanix'));assert.ok(csv.includes('x^2=2'));
    await page.click('#tanix-comparacion-panel summary');await page.click('#tanix-comparar');await page.waitForSelector('#tanix-comparacion-resultados table');
    assert.equal(await page.locator('#tanix-comparacion-resultados tr').count(),5);
    await page.fill('#raices-funcion-raw','x^2-4');assert.equal(await page.locator('#raices-results').isVisible(),false);
    await page.getByRole('button',{name:'Restaurar entradas',exact:true}).first().click();
    assert.equal(await page.inputValue('#raices-funcion-raw'),'x^2=2');
    await page.getByRole('button',{name:'Repetir cálculo',exact:true}).first().click();await page.waitForSelector('#tanix-comparacion-resultados table');
    // Diseño responsive: la tabla tiene desplazamiento propio y el lienzo cabe.
    await page.setViewportSize({width:390,height:844});await page.locator('#graph-canvas').scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+2));
    await page.goto(base+'/matrices');await page.fill('#mat-a','3');await page.click('#btn-mat-inversa');await page.click('#btn-perf-proceder');
    await page.waitForSelector('#mat-results:not(.hidden)');assert.ok((await page.textContent('#mat-results')).includes('0.3333333333'));
    await page.goto(base+'/ecuaciones');await page.fill('#input-m','1');await page.fill('#input-n','1');await page.click('#btn-generate');await page.click('#btn-perf-proceder');
    await page.fill('#ecuacion-1','x1+x1=2');await page.click('#btn-solve');await page.waitForSelector('#results:not(.hidden)');
    assert.ok((await page.textContent('#results')).includes('Correcto'));assert.deepEqual(errores,[]);
    await browser.close();console.log('Chromium: interacciones, exportación, historial y vista móvil superados.');
})().catch(e=>{console.error(e);process.exitCode=1;});
