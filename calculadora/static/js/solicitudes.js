// Evita mostrar respuestas de entradas anteriores. No guarda operaciones.
(() => {
    'use strict';
    let revision = 0;
    const pendientes = new Map();
    function invalidar() {
        revision++;
        for (const control of pendientes.values()) control.abort();
    }
    async function enviar(url, opciones) {
        const actual = revision;
        pendientes.get(url)?.abort();
        const control = new AbortController();
        pendientes.set(url, control);
        try {
            const respuesta = await fetch(url, {...opciones, signal: control.signal});
            if (actual !== revision || control.signal.aborted) throw new DOMException('Petición obsoleta', 'AbortError');
            return respuesta;
        } finally {
            if (pendientes.get(url) === control) pendientes.delete(url);
        }
    }
    window.Solicitudes = {enviar};
    document.addEventListener('DOMContentLoaded', () => {
        const principal = document.querySelector('main');
        for (const evento of ['input', 'change']) principal?.addEventListener(evento, e => {
            if (e.target.matches('input,select,textarea')) invalidar();
        });
    });
})();
