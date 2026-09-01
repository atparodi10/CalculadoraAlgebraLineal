document.addEventListener('DOMContentLoaded', () => {
    const btnGenerate = document.getElementById('btn-generate');
    const btnSolve = document.getElementById('btn-solve');
    const equationContainer = document.getElementById('equation-container');
    const equationList = document.getElementById('equation-list');
    const resultsSection = document.getElementById('results');

    let m = 3, n = 3;

    btnGenerate.addEventListener('click', () => {
        m = parseInt(document.getElementById('input-m').value);
        n = parseInt(document.getElementById('input-n').value);
        
        equationList.innerHTML = '';

        // Genera cajas de texto en lugar de la cuadrícula de matriz
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
        const ecuaciones = [];
        let formatoValido = true;

        document.querySelectorAll('.equation-input').forEach(input => {
            if (input.value.trim() === '') formatoValido = false;
            ecuaciones.push(input.value);
        });

        if (!formatoValido) {
            alert("Por favor, llena todos los campos de ecuaciones.");
            return;
        }

        const response = await fetch('/calcular', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ m, n, ecuaciones })
        });
        
        const data = await response.json();
        
        if (response.status === 400) {
            alert(data.error);
            return;
        }
        
        renderResults(data);
    });

    function renderResults(data) {
        resultsSection.innerHTML = '';
        resultsSection.classList.remove('hidden');

        // 1. Renderizar pasos de la eliminación por filas
        data.pasos.forEach((paso, index) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'results__step';
            
            let matrixText = paso.matriz.map(row => 
                row.map(val => val.toFixed(2).padStart(8, ' ')).join(' | ')
            ).join('\n');

            stepDiv.innerHTML = `
                <p><strong>Paso ${index}:</strong> ${paso.mensaje}</p>
                <div class="results__matrix">${matrixText}</div>
            `;
            resultsSection.appendChild(stepDiv);
        });

        // 2. Mostrar clasificación del sistema
        const classDiv = document.createElement('div');
        classDiv.className = 'results__classification';
        classDiv.innerText = data.tipo_sistema;
        resultsSection.appendChild(classDiv);

        // 3. Renderizar el proceso de sustitución de ecuaciones
        if (data.pasos_ecuaciones && data.pasos_ecuaciones.length > 0) {
            const eqDiv = document.createElement('div');
            eqDiv.className = 'results__step';
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

        // 4. Mostrar comprobación automática
        if (data.soluciones && data.soluciones.length > 0) {
            let solHTML = '<h3>Comprobación Automática:</h3><ul>';
            data.verificacion.forEach(v => {
                solHTML += `<li>Ecuación ${v.ecuacion}: ${v.calculado} = ${v.esperado} (${v.valido ? '✓ Correcto' : '✗ Error'})</li>`;
            });
            solHTML += '</ul>';
            
            const solDiv = document.createElement('div');
            solDiv.innerHTML = solHTML;
            resultsSection.appendChild(solDiv);
        }
    }
});