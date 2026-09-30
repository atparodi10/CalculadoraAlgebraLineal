// CONVERSIÓN DE BASES — Lineal Tanix
// Dedicated JS for the base conversion page.
// FIX: Visual bug when selecting number system is fixed by using custom-styled
// selects with proper state management and no conflicting CSS.

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('conversion-form');
    const origenSelect = document.getElementById('conversion-origen');
    const destinoSelect = document.getElementById('conversion-destino');
    const number = document.getElementById('conversion-number');
    const alertBox = document.getElementById('conversion-alert');
    const resultsContainer = document.getElementById('conversion-results');
    const submit = document.getElementById('conversion-submit');

    let revision = 0;

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

        // Result box
        html += `
            <div class="results__classification">
                <span style="font-size: 0.9rem; color: var(--text-muted); display: block; margin-bottom: 5px;">
                    Resultado Final (Base ${data.base_destino}):
                </span>
                ${data.resultado}
            </div>
        `;

        if (data.aviso) {
            html += `<p style="text-align: center; color: var(--color-success); font-weight: bold; margin-bottom: 20px;">${data.aviso}</p>`;
        }

        // Step-by-step
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
        const numValue = number.value.trim();
        const baseOrigen = parseInt(origenSelect.value);
        const baseDestino = parseInt(destinoSelect.value);

        if (baseOrigen === baseDestino) {
            mostrarError('La base de origen y destino no pueden ser la misma.');
            return;
        }

        submit.disabled = true;
        const originalHTML = submit.innerHTML;
        submit.innerHTML = '<span class="spinner"></span> Convirtiendo…';

        try {
            const response = await fetch('/convertir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    numero: numValue,
                    base_origen: baseOrigen,
                    base_destino: baseDestino
                }),
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
    number.addEventListener('invalid', (event) => {
        if (event.target.validity.valueMissing) {
            event.target.setCustomValidity('Por favor, ingresa un número para realizar la conversión.');
        }
    });

    number.addEventListener('input', (event) => {
        event.target.setCustomValidity('');
        invalidarResultado();
    });

    origenSelect.addEventListener('change', invalidarResultado);
    destinoSelect.addEventListener('change', invalidarResultado);
    form.addEventListener('submit', convertir);
});