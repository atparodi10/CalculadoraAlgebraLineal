document.addEventListener('DOMContentLoaded', () => {
    
    // 1. UTILIDADES DE PARSEO 
    const parseVector = (str) => {
        if (!str.trim()) return []; // Retorna arreglo vacío si no hay nada escrito
        const arr = str.split(/[, ]+/).filter(x => x.trim() !== '');
        const numeros = arr.map(Number);
        
        if (numeros.some(isNaN)) {
            return null; // Retorna null si detecta letras o caracteres raros
        }
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
        return matriz;
    };

    // 2. UTILIDADES DE UI
    function showMsg(idContainer, msg, type = 'error') {
        const alertBox = document.getElementById(idContainer);
        alertBox.textContent = msg;
        alertBox.className = `alert alert--${type}`;
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 7000);
    }

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
    async function fetchOperacion(url, data, alertId, resultId) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const json = await res.json();
            
            if (!res.ok) {
                showMsg(alertId, json.error || 'Error matemático detectado.', 'error');
                return; 
            }
            
            const resultsDiv = document.getElementById(resultId);
            resultsDiv.innerHTML = '';
            resultsDiv.classList.remove('hidden');

            // 1. Mensaje principal de éxito o inconsistencia
            if (json.mensaje) {
                const msgDiv = document.createElement('div');
                msgDiv.className = 'results__classification';
                msgDiv.textContent = json.mensaje;
                resultsDiv.appendChild(msgDiv);
            }

            // 2. RENDERIZADO DE MATRICES PASO A PASO (Gauss-Jordan en Combinación Lineal)
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
    const MSG_VACIO = "Datos nulos: Por favor, no dejes campos obligatorios en blanco.";
    const MSG_FORMATO_VEC = "Formato inválido: Los vectores solo admiten números separados por espacios o comas.";
    const MSG_FORMATO_MAT = "Formato inválido: Las matrices solo deben contener números (sin letras). Revisa que las filas estén completas.";

    // 4. EVENTOS DE VECTORES
    document.getElementById('btn-vec-suma').addEventListener('click', () => {
        const u = parseVector(document.getElementById('vec-u').value);
        const v = parseVector(document.getElementById('vec-v').value);
        
        if (u && u.length === 0 || v && v.length === 0) return showMsg('vec-alert', MSG_VACIO);
        if (u === null || v === null) return showMsg('vec-alert', MSG_FORMATO_VEC);
        fetchOperacion('/api/vectores', { operacion: 'suma', u, v }, 'vec-alert', 'vec-results');
    });

    document.getElementById('btn-vec-resta').addEventListener('click', () => {
        const u = parseVector(document.getElementById('vec-u').value);
        const v = parseVector(document.getElementById('vec-v').value);
        
        if (u && u.length === 0 || v && v.length === 0) return showMsg('vec-alert', MSG_VACIO);
        if (u === null || v === null) return showMsg('vec-alert', MSG_FORMATO_VEC);
        fetchOperacion('/api/vectores', { operacion: 'resta', u, v }, 'vec-alert', 'vec-results');
    });

    document.getElementById('btn-vec-mult').addEventListener('click', () => {
        const u = parseVector(document.getElementById('vec-u').value);
        const cText = document.getElementById('vec-c').value.trim();
        const c = parseFloat(cText);
        
        if ((u && u.length === 0) || cText === '') return showMsg('vec-alert', MSG_VACIO);
        if (u === null || isNaN(c)) return showMsg('vec-alert', MSG_FORMATO_VEC);
        fetchOperacion('/api/vectores', { operacion: 'escalar', u, c }, 'vec-alert', 'vec-results');
    });

    document.getElementById('btn-vec-comb').addEventListener('click', () => {
        const vectores_v = parseMatrix(document.getElementById('vec-conjunto').value);
        const vector_b = parseVector(document.getElementById('vec-b').value);
        
        if (vectores_v && vectores_v.length === 0 || vector_b && vector_b.length === 0) return showMsg('vec-alert', MSG_VACIO);
        if (vectores_v === null || vector_b === null) return showMsg('vec-alert', MSG_FORMATO_VEC);
        fetchOperacion('/api/vectores', { operacion: 'combinacion', vectores_v, vector_b }, 'vec-alert', 'vec-results');
    });

    // 5. EVENTOS DE MATRICES
    document.getElementById('btn-mat-suma').addEventListener('click', () => {
        const A = parseMatrix(document.getElementById('mat-a').value);
        const B = parseMatrix(document.getElementById('mat-b').value);
        
        if (A && A.length === 0 || B && B.length === 0) return showMsg('mat-alert', MSG_VACIO);
        if (A === null || B === null) return showMsg('mat-alert', MSG_FORMATO_MAT);
        fetchOperacion('/api/matrices', { operacion: 'suma', A, B }, 'mat-alert', 'mat-results');
    });

    document.getElementById('btn-mat-mult').addEventListener('click', () => {
        const A = parseMatrix(document.getElementById('mat-a').value);
        const B = parseMatrix(document.getElementById('mat-b').value);
        
        if (A && A.length === 0 || B && B.length === 0) return showMsg('mat-alert', MSG_VACIO);
        if (A === null || B === null) return showMsg('mat-alert', MSG_FORMATO_MAT);
        fetchOperacion('/api/matrices', { operacion: 'multiplicacion', A, B }, 'mat-alert', 'mat-results');
    });

    document.getElementById('btn-mat-escalar').addEventListener('click', () => {
        const A = parseMatrix(document.getElementById('mat-a').value);
        const cText = document.getElementById('mat-c').value.trim();
        const c = parseFloat(cText);
        
        if ((A && A.length === 0) || cText === '') return showMsg('mat-alert', MSG_VACIO);
        if (A === null || isNaN(c)) return showMsg('mat-alert', MSG_FORMATO_MAT);
        fetchOperacion('/api/matrices', { operacion: 'escalar', A, c }, 'mat-alert', 'mat-results');
    });
});