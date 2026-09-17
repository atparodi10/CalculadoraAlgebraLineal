// INTERFAZ DE CONVERSIÓN DE BASES
// Se enlaza con los ids conversion-* de index.html y con POST /convertir.
// DOMContentLoaded prepara referencias y eventos cuando los elementos ya existen.
// El callback crea un ámbito propio: convertir() aquí es JS y no es la función
// Python homónima. Los datos cruzan esa frontera mediante fetch y JSON.
document.addEventListener('DOMContentLoaded', () => {
    // form recibe submit; mode selecciona el sentido de conversión; base selecciona
    // la base variable; number conserva el texto tal como se escribió. Las etiquetas
    // y placeholder cambian según el origen. names es un mapa número->nombre legible.
    // La constante alert es el elemento de mensajes, no la función window.alert().
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
    // revision es un contador de cambios del formulario. Cada petición recuerda una
    // copia de él; si el usuario modifica la entrada mientras espera, la respuesta
    // vieja se descarta. No cancela el trabajo del servidor: impide mostrarlo como
    // si correspondiera a la nueva entrada.
    let revision = 0;

    // Descarta resultados anteriores cuando cambia el número o su interpretación.
    // invalidarResultado() aumenta revision, oculta error y resultado, y elimina sus
    // nodos hijos. No borra el número escrito. Se invoca al escribir, cambiar bases
    // y justo antes de enviar; así un resultado previo no parece seguir vigente.
    function invalidarResultado() {
        revision += 1;
        alert.classList.add('hidden');
        results.classList.add('hidden');
        results.replaceChildren();
    }

    // El sentido seleccionado fija una base en 10 y deja elegir la otra.
    // actualizarSeleccion() adapta la interfaz al sentido actual.
    // Desde decimal: origen fijo 10 y destino 2/8/16; deshabilita/oculta la opción 10.
    // Hacia decimal: destino fijo 10 y origen seleccionable; vuelve a permitir 10.
    // Number(base.value) pasa de texto del select a número para construir el JSON.
    // Finalmente invalida los resultados porque cambió la interpretación del número.
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
    // mostrarResultado(data) recibe el contrato de convertir_numero en Python.
    // Dibuja equivalencia, aviso opcional y cajas de pasos {titulo,lineas}.
    // Usa createElement y textContent para que una cadena sea texto y no etiquetas.
    // replaceChildren vacía el contenedor; appendChild incorpora cada bloque.
    // No retorna datos: produce el efecto visible sobre #conversion-results.
    function mostrarResultado(data) {
        results.replaceChildren();
        const summary = document.createElement('div');
        summary.className = 'results__classification';
        summary.style.overflowWrap = 'anywhere';
        // La relación depende de aproximado: '≈' si se truncó, '=' si es exacto.
        // Una expansión periódica con paréntesis representa un valor exacto y usa '='.
        // overflowWrap='anywhere' permite partir números largos para contener el ancho.
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
    // convertir(event) es el manejador async del submit del formulario.
    // preventDefault evita la navegación/recarga normal del formulario para resolver
    // la acción con fetch. Conserva el número como string: Number(number.value)
    // perdería precisión o no entendería correctamente una representación hexadecimal.
    // Deshabilita el botón para evitar nuevos clics mientras la petición está pendiente.
    async function convertir(event) {
        event.preventDefault();
        invalidarResultado();
        const currentRevision = revision;
        const desdeDecimal = mode.value === 'desde_decimal';
        submit.disabled = true;
        submit.textContent = 'Convirtiendo…';
        try {
            // Petición: {numero, base_origen, base_destino}; las bases se derivan del modo.
            // Flask valida el contenido, calcula y responde. response.ok comprueba que el
            // código HTTP sea de éxito; si no, se lanza Error con el mensaje de la API.
            // El control de currentRevision evita pintar respuestas para una entrada ya cambiada.
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
        // catch muestra errores conocidos y distingue TypeError como posible problema
        // de conexión. finally se ejecuta incluso tras error o return dentro del try:
        // restaura el botón y su etiqueta. El formulario vuelve a estar disponible.
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
    // EVENTO invalid: la validación nativa de required ocurre antes de submit.
    // Si falta el valor, setCustomValidity reemplaza el texto por un aviso en español.
    // No valida dígitos binarios/hexadecimales: esa tarea está en Python.
    // maxlength limita caracteres en el HTML; el backend cuenta hasta 64 dígitos.
    number.addEventListener('invalid', (event) => {
        if (event.target.validity.valueMissing) {
            event.target.setCustomValidity('Por favor, ingresa un número para realizar la conversión.');
        }
    });

    // EVENTO input: elimina el error personalizado al escribir; si no se limpiara,
    // el navegador podría seguir bloqueando el formulario aunque el campo tenga valor.
    // También invalida el resultado anterior. Los eventos change de los selects hacen
    // lo mismo mediante actualizarSeleccion; submit dispara convertir.
    // La llamada final a actualizarSeleccion prepara etiquetas sin esperar un cambio.
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