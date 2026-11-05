// Pruebas de interacción con DOM y backend Flask real. No verifican diseño ni
// renderizado Canvas: sus llamadas se observan para comprobar cuándo aparece raíz.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {JSDOM,VirtualConsole}=require(process.env.TANIX_JSDOM || 'jsdom');
const root=path.resolve(__dirname,'..');
let comprobaciones=0;
const ok=(valor,mensaje)=>{assert.ok(valor,mensaje);comprobaciones++;};
const eq=(a,b,mensaje)=>{assert.equal(a,b,mensaje);comprobaciones++;};
function backend(url,datos,method='POST') {
    const r=spawnSync(process.env.TANIX_PYTHON || 'python',[path.join(__dirname,'puente_ui.py')],{input:JSON.stringify({url,datos,method}),encoding:'utf8'});
    if(r.status!==0)throw Error(r.stderr);
    return JSON.parse(r.stdout);
}
let almacenamiento=new Map(),descargas=[],clipboard='',impresiones=0;
async function pagina(ruta) {
    const errores=[],etiquetas=[];
    const html=backend(ruta,null,'GET').body;
    const consola=new VirtualConsole();consola.on('jsdomError',e=>errores.push(e.message));
    const dom=new JSDOM(html,{url:'http://tanix.test'+ruta,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:consola});
    const w=dom.window;
    Object.defineProperty(w,'localStorage',{value:{getItem:k=>almacenamiento.get(k)??null,setItem:(k,v)=>almacenamiento.set(k,v),removeItem:k=>almacenamiento.delete(k)}});
    w.structuredClone=structuredClone;w.AbortController=AbortController;
    w.matchMedia=()=>({matches:false,addEventListener(){}});
    w.Element.prototype.scrollIntoView=function(){};
    w.HTMLElement.prototype.getBoundingClientRect=function(){return {width:800,height:400,left:0,top:0,right:800,bottom:400};};
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:t=>({width:String(t).length*7}),fillText:t=>etiquetas.push(String(t))},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
    w.ResizeObserver=class {observe(){}disconnect(){}};
    w.URL.createObjectURL=blob=>{descargas.push(blob);return 'blob:tanix';};w.URL.revokeObjectURL=()=>{};
    w.HTMLAnchorElement.prototype.click=function(){};
    w.print=()=>impresiones++;
    Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async t=>{clipboard=t;}}});
    w.fetch=async(url,options={})=>{
        if(options.signal?.aborted)throw new DOMException('Cancelado','AbortError');
        const r=backend(url,options.body?JSON.parse(options.body):null,options.method||'GET');
        return {ok:r.status<400,status:r.status,json:async()=>r.body,clone(){return this;}};
    };
    // Permite terminar el DOM inicial antes de ejecutar los scripts manualmente.
    await new Promise(resolve=>w.document.addEventListener('DOMContentLoaded',resolve,{once:true}));
    for(const script of w.document.querySelectorAll('script[src]')) {
        const local=path.join(root,'calculadora',script.getAttribute('src').replace(/^\//,''));
        w.eval(fs.readFileSync(local,'utf8'));
    }
    w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
    await tick();
    return {dom,w,d:w.document,errores,etiquetas};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
function poner(p,id,valor) {
    const e=p.d.getElementById(id);assert.ok(e,'Falta '+id);e.value=valor;e.dispatchEvent(new p.w.Event('input',{bubbles:true}));e.dispatchEvent(new p.w.Event('change',{bubbles:true}));
}
function click(p,id){const e=p.d.getElementById(id);assert.ok(e,'Falta '+id);e.click();}
function historial(){return JSON.parse(almacenamiento.get('lineal-tanix.historial.v1')||'[]');}
(async()=>{
    let p=await pagina('/raices');
    poner(p,'raices-funcion-raw','x^2=2');poner(p,'raices-xl','0');poner(p,'raices-xu','2');poner(p,'raices-error','0.001');
    await new Promise(r=>setTimeout(r,450));
    ok(!p.etiquetas.includes('raíz'),'La gráfica revela una raíz antes del cálculo');
    eq(historial().length,0,'No guardar la exploración');
    click(p,'raices-submit');await tick();
    ok(!p.d.getElementById('raices-results').classList.contains('hidden'),'No aparece resultado de raíces');
    ok(p.d.getElementById('raices-results').textContent.includes('1.414214'),'Raíz visible incorrecta');
    ok(p.etiquetas.includes('raíz'),'Falta marcador después del cálculo');
    eq(historial().length,1);eq(historial()[0].datos.funcion,'x^2=2');
    ok(historial()[0].resultado.convergencia);ok(!p.d.getElementById('tanix-csv').disabled);
    poner(p,'tanix-precision','10');
    ok(p.d.getElementById('raices-results').textContent.includes('1.41421356'),'La precisión no cambió');
    const valorOriginal=historial()[0].resultado.resultado;
    poner(p,'tanix-precision','4');eq(historial()[0].resultado.resultado,valorOriginal,'La precisión alteró el dato');
    click(p,'tanix-csv');eq(descargas.length,1);
    const csv=await new Promise(resolve=>{const lector=new p.w.FileReader();lector.onload=()=>resolve(lector.result);lector.readAsText(descargas[0]);});
    ok(csv.includes('Lineal Tanix'));ok(csv.includes('x^2=2'));ok(csv.includes('error_absoluto'));ok(csv.includes('iteracion'));
    click(p,'tanix-copiar');await tick();ok(clipboard.includes('Lineal Tanix'));ok(clipboard.includes('x^2=2'));ok(clipboard.includes('residuo'));
    click(p,'tanix-imprimir');eq(impresiones,1);ok(p.d.getElementById('tanix-informe').textContent.includes('Lineal Tanix'));
    p.etiquetas.length=0;
    poner(p,'raices-funcion-raw','x^2-4');ok(!p.etiquetas.includes('raíz'),'El marcador debe desaparecer al editar');ok(p.d.getElementById('raices-results').classList.contains('hidden'));ok(p.d.getElementById('tanix-csv').disabled);
    p.d.querySelector('#tanix-historial-lista button').click();await tick();eq(p.d.getElementById('raices-funcion-raw').value,'x^2=2');
    ok(p.d.getElementById('raices-results').classList.contains('hidden'),'Restaurar no debe calcular');
    p.d.querySelectorAll('#tanix-historial-lista button')[1].click();await tick();eq(historial().length,2,'Repetir no guardó el nuevo cálculo');
    click(p,'tanix-comparar');await tick();
    eq(p.d.querySelectorAll('#tanix-comparacion-resultados tr').length,5);eq(historial()[0].ruta,'/api/raices/comparar');
    ok(p.d.getElementById('tanix-comparacion-resultados').textContent.includes('Convergió'));
    poner(p,'raices-funcion-raw','<img src=x onerror=alert(1)>');await tick();eq(p.d.querySelectorAll('#math-preview-render img').length,0);
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();

    p=await pagina('/matrices');poner(p,'mat-a','3');click(p,'btn-mat-inversa');click(p,'btn-perf-proceder');await tick();
    ok(p.d.getElementById('mat-results').textContent.includes('0.3333'),'Inversa no presentada');
    eq(historial()[0].datos.operacion,'inversa');eq(historial()[0].resultado.resultado[0][0],1/3);
    poner(p,'tanix-precision','10');ok(p.d.getElementById('mat-results').textContent.includes('0.3333333333'));
    poner(p,'mat-a','2 3 5\n7 11 13\n17 19 23');click(p,'btn-mat-determinante');click(p,'det-met-sarrus');click(p,'btn-det-calcular');await tick();
    if(p.d.getElementById('btn-perf-proceder')){click(p,'btn-perf-proceder');await tick();}
    ok(p.d.getElementById('mat-results').textContent.includes('-78'),'Determinante incorrecto');
    ok(p.d.querySelectorAll('.sarrus-grid__cell').length>0 || p.d.getElementById('mat-results').textContent.includes('663'),'Falta visual Sarrus');
    ok(!p.d.getElementById('mat-results').textContent.includes('<span'),'Se imprimió HTML en lugar de números');
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();

    p=await pagina('/ecuaciones');poner(p,'input-m','1');poner(p,'input-n','1');click(p,'btn-generate');click(p,'btn-perf-proceder');
    poner(p,'ecuacion-1','x1+x1=2');click(p,'btn-solve');await tick();
    ok(p.d.getElementById('results').textContent.includes('Solución Única'), p.d.getElementById('results').innerHTML+' ALERT '+p.d.getElementById('ui-alert').textContent+' ERR '+p.errores.join('|'));ok(p.d.getElementById('results').textContent.includes('Correcto'));
    const antes=historial().length;p.d.querySelectorAll('#tanix-historial-lista button')[1].click();await tick();eq(historial().length,antes+1);
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();

    p=await pagina('/vectores');poner(p,'vec-dim','2');poner(p,'vec-u','1 2');poner(p,'vec-v','3 4');click(p,'btn-vec-suma');await tick();
    eq(historial()[0].ruta,'/api/vectores');eq(historial()[0].resultado.resultado[0],4);
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();

    p=await pagina('/conversion');poner(p,'conversion-number','25.5');poner(p,'conversion-origen','10');poner(p,'conversion-destino','2');
    click(p,'conversion-submit');await tick();eq(historial()[0].resultado.resultado,'11001.1');
    p.d.querySelectorAll('#tanix-historial-lista button')[1].click();await tick();eq(historial()[0].ruta,'/convertir');
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();

    p=await pagina('/romanos');poner(p,'romanos-input','1994');click(p,'romanos-submit');await tick();
    eq(historial()[0].ruta,'/api/romanos');eq(historial()[0].resultado.resultado,'MCMXCIV');
    const size=historial().length;p.d.querySelectorAll('#tanix-historial-lista button')[2].click();eq(historial().length,size-1);
    click(p,'tanix-limpiar');eq(historial().length,0);
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();
    p=await pagina('/matrices');poner(p,'mat-a','1');poner(p,'mat-b','2');
    let resolver;
    const fetchReal=p.w.fetch;
    p.w.fetch=(url,opciones)=>new Promise(resolve=>{resolver=()=>fetchReal(url,{...opciones,signal:null}).then(resolve);});
    click(p,'btn-mat-suma');click(p,'btn-perf-proceder');await tick();
    poner(p,'mat-a','9');
    // Respuesta tardía aunque el transporte ignore AbortSignal.
    p.w.fetch=fetchReal;
    // Entrega un Response válido ya obtenido; Tanix debe rechazar la revisión antigua.
    // El transporte de prueba original también observa cancelación.
    try { resolver(); } catch {}
    await tick();eq(historial().length,0,'Se guardó una respuesta obsoleta');
    p.dom.window.close();
    p=await pagina('/vectores');
    for(let i=0;i<35;i++)p.w.Tanix.registrar('/api/vectores',{operacion:'suma',n:1,u:[i],v:[1]},{resultado:[i+1]},[]);
    eq(historial().length,30,'El historial debe estar acotado');
    p.w.localStorage.setItem=()=>{throw Error('Sin cuota');};
    p.w.Tanix.registrar('/api/vectores',{operacion:'suma',n:1,u:[1],v:[1]},{resultado:[2]},[]);
    ok(p.d.getElementById('tanix-aviso').textContent.includes('No se pudo guardar'));
    p.dom.window.close();
    console.log(`DOM: ${comprobaciones} comprobaciones superadas; 0 fallos.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
