// MATRICES — Lineal Tanix
// Dedicated JS for matrix operations page.

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

    // Matrix operations
    const procesarMatrices = (operacion) => {
        const A = parseMatrix(document.getElementById('mat-a').value);
        const B = parseMatrix(document.getElementById('mat-b').value);

        if (A === null || B === null) return showMsg('mat-alert', "Error de formato: Matrices irregulares o no numéricas.");
        if (A.length === 0 || B.length === 0) return showMsg('mat-alert', "Datos incompletos.");

        const celdasA = A.length * A[0].length;
        const celdasB = B.length * B[0].length;

        const errorMemoria = validarMemoria(celdasA + celdasB);
        if (errorMemoria) return showMsg('mat-alert', errorMemoria);

        fetchOperacion('/api/matrices', { operacion, A, B }, 'mat-alert', 'mat-results');
    };

    document.getElementById('btn-mat-suma').addEventListener('click', () => procesarMatrices('suma'));

    const btnMatResta = document.getElementById('btn-mat-resta');
    if (btnMatResta) btnMatResta.addEventListener('click', () => procesarMatrices('resta'));

    document.getElementById('btn-mat-mult').addEventListener('click', () => procesarMatrices('multiplicacion'));

    document.getElementById('btn-mat-escalar').addEventListener('click', () => {
        const A = parseMatrix(document.getElementById('mat-a').value);
        const c = parseFloat(document.getElementById('mat-c').value.trim());

        if (A === null || isNaN(c)) return showMsg('mat-alert', "Error de formato.");
        if (A.length === 0) return showMsg('mat-alert', "Datos incompletos.");

        const errorMemoria = validarMemoria(A.length * A[0].length);
        if (errorMemoria) return showMsg('mat-alert', errorMemoria);

        fetchOperacion('/api/matrices', { operacion: 'escalar', A, c }, 'mat-alert', 'mat-results');
    });
});
