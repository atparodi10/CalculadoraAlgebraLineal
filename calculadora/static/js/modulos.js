// NAVEGACIÓN ENTRE LOS CUATRO MÓDULOS
// Los módulos son secciones de una misma página, no páginas ni ventanas distintas.
// Este archivo solo controla visibilidad y título; no envía peticiones HTTP,
// no calcula y no elimina campos ni resultados de las secciones ocultas.
document.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('modulo-activo');
    const ecuaciones = document.getElementById('modulo-ecuaciones');
    const conversion = document.getElementById('modulo-conversion');
    const vectores = document.getElementById('modulo-vectores');
    const matrices = document.getElementById('modulo-matrices');
    const titulo = document.querySelector('.calculator__title');

    // mostrarModulo() lee el value del selector #modulo-activo, añade hidden a todas
    // las secciones y luego lo quita de la elegida. CSS define hidden como display:none.
    // También cambia el texto del h1 para que coincida con la herramienta seleccionada.
    // Los values ecuaciones/conversion/vectores/matrices deben coincidir con HTML.
    // Si apareciera un value no contemplado, todas quedarían ocultas.
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

    // change ejecuta la función al elegir otra opción. La llamada inmediata establece
    // el estado inicial. Ocultar no equivale a desactivar ni a sacar elementos del DOM:
    // otros selectores de JavaScript todavía pueden encontrarlos.
    selector.addEventListener('change', mostrarModulo);
    mostrarModulo();
});
