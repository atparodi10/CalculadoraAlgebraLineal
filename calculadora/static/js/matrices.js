// MATRICES — Lineal Tanix
// Dedicated JS for matrix operations page.
// Includes performance estimation and hardware evaluation for large matrices.

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

    // =========================================
    // EVALUACIÓN DE RENDIMIENTO Y UX
    // =========================================

    /**
     * Estima la memoria RAM del dispositivo (en GB).
     * navigator.deviceMemory está disponible en Chrome/Edge; retorna 4 como fallback.
     */
    function obtenerRAM() {
        return navigator.deviceMemory || 4;
    }

    /**
     * Evalúa si el hardware del cliente puede procesar la operación.
     * Estima el tiempo basado en la complejidad O(n³) de las operaciones matriciales.
     * Retorna un objeto con: soportado (bool), tiempoEstimado (string), celdas (int).
     */
    function evaluarRendimiento(filas, columnas, operacion) {
        const ramGB = obtenerRAM();
        const celdas = filas * columnas;

        // Límite de celdas basado en RAM disponible
        const limiteCeldas = ramGB * 250;

        // Calcular complejidad: O(n³) para inversa/multiplicación, O(n²) para suma/resta/escalar
        let complejidad;
        const n = Math.max(filas, columnas);

        if (operacion === 'inversa' || operacion === 'multiplicacion') {
            complejidad = n * n * n; // O(n³)
        } else {
            complejidad = n * n; // O(n²)
        }

        // Estimar tiempo: calibración basada en ~500,000 operaciones/segundo en hardware promedio
        // Ajustado por la RAM disponible como proxy de potencia del hardware
        const factorHardware = ramGB / 4; // normalizado a 4GB como base
        const operacionesPorSegundo = 500000 * factorHardware;
        const tiempoSegundos = complejidad / operacionesPorSegundo;

        // Formatear tiempo estimado
        let tiempoEstimado;
        if (tiempoSegundos < 0.001) {
            tiempoEstimado = '< 1 ms (instantáneo)';
        } else if (tiempoSegundos < 1) {
            tiempoEstimado = `~${Math.ceil(tiempoSegundos * 1000)} ms`;
        } else if (tiempoSegundos < 60) {
            tiempoEstimado = `~${tiempoSegundos.toFixed(1)} segundos`;
        } else {
            const minutos = Math.floor(tiempoSegundos / 60);
            const segs = Math.round(tiempoSegundos % 60);
            tiempoEstimado = `~${minutos} min ${segs} seg`;
        }

        return {
            soportado: celdas <= limiteCeldas,
            tiempoEstimado: tiempoEstimado,
            celdas: celdas,
            ramGB: ramGB,
            limiteCeldas: limiteCeldas
        };
    }

    // =========================================
    // UI utilities
    // =========================================

    function showMsg(idContainer, msg, type = 'error') {
        const alertBox = document.getElementById(idContainer);
        alertBox.textContent = msg;
        alertBox.className = `alert alert--${type}`;
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 7000);
    }

    /**
     * Muestra la alerta de rendimiento con botones de proceder/cancelar.
     * Retorna una Promise que resuelve a true (proceder) o false (cancelar).
     */
    function mostrarDialogoRendimiento(evaluacion, operacion) {
        return new Promise((resolve) => {
            const alertBox = document.getElementById('mat-alert');
            const nombreOp = {
                'suma': 'Suma', 'resta': 'Resta', 'multiplicacion': 'Multiplicación',
                'escalar': 'Escalar', 'inversa': 'Inversa'
            }[operacion] || operacion;

            let html = '';

            if (!evaluacion.soportado) {
                html = `
                    <div style="width:100%;">
                        <p style="margin-bottom:8px;">
                            <strong>⚠️ Hardware insuficiente:</strong> Tu dispositivo (${evaluacion.ramGB}GB RAM) 
                            no soporta procesar ${evaluacion.celdas} celdas para la operación "${nombreOp}".
                            Límite: ${evaluacion.limiteCeldas} celdas.
                        </p>
                        <div style="display:flex; gap:0.75rem; margin-top:12px; flex-wrap:wrap;">
                            <button class="btn btn--primary" id="btn-perf-proceder" style="padding:0.5rem 1.2rem; font-size:0.9rem;">
                                ⏳ Esperar / Proceder de todas formas
                            </button>
                            <button class="btn btn--primary" id="btn-perf-cancelar" style="padding:0.5rem 1.2rem; font-size:0.9rem; background:var(--color-danger);">
                                ✕ No proceder
                            </button>
                        </div>
                    </div>
                `;
            } else {
                html = `
                    <div style="width:100%;">
                        <p style="margin-bottom:8px;">
                            <strong>⏱️ Tiempo estimado de cálculo:</strong> ${evaluacion.tiempoEstimado}
                            <span style="color:var(--text-muted); font-size:0.85rem;">
                                (${evaluacion.celdas} celdas · ${evaluacion.ramGB}GB RAM · Operación: ${nombreOp})
                            </span>
                        </p>
                        <div style="display:flex; gap:0.75rem; margin-top:12px; flex-wrap:wrap;">
                            <button class="btn btn--primary" id="btn-perf-proceder" style="padding:0.5rem 1.2rem; font-size:0.9rem;">
                                ✓ Proceder
                            </button>
                            <button class="btn btn--primary" id="btn-perf-cancelar" style="padding:0.5rem 1.2rem; font-size:0.9rem; background:var(--color-danger);">
                                ✕ No proceder
                            </button>
                        </div>
                    </div>
                `;
            }

            alertBox.innerHTML = html;
            alertBox.className = `alert alert--${evaluacion.soportado ? 'warning' : 'error'}`;
            alertBox.classList.remove('hidden');

            document.getElementById('btn-perf-proceder').addEventListener('click', () => {
                alertBox.classList.add('hidden');
                resolve(true);
            });
            document.getElementById('btn-perf-cancelar').addEventListener('click', () => {
                alertBox.classList.add('hidden');
                // Limpiar campos
                document.getElementById('mat-a').value = '';
                document.getElementById('mat-b').value = '';
                document.getElementById('mat-c').value = '';
                document.getElementById('mat-results').classList.add('hidden');
                document.getElementById('mat-results').innerHTML = '';
                resolve(false);
            });
        });
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
                    if (line.includes("Fila") || line.includes("x") || line.includes("C[") || line.includes("Sistema") || line.includes("Componente") || line.includes("F") || line.includes("→") || line.includes("✓") || line.includes("⚠") || line.includes("A⁻¹")) {
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

    // =========================================
    // Matrix operations with performance evaluation
    // =========================================

    const procesarMatrices = async (operacion) => {
        const A = parseMatrix(document.getElementById('mat-a').value);
        const B = parseMatrix(document.getElementById('mat-b').value);

        if (A === null) return showMsg('mat-alert', "Error de formato en Matriz A: Valores irregulares o no numéricos.");
        if (A.length === 0) return showMsg('mat-alert', "Datos incompletos: Matriz A está vacía.");

        // Para operaciones que no necesitan B (escalar, inversa)
        if (operacion !== 'escalar' && operacion !== 'inversa') {
            if (B === null) return showMsg('mat-alert', "Error de formato en Matriz B: Valores irregulares o no numéricos.");
            if (B.length === 0) return showMsg('mat-alert', "Datos incompletos: Matriz B está vacía.");
        }

        // Calcular celdas totales
        const celdasA = A.length * A[0].length;
        const celdasB = (B && B.length > 0) ? B.length * B[0].length : 0;
        const celdasTotales = (operacion === 'escalar' || operacion === 'inversa') ? celdasA : celdasA + celdasB;

        // Evaluación de rendimiento
        const evaluacion = evaluarRendimiento(A.length, A[0].length, operacion);

        // Mostrar diálogo de rendimiento con estimación de tiempo
        const proceder = await mostrarDialogoRendimiento(evaluacion, operacion);
        if (!proceder) return;

        fetchOperacion('/api/matrices', { operacion, A, B }, 'mat-alert', 'mat-results');
    };

    document.getElementById('btn-mat-suma').addEventListener('click', () => procesarMatrices('suma'));

    const btnMatResta = document.getElementById('btn-mat-resta');
    if (btnMatResta) btnMatResta.addEventListener('click', () => procesarMatrices('resta'));

    document.getElementById('btn-mat-mult').addEventListener('click', () => procesarMatrices('multiplicacion'));

    // Escalar handler with performance evaluation
    document.getElementById('btn-mat-escalar').addEventListener('click', async () => {
        const A = parseMatrix(document.getElementById('mat-a').value);
        const c = parseFloat(document.getElementById('mat-c').value.trim());

        if (A === null || isNaN(c)) return showMsg('mat-alert', "Error de formato.");
        if (A.length === 0) return showMsg('mat-alert', "Datos incompletos.");

        const evaluacion = evaluarRendimiento(A.length, A[0].length, 'escalar');
        const proceder = await mostrarDialogoRendimiento(evaluacion, 'escalar');
        if (!proceder) return;

        fetchOperacion('/api/matrices', { operacion: 'escalar', A, c }, 'mat-alert', 'mat-results');
    });

    // Inversa handler
    document.getElementById('btn-mat-inversa').addEventListener('click', async () => {
        const A = parseMatrix(document.getElementById('mat-a').value);

        if (A === null) return showMsg('mat-alert', "Error de formato en Matriz A.");
        if (A.length === 0) return showMsg('mat-alert', "Datos incompletos: Ingresa la Matriz A.");

        // Verificar que sea cuadrada en el frontend
        if (A.length !== A[0].length) {
            return showMsg('mat-alert', `La matriz debe ser cuadrada para calcular su inversa. Dimensiones: ${A.length}×${A[0].length}.`);
        }

        const evaluacion = evaluarRendimiento(A.length, A[0].length, 'inversa');
        const proceder = await mostrarDialogoRendimiento(evaluacion, 'inversa');
        if (!proceder) return;

        fetchOperacion('/api/matrices', { operacion: 'inversa', A }, 'mat-alert', 'mat-results');
    });
});
