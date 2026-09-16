document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('conversion-form');
    const mode = document.getElementById('conversion-mode');
    const base = document.getElementById('conversion-base');
    const number = document.getElementById('conversion-number');
    const baseLabel = document.getElementById('conversion-base-label');
    const numberLabel = document.getElementById('conversion-number-label');
    const alert = document.getElementById('conversion-alert');
    const results = document.getElementById('conversion-results');
    const submit = document.getElementById('conversion-submit');
    const names = { 2: 'binario', 8: 'octal', 10: 'decimal', 16: 'hexadecimal' };
    let revision = 0;

    // Descarta resultados anteriores cuando cambia el número o su interpretación.
    function invalidarResultado() {
        revision += 1;
        alert.classList.add('hidden');
        results.classList.add('hidden');
        results.replaceChildren();
    }

    // El sentido seleccionado fija una base en 10 y deja elegir la otra.
    function actualizarSeleccion() {
        const desdeDecimal = mode.value === 'desde_decimal';
        const decimalOption = base.querySelector('option[value="10"]');
        decimalOption.hidden = desdeDecimal;
        decimalOption.disabled = desdeDecimal;
        if (desdeDecimal && base.value === '10') base.value = '2';
        baseLabel.textContent = desdeDecimal ? 'Base de destino:' : 'Base de origen:';
        const origen = desdeDecimal ? 10 : Number(base.value);
        numberLabel.textContent = `Número ${names[origen]}:`;
        const examples = { 2: 'Ej.: 11001 o 11001.1', 8: 'Ej.: 31 o 31.4',
            10: 'Ej.: 25 o 25.5', 16: 'Ej.: 19 o 19.8' };
        number.placeholder = examples[origen];
        invalidarResultado();
    }

    // Usa texto para mostrar números y operaciones sin interpretar entradas como HTML.
    function mostrarResultado(data) {
        results.replaceChildren();
        const summary = document.createElement('div');
        summary.className = 'results__classification';
        summary.style.overflowWrap = 'anywhere';
        const relation = data.aproximado ? '≈' : '=';
        summary.textContent = `${data.numero} (base ${data.base_origen}) ${relation} ${data.resultado} (base ${data.base_destino})`;
        results.appendChild(summary);
        if (data.aviso) {
            const note = document.createElement('p');
            note.textContent = data.aviso;
            results.appendChild(note);
        }
        data.pasos.forEach(paso => {
            const box = document.createElement('div');
            box.className = 'results__step';
            box.style.textAlign = 'left';
            const title = document.createElement('h3');
            title.textContent = paso.titulo;
            box.appendChild(title);
            paso.lineas.forEach(linea => {
                const paragraph = document.createElement('p');
                paragraph.textContent = linea;
                box.appendChild(paragraph);
            });
            results.appendChild(box);
        });
        results.classList.remove('hidden');
    }

    // Envía el número como texto para conservar todos sus dígitos y su base.
    async function convertir(event) {
        event.preventDefault();
        invalidarResultado();
        const currentRevision = revision;
        const desdeDecimal = mode.value === 'desde_decimal';
        submit.disabled = true;
        submit.textContent = 'Convirtiendo…';
        try {
            const response = await fetch('/convertir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ numero: number.value,
                    base_origen: desdeDecimal ? 10 : Number(base.value),
                    base_destino: desdeDecimal ? Number(base.value) : 10 }),
            });
            const data = await response.json();
            if (currentRevision !== revision) return;
            if (!response.ok) throw new Error(data.error || 'No se pudo completar la conversión.');
            mostrarResultado(data);
        } catch (error) {
            if (currentRevision !== revision) return;
            alert.textContent = error instanceof TypeError
                ? 'Error de conexión con el servidor. Verificá que Flask esté ejecutándose.'
                : error.message;
            alert.classList.remove('hidden');
        } finally {
            submit.disabled = false;
            submit.textContent = 'Convertir número';
        }
    }

    // ==========================================
    // NUEVO: FORZAR MENSAJE DE REQUIRED EN ESPAÑOL
    // ==========================================
    number.addEventListener('invalid', (event) => {
        if (event.target.validity.valueMissing) {
            event.target.setCustomValidity('Por favor, ingresa un número para realizar la conversión.');
        }
    });

    number.addEventListener('input', (event) => {
        // Limpiamos el error nativo en cuanto el usuario empiece a escribir
        event.target.setCustomValidity(''); 
        invalidarResultado();
    });
    // ==========================================

    mode.addEventListener('change', actualizarSeleccion);
    base.addEventListener('change', actualizarSeleccion);
    form.addEventListener('submit', convertir);
    actualizarSeleccion();
});