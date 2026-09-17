// INTERFAZ DE SISTEMAS DE ECUACIONES
// index.html carga este archivo mediante un <script> generado por url_for.
// DOMContentLoaded se dispara cuando el navegador ya construyó el DOM (los
// objetos que representan etiquetas HTML). Dentro se buscan los campos por id
// y se registran eventos: las funciones no se ejecutan continuamente.
//
// Este archivo no importa Python ni implementa Gauss. Su conexión es:
// btn-solve -> fetch('/calcular') -> Flask calcular() -> resolver elegido -> JSON
// -> renderResults(data) -> elementos visibles en #results.
// El callback exterior mantiene variables y funciones en su propio ámbito;
// los otros archivos JS tienen sus propios callbacks y no usan estas variables.
document.addEventListener('DOMContentLoaded', () => {
    // getElementById obtiene una referencia al elemento cuyo id aparece en HTML.
    // btnGenerate/btnSolve son botones; equationList contendrá campos creados por JS;
    // resultsSection y uiAlert son las zonas de resultado y mensajes.
    // Si se cambia un id en HTML también debe cambiar aquí para conservar la conexión.
    const btnGenerate = document.getElementById('btn-generate');
    const btnSolve = document.getElementById('btn-solve');
    const equationContainer = document.getElementById('equation-container');
    const equationList = document.getElementById('equation-list');
    const resultsSection = document.getElementById('results');
    const uiAlert = document.getElementById('ui-alert');

    // Estado local: m y n se actualizan al pulsar Generar Campos, no al editar cada
    // input. Si se cambian dimensiones hay que generar de nuevo antes de resolver.
    // const fija la referencia de una variable; let permite reasignar su valor.
    let m = 3, n = 3;

    // mostrarAlerta(mensaje,tipo='error') escribe texto y aplica el color con CSS.
    // textContent no interpreta el mensaje como HTML. className reemplaza las clases;
    // classList agrega/quita una sola. setTimeout oculta la alerta tras 7000 ms.
    // No bloquea la ejecución durante esos siete segundos ni abre una ventana emergente.
    // Límite actual: si llegan varias alertas seguidas, un temporizador anterior puede
    // ocultar una más reciente; no se cancela el temporizador previo.
    function mostrarAlerta(mensaje, tipo = 'error') {
        uiAlert.textContent = mensaje;
        uiAlert.className = `alert alert--${tipo}`;
        uiAlert.classList.remove('hidden');
        
        setTimeout(() => {
            uiAlert.classList.add('hidden');
        }, 7000);
    }

    // EVENTO Generar Campos: lee dimensiones, aplica dos controles y crea m inputs.
    // parseInt transforma el texto de los controles en enteros. La m elegida fija
    // cuántas ecuaciones se piden; n indica cuántas variables interpretará Python.
    // Límite actual: no se comprueba Number.isNaN ni que la entrada original sea un
    // entero exacto. Un campo vacío puede producir NaN; parseInt puede truncar decimales.
    btnGenerate.addEventListener('click', () => {
        m = parseInt(document.getElementById('input-m').value);
        n = parseInt(document.getElementById('input-n').value);
        
        // Control preventivo de tamaño: usa navigator.deviceMemory, si existe, o asume 4.
        // limiteCeldas = RAM estimada * 250. Es una heurística local, no una medida real de
        // memoria libre ni de capacidad del servidor. Cuenta m*n, sin incluir la columna b
        // ni las copias del historial. No garantiza que un cálculo grande sea eficiente.
        // No existe aquí un límite equivalente en el backend para peticiones manuales.
        const ramGB = navigator.deviceMemory || 4; 
        const celdasTotales = m * n;
        const limiteCeldas = ramGB * 250; 

        if (celdasTotales > limiteCeldas) {
            mostrarAlerta(`Tu dispositivo (${ramGB}GB RAM) no soporta procesar ${celdasTotales} celdas de forma óptima. Reduce el tamaño de la matriz.`, 'warning');
            return;
        }

        // Evita dimensiones cero o negativas. Los min='1' del HTML orientan al navegador,
        // pero estos botones no envían un formulario con validación nativa de dimensiones.
        // La condición m<=0 no detecta NaN: las validaciones cubren casos concretos.
        if (m <= 0 || n <= 0) {
            mostrarAlerta('Las dimensiones de la matriz deben ser mayores a 0.', 'error');
            return;
        }
        
        uiAlert.classList.add('hidden');
        // Vacía los campos anteriores y crea uno nuevo por ecuación. placeholder muestra
        // un ejemplo visual, no un valor real. appendChild incorpora cada input al DOM.
        // Al terminar se muestra la entrada y se oculta el resultado anterior.
        equationList.innerHTML = '';
        
        for (let i = 0; i < m; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'equation-input';
            input.placeholder = `Ecuación ${i + 1} (Ej: 2x1 - 3x2 + 4x3 = 5)`;
            equationList.appendChild(input);
        }

        equationContainer.classList.remove('hidden');
        resultsSection.classList.add('hidden');
    });

    // EVENTO Resolver Sistema: callback async porque espera una respuesta del servidor.
    // Recoge todas las .equation-input de este módulo: en esta versión, los campos
    // con esa clase también existen en otros módulos y querySelectorAll consulta
    // TODO el documento, no solo equationList. Límite actual importante: también lee
    // conversion-number, vectores y matrices aunque estén ocultos; pueden activar
    // camposVacios/faltaSignoIgual o añadir entradas ajenas. Se documenta sin corregir.
    // Una sección hidden sigue en el DOM y puede ser seleccionada con JavaScript.
    btnSolve.addEventListener('click', async () => {
        const metodo = document.getElementById('select-method').value;
        const ecuaciones = [];
        
        // Dos banderas resumen los errores encontrados: camposVacios tiene prioridad;
        // faltaSignoIgual solo se activa en campos no vacíos sin '='. trim elimina espacios
        // de los extremos. Estas comprobaciones no validan coeficientes ni variables.
        // forEach recorre elementos; push agrega el texto a la lista que se enviará.
        let camposVacios = false;
        let faltaSignoIgual = false;

        document.querySelectorAll('.equation-input').forEach(input => {
            const val = input.value.trim();
            
            if (val === '') {
                camposVacios = true;
            } else if (!val.includes('=')) {
                faltaSignoIgual = true;
            }
            
            ecuaciones.push(val);
        });

        // Validaciones específicas
        if (camposVacios) {
            mostrarAlerta('Datos nulos: Por favor, asegúrate de no dejar ninguna ecuación en blanco.', 'error');
            return;
        }

        if (faltaSignoIgual) {
            mostrarAlerta('Formato inválido: Toda ecuación debe contener el signo de igualdad "=" (Ej: 2x1 = 4).', 'error');
            return;
        }

        uiAlert.classList.add('hidden');

        // fetch hace una petición HTTP relativa al mismo servidor que entregó la página.
        // POST lleva datos en el cuerpo. Content-Type indica JSON; JSON.stringify convierte
        // {m,n,metodo,ecuaciones} a texto. await espera la respuesta sin bloquear la página.
        // response.json() interpreta el cuerpo: recibir respuesta HTTP y leer su contenido
        // son pasos distintos. Una respuesta HTTP de error no hace fallar fetch por sí sola.
        try {
            const response = await fetch('/calcular', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ m, n, metodo, ecuaciones })
            });
            
            const data = await response.json();
            
            // Solo se trata explícitamente HTTP 400. Otros códigos o cuerpos no JSON pueden
            // terminar en catch. El texto 'Error de conexión' también puede aparecer si falla
            // el parseo de JSON o el renderizado: no demuestra por sí solo una caída de red.
            // Este módulo no deshabilita el botón durante la petición ni descarta respuestas
            // antiguas como hace conversion.js; peticiones sucesivas pueden llegar en otro orden.
            if (response.status === 400) {
                mostrarAlerta(data.error, 'error');
                return;
            }
            
            renderResults(data);
        } catch (error) {
            mostrarAlerta('Error de conexión con el servidor. Verifica que Flask esté ejecutándose.', 'error');
        }
    });

    // renderResults(data) no recalcula el sistema. Borra el resultado anterior y dibuja:
    // 1. Cada matriz de data.pasos con su mensaje y número de paso, empezando en 0.
    // 2. La clasificación del sistema.
    // 3. Los textos algebraicos de pasos_ecuaciones, si existen.
    // 4. La comprobación por sustitución, solo si soluciones no está vacía.
    // No devuelve un resultado matemático; su efecto es modificar el DOM.
    function renderResults(data) {
        resultsSection.innerHTML = '';
        resultsSection.classList.remove('hidden');

        data.pasos.forEach((paso, index) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'results__step';
            
            let matrixHTML = '<div class="matrix">';
            paso.matriz.forEach(row => {
                matrixHTML += '<div class="matrix__row">';
                // La última celda de cada fila es b en la matriz aumentada; recibe la clase
                // matrix__cell--result, que CSS separa con una línea discontinua.
                // toFixed(2) convierte un número a texto de dos decimales SOLO para esta vista.
                // Puede mostrar 0.00 aunque internamente quede un valor pequeño no nulo.
                row.forEach((val, idx) => {
                    const cellClass = (idx === row.length - 1) ? 'matrix__cell matrix__cell--result' : 'matrix__cell';
                    matrixHTML += `<div class="${cellClass}">${val.toFixed(2)}</div>`;
                });
                matrixHTML += '</div>';
            });
            matrixHTML += '</div>';

            // innerHTML interpreta la cadena como etiquetas; permite construir filas y celdas.
            // Los valores provienen de números y mensajes del backend actual. Si en el futuro
            // se insertara texto libre del usuario, habría que escaparlo o usar textContent;
            // innerHTML no protege por sí mismo frente a etiquetas introducidas en el texto.
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
            // La elección de viñeta o subtítulo se basa en buscar 'Fila' o 'x' en el texto.
            // Es una regla de presentación simple, no un análisis de significado matemático.
            // Las soluciones aparecen en el desarrollo; este bloque final muestra comprobaciones.
            data.pasos_ecuaciones.forEach(line => {
                if(line.includes("Fila") || line.includes("x")) {
                    eqHTML += `<li style="font-family: monospace; font-size: 1.1rem; margin-bottom: 5px;">${line}</li>`;
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
            // v.valido viene calculado de Python. El operador ternario condición ? A : B
            // elige qué marca mostrar; JavaScript no vuelve a evaluar la ecuación aquí.
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
    }
});