// INTERFAZ DE CONVERSIÓN DE BASES UNIVERSAL
// Se enlaza con los ids conversion-* de index.html y con POST /convertir.

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('conversion-form');
    const origenSelect = document.getElementById('conversion-origen');
    const destinoSelect = document.getElementById('conversion-destino');
    const number = document.getElementById('conversion-number');
    const alertBox = document.getElementById('conversion-alert');
    const resultsContainer = document.getElementById('conversion-results');
    const submit = document.getElementById('conversion-submit');
    
    let revision = 0;

    // Función para ocultar resultados viejos cuando el usuario cambia algo
    function invalidarResultado() {
        revision += 1;
        alertBox.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        resultsContainer.innerHTML = '';
    }

    // Renderiza la respuesta JSON del servidor en cajas HTML
    function mostrarResultado(data) {
        let html = '';

        // A. Caja principal con el resultado destacado
        html += `
            <div class="results__classification">
                <span style="font-size: 1rem; color: var(--text-muted); display: block; margin-bottom: 5px;">
                    Resultado Final (Base ${data.base_destino}):
                </span>
                ${data.resultado}
            </div>
        `;

        if (data.aviso) {
            html += `<p style="text-align: center; color: var(--success-color); font-weight: bold; margin-bottom: 20px;">${data.aviso}</p>`;
        }

        // B. Cajas de desarrollo (Paso a Paso)
        if (data.pasos && data.pasos.length > 0) {
            data.pasos.forEach(paso => {
                html += `
                <div class="results__step" style="text-align: left;">
                    <h3 style="color: var(--primary-color); margin-top: 0; margin-bottom: 15px;">${paso.titulo}</h3>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        ${paso.lineas.map(linea => `
                            <li style="font-family: 'Fira Code', monospace; font-size: 1rem; color: #475569; background: #f8fafc; padding: 0.75rem 1rem; margin-bottom: 0.5rem; border-radius: 6px; border: 1px solid #e2e8f0;">
                                ${linea}
                            </li>
                        `).join('')}
                    </ul>
                </div>`;
            });
        }

        resultsContainer.innerHTML = html;
        resultsContainer.classList.remove('hidden');
    }

    // Función principal de envío
    async function convertir(event) {
        event.preventDefault(); // EVITA LA RECARGA DE LA PÁGINA
        invalidarResultado();
        
        const currentRevision = revision;
        const numValue = number.value.trim();
        const baseOrigen = parseInt(origenSelect.value);
        const baseDestino = parseInt(destinoSelect.value);

        if (baseOrigen === baseDestino) {
            alertBox.textContent = 'La base de origen y destino no pueden ser la misma.';
            alertBox.classList.remove('hidden');
            return;
        }

        submit.disabled = true;
        submit.textContent = 'Convirtiendo…';
        
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
            alertBox.textContent = error instanceof TypeError
                ? 'Error de conexión con el servidor. Verificá que Flask esté ejecutándose.'
                : error.message;
            alertBox.classList.remove('hidden');
        } finally {
            submit.disabled = false;
            submit.textContent = 'Convertir número';
        }
    }

    // Mensaje personalizado de "Required" en español
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