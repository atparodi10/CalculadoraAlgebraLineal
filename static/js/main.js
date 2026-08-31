document.addEventListener('DOMContentLoaded', () => {
    const btnGenerate = document.getElementById('btn-generate');
    const btnSolve = document.getElementById('btn-solve');
    const matrixContainer = document.getElementById('matrix-container');
    const matrixGrid = document.getElementById('matrix-grid');
    const resultsSection = document.getElementById('results');

    let m = 3, n = 3;

    btnGenerate.addEventListener('click', () => {
        m = parseInt(document.getElementById('input-m').value);
        n = parseInt(document.getElementById('input-n').value);
        
        matrixGrid.style.gridTemplateColumns = `repeat(${n}, 1fr) auto`;
        matrixGrid.innerHTML = '';

        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'matrix-cell matrix-cell--a';
                input.dataset.row = i;
                input.dataset.col = j;
                input.value = 0;
                matrixGrid.appendChild(input);
            }
            const inputB = document.createElement('input');
            inputB.type = 'number';
            inputB.className = 'matrix-cell matrix-cell--b';
            inputB.dataset.row = i;
            inputB.dataset.col = n;
            inputB.value = 0;
            matrixGrid.appendChild(inputB);
        }

        matrixContainer.classList.remove('hidden');
        resultsSection.classList.add('hidden');
    });

    btnSolve.addEventListener('click', async () => {
        const A = Array.from({length: m}, () => Array(n).fill(0));
        const b = Array(m).fill(0);

        document.querySelectorAll('.matrix-cell--a').forEach(input => {
            A[input.dataset.row][input.dataset.col] = parseFloat(input.value);
        });
        document.querySelectorAll('.matrix-cell--b').forEach(input => {
            b[input.dataset.row] = parseFloat(input.value);
        });

        const response = await fetch('/calcular', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ m, n, A, b })
        });
        
        const data = await response.json();
        renderResults(data);
    });

    function renderResults(data) {
        resultsSection.innerHTML = '';
        resultsSection.classList.remove('hidden');

        // Renderizar pasos
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

        // Clasificación
        const classDiv = document.createElement('div');
        classDiv.className = 'results__classification';
        classDiv.innerText = data.tipo_sistema;
        resultsSection.appendChild(classDiv);

        // Soluciones y Verificación
        if (data.soluciones.length > 0) {
            let solHTML = '<h3>Variables (x):</h3><ul>';
            data.soluciones.forEach((val, i) => solHTML += `<li>x${i+1} = ${val}</li>`);
            solHTML += '</ul><h3>Comprobación Automática:</h3><ul>';
            
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