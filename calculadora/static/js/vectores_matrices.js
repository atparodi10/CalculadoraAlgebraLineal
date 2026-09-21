document.addEventListener('DOMContentLoaded', () => {
    
    // 1. UTILIDADES DE PARSEO Y PROTECCIÓN DE MEMORIA
    const parseVector = (str) => {
        if (!str.trim()) return [];
        const arr = str.split(/[, ]+/).filter(x => x.trim() !== '');
        const numeros = arr.map(Number);
        if (numeros.some(isNaN)) return null; 
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

    const validarMemoria = (celdasTotales) => {
        const ramGB = navigator.deviceMemory || 4; 
        const limiteCeldas = ramGB * 250; 
        if (celdasTotales > limiteCeldas) {
            return `Límite excedido: Tu dispositivo (${ramGB}GB RAM) no soporta el procesamiento de ${celdasTotales} celdas simultáneas.`;
        }
        return null;
    };

    // 2. UTILIDADES DE INTERFAZ GRÁFICA
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

    // 3. COMUNICACIÓN BACKEND (Renderizado paso a paso pulido)
    async function fetchOperacion(url, data, alertId, resultId) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const json = await res.json();
            
            if (!res.ok) {
                showMsg(alertId, json.error || 'Error matemático detectado por el motor de cálculo.', 'error');
                return; 
            }
            
            const resultsDiv = document.getElementById(resultId);
            resultsDiv.innerHTML = '';
            resultsDiv.classList.remove('hidden');

            if (json.mensaje) {
                const msgDiv = document.createElement('div');
                msgDiv.className = 'results__classification';
                msgDiv.textContent = json.mensaje;
                resultsDiv.appendChild(msgDiv);
            }

            if (json.pasos && json.pasos.length > 0) {
                json.pasos.forEach((paso, index) => {
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'results__step';
                    let contenidoHtml = `<p style="text-align:left; color: var(--primary-color); font-weight: bold;">Paso ${index}: ${paso.mensaje}</p>`;
                    if (paso.matriz) contenidoHtml += renderMatrizHtml(paso.matriz);
                    stepDiv.innerHTML = contenidoHtml;
                    resultsDiv.appendChild(stepDiv);
                });
            }

            if (json.pasos_ecuaciones && json.pasos_ecuaciones.length > 0) {
                const eqDiv = document.createElement('div');
                eqDiv.className = 'results__step';
                eqDiv.style.textAlign = 'left';
                let eqHTML = '<h3 style="color:var(--primary-color); margin-bottom: 10px;">Desglose Algebraico:</h3><ul style="background: #f8f9fa; padding: 15px; border-radius: 8px;">';
                
                json.pasos_ecuaciones.forEach(line => {
                    if (line.includes("Fila") || line.includes("x") || line.includes("C[") || line.includes("Sistema") || line.includes("Componente")) {
                        eqHTML += `<li style="font-family: monospace; font-size: 1.05rem; margin-bottom: 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px;">${line}</li>`;
                    } else {
                        eqHTML += `<p><strong>${line}</strong></p>`;
                    }
                });
                eqHTML += '</ul>';
                eqDiv.innerHTML = eqHTML;
                resultsDiv.appendChild(eqDiv);
            }
            
            if (json.resultado && !json.pasos) {
                const stepDiv = document.createElement('div');
                stepDiv.className = 'results__step';
                stepDiv.innerHTML = `<h3 style="color:var(--primary-color)">Resultado Final:</h3>`;
                const mat = Array.isArray(json.resultado[0]) ? json.resultado : [json.resultado];
                stepDiv.innerHTML += renderMatrizHtml(mat);
                resultsDiv.appendChild(stepDiv);
            }
        } catch (error) {
            showMsg(alertId, 'Fallo de Red: No se estableció conexión con el servidor Flask.', 'error');
        }
    }

    // 4. CONTROLADORES DE EVENTOS Y VALIDACIÓN DE DIMENSIÓN EN VECTORES
    const procesarVectores = (operacion) => {
        // Captura la dimensión especificada por el usuario
        const dimStr = document.getElementById('vec-dim') ? document.getElementById('vec-dim').value : '';
        const n = parseInt(dimStr);
        
        const u = parseVector(document.getElementById('vec-u').value);
        const v = parseVector(document.getElementById('vec-v').value);
        
        if (isNaN(n) || n <= 0) return showMsg('vec-alert', "Especifique una dimensión geométrica válida (n > 0).");
        if (u === null || v === null) return showMsg('vec-alert', "Formato inválido: Ingrese únicamente números en los vectores.");
        if (u.length === 0 || v.length === 0) return showMsg('vec-alert', "Datos incompletos.");
        
        // Validación de memoria (estimando 2 vectores de n componentes)
        const errorMemoria = validarMemoria(n * 2); 
        if (errorMemoria) return showMsg('vec-alert', errorMemoria);

        fetchOperacion('/api/vectores', { operacion, u, v, n }, 'vec-alert', 'vec-results');
    };

    document.getElementById('btn-vec-suma').addEventListener('click', () => procesarVectores('suma'));
    document.getElementById('btn-vec-resta').addEventListener('click', () => procesarVectores('resta'));
    
    document.getElementById('btn-vec-mult').addEventListener('click', () => {
        const dimStr = document.getElementById('vec-dim') ? document.getElementById('vec-dim').value : '';
        const n = parseInt(dimStr);
        const u = parseVector(document.getElementById('vec-u').value);
        const c = parseFloat(document.getElementById('vec-c').value.trim());

        if (isNaN(n) || n <= 0) return showMsg('vec-alert', "Especifique una dimensión válida (n > 0).");
        if (u === null || isNaN(c)) return showMsg('vec-alert', "Formato numérico inválido.");
        
        const errorMemoria = validarMemoria(n); 
        if (errorMemoria) return showMsg('vec-alert', errorMemoria);

        fetchOperacion('/api/vectores', { operacion: 'escalar', u, c, n }, 'vec-alert', 'vec-results');
    });

    document.getElementById('btn-vec-comb').addEventListener('click', () => {
        const vectores_v = parseMatrix(document.getElementById('vec-conjunto').value);
        const vector_b = parseVector(document.getElementById('vec-b').value);
        
        if (vectores_v === null || vector_b === null) return showMsg('vec-alert', "Formato inválido detectado.");
        if (vectores_v.length === 0 || vector_b.length === 0) return showMsg('vec-alert', "Conjunto de vectores vacío.");
        
        // Validación de carga de memoria basada en filas * columnas del sistema
        const errorMemoria = validarMemoria(vectores_v.length * vector_b.length);
        if (errorMemoria) return showMsg('vec-alert', errorMemoria);

        fetchOperacion('/api/vectores', { operacion: 'combinacion', vectores_v, vector_b }, 'vec-alert', 'vec-results');
    });

    // 5. CONTROLADORES DE EVENTOS EN MATRICES
    const procesarMatrices = (operacion) => {
        const A = parseMatrix(document.getElementById('mat-a').value);
        const B = parseMatrix(document.getElementById('mat-b').value);
        
        if (A === null || B === null) return showMsg('mat-alert', "Error de formato: Matrices irregulares o no numéricas.");
        if (A.length === 0 || B.length === 0) return showMsg('mat-alert', "Datos incompletos.");

        const celdasA = A.length * A[0].length;
        const celdasB = B.length * B[0].length;
        
        // Protección contra sobrecarga de RAM en matrices inmensas
        const errorMemoria = validarMemoria(celdasA + celdasB);
        if (errorMemoria) return showMsg('mat-alert', errorMemoria);

        fetchOperacion('/api/matrices', { operacion, A, B }, 'mat-alert', 'mat-results');
    };

    document.getElementById('btn-mat-suma').addEventListener('click', () => procesarMatrices('suma'));
    
    // Botón de Resta en Matrices
    const btnMatResta = document.getElementById('btn-mat-resta');
    if(btnMatResta) btnMatResta.addEventListener('click', () => procesarMatrices('resta'));
    
    document.getElementById('btn-mat-mult').addEventListener('click', () => procesarMatrices('multiplicacion'));

    document.getElementById('btn-mat-escalar').addEventListener('click', () => {
        const A = parseMatrix(document.getElementById('mat-a').value);
        const c = parseFloat(document.getElementById('mat-c').value.trim());
        
        if (A === null || isNaN(c)) return showMsg('mat-alert', "Error de formato.");
        if (A.length === 0) return showMsg('mat-alert', "Datos incompletos.");

        const errorMemoria = validarMemoria(A.length * A[0].length);
        if (errorMemoria) return showMsg('mat-alert', errorMemoria);

        fetchOperacion('/api/matrices', { operacion: 'escalar', A, c }, 'mat-alert', 'mat-results');
    });
});