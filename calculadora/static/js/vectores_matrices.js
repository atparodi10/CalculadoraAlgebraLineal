// INTERFAZ COMPARTIDA DE VECTORES Y MATRICES
// Tres responsabilidades: interpretar el texto, enviar la operación y presentar
// la respuesta. Los cálculos matemáticos se delegan a las rutas /api/vectores y
// /api/matrices. Ambos módulos comparten parsers y renderizado para evitar repetir
// la comunicación HTTP. Todo queda dentro del callback DOMContentLoaded.
//
// Formato en pantalla: componentes separadas por espacios o comas; una fila o
// vector generador por línea. Usar PUNTO para decimales: '1,5' se interpreta como
// dos componentes [1,5], no como el número 1.5. Esto difiere de conversión de bases.
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. UTILIDADES DE PARSEO 
    // parseVector(str) -> lista de números, [] si no hay componentes, o null si falla.
    // Es una función flecha guardada en una constante. split(/[, ]+/) separa por una
    // o más comas/espacios; filter elimina fragmentos vacíos; map(Number) convierte.
    // some(isNaN) pregunta si AL MENOS una conversión produjo NaN ('no es un número').
    // Ejemplo: '1, -2 3.5' -> [1,-2,3.5]; '1 hola' -> null.
    // Límites actuales: no exige números finitos ni un formato decimal estricto;
    // Number admite otras notaciones. El separador no incluye todos los caracteres
    // de espacio posibles. Un resultado Infinity no queda bloqueado por isNaN.
    const parseVector = (str) => {
        if (!str.trim()) return []; // Retorna arreglo vacío si no hay nada escrito
        const arr = str.split(/[, ]+/).filter(x => x.trim() !== '');
        const numeros = arr.map(Number);
        
        if (numeros.some(isNaN)) {
            return null; // Retorna null si detecta letras o caracteres raros
        }
        return numeros;
    };
    
    // parseMatrix(str) -> lista de filas numéricas, [] si está vacía, null si hay error.
    // Primero separa por saltos de línea y luego reutiliza parseVector para cada fila.
    // Omite filas vacías. Ejemplo: '1 2
    // 3 4' -> [[1,2],[3,4]].
    // NO comprueba rectangularidad: [[1,2],[3]] se envía y Python debe rechazarla.
    // También se usa para el conjunto de vectores, donde cada línea es un generador;
    // la transposición a columnas se hace después en verificar_combinacion_lineal.
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

    // 2. UTILIDADES DE UI
    // showMsg(idContainer,msg,type='error') busca #vec-alert o #mat-alert, escribe
    // texto seguro con textContent y asigna las clases de color. Oculta tras 7 segundos.
    // Es semejante a mostrarAlerta de main.js, pero recibe el id para servir a dos
    // módulos. No cancela temporizadores anteriores y no borra resultados anteriores.
    function showMsg(idContainer, msg, type = 'error') {
        const alertBox = document.getElementById(idContainer);
        alertBox.textContent = msg;
        alertBox.className = `alert alert--${type}`;
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 7000);
    }

    // renderMatrizHtml(matriz_2d) -> cadena HTML con filas/celdas y clases de style.css.
    // Los enteros se muestran sin decimales; los demás, con tres usando toFixed(3).
    // No modifica los números originales. Aquí no separa la última columna como b:
    // se usa tanto para matrices comunes como para los pasos de combinación lineal.
    // Su contrato presupone valores numéricos que puedan formatearse.
    function renderMatrizHtml(matriz_2d) {
        let html = '<div class="matrix">';
        matriz_2d.forEach(row => {
            html += '<div class="matrix__row">';
            row.forEach(val => {
                const numeroFormateado = Number.isInteger(val) ? val : val.toFixed(3);
                html += `<div class="matrix__cell">${numeroFormateado}</div>`;
            });
            html += '</div>';
        });
        html += '</div>';
        return html;
    }

    // 3. COMUNICACIÓN BACKEND
    // 3. COMUNICACIÓN BACKEND (Actualizada para renderizar matrices paso a paso)
    // fetchOperacion(url,data,alertId,resultId) centraliza la petición async.
    // url: ruta Flask; data: objeto con operacion y operandos; alertId: dónde avisar;
    // resultId: dónde dibujar. Envía POST con JSON y espera cuerpo JSON de respuesta.
    // Retorna una promesa, pero los callbacks de botones no la esperan: esta función
    // maneja internamente su try/catch y actualiza la interfaz cuando termina.
    async function fetchOperacion(url, data, alertId, resultId) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const json = await res.json();
            
            // res.ok verifica el estado HTTP. Si falla, muestra json.error y termina sin
            // limpiar el resultado anterior. Una respuesta sin JSON o un fallo de renderizado
            // también entra al catch con mensaje genérico de red.
            // Límite actual: no invalida resultados al editar datos, ni controla respuestas
            // fuera de orden, ni bloquea botones durante el cálculo.
            if (!res.ok) {
                showMsg(alertId, json.error || 'Error matemático detectado.', 'error');
                return; 
            }
            
            const resultsDiv = document.getElementById(resultId);
            resultsDiv.innerHTML = '';
            resultsDiv.classList.remove('hidden');

            // El renderizador acepta tres formas de respuesta:
            // - Vector básico: resultado y pasos_ecuaciones, sin pasos matriciales.
            // - Combinación lineal: mensaje, pasos y pasos_ecuaciones, sin resultado directo.
            // - Matrices: resultado, pasos y pasos_ecuaciones; la matriz final está en pasos.
            // Los if comprueban qué bloques existen, de modo que la misma función los dibuje.
            // 1. Mensaje principal de éxito o inconsistencia
            if (json.mensaje) {
                const msgDiv = document.createElement('div');
                msgDiv.className = 'results__classification';
                msgDiv.textContent = json.mensaje;
                resultsDiv.appendChild(msgDiv);
            }

            // 2. RENDERIZADO DE MATRICES PASO A PASO (Gauss-Jordan en Combinación Lineal)
            // Cada paso usa {mensaje,matriz}. forEach recorre el historial; el índice empieza
            // en cero. Si existe una matriz, renderMatrizHtml construye su representación.
            // Los textos se insertan con innerHTML aquí y en el desarrollo algebraico. El
            // backend actual genera esos textos desde datos numéricos; si se incorporara texto
            // libre, habría que escaparlo o construir nodos con textContent.
            if (json.pasos && json.pasos.length > 0) {
                json.pasos.forEach((paso, index) => {
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'results__step';
                    
                    let contenidoHtml = `<p style="text-align:left;"><strong>Paso ${index}:</strong> ${paso.mensaje}</p>`;
                    
                    // Si el paso incluye una matriz, la dibujamos con corchetes
                    if (paso.matriz) {
                        contenidoHtml += renderMatrizHtml(paso.matriz);
                    }
                    
                    stepDiv.innerHTML = contenidoHtml;
                    resultsDiv.appendChild(stepDiv);
                });
            }

            // 3. RENDERIZADO DEL DESGLOSE ALGEBRAICO Y ECUACIONES
           // Renderizado de las ecuaciones algebraicas de transformación
            if (json.pasos_ecuaciones && json.pasos_ecuaciones.length > 0) {
                const eqDiv = document.createElement('div');
                eqDiv.className = 'results__step';
                eqDiv.style.textAlign = 'left';
                let eqHTML = '<h3 style="color:var(--primary-color)">Ecuaciones de Transformación:</h3><ul style="text-align:left">';
                
                json.pasos_ecuaciones.forEach(line => {
                    eqHTML += `<li style="font-family: monospace; font-size: 1.1rem; margin-bottom: 5px;">${line}</li>`;
                });
                eqHTML += '</ul>';
                eqDiv.innerHTML = eqHTML;
                resultsDiv.appendChild(eqDiv);
            }
            
            // 4. Resultado directo para operaciones básicas de vectores
            // El resultado directo se dibuja solo si no hay propiedad pasos. Para un vector,
            // [resultado] lo envuelve en una fila y reutiliza el dibujo matricial. Array.isArray
            // permite distinguir una matriz ya bidimensional de una lista de coordenadas.
            // Una propiedad pasos:[] es verdadera en JavaScript: ese caso no mostraría este
            // bloque. Las rutas actuales omiten pasos en operaciones básicas de vectores.
            if (json.resultado && !json.pasos) {
                const stepDiv = document.createElement('div');
                stepDiv.className = 'results__step';
                stepDiv.innerHTML = `<h3 style="color:var(--primary-color)">Resultado Final:</h3>`;
                const mat = Array.isArray(json.resultado[0]) ? json.resultado : [json.resultado];
                stepDiv.innerHTML += renderMatrizHtml(mat);
                resultsDiv.appendChild(stepDiv);
            }

        } catch (error) {
            showMsg(alertId, 'Error de red: No se pudo contactar al servidor Flask.', 'error');
        }
    }
    // MENSAJES ESTÁNDARES
    // Mensajes comunes: distinguen campo vacío de texto que no se pudo convertir.
    // El mensaje de matriz menciona filas completas, pero parseMatrix no comprueba
    // que tengan igual tamaño; la validación dimensional corresponde al backend.
    const MSG_VACIO = "Datos nulos: Por favor, no dejes campos obligatorios en blanco.";
    const MSG_FORMATO_VEC = "Formato inválido: Los vectores solo admiten números separados por espacios o comas.";
    const MSG_FORMATO_MAT = "Formato inválido: Las matrices solo deben contener números (sin letras). Revisa que las filas estén completas.";

    // 4. EVENTOS DE VECTORES
    // EVENTO: Suma de vectores.
    // Lee vec-u y vec-v. Primero rechaza operandos vacíos; luego
    // rechaza null/NaN del parseo. Si pasa, envía operacion=suma, u, v.
    // fetchOperacion selecciona la zona de alerta y resultados del módulo. Cada
    // return anticipado evita enviar una petición que ya se sabe inválida.
    document.getElementById('btn-vec-suma').addEventListener('click', () => {
        const u = parseVector(document.getElementById('vec-u').value);
        const v = parseVector(document.getElementById('vec-v').value);
        
        // && tiene prioridad sobre ||: se interpreta (u && u.length===0) o
        // (v && v.length===0). La comprobación u/v evita leer .length de null.
        // [] y null significan errores distintos: ausencia de componentes y formato inválido.
        // La igualdad de dimensiones se revisa en Python, no en esta condición.
        if (u && u.length === 0 || v && v.length === 0) return showMsg('vec-alert', MSG_VACIO);
        if (u === null || v === null) return showMsg('vec-alert', MSG_FORMATO_VEC);
        fetchOperacion('/api/vectores', { operacion: 'suma', u, v }, 'vec-alert', 'vec-results');
    });

    // EVENTO: Resta de vectores.
    // Lee vec-u y vec-v. Primero rechaza operandos vacíos; luego
    // rechaza null/NaN del parseo. Si pasa, envía operacion=resta, u, v.
    // fetchOperacion selecciona la zona de alerta y resultados del módulo. Cada
    // return anticipado evita enviar una petición que ya se sabe inválida.
    document.getElementById('btn-vec-resta').addEventListener('click', () => {
        const u = parseVector(document.getElementById('vec-u').value);
        const v = parseVector(document.getElementById('vec-v').value);
        
        if (u && u.length === 0 || v && v.length === 0) return showMsg('vec-alert', MSG_VACIO);
        if (u === null || v === null) return showMsg('vec-alert', MSG_FORMATO_VEC);
        fetchOperacion('/api/vectores', { operacion: 'resta', u, v }, 'vec-alert', 'vec-results');
    });

    // EVENTO: Multiplicación escalar de vector.
    // Lee vec-u y vec-c; vec-v no es obligatorio. Primero rechaza operandos vacíos; luego
    // rechaza null/NaN del parseo. Si pasa, envía operacion=escalar, u, c.
    // fetchOperacion selecciona la zona de alerta y resultados del módulo. Cada
    // return anticipado evita enviar una petición que ya se sabe inválida.
    document.getElementById('btn-vec-mult').addEventListener('click', () => {
        const u = parseVector(document.getElementById('vec-u').value);
        const cText = document.getElementById('vec-c').value.trim();
        // parseFloat convierte el escalar a número. cText==='' se revisa aparte porque
        // un campo vacío no significa escalar cero; cero sí es una entrada válida.
        // Límite actual: parseFloat no exige consumir todo el texto y isNaN no comprueba
        // finitud. El control type=number ayuda en la interfaz, sin sustituir al backend.
        const c = parseFloat(cText);
        
        if ((u && u.length === 0) || cText === '') return showMsg('vec-alert', MSG_VACIO);
        if (u === null || isNaN(c)) return showMsg('vec-alert', MSG_FORMATO_VEC);
        fetchOperacion('/api/vectores', { operacion: 'escalar', u, c }, 'vec-alert', 'vec-results');
    });

    // EVENTO: Combinación lineal.
    // Lee vec-conjunto y vec-b. Primero rechaza operandos vacíos; luego
    // rechaza null/NaN del parseo. Si pasa, envía operacion=combinacion, vectores_v, vector_b.
    // fetchOperacion selecciona la zona de alerta y resultados del módulo. Cada
    // return anticipado evita enviar una petición que ya se sabe inválida.
    document.getElementById('btn-vec-comb').addEventListener('click', () => {
        const vectores_v = parseMatrix(document.getElementById('vec-conjunto').value);
        const vector_b = parseVector(document.getElementById('vec-b').value);
        
        if (vectores_v && vectores_v.length === 0 || vector_b && vector_b.length === 0) return showMsg('vec-alert', MSG_VACIO);
        if (vectores_v === null || vector_b === null) return showMsg('vec-alert', MSG_FORMATO_VEC);
        fetchOperacion('/api/vectores', { operacion: 'combinacion', vectores_v, vector_b }, 'vec-alert', 'vec-results');
    });

    // 5. EVENTOS DE MATRICES
    // EVENTO: Suma de matrices.
    // Lee mat-a y mat-b. Primero rechaza operandos vacíos; luego
    // rechaza null/NaN del parseo. Si pasa, envía operacion=suma, A, B.
    // fetchOperacion selecciona la zona de alerta y resultados del módulo. Cada
    // return anticipado evita enviar una petición que ya se sabe inválida.
    document.getElementById('btn-mat-suma').addEventListener('click', () => {
        const A = parseMatrix(document.getElementById('mat-a').value);
        const B = parseMatrix(document.getElementById('mat-b').value);
        
        if (A && A.length === 0 || B && B.length === 0) return showMsg('mat-alert', MSG_VACIO);
        if (A === null || B === null) return showMsg('mat-alert', MSG_FORMATO_MAT);
        fetchOperacion('/api/matrices', { operacion: 'suma', A, B }, 'mat-alert', 'mat-results');
    });

    // EVENTO: Producto matricial.
    // Lee mat-a y mat-b. Primero rechaza operandos vacíos; luego
    // rechaza null/NaN del parseo. Si pasa, envía operacion=multiplicacion, A, B.
    // fetchOperacion selecciona la zona de alerta y resultados del módulo. Cada
    // return anticipado evita enviar una petición que ya se sabe inválida.
    document.getElementById('btn-mat-mult').addEventListener('click', () => {
        const A = parseMatrix(document.getElementById('mat-a').value);
        const B = parseMatrix(document.getElementById('mat-b').value);
        
        if (A && A.length === 0 || B && B.length === 0) return showMsg('mat-alert', MSG_VACIO);
        if (A === null || B === null) return showMsg('mat-alert', MSG_FORMATO_MAT);
        fetchOperacion('/api/matrices', { operacion: 'multiplicacion', A, B }, 'mat-alert', 'mat-results');
    });

    // EVENTO: Multiplicación escalar de matriz.
    // Lee mat-a y mat-c; mat-b no es obligatorio. Primero rechaza operandos vacíos; luego
    // rechaza null/NaN del parseo. Si pasa, envía operacion=escalar, A, c.
    // fetchOperacion selecciona la zona de alerta y resultados del módulo. Cada
    // return anticipado evita enviar una petición que ya se sabe inválida.
    document.getElementById('btn-mat-escalar').addEventListener('click', () => {
        const A = parseMatrix(document.getElementById('mat-a').value);
        const cText = document.getElementById('mat-c').value.trim();
        const c = parseFloat(cText);
        
        if ((A && A.length === 0) || cText === '') return showMsg('mat-alert', MSG_VACIO);
        if (A === null || isNaN(c)) return showMsg('mat-alert', MSG_FORMATO_MAT);
        fetchOperacion('/api/matrices', { operacion: 'escalar', A, c }, 'mat-alert', 'mat-results');
    });
});