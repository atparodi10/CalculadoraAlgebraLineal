document.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('modulo-activo');
    const ecuaciones = document.getElementById('modulo-ecuaciones');
    const conversion = document.getElementById('modulo-conversion');
    const vectores = document.getElementById('modulo-vectores');
    const matrices = document.getElementById('modulo-matrices');
    const titulo = document.querySelector('.calculator__title');

    function mostrarModulo() {
        const val = selector.value;
        
        // Ocultar todos
        ecuaciones.classList.add('hidden');
        conversion.classList.add('hidden');
        vectores.classList.add('hidden');
        matrices.classList.add('hidden');

        // Mostrar el seleccionado y actualizar título
        if (val === 'ecuaciones') {
            ecuaciones.classList.remove('hidden');
            titulo.textContent = 'Calculadora de Sistemas de Ecuaciones';
        } else if (val === 'conversion') {
            conversion.classList.remove('hidden');
            titulo.textContent = 'Conversión de Sistemas Numéricos';
        } else if (val === 'vectores') {
            vectores.classList.remove('hidden');
            titulo.textContent = 'Operaciones con Vectores y Combinación Lineal';
        } else if (val === 'matrices') {
            matrices.classList.remove('hidden');
            titulo.textContent = 'Operaciones Matriciales Básicas';
        }
    }

    selector.addEventListener('change', mostrarModulo);
    mostrarModulo();
});
