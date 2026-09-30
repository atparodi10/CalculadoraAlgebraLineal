// NÚMEROS ROMANOS — Lineal Tanix
// Dedicated JS for the Roman numeral conversion page.
// Follows the same pattern as conversion.js for consistency.

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('romanos-form');
    const direccionSelect = document.getElementById('romanos-direccion');
    const inputField = document.getElementById('romanos-input');
    const inputLabel = document.getElementById('romanos-input-label');
    const inputHelp = document.getElementById('romanos-help');
    const alertBox = document.getElementById('romanos-alert');
    const resultsContainer = document.getElementById('romanos-results');
    const submit = document.getElementById('romanos-submit');

    let revision = 0;

    // Actualizar placeholder y label según la dirección seleccionada
    function actualizarUI() {
        const dir = direccionSelect.value;
        if (dir === 'arabigo_a_romano') {
            inputLabel.textContent = 'Número arábigo (1–3999)';
            inputField.placeholder = 'Ej: 2024';
            inputHelp.textContent = 'Ingresa un número entero entre 1 y 3999.';
        } else {
            inputLabel.textContent = 'Número romano';
            inputField.placeholder = 'Ej: MMXXIV, XIV, XLII';
            inputHelp.textContent = 'Usa los símbolos I, V, X, L, C, D, M. No distingue mayúsculas.';
        }
    }

    function invalidarResultado() {
        revision += 1;
        alertBox.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        resultsContainer.innerHTML = '';
    }

    function mostrarError(msg) {
        alertBox.textContent = msg;
        alertBox.className = 'alert alert--error';
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 7000);
    }

    function mostrarResultado(data) {
        let html = '';

        // Resultado principal
        html += `
            <div class="results__classification">
                <span style="font-size: 0.9rem; color: var(--text-muted); display: block; margin-bottom: 5px;">
                    ${data.direccion}:
                </span>
                <span style="font-size: 1.8rem; letter-spacing: 0.05em;">${data.resultado}</span>
            </div>
        `;

        // Pasos detallados
        if (data.pasos && data.pasos.length > 0) {
            data.pasos.forEach(paso => {
                html += `
                <div class="results__step conversion-step">
                    <h3>${paso.titulo}</h3>
                    <ul>
                        ${paso.lineas.map(linea => `
                            <li>${linea}</li>
                        `).join('')}
                    </ul>
                </div>`;
            });
        }

        resultsContainer.innerHTML = html;
        resultsContainer.classList.remove('hidden');
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async function convertir(event) {
        event.preventDefault();
        invalidarResultado();

        const currentRevision = revision;
        const valor = inputField.value.trim();
        const direccion = direccionSelect.value;

        if (!valor) {
            mostrarError('Por favor, ingresa un valor para convertir.');
            return;
        }

        // Preparar el dato según la dirección
        let numero;
        if (direccion === 'arabigo_a_romano') {
            numero = parseInt(valor);
            if (isNaN(numero)) {
                mostrarError('El valor debe ser un número entero válido para convertir a Romano.');
                return;
            }
        } else {
            numero = valor.toUpperCase();
        }

        submit.disabled = true;
        const originalHTML = submit.innerHTML;
        submit.innerHTML = '<span class="spinner"></span> Convirtiendo…';

        try {
            const response = await fetch('/api/romanos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ numero, direccion }),
            });

            const data = await response.json();

            if (currentRevision !== revision) return;

            if (!response.ok) throw new Error(data.error || 'No se pudo completar la conversión.');

            mostrarResultado(data);

        } catch (error) {
            if (currentRevision !== revision) return;
            if (error instanceof TypeError) {
                mostrarError('Error de conexión con el servidor. Verifica que Flask esté ejecutándose.');
            } else {
                mostrarError(error.message);
            }
        } finally {
            submit.disabled = false;
            submit.innerHTML = originalHTML;
        }
    }

    // Custom validity message in Spanish
    inputField.addEventListener('invalid', (event) => {
        if (event.target.validity.valueMissing) {
            event.target.setCustomValidity('Por favor, ingresa un valor para realizar la conversión.');
        }
    });

    inputField.addEventListener('input', (event) => {
        event.target.setCustomValidity('');
        invalidarResultado();
    });

    direccionSelect.addEventListener('change', () => {
        actualizarUI();
        invalidarResultado();
        inputField.value = '';
    });

    form.addEventListener('submit', convertir);

    // Inicializar la UI con la dirección por defecto
    actualizarUI();
});
