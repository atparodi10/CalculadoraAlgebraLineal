// Herramientas comunes: historial local, informes y precisión de presentación.
// Los datos originales se conservan; fmt solo transforma texto visible.
(() => {
    'use strict';
    const KEY = 'lineal-tanix.historial.v1';
    const PENDING = 'lineal-tanix.restaurar.v1';
    const endpoints = {'/calcular':'Sistemas', '/api/matrices':'Matrices', '/api/vectores':'Vectores',
        '/convertir':'Conversión', '/api/romanos':'Romanos', '/api/raices':'Raíces', '/api/raices/comparar':'Comparación'};
    const paginas = {'/calcular':'/ecuaciones', '/api/matrices':'/matrices', '/api/vectores':'/vectores',
        '/convertir':'/conversion', '/api/romanos':'/romanos', '/api/raices':'/raices', '/api/raices/comparar':'/raices'};
    let historial = [], ultimo = null, decimales = 6, revisionFormulario = 0;
    const peticiones = new Map();
    const aviso = texto => { const e = document.getElementById('tanix-aviso'); if (e) e.textContent = texto; };
    function leer() {
        try {
            const data = JSON.parse(localStorage.getItem(KEY) || '[]');
            historial = Array.isArray(data) ? data.filter(e => e && typeof e.id === 'string' && endpoints[e.ruta] && e.datos && Array.isArray(e.campos) && typeof e.fecha === 'string').slice(0,30) : [];
            const guardado = Number(localStorage.getItem('lineal-tanix.decimales'));
            if ([4,6,8,10].includes(guardado)) decimales = guardado;
        } catch { historial = []; }
    }
    function guardar() {
        try { localStorage.setItem(KEY, JSON.stringify(historial)); }
        catch { aviso('No se pudo guardar el historial en este navegador. Puedes seguir calculando.'); }
    }
    function campos() {
        return Array.from(document.querySelectorAll('main input[id],main select[id],main textarea[id]'))
            .filter(e => !['tanix-precision','tanix-modo'].includes(e.id))
            .map(e => ({id:e.id, valor:e.value, marcado:e.checked}));
    }
    function fmt(valor) {
        if (valor === null || valor === undefined) return '—';
        if (typeof valor !== 'number') return String(valor);
        if (!Number.isFinite(valor)) return 'No definido';
        if (valor !== 0 && (Math.abs(valor) < 10 ** -decimales || Math.abs(valor) >= 1e12)) return valor.toExponential(decimales);
        return valor.toFixed(decimales);
    }
    function resumen(respuesta) {
        const r = {};
        for (const k of ['resultado','soluciones','tipo_sistema','convergencia','iteraciones','residuo','error_final','mensaje','comparacion','modo','tiempo_s']) {
            if (respuesta[k] !== undefined) r[k] = respuesta[k];
        }
        return r;
    }
    function registrar(ruta, datos, respuesta, estadoCampos = campos()) {
        if (!endpoints[ruta] || respuesta.error || datos.solo_recomendacion) return;
        ultimo = {ruta, datos:structuredClone(datos), respuesta:structuredClone(respuesta), fecha:new Date().toISOString()};
        const e = {id:globalThis.crypto?.randomUUID?.() || String(Date.now()), modulo:endpoints[ruta], ruta,
            datos:structuredClone(datos), resultado:resumen(respuesta), fecha:ultimo.fecha, campos:estadoCampos};
        if (JSON.stringify(e).length <= 100000) {
            historial.unshift(e); historial = historial.slice(0,30); guardar(); dibujarHistorial();
        } else aviso('El resultado está disponible; la entrada supera el tamaño del historial.');
        document.querySelectorAll('[data-tanix-exportar]').forEach(b => b.disabled = false);
        document.dispatchEvent(new CustomEvent('tanix:resultado', {detail:ultimo}));
    }
    async function solicitar(ruta, opciones) {
        const datos = JSON.parse(opciones.body);
        if (['/api/matrices','/calcular','/api/vectores'].includes(ruta)) {
            datos.modo = document.getElementById('tanix-modo')?.value || 'auto';
            opciones = {...opciones, body:JSON.stringify(datos)};
        }
        const estado = campos(), revision = revisionFormulario;
        peticiones.get(ruta)?.abort();
        const controller = new AbortController();peticiones.set(ruta,controller);
        aviso('Calculando…');
        try {
            const respuesta = await fetch(ruta, {...opciones, signal:controller.signal});
            if (revision !== revisionFormulario || controller.signal.aborted) throw new DOMException('Petición obsoleta','AbortError');
            if (respuesta.ok && endpoints[ruta]) {
                const contenido = await respuesta.clone().json();
                if (revision !== revisionFormulario) throw new DOMException('Petición obsoleta','AbortError');
                registrar(ruta, datos, contenido, estado);
            }
            return respuesta;
        } finally {
            if(peticiones.get(ruta)===controller){peticiones.delete(ruta);aviso('');}
        }
    }

    function mostrarResumen(contenedor, datos) {
        const resumen=document.createElement('div');resumen.className='results__step';
        const texto=document.createElement('p');texto.textContent=`Modo: ${datos.modo || 'educativo'} · Método: ${datos.metodo_utilizado || ''} · Tiempo: ${fmt(datos.tiempo_s)} s.`;resumen.append(texto);
        const ver=datos.comprobacion || datos.verificacion_visual;
        if(ver && !Array.isArray(ver)) {
            const p=document.createElement('p');p.textContent=`Comprobación numérica: ${ver.verificacion_ok === false ? 'requiere revisión' : 'correcta'} · Residuo máximo: ${fmt(ver.residuo_maximo ?? ver.residuo_factorizacion)}`;resumen.append(p);
            if(ver.condicion_estimada !== undefined){const condicion=document.createElement('p');condicion.textContent=`Condición estimada: ${fmt(ver.condicion_estimada)}`;resumen.append(condicion);}
            if(ver.advertencia){const aviso=document.createElement('p');aviso.textContent=ver.advertencia;aviso.className='alert alert--warning';resumen.append(aviso);}
        }
        contenedor.append(resumen);
    }
    function boton(texto, accion) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn--primary';
        b.textContent = texto; b.addEventListener('click', accion); return b;
    }
    function restaurar(e, repetir=false) {
        if (paginas[e.ruta] !== location.pathname) {
            try { sessionStorage.setItem(PENDING, JSON.stringify({entrada:e,repetir})); location.assign(paginas[e.ruta]); }
            catch { aviso('No se pudo restaurar entre páginas. Abre el módulo y vuelve a intentarlo.'); }
            return;
        }
        for (const c of e.campos) {
            const el = document.getElementById(c.id);
            if (!el || !el.matches('input,select,textarea')) continue;
            el.value = c.valor; if (typeof c.marcado === 'boolean') el.checked = c.marcado;
            el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true}));
        }
        document.dispatchEvent(new CustomEvent('tanix:restaurar', {detail:e}));
        // Restaurar entradas nunca expone una raíz ni reutiliza un resultado antiguo.
        if (repetir) {
            const d=e.datos;
            const ids={'/api/raices':'raices-submit','/api/raices/comparar':'tanix-comparar','/calcular':'btn-solve',
                '/convertir':'conversion-submit','/api/romanos':'romanos-submit'};
            let id = ids[e.ruta];
            if (e.ruta === '/api/matrices') id = {suma:'btn-mat-suma',resta:'btn-mat-resta',multiplicacion:'btn-mat-mult',escalar:'btn-mat-escalar',inversa:'btn-mat-inversa',determinante:'btn-mat-determinante'}[d.operacion];
            if (e.ruta === '/api/vectores') id = {suma:'btn-vec-suma',resta:'btn-vec-resta',escalar:'btn-vec-mult',combinacion:'btn-vec-comb'}[d.operacion];
            Tanix.repitiendo = true;
            document.getElementById(id)?.click();
            if (e.ruta === '/api/matrices' && d.operacion === 'determinante') {
                const radio = document.querySelector(`input[name="det-metodo"][value="${['lu','sarrus','cofactores'].includes(d.metodo) ? d.metodo : 'lu'}"]`);
                if (radio) radio.checked = true;
                document.getElementById('btn-det-calcular')?.click();
            }
            setTimeout(() => { Tanix.repitiendo = false; }, 0);
        }
    }
    function dibujarHistorial() {
        const lista = document.getElementById('tanix-historial-lista'); if (!lista) return;
        lista.replaceChildren();
        if (!historial.length) { lista.textContent = 'Todavía no hay operaciones guardadas.'; return; }
        for (const e of historial) {
            const item = document.createElement('li'); item.className = 'tanix-historial-item';
            const titulo = document.createElement('p');
            titulo.textContent = `${e.modulo} · ${e.datos.metodo || e.datos.operacion || e.datos.direccion || 'Conversión'} · ${new Date(e.fecha).toLocaleString()}`;
            const problema=document.createElement('pre'); problema.textContent=JSON.stringify(e.datos, null, 2);
            const resultado=document.createElement('pre'); resultado.textContent=JSON.stringify(e.resultado, null, 2);
            const acciones=document.createElement('div'); acciones.className='btn-group';
            acciones.append(boton('Restaurar entradas',()=>restaurar(e)), boton('Repetir cálculo',()=>restaurar(e,true)),
                boton('Eliminar',()=>{historial=historial.filter(x=>x.id!==e.id);guardar();dibujarHistorial();}));
            item.append(titulo, problema, resultado, acciones); lista.append(item);
        }
    }
    function filasReporte() {
        if (!ultimo) return [];
        const {datos:d, respuesta:r} = ultimo;
        const filas = [['Lineal Tanix'],['Fecha',new Date(ultimo.fecha).toLocaleString()],['Módulo',endpoints[ultimo.ruta]],
            ['Problema y parámetros',JSON.stringify(d)],['Resultado',JSON.stringify(resumen(r))],
            ['Decimales de presentación',decimales],['Tolerancia Ea (%)',d.error_esperado ?? 'No aplica']];
        if (r.pasos?.length && r.pasos[0].iteracion !== undefined) {
            const columnas=Object.keys(r.pasos[0]); filas.push([],columnas);
            for (const paso of r.pasos) filas.push(columnas.map(k=>paso[k]));
        } else {
            for (const paso of r.pasos || []) filas.push(['Procedimiento',JSON.stringify(paso)]);
        }
        for (const paso of r.pasos_ecuaciones || []) filas.push(['Procedimiento',paso]);
        for (const metodo of r.comparacion || []) filas.push(['Comparación',JSON.stringify(metodo)]);
        return filas;
    }
    function celdaCSV(valor) {
        let s=valor == null ? '' : String(valor);
        // Evita interpretar expresiones o nombres como fórmulas en una hoja de cálculo.
        if (/^[=+\-@\t\r]/.test(s)) s="'"+s;
        return '"'+s.replace(/"/g,'""')+'"';
    }
    function exportarCSV() {
        const texto='\uFEFF'+filasReporte().map(f=>f.map(celdaCSV).join(',')).join('\r\n');
        const url=URL.createObjectURL(new Blob([texto],{type:'text/csv;charset=utf-8'}));
        const a=document.createElement('a');a.href=url;a.download='Lineal_Tanix_procedimiento.csv';a.click();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    function imprimir() {
        const area=document.getElementById('tanix-informe'); area.replaceChildren();
        const titulo=document.createElement('h1');titulo.textContent='Lineal Tanix — Procedimiento';area.append(titulo);
        const contenido=document.createElement('pre');contenido.textContent=filasReporte().map(f=>f.join(': ')).join('\n');area.append(contenido);
        window.print();
    }
    function invalidarExportacion() {
        revisionFormulario++;
        for(const controller of peticiones.values())controller.abort();
        ultimo=null;
        document.querySelectorAll('[data-tanix-exportar]').forEach(b=>b.disabled=true);
    }
    const Tanix = window.Tanix = {fmt, registrar, solicitar, mostrarResumen, invalidar:invalidarExportacion, get decimales(){return decimales;}, repitiendo:false};
    document.addEventListener('DOMContentLoaded',()=>{
        leer(); dibujarHistorial();
        const precision=document.getElementById('tanix-precision');
        if (!precision) return;
        precision.value=String(decimales);
        precision.addEventListener('change',()=>{
            decimales=Number(precision.value);
            try {localStorage.setItem('lineal-tanix.decimales',String(decimales));} catch {}
            document.querySelectorAll('[data-tanix-numero]').forEach(e=>e.textContent=fmt(Number(e.dataset.tanixNumero)));
            document.dispatchEvent(new Event('tanix:precision'));
        });
        document.getElementById('tanix-limpiar').addEventListener('click',()=>{historial=[];guardar();dibujarHistorial();});
        document.getElementById('tanix-csv').addEventListener('click',exportarCSV);
        document.getElementById('tanix-imprimir').addEventListener('click',imprimir);
        document.getElementById('tanix-copiar').addEventListener('click',async()=>{
            try {await navigator.clipboard.writeText(filasReporte().map(f=>f.join(': ')).join('\n'));aviso('Procedimiento copiado.');}
            catch {aviso('El navegador no permitió copiar. Puedes usar CSV o imprimir.');}
        });
        document.querySelector('main').addEventListener('change',e=>{
            if (e.target.matches('select,input') && e.target.id !== 'tanix-precision') invalidarExportacion();
        });
        document.querySelector('main').addEventListener('input',e=>{
            if (e.target.matches('input,textarea') && e.target.id !== 'tanix-precision') invalidarExportacion();
        });
        try {
            const pendiente=JSON.parse(sessionStorage.getItem(PENDING)||'null');sessionStorage.removeItem(PENDING);
            if (pendiente && endpoints[pendiente.entrada?.ruta]) setTimeout(()=>restaurar(pendiente.entrada,pendiente.repetir),0);
        } catch {}
    });
})();
