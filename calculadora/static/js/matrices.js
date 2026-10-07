// MATRICES — Lineal Tanix
// JS dedicado a la página de operaciones matriciales.
// Incluye visualización de la aumentada [A | I], comprobación A×A⁻¹,
// tiempo real medido y diálogo de evaluación de rendimiento.

document.addEventListener('DOMContentLoaded', () => {

    // Utilidades de parseo
    const parseVector = (str) => {
        if (!str.trim()) return [];
        const arr = str.split(/[, ]+/).filter(x => x.trim() !== '');
        const numeros = arr.map(Number);
        if (numeros.some(v => isNaN(v) || !isFinite(v))) return null;
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
        // Validar filas irregulares
        if (matriz.length > 0) {
            const cols = matriz[0].length;
            for (let i = 1; i < matriz.length; i++) {
                if (matriz[i].length !== cols) return null;
            }
        }
        return matriz;
    };

    // =========================================
    // EVALUACIÓN DE RENDIMIENTO
    // =========================================

    /**
     * Obtiene la RAM aproximada del visitante mediante navigator.deviceMemory.
     * Devuelve el valor reportado (en GB) o null si no está disponible.
     * No asume 4 GB como fallback: si falta, se informa "No disponible".
     */
    function obtenerRAMCliente() {
        if (navigator.deviceMemory !== undefined) {
            return navigator.deviceMemory;
        }
        return null;
    }

    /**
     * Muestra la alerta de rendimiento con botones de proceder/cancelar.
     * No estima tiempo de cálculo: se obtiene del servidor tras la operación.
     * Solo advierte sobre la cantidad de celdas y la RAM del visitante.
     * Retorna una Promise que resuelve a true (proceder) o false (cancelar).
     */
    function mostrarDialogoRendimiento(filas, columnas, operacion) {
        return new Promise((resolve) => {
            const alertBox = document.getElementById('mat-alert');
            const ramCliente = obtenerRAMCliente();
            const celdas = filas * columnas;

            // Límite de protección justificado:
            // Para inversa/multiplicación con complejidad O(n³), una 200×200
            // genera ~8 millones de operaciones. Más allá, el tiempo del servidor
            // puede superar los 30 s y la aumentada consume memoria significativa.
            // El servidor también valida este límite independientemente.
            const LIMITE_CELDAS = 40000; // ~200×200

            const nombreOp = {
                'suma': 'Suma', 'resta': 'Resta', 'multiplicacion': 'Multiplicación',
                'escalar': 'Escalar', 'inversa': 'Inversa'
            }[operacion] || operacion;

            const soportado = celdas <= LIMITE_CELDAS;

            const infoRAM = ramCliente !== null
                ? `${ramCliente} GB (aprox. reportada por el navegador)`
                : 'No disponible';

            let html = '';

            if (!soportado) {
                html = `
                    <div style="width:100%;">
                        <p style="margin-bottom:8px;">
                            <strong>⚠️ Operación grande:</strong> ${celdas} celdas para "${nombreOp}".
                            Límite recomendado: ${LIMITE_CELDAS} celdas (dimensión máxima del servidor: 200×200).
                        </p>
                        <p style="margin-bottom:8px; font-size:0.85rem; color:var(--text-muted);">
                            RAM del visitante: ${infoRAM}
                        </p>
                        <div style="display:flex; gap:0.75rem; margin-top:12px; flex-wrap:wrap;">
                            <button class="btn btn--primary" id="btn-perf-proceder" style="padding:0.5rem 1.2rem; font-size:0.9rem;">
                                ⏳ Proceder de todas formas
                            </button>
                            <button class="btn btn--primary" id="btn-perf-cancelar" style="padding:0.5rem 1.2rem; font-size:0.9rem; background:var(--color-danger);">
                                ✕ Cancelar
                            </button>
                        </div>
                    </div>
                `;
            } else {
                html = `
                    <div style="width:100%;">
                        <p style="margin-bottom:8px;">
                            <strong>📐 Operación: ${nombreOp}</strong>
                            <span style="color:var(--text-muted); font-size:0.85rem;">
                                (${celdas} celdas · RAM visitante: ${infoRAM})
                            </span>
                        </p>
                        <p style="margin-bottom:8px; font-size:0.85rem; color:var(--text-muted);">
                            El tiempo de cálculo se medirá en el servidor y se mostrará tras completar la operación.
                        </p>
                        <div style="display:flex; gap:0.75rem; margin-top:12px; flex-wrap:wrap;">
                            <button class="btn btn--primary" id="btn-perf-proceder" style="padding:0.5rem 1.2rem; font-size:0.9rem;">
                                ✓ Proceder
                            </button>
                            <button class="btn btn--primary" id="btn-perf-cancelar" style="padding:0.5rem 1.2rem; font-size:0.9rem; background:var(--color-danger);">
                                ✕ Cancelar
                            </button>
                        </div>
                    </div>
                `;
            }

            alertBox.innerHTML = html;
            alertBox.className = `alert alert--${soportado ? 'warning' : 'error'}`;
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

    // =========================================
    // Utilidades de interfaz
    // =========================================

    function showMsg(idContainer, msg, type = 'error') {
        const alertBox = document.getElementById(idContainer);
        alertBox.textContent = msg;
        alertBox.className = `alert alert--${type}`;
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 7000);
    }

    /**
     * Formatea un número para presentación: enteros sin decimales,
     * flotantes con hasta 4 decimales significativos.
     */
    function fmtNum(val) {
        if (typeof val !== 'number') return String(val);
        if (Number.isInteger(val)) return String(val);
        // Eliminar ceros finales innecesarios
        return parseFloat(val.toFixed(4)).toString();
    }

    /**
     * Renderiza una matriz simple con corchetes usando las clases CSS existentes.
     */
    function renderMatrizHtml(matriz_2d) {
        let html = '<div class="matrix">';
        matriz_2d.forEach(row => {
            html += '<div class="matrix__row">';
            row.forEach(val => {
                html += `<div class="matrix__cell">${fmtNum(val)}</div>`;
            });
            html += '</div>';
        });
        html += '</div>';
        return html;
    }

    /**
     * Renderiza la matriz aumentada [parte_A | parte_I] con separación vertical.
     * Cada celda de la parte derecha usa la clase matrix__cell--result para
     * el borde punteado y color primario existentes.
     */
    function renderMatrizAumentadaHtml(parte_A, parte_I) {
        const n = parte_A.length;
        let html = '<div class="matrix">';
        for (let i = 0; i < n; i++) {
            html += '<div class="matrix__row">';
            // Parte izquierda (A en transformación)
            for (let j = 0; j < parte_A[i].length; j++) {
                html += `<div class="matrix__cell">${fmtNum(parte_A[i][j])}</div>`;
            }
            // Parte derecha (I en transformación) con separación visual
            for (let j = 0; j < parte_I[i].length; j++) {
                html += `<div class="matrix__cell matrix__cell--result">${fmtNum(parte_I[i][j])}</div>`;
            }
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    /**
     * Renderiza la sección de tiempo real medido.
     * Diferencia tiempo de cálculo del servidor vs tiempo total de petición.
     */
    function renderTiempoInfo(tiempoInfo, tiempoPeticionMs) {
        if (!tiempoInfo) return '';

        const durServidor = tiempoInfo.duracion_calculo_s;
        let html = '<div class="results__step" style="text-align:left;">';
        html += '<h3>⏱️ Tiempo de Ejecución</h3>';
        html += '<ul>';

        // Tiempo de cálculo en el servidor (medido con time.perf_counter)
        if (durServidor !== undefined) {
            const ms = (durServidor * 1000).toFixed(2);
            html += `<li><strong>Cálculo del servidor:</strong> ${ms} ms (${durServidor.toFixed(6)} s)</li>`;
            html += `<li style="font-size:0.85rem; color:var(--text-muted);">${tiempoInfo.descripcion || ''}</li>`;
        }

        // Tiempo total de petición (medido con performance.now en el navegador)
        if (tiempoPeticionMs !== undefined) {
            html += `<li><strong>Tiempo total de petición (red + servidor + respuesta):</strong> ${tiempoPeticionMs.toFixed(2)} ms</li>`;
            html += `<li style="font-size:0.85rem; color:var(--text-muted);">Medido con performance.now() en el navegador. Incluye latencia de red, procesamiento del servidor y transferencia de datos.</li>`;
        }

        // RAM del servidor
        if (tiempoInfo.ram_servidor) {
            const ram = tiempoInfo.ram_servidor;
            html += `<li><strong>RAM del servidor:</strong> Total: ${ram.total_gb} GB · Disponible: ${ram.disponible_gb} GB</li>`;
        } else {
            html += `<li><strong>RAM del servidor:</strong> No disponible</li>`;
        }

        // RAM del visitante
        const ramCliente = obtenerRAMCliente();
        if (ramCliente !== null) {
            html += `<li><strong>RAM del visitante (aprox.):</strong> ${ramCliente} GB (reportada por navigator.deviceMemory)</li>`;
        } else {
            html += `<li><strong>RAM del visitante:</strong> No disponible (navigator.deviceMemory no soportado por este navegador)</li>`;
        }

        html += '</ul></div>';
        return html;
    }

    /**
     * Renderiza la sección de comprobación visual A × A⁻¹ ≈ I.
     * Muestra: matrices de factores, producto progresivo e identidad esperada.
     * Desarrolla cada celda con la multiplicación fila por columna.
     */
    function renderVerificacionVisual(verificacion) {
        if (!verificacion) return '';

        const { A_original, inversa, producto, identidad_esperada,
                detalle_celdas, tolerancia, verificacion_ok } = verificacion;
        const n = A_original.length;

        let html = '<div class="results__step" style="text-align:left;">';
        html += '<h3>🔍 Comprobación Visual: A × A⁻¹ ≈ I</h3>';

        // --- Matrices: A, A⁻¹, Producto, Identidad esperada ---
        html += '<div style="text-align:center; margin:1rem 0;">';
        html += '<p style="color:var(--color-primary); font-weight:600; margin-bottom:0.5rem;">Matriz A</p>';
        html += renderMatrizHtml(A_original);
        html += '<p style="color:var(--text-muted); font-size:1.5rem; margin:0.5rem 0;">×</p>';
        html += '<p style="color:var(--color-primary); font-weight:600; margin-bottom:0.5rem;">Matriz A⁻¹</p>';
        html += renderMatrizHtml(inversa);
        html += '<p style="color:var(--text-muted); font-size:1.5rem; margin:0.5rem 0;">=</p>';
        html += '<p style="color:var(--color-primary); font-weight:600; margin-bottom:0.5rem;">Producto A × A⁻¹</p>';
        html += renderMatrizHtml(producto);
        html += '<p style="color:var(--text-muted); font-size:1.5rem; margin:0.5rem 0;">≈</p>';
        html += '<p style="color:var(--color-primary); font-weight:600; margin-bottom:0.5rem;">Identidad Esperada</p>';
        html += renderMatrizHtml(identidad_esperada);
        html += '</div>';

        // --- Desglose celda a celda con avance progresivo ---
        // Para matrices ≤ 6×6 se muestra completo; para mayores, resumen
        const mostrarCompleto = n <= 6;

        if (mostrarCompleto && detalle_celdas && detalle_celdas.length > 0) {
            html += '<h3 style="margin-top:1.5rem;">Desarrollo celda a celda (fila de A · columna de A⁻¹)</h3>';

            // Renderizar avance progresivo del producto
            html += '<div style="margin:1rem 0;">';
            let productoParcial = Array.from({length: n}, () => Array(n).fill(null));
            let celdaIdx = 0;

            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    const celda = detalle_celdas[celdaIdx];
                    celdaIdx++;

                    // Registrar el valor calculado
                    productoParcial[i][j] = celda.resultado;

                    // Mostrar la ecuación de esta celda
                    const icono = celda.correcto ? '✓' : '⚠';
                    const colorIcono = celda.correcto ? 'var(--color-success)' : 'var(--color-danger)';
                    html += `<div style="background:var(--bg-card-alt); border:1px solid var(--border-color); border-radius:6px; padding:0.7rem 1rem; margin-bottom:0.5rem; font-family:'Fira Code',monospace; font-size:0.9rem;">`;
                    html += `<span style="color:${colorIcono}; font-weight:700;">${icono}</span> `;
                    html += `<strong>(A×A⁻¹)[${celda.fila},${celda.columna}]</strong> = ${celda.desglose} = <strong>${fmtNum(celda.resultado)}</strong>`;
                    html += ` <span style="color:var(--text-muted); font-size:0.8rem;">(esperado: ${fmtNum(celda.esperado)})</span>`;
                    html += '</div>';
                }

                // Tras completar cada fila, mostrar el estado parcial del producto
                // Diferenciando posiciones calculadas de pendientes
                html += '<div style="text-align:center; margin:0.75rem 0;">';
                html += '<p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.25rem;">Avance del producto tras fila ' + (i + 1) + ':</p>';
                html += '<div class="matrix">';
                for (let pi = 0; pi < n; pi++) {
                    html += '<div class="matrix__row">';
                    for (let pj = 0; pj < n; pj++) {
                        if (productoParcial[pi][pj] !== null) {
                            // Celda ya calculada
                            const esUno = Math.abs(productoParcial[pi][pj] - 1) < tolerancia && pi === pj;
                            const esCero = Math.abs(productoParcial[pi][pj]) < tolerancia && pi !== pj;
                            const color = (esUno || esCero) ? 'var(--color-success)' : 'var(--color-danger)';
                            html += `<div class="matrix__cell" style="color:${color}; font-weight:700;">${fmtNum(productoParcial[pi][pj])}</div>`;
                        } else {
                            // Celda pendiente
                            html += `<div class="matrix__cell" style="color:var(--text-muted); font-style:italic;">—</div>`;
                        }
                    }
                    html += '</div>';
                }
                html += '</div></div>';
            }
            html += '</div>';
        } else if (!mostrarCompleto) {
            html += `<p style="color:var(--text-muted); font-size:0.9rem; margin-top:1rem;">`;
            html += `Desglose celda a celda omitido por tamaño (${n}×${n}). `;
            html += `Las matrices del producto y la identidad esperada se muestran arriba para comparación visual.`;
            html += `</p>`;
        }

        // --- Resultado de la verificación ---
        html += '<div style="margin-top:1rem; padding:1rem; border-radius:8px; ';
        if (verificacion_ok) {
            html += 'background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3);">';
            html += `<strong style="color:var(--color-success);">✓ Verificación exitosa:</strong> A × A⁻¹ ≈ I (tolerancia: ${tolerancia})`;
        } else {
            html += 'background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3);">';
            html += `<strong style="color:var(--color-danger);">⚠ Advertencia:</strong> Posible error de precisión numérica (tolerancia: ${tolerancia})`;
        }
        html += '</div></div>';

        return html;
    }

    // =========================================
    // Comunicación con el backend
    // =========================================

    /**
     * Envía la operación al servidor y renderiza los resultados.
     * Para la inversa: usa renderizado especial con aumentada, tiempo y comprobación.
     */
    async function fetchOperacion(url, data, alertId, resultId) {
        // Medir tiempo total de petición con performance.now()
        const tInicioReq = performance.now();

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const tFinReq = performance.now();
            const tiempoPeticionMs = tFinReq - tInicioReq;

            const json = await res.json();

            if (!res.ok) {
                // Para la inversa con singularidad, mostrar los pasos alcanzados
                if (data.operacion === 'inversa' && (json.pasos || json.pasos_ecuaciones)) {
                    const resultsDiv = document.getElementById(resultId);
                    resultsDiv.innerHTML = '';
                    resultsDiv.classList.remove('hidden');

                    // Mostrar el error
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'results__classification';
                    errorDiv.style.color = 'var(--color-danger)';
                    errorDiv.style.background = 'rgba(239,68,68,0.1)';
                    errorDiv.style.border = '1px solid rgba(239,68,68,0.3)';
                    errorDiv.textContent = json.error;
                    resultsDiv.appendChild(errorDiv);

                    // Mostrar pasos alcanzados antes de la singularidad
                    if (json.pasos && json.pasos.length > 0) {
                        renderPasosInversa(json.pasos, resultsDiv);
                    }

                    // Mostrar desglose algebraico
                    if (json.pasos_ecuaciones && json.pasos_ecuaciones.length > 0) {
                        renderDesgloseAlgebraico(json.pasos_ecuaciones, resultsDiv);
                    }

                    // Mostrar tiempo si existe
                    if (json.tiempo_info) {
                        resultsDiv.innerHTML += renderTiempoInfo(json.tiempo_info, tiempoPeticionMs);
                    }

                    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    showMsg(alertId, json.error || 'Error matemático detectado.', 'error');
                }
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

            // === Renderizado especial para la inversa ===
            if (data.operacion === 'inversa') {
                // Pasos con matriz aumentada visual
                if (json.pasos && json.pasos.length > 0) {
                    renderPasosInversa(json.pasos, resultsDiv);
                }

                // Resultado final: A, Identidad obtenida y A⁻¹ por separado
                if (json.resultado) {
                    const finalDiv = document.createElement('div');
                    finalDiv.className = 'results__step';
                    let finalHtml = '<h3>Resultado Final</h3>';
                    finalHtml += '<div style="text-align:center;">';

                    // Matriz A original
                    finalHtml += '<p style="color:var(--color-primary); font-weight:600; margin-bottom:0.5rem;">Matriz A original</p>';
                    finalHtml += renderMatrizHtml(data.A);

                    // Identidad obtenida (parte izquierda del último paso)
                    const ultimoPaso = json.pasos[json.pasos.length - 1];
                    if (ultimoPaso && ultimoPaso.parte_A) {
                        finalHtml += '<p style="color:var(--color-primary); font-weight:600; margin:1rem 0 0.5rem;">Identidad obtenida (parte izquierda)</p>';
                        finalHtml += renderMatrizHtml(ultimoPaso.parte_A);
                    }

                    // A⁻¹
                    finalHtml += '<p style="color:var(--color-primary); font-weight:600; margin:1rem 0 0.5rem;">Matriz Inversa A⁻¹</p>';
                    finalHtml += renderMatrizHtml(json.resultado);
                    finalHtml += '</div>';
                    finalDiv.innerHTML = finalHtml;
                    resultsDiv.appendChild(finalDiv);
                }

                // Desglose algebraico
                if (json.pasos_ecuaciones && json.pasos_ecuaciones.length > 0) {
                    renderDesgloseAlgebraico(json.pasos_ecuaciones, resultsDiv);
                }

                // Comprobación visual A × A⁻¹ ≈ I
                if (json.verificacion_visual) {
                    const verifContainer = document.createElement('div');
                    verifContainer.innerHTML = renderVerificacionVisual(json.verificacion_visual);
                    resultsDiv.appendChild(verifContainer);
                }

                // Información de tiempo real
                if (json.tiempo_info) {
                    const tiempoContainer = document.createElement('div');
                    tiempoContainer.innerHTML = renderTiempoInfo(json.tiempo_info, tiempoPeticionMs);
                    resultsDiv.appendChild(tiempoContainer);
                }

            } else {
                // === Renderizado estándar para otras operaciones ===
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
                    renderDesgloseAlgebraico(json.pasos_ecuaciones, resultsDiv);
                }

                if (json.resultado && !json.pasos) {
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'results__step';
                    stepDiv.innerHTML = `<h3>Resultado Final:</h3>`;
                    const mat = Array.isArray(json.resultado[0]) ? json.resultado : [json.resultado];
                    stepDiv.innerHTML += renderMatrizHtml(mat);
                    resultsDiv.appendChild(stepDiv);
                }
            }

            resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            showMsg(alertId, 'Fallo de Red: No se estableció conexión con el servidor Flask.', 'error');
        }
    }

    /**
     * Renderiza los pasos de la inversa usando la matriz aumentada con
     * separación visual entre ambas mitades.
     */
    function renderPasosInversa(pasos, contenedor) {
        pasos.forEach((paso, index) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'results__step';
            let contenidoHtml = `<p style="text-align:left; color: var(--color-primary); font-weight: bold;">Paso ${index}: ${paso.mensaje}</p>`;

            // Si el paso tiene ambas mitades separadas, dibujar la aumentada
            if (paso.parte_A && paso.parte_I) {
                contenidoHtml += renderMatrizAumentadaHtml(paso.parte_A, paso.parte_I);
            } else if (paso.matriz) {
                // Fallback: matriz completa sin separación
                contenidoHtml += renderMatrizHtml(paso.matriz);
            }

            stepDiv.innerHTML = contenidoHtml;
            contenedor.appendChild(stepDiv);
        });
    }

    /**
     * Renderiza el desglose algebraico (ecuaciones paso a paso).
     */
    function renderDesgloseAlgebraico(pasosEcuaciones, contenedor) {
        const eqDiv = document.createElement('div');
        eqDiv.className = 'results__step';
        eqDiv.style.textAlign = 'left';
        let eqHTML = '<h3>Desglose Algebraico:</h3><ul>';
        pasosEcuaciones.forEach(line => {
            if (line.includes("Fila") || line.includes("x") || line.includes("C[") || line.includes("Sistema") || line.includes("Componente") || line.includes("F") || line.includes("→") || line.includes("✓") || line.includes("⚠") || line.includes("A⁻¹") || line.includes("A×A⁻¹") || line.includes("tolerancia")) {
                eqHTML += `<li style="font-family: monospace; font-size: 1rem; margin-bottom: 5px;">${line}</li>`;
            } else {
                eqHTML += `<p><strong>${line}</strong></p>`;
            }
        });
        eqHTML += '</ul>';
        eqDiv.innerHTML = eqHTML;
        contenedor.appendChild(eqDiv);
    }

    // =========================================
    // Operaciones matriciales con evaluación de rendimiento
    // =========================================

    const procesarMatrices = async (operacion) => {
        const A = parseMatrix(document.getElementById('mat-a').value);
        const B = parseMatrix(document.getElementById('mat-b').value);

        if (A === null) return showMsg('mat-alert', "Error de formato en Matriz A: Valores irregulares, no numéricos o filas de distinta longitud.");
        if (A.length === 0) return showMsg('mat-alert', "Datos incompletos: Matriz A está vacía.");

        // Para operaciones que no necesitan B (escalar, inversa)
        if (operacion !== 'escalar' && operacion !== 'inversa') {
            if (B === null) return showMsg('mat-alert', "Error de formato en Matriz B: Valores irregulares, no numéricos o filas de distinta longitud.");
            if (B.length === 0) return showMsg('mat-alert', "Datos incompletos: Matriz B está vacía.");
        }

        // Mostrar diálogo de rendimiento
        const proceder = await mostrarDialogoRendimiento(A.length, A[0].length, operacion);
        if (!proceder) return;

        fetchOperacion('/api/matrices', { operacion, A, B }, 'mat-alert', 'mat-results');
    };

    document.getElementById('btn-mat-suma').addEventListener('click', () => procesarMatrices('suma'));

    const btnMatResta = document.getElementById('btn-mat-resta');
    if (btnMatResta) btnMatResta.addEventListener('click', () => procesarMatrices('resta'));

    document.getElementById('btn-mat-mult').addEventListener('click', () => procesarMatrices('multiplicacion'));

    // Manejador de escalar con evaluación de rendimiento
    document.getElementById('btn-mat-escalar').addEventListener('click', async () => {
        const A = parseMatrix(document.getElementById('mat-a').value);
        const c = parseFloat(document.getElementById('mat-c').value.trim());

        if (A === null || isNaN(c)) return showMsg('mat-alert', "Error de formato: verifica la Matriz A y el escalar.");
        if (A.length === 0) return showMsg('mat-alert', "Datos incompletos: Matriz A está vacía.");

        const proceder = await mostrarDialogoRendimiento(A.length, A[0].length, 'escalar');
        if (!proceder) return;

        fetchOperacion('/api/matrices', { operacion: 'escalar', A, c }, 'mat-alert', 'mat-results');
    });

    // Manejador de inversa
    document.getElementById('btn-mat-inversa').addEventListener('click', async () => {
        const A = parseMatrix(document.getElementById('mat-a').value);

        if (A === null) return showMsg('mat-alert', "Error de formato en Matriz A: Valores irregulares, no numéricos o filas de distinta longitud.");
        if (A.length === 0) return showMsg('mat-alert', "Datos incompletos: Ingresa la Matriz A.");

        // Verificar que sea cuadrada en el frontend
        if (A.length !== A[0].length) {
            return showMsg('mat-alert', `La matriz debe ser cuadrada para calcular su inversa. Dimensiones: ${A.length}×${A[0].length}.`);
        }

        const proceder = await mostrarDialogoRendimiento(A.length, A[0].length, 'inversa');
        if (!proceder) return;

        fetchOperacion('/api/matrices', { operacion: 'inversa', A }, 'mat-alert', 'mat-results');
    });
});
