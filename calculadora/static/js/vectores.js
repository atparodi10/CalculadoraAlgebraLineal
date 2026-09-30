// VECTORES — Lineal Tanix
// Dedicated JS for vector operations and linear combination page.

document.addEventListener('DOMContentLoaded', () => {

    // Parsing utilities
    const parseVector = (str) => {
        if (!str.trim()) return [];
        const arr = str.split(/[, ]+/).filter(x => x.trim() !== '');
        const numeros = arr.map(Number);
        if (numeros.some(isNaN)) return null;
        return numeros;
    };

    const parseMatrix = (str) => {
        if (!str.trim()) return [];
        const filas = str.trim().split('\n');
        const matriz = [];
        for (let fila of filas) {
            const vec = parseVector(fila);
            if (vec === null) return null;
            if (vec.length > 0) matriz.push(vec);
        }
        return matriz;
    };

    const validarMemoria = (celdasTotales) => {
        const ramGB = navigator.deviceMemory || 4;
        const limiteCeldas = ramGB * 250;
        if (celdasTotales > limiteCeldas) {
            return `Límite excedido: Tu dispositivo (${ramGB}GB RAM) no soporta ${celdasTotales} celdas simultáneas.`;
        }
        return null;
    };

    // UI utilities
    function showMsg(idContainer, msg, type = 'error') {
        const alertBox = document.getElementById(idContainer);
        alertBox.textContent = msg;
        alertBox.className = `alert alert--${type}`;
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 7000);
    }

    function renderMatrizHtml(matriz_2d) {
        let html = '<div class="matrix">';
        matriz_2d.forEach(row => {
            html += '<div class="matrix__row">';
            row.forEach(val => {
                const fmt = Number.isInteger(val) ? val : val.toFixed(3);
                html += `<div class="matrix__cell">${fmt}</div>`;
            });
            html += '</div>';
        });
        html += '</div>';
        return html;
    }

    // Backend communication
    async function fetchOperacion(url, data, alertId, resultId) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const json = await res.json();

            if (!res.ok) {
                showMsg(alertId, json.error || 'Error matemático detectado.', 'error');
                return;
            }

            const resultsDiv = document.getElementById(resultId);
            resultsDiv.innerHTML = '';
            resultsDiv.classList.remove('hidden');

            if (json.mensaje) {
                const msgDiv = document.createElement('div');
                msgDiv.className = 'results__classification';
                msgDiv.textContent = json.mensaje;
                resultsDiv.appendChild(msgDiv);
            }

            if (json.pasos && json.pasos.length > 0) {
                json.pasos.forEach((paso, index) => {
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'results__step';
                    let contenidoHtml = `<p style="text-align:left; color: var(--color-primary); font-weight: bold;">Paso ${index}: ${paso.mensaje}</p>`;
                    if (paso.matriz) contenidoHtml += renderMatrizHtml(paso.matriz);
                    stepDiv.innerHTML = contenidoHtml;
                    resultsDiv.appendChild(stepDiv);
                });
            }

            if (json.pasos_ecuaciones && json.pasos_ecuaciones.length > 0) {
                const eqDiv = document.createElement('div');
                eqDiv.className = 'results__step';
                eqDiv.style.textAlign = 'left';
                let eqHTML = '<h3>Desglose Algebraico:</h3><ul>';
                json.pasos_ecuaciones.forEach(line => {
                    if (line.includes("Fila") || line.includes("x") || line.includes("C[") || line.includes("Sistema") || line.includes("Componente")) {
                        eqHTML += `<li style="font-family: monospace; font-size: 1rem; margin-bottom: 5px;">${line}</li>`;
                    } else {
                        eqHTML += `<p><strong>${line}</strong></p>`;
                    }
                });
                eqHTML += '</ul>';
                eqDiv.innerHTML = eqHTML;
                resultsDiv.appendChild(eqDiv);
            }

            if (json.resultado && !json.pasos) {
                const stepDiv = document.createElement('div');
                stepDiv.className = 'results__step';
                stepDiv.innerHTML = `<h3>Resultado Final:</h3>`;
                const mat = Array.isArray(json.resultado[0]) ? json.resultado : [json.resultado];
                stepDiv.innerHTML += renderMatrizHtml(mat);
                resultsDiv.appendChild(stepDiv);
            }

            resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            showMsg(alertId, 'Fallo de Red: No se estableció conexión con el servidor Flask.', 'error');
        }
    }

    // Vector operations
    const procesarVectores = (operacion) => {
        const dimStr = document.getElementById('vec-dim').value;
        const n = parseInt(dimStr);
        const u = parseVector(document.getElementById('vec-u').value);
        const v = parseVector(document.getElementById('vec-v').value);

        if (isNaN(n) || n <= 0) return showMsg('vec-alert', "Especifique una dimensión válida (n > 0).");
        if (u === null || v === null) return showMsg('vec-alert', "Formato inválido: Ingrese únicamente números.");
        if (u.length === 0 || v.length === 0) return showMsg('vec-alert', "Datos incompletos.");

        const errorMemoria = validarMemoria(n * 2);
        if (errorMemoria) return showMsg('vec-alert', errorMemoria);

        fetchOperacion('/api/vectores', { operacion, u, v, n }, 'vec-alert', 'vec-results');
    };

    document.getElementById('btn-vec-suma').addEventListener('click', () => procesarVectores('suma'));
    document.getElementById('btn-vec-resta').addEventListener('click', () => procesarVectores('resta'));

    document.getElementById('btn-vec-mult').addEventListener('click', () => {
        const n = parseInt(document.getElementById('vec-dim').value);
        const u = parseVector(document.getElementById('vec-u').value);
        const c = parseFloat(document.getElementById('vec-c').value.trim());

        if (isNaN(n) || n <= 0) return showMsg('vec-alert', "Especifique una dimensión válida (n > 0).");
        if (u === null || isNaN(c)) return showMsg('vec-alert', "Formato numérico inválido.");

        const errorMemoria = validarMemoria(n);
        if (errorMemoria) return showMsg('vec-alert', errorMemoria);

        fetchOperacion('/api/vectores', { operacion: 'escalar', u, c, n }, 'vec-alert', 'vec-results');
    });

    document.getElementById('btn-vec-comb').addEventListener('click', () => {
        const vectores_v = parseMatrix(document.getElementById('vec-conjunto').value);
        const vector_b = parseVector(document.getElementById('vec-b').value);

        if (vectores_v === null || vector_b === null) return showMsg('vec-alert', "Formato inválido detectado.");
        if (vectores_v.length === 0 || vector_b.length === 0) return showMsg('vec-alert', "Conjunto de vectores vacío.");

        const errorMemoria = validarMemoria(vectores_v.length * vector_b.length);
        if (errorMemoria) return showMsg('vec-alert', errorMemoria);

        fetchOperacion('/api/vectores', { operacion: 'combinacion', vectores_v, vector_b }, 'vec-alert', 'vec-results');
    });
});
