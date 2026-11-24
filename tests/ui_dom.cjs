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
let almacenamiento=new Map();
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
(async()=>{
    let p=await pagina('/raices');
    poner(p,'raices-funcion-raw','x^2=2');poner(p,'raices-xl','0');poner(p,'raices-xu','2');poner(p,'raices-error','0.001');
    await new Promise(r=>setTimeout(r,450));
    ok(!p.etiquetas.some(t=>t.startsWith('raíz')),'La gráfica revela una raíz antes del cálculo');
    click(p,'raices-submit');await tick();
    ok(!p.d.getElementById('raices-results').classList.contains('hidden'));
    ok(p.d.getElementById('raices-results').textContent.includes('1.41421356'));
    ok(p.etiquetas.some(t=>t.startsWith('raíz')),'Falta marcador después del cálculo');
    ok(p.d.getElementById('raices-results').textContent.includes('Residuo'));
    await tick();
    const opciones=p.d.querySelectorAll('#raices-visibles button');
    eq(opciones.length,2,'Deben aparecer las dos raíces de x²=2');
    ok(opciones[0].textContent.includes('Raíz A'));
    p.etiquetas.length=0;opciones[0].click();
    ok(p.etiquetas.some(t=>t.includes('-1.41421')),'No se marcó la raíz elegida');
    ok(p.d.getElementById('raices-results').textContent.includes('1.41421356'));
    p.etiquetas.length=0;poner(p,'raices-funcion-raw','x^2-4');
    ok(!p.etiquetas.some(t=>t.startsWith('raíz')));ok(p.d.getElementById('raices-results').classList.contains('hidden'));
    poner(p,'raices-funcion-raw','<img src=x onerror=alert(1)>');
    eq(p.d.querySelectorAll('#math-preview-render img').length,0);
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();

    p=await pagina('/matrices');poner(p,'mat-a','3');click(p,'btn-mat-inversa');click(p,'btn-perf-proceder');await tick();
    ok(p.d.getElementById('mat-results').textContent.includes('0.3333'));
    poner(p,'mat-a','2 3 5\n7 11 13\n17 19 23');click(p,'btn-mat-determinante');click(p,'det-met-sarrus');click(p,'btn-det-calcular');click(p,'btn-perf-proceder');await tick();
    ok(p.d.getElementById('mat-results').textContent.includes('-78'));
    ok(p.d.querySelectorAll('.sarrus-grid__cell').length>0);
    ok(p.d.querySelector('.sarrus-svg-overlay marker path[fill="#10b981"]'));
    ok(p.d.querySelector('.sarrus-svg-overlay marker path[fill="#ef4444"]'));
    const identidad=n=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>Number(i===j)).join(' ')).join('\n');
    poner(p,'mat-a',identidad(10));click(p,'btn-mat-determinante');
    eq(p.d.getElementById('det-met-cofactores').disabled,false,'Cofactores 10×10 debe estar habilitado');
    click(p,'det-met-cofactores');click(p,'btn-det-calcular');click(p,'btn-perf-proceder');await tick();
    ok(p.d.querySelector('.det-resultado-final__valor').textContent.includes('1'));
    poner(p,'mat-a',identidad(11));click(p,'btn-mat-determinante');
    eq(p.d.getElementById('det-met-cofactores').disabled,true);
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();

    p=await pagina('/ecuaciones');poner(p,'input-m','1');poner(p,'input-n','1');click(p,'btn-generate');click(p,'btn-perf-proceder');
    poner(p,'ecuacion-1','x1+x1=2');click(p,'btn-solve');await tick();
    ok(p.d.getElementById('results').textContent.includes('Solución Única'));
    ok(p.d.getElementById('results').textContent.includes('Correcto'));
    poner(p,'ecuacion-1','3x1=1');click(p,'btn-solve');await tick();
    ok(p.d.getElementById('results').textContent.includes('Correcto'),'Verificación con solución sin redondear');
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();

    p=await pagina('/vectores');poner(p,'vec-dim','2');poner(p,'vec-u','1 2');poner(p,'vec-v','3 4');click(p,'btn-vec-suma');await tick();
    ok(p.d.getElementById('vec-results').textContent.includes('4'));
    ok(p.d.getElementById('vec-results').textContent.includes('6'));
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();

    p=await pagina('/conversion');poner(p,'conversion-number','25.5');poner(p,'conversion-origen','10');poner(p,'conversion-destino','2');
    click(p,'conversion-submit');await tick();ok(p.d.getElementById('conversion-results').textContent.includes('11001.1'));
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();
    p=await pagina('/romanos');poner(p,'romanos-input','1994');click(p,'romanos-submit');await tick();
    ok(p.d.getElementById('romanos-results').textContent.includes('MCMXCIV'));
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();

    p=await pagina('/matrices');poner(p,'mat-a','1');poner(p,'mat-b','2');
    let resolver;const fetchReal=p.w.fetch;
    p.w.fetch=(url,opciones)=>new Promise(resolve=>{resolver=()=>fetchReal(url,{...opciones,signal:null}).then(resolve);});
    click(p,'btn-mat-suma');click(p,'btn-perf-proceder');await tick();poner(p,'mat-a','9');
    p.w.fetch=fetchReal;resolver();await tick();
    ok(p.d.getElementById('mat-results').classList.contains('hidden'),'Descartar respuesta de entradas anteriores');
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();

    // Teclado compartido: eventos reales de input y selección sobre los seis módulos.
    const teclas=p=>Array.from(p.d.querySelectorAll('.math-keyboard__key')).map(e=>e.textContent);
    const tecla=(p,nombre)=>{const b=Array.from(p.d.querySelectorAll('.math-keyboard__key')).find(e=>e.textContent===nombre);ok(b,'Falta tecla '+nombre);b.click();};
    p=await pagina('/ecuaciones');poner(p,'input-n','5');click(p,'btn-generate');click(p,'btn-perf-proceder');
    let campo=p.d.getElementById('ecuacion-1');campo.focus();ok(teclas(p).includes('x5'));ok(!teclas(p).includes('sin'));
    poner(p,'ecuacion-1','x1+x1=2');campo.setSelectionRange(2,3);tecla(p,'Espacio');eq(campo.value,'x1 x1=2');eq(campo.selectionStart,3);
    poner(p,'ecuacion-1','x1 + x2 = 10 ');eq(campo.value,'x1 + x2 = 10 ','Conservar espacio físico al escribir');
    campo.value='0.5×1 + 3.2×2 ';campo.setSelectionRange(5,5);
    campo.dispatchEvent(new p.w.Event('input',{bubbles:true}));
    eq(campo.value,'0.5x1 + 3.2x2 ','Mostrar x1 y x2 sin signo de multiplicación');
    eq(campo.selectionStart,5,'Conservar el cursor después de corregir ×');
    ok(teclas(p).includes('x1') && teclas(p).includes('*') && !teclas(p).includes('×'));
    campo.dispatchEvent(new p.w.Event('compositionstart',{bubbles:true}));
    campo.value='x1+×2';campo.dispatchEvent(new p.w.Event('input',{bubbles:true}));eq(campo.value,'x1+×2','No interferir en composición');
    campo.dispatchEvent(new p.w.Event('compositionend',{bubbles:true}));eq(campo.value,'x1+x2');
    poner(p,'ecuacion-1','x1 + x2 = 10 ');
    campo.setSelectionRange(0,0);tecla(p,'3');eq(campo.value,'3x1 + x2 = 10 ');
    campo.setSelectionRange(1,1);tecla(p,'⌫');eq(campo.value,'x1 + x2 = 10 ');
    for(const ecuacion of ['2x1 - 3x2 + 4x3 = 5','x1 + x2 = 10','3x1 - 2x2 = -7','x1+x1=2','-.5x1+2x2=-1.25']) {
        poner(p,'ecuacion-1',ecuacion);click(p,'btn-solve');await tick();eq(campo.value,ecuacion,'Conservar ecuación visible');
    }
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();

    p=await pagina('/matrices');campo=p.d.getElementById('mat-a');campo.focus();
    for(const nombre of ['1','Espacio','2','Nueva fila','3'])tecla(p,nombre);
    eq(campo.value,'1 2\n3');campo=p.d.getElementById('mat-c');campo.focus();ok(!teclas(p).includes('Nueva fila'));
    tecla(p,'-');tecla(p,'2');eq(campo.value,'-2','Signo parcial de input number');
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();

    p=await pagina('/vectores');campo=p.d.getElementById('vec-u');campo.focus();
    for(const nombre of ['1',',','Espacio','-','2'])tecla(p,nombre);
    eq(campo.value,'1, -2');p.d.getElementById('vec-conjunto').focus();ok(teclas(p).includes('Nueva fila'));
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();

    p=await pagina('/conversion');campo=p.d.getElementById('conversion-number');campo.focus();
    poner(p,'conversion-origen','2');ok(!teclas(p).includes('2'));
    poner(p,'conversion-number','1A');poner(p,'conversion-origen','16');eq(campo.value,'1A');ok(teclas(p).includes('F'));
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();

    p=await pagina('/romanos');campo=p.d.getElementById('romanos-input');campo.focus();
    ok(!teclas(p).includes('M'));poner(p,'romanos-direccion','romano_a_arabigo');ok(teclas(p).includes('M'));ok(!teclas(p).includes('9'));
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();

    p=await pagina('/raices');campo=p.d.getElementById('raices-funcion-raw');campo.focus();tecla(p,'sin');
    eq(campo.value,'sin()');eq(campo.selectionStart,4);tecla(p,'x');eq(campo.value,'sin(x)');
    ok(p.d.getElementById('math-preview-render').textContent.includes('sin'));
    p.d.querySelector('.math-keyboard__close').click();ok(p.d.querySelector('.math-keyboard').hidden);
    p.d.querySelector('.math-keyboard-toggle').click();ok(!p.d.querySelector('.math-keyboard').hidden);
    p.d.getElementById('raices-xl').focus();ok(!teclas(p).includes('sin'));
    const visual=p.d.getElementById('raices-funcion-visual');
    const raw=p.d.getElementById('raices-funcion-raw');
    ok(!visual.hidden && raw.hidden,'El editor matemático es el modo inicial');
    const mq=p.w.MathQuill.getInterface(2)(visual);
    const teclaAria=nombre=>{const b=Array.from(p.d.querySelectorAll('.math-keyboard__key')).find(e=>e.getAttribute('aria-label')===nombre);ok(b,'Falta '+nombre);b.click();};
    mq.latex('');visual.mathEditor.focus();
    teclaAria('Fracción');tecla(p,'2');tecla(p,'↓');tecla(p,'3');
    eq(raw.value,'((2)/(3))','La fracción visual produce una expresión agrupada');
    ok(visual.querySelector('.mq-fraction'),'Fracción apilada real');
    tecla(p,'AC');teclaAria('Euler elevado a una potencia');tecla(p,'x');tecla(p,'+');tecla(p,'2');
    eq(raw.value,'e^(x+2)','El exponente compuesto no pierde sus paréntesis');
    ok(visual.querySelector('.mq-supsub'),'Exponente visual');
    tecla(p,'→');tecla(p,'+');teclaAria('Raíz cuadrada');tecla(p,'9');
    eq(raw.value,'e^(x+2)+sqrt(9)');ok(visual.querySelector('.mq-sqrt-prefix'),'Radical visible');
    const evaluado=backend('/api/raices/evaluar',{funcion:raw.value,x_min:0,x_max:1,n_puntos:2});
    eq(evaluado.status,200);ok(Math.abs(evaluado.body.puntos[0].y-(Math.exp(2)+3))<1e-10,'El servidor evalúa el exponente compuesto y la raíz');
    tecla(p,'AC');tecla(p,'sin');tecla(p,'x');tecla(p,')');eq(raw.value,'sin(x)');
    p.d.querySelector('[data-tab="functions"]').click();ok(teclas(p).includes('ln'));tecla(p,'AC');tecla(p,'ln');tecla(p,'2');tecla(p,')');eq(raw.value,'ln(2)');
    // Switch to source and back; grouping and server evaluation remain consistent.
    p.d.getElementById('math-source-toggle').click();ok(!raw.hidden && visual.hidden);
    poner(p,'raices-funcion-raw','(x+1)/(x-1)+e^(x+2)');p.d.getElementById('math-source-toggle').click();
    ok(raw.hidden && !visual.hidden);ok(visual.querySelector('.mq-fraction'));
    mq.latex('\\frac{2}{3}^{2}+\\sqrt{9}');eq(raw.value,'((2)/(3))^(2)+sqrt(9)');
    mq.latex('\\sqrt[3]{8}');eq(raw.value,'((8)^(1/(3)))');
    mq.latex('\\left|x-2\\right|');eq(raw.value,'abs(x-2)');
    // The reference screenshot contains a (1/x) with an empty exponent. Detect it
    // before any graph, interval or calculation request, and focus the exact block.
    mq.latex('\\frac{e\\left(\\frac{1}{x}^{ }\\right)+2x}{\\ln\\left(x\\right)}');
    ok(raw.dataset.mathError.toLowerCase().includes('exponente'));
    const llamadas=[];const fetchOriginal=p.w.fetch;
    p.w.fetch=(url,options)=>{llamadas.push(String(url));return fetchOriginal(url,options);};
    click(p,'raices-submit');await new Promise(r=>setTimeout(r,380));
    ok(!llamadas.some(url=>url.includes('/api/raices')),'No enviar una expresión incompleta a Flask');
    eq(visual.mathEditor.location(),'Numerador › Interior de paréntesis › Exponente');
    ok(visual.querySelector('.mq-sup.math-active-slot.math-empty-slot'),'El hueco está destacado');
    p.w.fetch=fetchOriginal;

    // Build the document's nested e^(1/x) + 2x/tan(x) = 2 using the new navigation.
    let cambios=0;raw.addEventListener('input',()=>cambios++);
    tecla(p,'AC');p.d.querySelector('[data-tab="main"]').click();
    teclaAria('Euler elevado a una potencia');eq(visual.mathEditor.location(),'Exponente');
    teclaAria('Fracción');eq(visual.mathEditor.location(),'Exponente › Numerador');
    tecla(p,'1');let prev=cambios;teclaAria('Siguiente campo');eq(cambios,prev,'Navegar no invalida el gráfico');
    eq(visual.mathEditor.location(),'Exponente › Denominador');
    tecla(p,'x');teclaAria('Salir del nivel actual');eq(visual.mathEditor.location(),'Exponente');
    teclaAria('Salir del nivel actual');eq(visual.mathEditor.location(),'Expresión principal');
    tecla(p,'+');teclaAria('Fracción');tecla(p,'2');tecla(p,'x');teclaAria('Siguiente campo');
    tecla(p,'tan');tecla(p,'x');teclaAria('Ir al final de la expresión');eq(visual.mathEditor.location(),'Expresión principal');
    tecla(p,'=');tecla(p,'2');
    eq(raw.dataset.mathError,'');eq(raw.value,'e^(((1)/(x)))+((2 x)/(tan(x)))=2');
    const compuesto=backend('/api/raices',{funcion:raw.value,metodo:'newton_raphson',x0:1.5,error_esperado:0.0001,max_iter:100});
    eq(compuesto.status,200);ok(compuesto.body.convergencia);ok(Math.abs(compuesto.body.resultado-1.542396006148898)<1e-8);
    teclaAria('Raíz cuadrada');eq(visual.mathEditor.location(),'Radicando');
    teclaAria('Salir del nivel actual');eq(visual.mathEditor.location(),'Expresión principal');
    ok(raw.dataset.mathError.includes('radicando'));
    tecla(p,'AC');eq(raw.dataset.mathError,'');
    const header=p.d.querySelector('.math-keyboard__header');
    function pointer(target,type,x,y){const e=new p.w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});Object.defineProperty(e,'pointerId',{value:1});target.dispatchEvent(e);}
    pointer(header,'pointerdown',10,10);pointer(p.d,'pointermove',100,130);pointer(p.d,'pointerup',100,130);
    const panel=p.d.querySelector('.math-keyboard');eq(panel.style.left,'90px');eq(panel.style.top,'120px');
    visual.mathEditor.focus();eq(panel.style.left,'90px','La posición manual se conserva');
    eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();

    for(const ruta of ['/raices','/matrices','/ecuaciones','/vectores','/conversion','/romanos']) {
        p=await pagina(ruta);
        eq(p.d.querySelectorAll('[id^="tanix-"]').length,0,'No deben existir controles de funciones retiradas');
        eq(p.d.querySelectorAll('script[src*="herramientas"],link[href*="herramientas"]').length,0);
        eq(p.w.Tanix,undefined);
        eq(p.errores.length,0,p.errores.join('\n'));p.dom.window.close();
    }
    ok(Array.from(almacenamiento.keys()).every(k=>k==='lineal-tanix-theme'),'No guardar operaciones ni precisión en localStorage');
    console.log(`DOM: ${comprobaciones} comprobaciones superadas; 0 fallos.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
