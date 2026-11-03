// RAÍCES DE ECUACIONES — Lineal Tanix
// Módulo JS para el cálculo de raíces por métodos numéricos.
// Sigue el patrón de romanos.js y conversion.js para consistencia.

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('raices-form');
    const metodoSelect = document.getElementById('raices-metodo');
    const funcionInput = document.getElementById('raices-funcion');
    const errorInput = document.getElementById('raices-error');
    const maxIterInput = document.getElementById('raices-maxiter');
    const alertBox = document.getElementById('raices-alert');
    const warningBox = document.getElementById('raices-warning');
    const resultsContainer = document.getElementById('raices-results');
    const submitBtn = document.getElementById('raices-submit');

    // Contenedores de parámetros dinámicos
    const paramsCerrados = document.getElementById('raices-params-cerrados');
    const paramsNewton = document.getElementById('raices-params-newton');
    const paramsSecante = document.getElementById('raices-params-secante');

    // Inputs específicos
    const xlInput = document.getElementById('raices-xl');
    const xuInput = document.getElementById('raices-xu');
    const x0NewtonInput = document.getElementById('raices-x0-newton');
    const xm1Input = document.getElementById('raices-xm1');
    const x0SecanteInput = document.getElementById('raices-x0-secante');

    let revision = 0;

    // =========================================
    // GESTIÓN DE PARÁMETROS DINÁMICOS
    // =========================================
    function actualizarParametros() {
        const metodo = metodoSelect.value;

        paramsCerrados.classList.add('hidden');
        paramsNewton.classList.add('hidden');
        paramsSecante.classList.add('hidden');
        warningBox.classList.add('hidden');

        if (metodo === 'biseccion' || metodo === 'regla_falsa') {
            paramsCerrados.classList.remove('hidden');
        } else if (metodo === 'newton_raphson') {
            paramsNewton.classList.remove('hidden');
        } else if (metodo === 'secante') {
            paramsSecante.classList.remove('hidden');
        }
    }

    // =========================================
    // UTILIDADES DE UI
    // =========================================
    function invalidarResultado() {
        revision += 1;
        alertBox.classList.add('hidden');
        warningBox.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        resultsContainer.innerHTML = '';
    }

    function mostrarError(msg) {
        alertBox.textContent = msg;
        alertBox.className = 'alert alert--error';
        alertBox.classList.remove('hidden');
        alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => alertBox.classList.add('hidden'), 10000);
    }

    function mostrarWarning(msg) {
        warningBox.textContent = msg;
        warningBox.className = 'alert alert--warning';
        warningBox.classList.remove('hidden');
    }

    // =========================================
    // VALIDACIONES
    // =========================================
    function validarCampos() {
        const funcion = funcionInput.value.trim();
        const metodo = metodoSelect.value;
        const errorEa = parseFloat(errorInput.value);

        if (!funcion) {
            mostrarError('Por favor, ingresa la función f(x).');
            return null;
        }

        if (isNaN(errorEa) || errorEa <= 0) {
            mostrarError('El error esperado (Ea) debe ser un número positivo.');
            return null;
        }

        const datos = {
            funcion: funcion,
            metodo: metodo,
            error_esperado: errorEa,
            max_iter: parseInt(maxIterInput.value) || 100,
        };

        if (metodo === 'biseccion' || metodo === 'regla_falsa') {
            const xl = parseFloat(xlInput.value);
            const xu = parseFloat(xuInput.value);

            if (isNaN(xl) || xlInput.value.trim() === '') {
                mostrarError('Ingresa un valor numérico para el límite inferior (xl).');
                return null;
            }
            if (isNaN(xu) || xuInput.value.trim() === '') {
                mostrarError('Ingresa un valor numérico para el límite superior (xu).');
                return null;
            }
            if (xl >= xu) {
                mostrarError('El límite inferior (xl) debe ser menor que el límite superior (xu).');
                return null;
            }

            datos.xl = xl;
            datos.xu = xu;

        } else if (metodo === 'newton_raphson') {
            const x0 = parseFloat(x0NewtonInput.value);
            if (isNaN(x0) || x0NewtonInput.value.trim() === '') {
                mostrarError('Ingresa un valor numérico para x₀ (valor inicial).');
                return null;
            }
            datos.x0 = x0;

        } else if (metodo === 'secante') {
            const xm1 = parseFloat(xm1Input.value);
            const x0 = parseFloat(x0SecanteInput.value);
            if (isNaN(xm1) || xm1Input.value.trim() === '') {
                mostrarError('Ingresa un valor numérico para x₋₁.');
                return null;
            }
            if (isNaN(x0) || x0SecanteInput.value.trim() === '') {
                mostrarError('Ingresa un valor numérico para x₀.');
                return null;
            }
            datos.x_menos1 = xm1;
            datos.x0 = x0;
        }

        return datos;
    }

    // =========================================
    // RENDERIZADO DE RESULTADOS
    // =========================================
    function renderizarResultado(data, metodo) {
        let html = '';

        // Banner de resultado principal
        const esExito = data.convergencia;
        const claseAlerta = esExito ? 'alert--success' : 'alert--warning';
        const iconoEstado = esExito
            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

        html += `
            <div class="alert ${claseAlerta}" style="margin-bottom: 1.5rem;">
                ${iconoEstado}
                <span>${data.mensaje || (esExito ? 'Raíz encontrada con éxito.' : 'No se alcanzó convergencia.')}</span>
            </div>
        `;

        // Resumen numérico
        if (data.resultado !== null && data.resultado !== undefined) {
            html += `
                <div class="results__classification">
                    <span style="font-size: 0.9rem; color: var(--text-muted); display: block; margin-bottom: 5px;">
                        Raíz aproximada:
                    </span>
                    <span style="font-size: 1.8rem; letter-spacing: 0.02em; font-family: 'Fira Code', monospace;">
                        x ≈ ${data.resultado}
                    </span>
                    <span style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-top: 8px;">
                        Iteraciones: ${data.iteraciones} &nbsp;|&nbsp; Convergencia: ${esExito ? 'Sí ✓' : 'No ✗'}
                    </span>
                </div>
            `;
        }

        // Tabla de iteraciones
        if (data.pasos && data.pasos.length > 0) {
            html += `
                <div class="results__step" style="text-align: left; overflow-x: auto;">
                    <h3 style="margin-bottom: 1rem;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
                        </svg>
                        Tabla de Iteraciones
                    </h3>
                    <div class="raices-table-wrapper">
                        ${generarTabla(data.pasos, metodo)}
                    </div>
                </div>
            `;
        }

        resultsContainer.innerHTML = html;
        resultsContainer.classList.remove('hidden');
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function generarTabla(pasos, metodo) {
        if (metodo === 'biseccion' || metodo === 'regla_falsa') {
            return generarTablaCerrados(pasos);
        } else if (metodo === 'newton_raphson') {
            return generarTablaNewton(pasos);
        } else if (metodo === 'secante') {
            return generarTablaSecante(pasos);
        }
        return '';
    }

    function generarTablaCerrados(pasos) {
        let html = `
            <table class="raices-table">
                <thead>
                    <tr>
                        <th>Iteración</th>
                        <th>xl</th>
                        <th>xu</th>
                        <th>xr</th>
                        <th>f(xl)</th>
                        <th>f(xu)</th>
                        <th>f(xr)</th>
                        <th>Ea (%)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        pasos.forEach((p, idx) => {
            const esUltimo = idx === pasos.length - 1;
            html += `
                <tr class="${esUltimo ? 'raices-table__row--final' : ''}">
                    <td>${p.iteracion}</td>
                    <td>${p.xl}</td>
                    <td>${p.xu}</td>
                    <td><strong>${p.xr}</strong></td>
                    <td>${p.f_xl}</td>
                    <td>${p.f_xu}</td>
                    <td>${p.f_xr}</td>
                    <td>${p.ea}%</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        return html;
    }

    function generarTablaNewton(pasos) {
        let html = `
            <table class="raices-table">
                <thead>
                    <tr>
                        <th>Iteración</th>
                        <th>xᵢ</th>
                        <th>f(xᵢ)</th>
                        <th>f'(xᵢ)</th>
                        <th>xᵢ₊₁</th>
                        <th>Ea (%)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        pasos.forEach((p, idx) => {
            const esUltimo = idx === pasos.length - 1;
            html += `
                <tr class="${esUltimo ? 'raices-table__row--final' : ''}">
                    <td>${p.iteracion}</td>
                    <td>${p.xi}</td>
                    <td>${p.f_xi}</td>
                    <td>${p.f_prima_xi}</td>
                    <td><strong>${p.xi_nuevo}</strong></td>
                    <td>${p.ea}%</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        return html;
    }

    function generarTablaSecante(pasos) {
        let html = `
            <table class="raices-table">
                <thead>
                    <tr>
                        <th>Iteración</th>
                        <th>xᵢ₋₁</th>
                        <th>xᵢ</th>
                        <th>f(xᵢ₋₁)</th>
                        <th>f(xᵢ)</th>
                        <th>xᵢ₊₁</th>
                        <th>Ea (%)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        pasos.forEach((p, idx) => {
            const esUltimo = idx === pasos.length - 1;
            html += `
                <tr class="${esUltimo ? 'raices-table__row--final' : ''}">
                    <td>${p.iteracion}</td>
                    <td>${p.x_i_menos1}</td>
                    <td>${p.x_i}</td>
                    <td>${p.f_i_menos1}</td>
                    <td>${p.f_i}</td>
                    <td><strong>${p.x_nuevo}</strong></td>
                    <td>${p.ea}%</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        return html;
    }

    // =========================================
    // ENVÍO AL BACKEND
    // =========================================
    async function calcularRaiz(event) {
        event.preventDefault();
        invalidarResultado();

        const currentRevision = revision;
        const datos = validarCampos();
        if (!datos) return;

        submitBtn.disabled = true;
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Calculando…';

        try {
            const response = await fetch('/api/raices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos),
            });

            const data = await response.json();

            if (currentRevision !== revision) return;

            if (!response.ok) {
                throw new Error(data.error || 'No se pudo completar el cálculo.');
            }

            renderizarResultado(data, datos.metodo);

        } catch (error) {
            if (currentRevision !== revision) return;
            if (error instanceof TypeError) {
                mostrarError('Error de conexión con el servidor. Verifica que Flask esté ejecutándose.');
            } else {
                mostrarError(error.message);
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
        }
    }

    // =========================================
    // EVENT LISTENERS
    // =========================================
    metodoSelect.addEventListener('change', () => {
        actualizarParametros();
        invalidarResultado();
    });

    funcionInput.addEventListener('input', () => {
        invalidarResultado();
    });

    // Custom validity en español
    funcionInput.addEventListener('invalid', (event) => {
        if (event.target.validity.valueMissing) {
            event.target.setCustomValidity('Por favor, ingresa la función f(x) a evaluar.');
        }
    });
    funcionInput.addEventListener('input', (event) => {
        event.target.setCustomValidity('');
    });

    form.addEventListener('submit', calcularRaiz);

    // Inicializar UI
    actualizarParametros();
});

