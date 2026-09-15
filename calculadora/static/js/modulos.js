document.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('modulo-activo');
    const ecuaciones = document.getElementById('modulo-ecuaciones');
    const conversion = document.getElementById('modulo-conversion');
    const titulo = document.querySelector('.calculator__title');

    // Alterna los paneles sin recargar la página ni borrar entradas o resultados.
    function mostrarModulo() {
        const mostrarEcuaciones = selector.value === 'ecuaciones';
        ecuaciones.classList.toggle('hidden', !mostrarEcuaciones);
        conversion.classList.toggle('hidden', mostrarEcuaciones);
        titulo.textContent = mostrarEcuaciones
            ? 'Calculadora de Sistemas de Ecuaciones'
            : 'Conversión de Sistemas Numéricos';
    }

    selector.addEventListener('change', mostrarModulo);
    mostrarModulo();
});
