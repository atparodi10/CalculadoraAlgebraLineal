// SISTEMAS DE ECUACIONES — Lineal Tanix
// JS dedicado a la página de sistemas de ecuaciones.
// CORRECCIÓN: La versión anterior consultaba TODOS los .equation-input de la página,
// incluyendo módulos ocultos. Ahora cada módulo tiene su propia página y archivo JS.
// CORRECCIÓN: Algunos teclados/autocorrectores reemplazan 'x' por '×' (signo de multiplicación).
// Se normaliza antes de parsear.

document.addEventListener('DOMContentLoaded', () => {
    const btnGenerate = document.getElementById('btn-generate');
    const btnSolve = document.getElementById('btn-solve');
    const equationContainer = document.getElementById('equation-container');
    const equationList = document.getElementById('equation-list');
    const resultsSection = document.getElementById('results');
    const uiAlert = document.getElementById('ui-alert');

    let m = 3, n = 3;

    function mostrarAlerta(mensaje, tipo = 'error') {
        uiAlert.textContent = mensaje;
        uiAlert.className = `alert alert--${tipo}`;
        uiAlert.classList.remove('hidden');
        setTimeout(() => uiAlert.classList.add('hidden'), 7000);
    }

    // Normalize input: replace × (U+00D7) with x (lowercase latin x)
    // This fixes the bug where mobile keyboards or autocorrect replace x with ×
    function normalizeEquation(text) {
        return text
            .replace(/×/g, 'x')    // multiplication sign → x
            .replace(/✕/g, 'x')    // heavy multiplication x → x
            .replace(/✖/g, 'x')    // heavy multiplication sign → x
            .replace(/⋅/g, '*')    // dot operator → *
            .replace(/−/g, '-')    // minus sign → hyphen-minus
            .trim();
    }

    btnGenerate.addEventListener('click', () => {
        m = parseInt(document.getElementById('input-m').value);
        n = parseInt(document.getElementById('input-n').value);

        if (m <= 0 || n <= 0 || isNaN(m) || isNaN(n)) {
            mostrarAlerta('Las dimensiones de la matriz deben ser mayores a 0.', 'error');
            return;
        }

        const ramGB = navigator.deviceMemory || 4;
        const celdasTotales = m * n;
        const limiteCeldas = ramGB * 250;

        // Estimar tiempo basado en O(n³) de los métodos de resolución
        const complejidad = Math.max(m, n) ** 3;
        const factorHardware = ramGB / 4;
        const operacionesPorSegundo = 500000 * factorHardware;
        const tiempoSegundos = complejidad / operacionesPorSegundo;

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

        const noSoportado = celdasTotales > limiteCeldas;

        // Construir el diálogo de rendimiento
        let html = '';
        if (noSoportado) {
            html = `
                <div style="width:100%;">
                    <p style="margin-bottom:8px;">
                        <strong>⚠️ Hardware insuficiente:</strong> Tu dispositivo (${ramGB}GB RAM) 
                        no soporta procesar una matriz de ${m}×${n} (${celdasTotales} celdas). 
                        Límite estimado: ${limiteCeldas} celdas.
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
                        <strong>⏱️ Tiempo estimado de resolución:</strong> ${tiempoEstimado}
                        <span style="color:var(--text-muted); font-size:0.85rem;">
                            (${celdasTotales} celdas · ${ramGB}GB RAM · Sistema ${m}×${n})
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

        uiAlert.innerHTML = html;
        uiAlert.className = `alert alert--${noSoportado ? 'error' : 'warning'}`;
        uiAlert.classList.remove('hidden');

        document.getElementById('btn-perf-proceder').addEventListener('click', () => {
            uiAlert.classList.add('hidden');
            generarCamposEcuaciones();
        });

        document.getElementById('btn-perf-cancelar').addEventListener('click', () => {
            uiAlert.classList.add('hidden');
            // Resetear el formulario
            document.getElementById('input-m').value = '3';
            document.getElementById('input-n').value = '3';
            m = 3;
            n = 3;
            equationList.innerHTML = '';
            equationContainer.classList.add('hidden');
            resultsSection.classList.add('hidden');
            resultsSection.innerHTML = '';
        });
    });

    function generarCamposEcuaciones() {
        equationList.innerHTML = '';

        for (let i = 0; i < m; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-input';
            input.placeholder = `Ecuación ${i + 1} (Ej: 2x1 - 3x2 + 4x3 = 5)`;
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('autocapitalize', 'off');
            input.setAttribute('spellcheck', 'false');
            // Real-time normalization: replace × as the user types
            input.addEventListener('input', function() {
                const pos = this.selectionStart;
                const normalized = normalizeEquation(this.value);
                if (normalized !== this.value) {
                    this.value = normalized;
                    this.setSelectionRange(pos, pos);
                }
            });
            equationList.appendChild(input);
        }

        equationContainer.classList.remove('hidden');
        resultsSection.classList.add('hidden');

        // Focus the first input
        const firstInput = equationList.querySelector('input');
        if (firstInput) firstInput.focus();
    }

    btnSolve.addEventListener('click', async () => {
        const metodo = document.getElementById('select-method').value;
        const ecuaciones = [];

        let camposVacios = false;
        let faltaSignoIgual = false;

        // Only query inputs within the equation list (not other page elements)
        const inputs = equationList.querySelectorAll('.form-input');

        inputs.forEach(input => {
            const val = normalizeEquation(input.value);
            // Also update the input visually
            input.value = val;

            if (val === '') {
                camposVacios = true;
            } else if (!val.includes('=')) {
                faltaSignoIgual = true;
            }

            ecuaciones.push(val);
        });

        if (camposVacios) {
            mostrarAlerta('Datos nulos: Por favor, asegúrate de no dejar ninguna ecuación en blanco.', 'error');
            return;
        }

        if (faltaSignoIgual) {
            mostrarAlerta('Formato inválido: Toda ecuación debe contener el signo de igualdad "=" (Ej: 2x1 = 4).', 'error');
            return;
        }

        uiAlert.classList.add('hidden');
        btnSolve.disabled = true;
        const originalText = btnSolve.innerHTML;
        btnSolve.innerHTML = '<span class="spinner"></span> Procesando…';

        try {
            const response = await fetch('/calcular', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ m, n, metodo, ecuaciones })
            });

            const data = await response.json();

            if (response.status === 400) {
                mostrarAlerta(data.error, 'error');
                return;
            }

            renderResults(data);
        } catch (error) {
            mostrarAlerta('Error de conexión con el servidor. Verifica que Flask esté ejecutándose.', 'error');
        } finally {
            btnSolve.disabled = false;
            btnSolve.innerHTML = originalText;
        }
    });

    function renderResults(data) {
        resultsSection.innerHTML = '';
        resultsSection.classList.remove('hidden');

        data.pasos.forEach((paso, index) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'results__step';

            let matrixHTML = '<div class="matrix">';
            paso.matriz.forEach(row => {
                matrixHTML += '<div class="matrix__row">';
                row.forEach((val, idx) => {
                    const cellClass = (idx === row.length - 1) ? 'matrix__cell matrix__cell--result' : 'matrix__cell';
                    matrixHTML += `<div class="${cellClass}">${val.toFixed(2)}</div>`;
                });
                matrixHTML += '</div>';
            });
            matrixHTML += '</div>';

            stepDiv.innerHTML = `<p style="text-align:left;"><strong>Paso ${index}:</strong> ${paso.mensaje}</p>${matrixHTML}`;
            resultsSection.appendChild(stepDiv);
        });

        const classDiv = document.createElement('div');
        classDiv.className = 'results__classification';
        classDiv.innerText = data.tipo_sistema;
        resultsSection.appendChild(classDiv);

        if (data.pasos_ecuaciones && data.pasos_ecuaciones.length > 0) {
            const eqDiv = document.createElement('div');
            eqDiv.className = 'results__step';
            eqDiv.style.textAlign = 'left';
            let eqHTML = '<h3>Análisis de las Ecuaciones:</h3><ul>';
            data.pasos_ecuaciones.forEach(line => {
                if (line.includes("Fila") || line.includes("x")) {
                    eqHTML += `<li style="font-family: monospace; font-size: 1.05rem; margin-bottom: 5px;">${line}</li>`;
                } else {
                    eqHTML += `<p><strong>${line}</strong></p>`;
                }
            });
            eqHTML += '</ul>';
            eqDiv.innerHTML = eqHTML;
            resultsSection.appendChild(eqDiv);
        }

        if (data.soluciones && data.soluciones.length > 0) {
            let solHTML = '<h3>Comprobación Automática:</h3><ul>';
            data.verificacion.forEach(v => {
                solHTML += `<li>Ecuación ${v.ecuacion}: ${v.calculado} = ${v.esperado} (${v.valido ? '✓ Correcto' : '✗ Error'})</li>`;
            });
            solHTML += '</ul>';

            const solDiv = document.createElement('div');
            solDiv.className = 'results__step';
            solDiv.style.textAlign = 'left';
            solDiv.innerHTML = solHTML;
            resultsSection.appendChild(solDiv);
        }

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});
