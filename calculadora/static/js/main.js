document.addEventListener('DOMContentLoaded', () => {
    const btnGenerate = document.getElementById('btn-generate');
    const btnSolve = document.getElementById('btn-solve');
    const equationContainer = document.getElementById('equation-container');
    const equationList = document.getElementById('equation-list');
    const resultsSection = document.getElementById('results');
    const uiAlert = document.getElementById('ui-alert');

    let m = 3, n = 3;

    function mostrarAlerta(mensaje, tipo = 'error') {
        uiAlert.textContent = mensaje;
        uiAlert.className = `alert alert--${tipo}`;
        uiAlert.classList.remove('hidden');
        
        setTimeout(() => {
            uiAlert.classList.add('hidden');
        }, 7000);
    }

    btnGenerate.addEventListener('click', () => {
        m = parseInt(document.getElementById('input-m').value);
        n = parseInt(document.getElementById('input-n').value);
        
        const ramGB = navigator.deviceMemory || 4; 
        const celdasTotales = m * n;
        const limiteCeldas = ramGB * 250; 

        if (celdasTotales > limiteCeldas) {
            mostrarAlerta(`Tu dispositivo (${ramGB}GB RAM) no soporta procesar ${celdasTotales} celdas de forma óptima. Reduce el tamaño de la matriz.`, 'warning');
            return;
        }

        if (m <= 0 || n <= 0) {
            mostrarAlerta('Las dimensiones de la matriz deben ser mayores a 0.', 'error');
            return;
        }
        
        uiAlert.classList.add('hidden');
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

    btnSolve.addEventListener('click', async () => {
        const metodo = document.getElementById('select-method').value;
        const ecuaciones = [];
        
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

        try {
            const response = await fetch('/calcular', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ m, n, metodo, ecuaciones })
            });
            
            const data = await response.json();
            
            if (response.status === 400) {
                mostrarAlerta(data.error, 'error');
                return;
            }
            
            renderResults(data);
        } catch (error) {
            mostrarAlerta('Error de conexión con el servidor. Verifica que Flask esté ejecutándose.', 'error');
        }
    });

    function renderResults(data) {
        resultsSection.innerHTML = '';
        resultsSection.classList.remove('hidden');

        data.pasos.forEach((paso, index) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'results__step';
            
            let matrixHTML = '<div class="matrix">';
            paso.matriz.forEach(row => {
                matrixHTML += '<div class="matrix__row">';
                row.forEach((val, idx) => {
                    const cellClass = (idx === row.length - 1) ? 'matrix__cell matrix__cell--result' : 'matrix__cell';
                    matrixHTML += `<div class="${cellClass}">${val.toFixed(2)}</div>`;
                });
                matrixHTML += '</div>';
            });
            matrixHTML += '</div>';

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