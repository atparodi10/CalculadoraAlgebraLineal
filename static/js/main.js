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
            body: JSON.stringify({ m, n, metodo, ecuaciones })
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

        // Renderizado visual de matrices con BEM
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