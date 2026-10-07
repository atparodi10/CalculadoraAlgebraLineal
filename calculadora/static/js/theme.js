// ALTERNANCIA DE TEMA CLARO/OSCURO — Lineal Tanix
// Persiste la preferencia de tema del usuario en localStorage.
(function() {
    const toggle = document.getElementById('theme-toggle');
    const html = document.documentElement;

    // Aplicar la preferencia guardada o el valor predeterminado del sistema
    const saved = localStorage.getItem('lineal-tanix-theme');
    if (saved) {
        html.setAttribute('data-theme', saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.setAttribute('data-theme', 'dark');
    }

    toggle.addEventListener('click', () => {
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('lineal-tanix-theme', next);

        // Animación suave del botón de alternancia
        toggle.style.transform = 'rotate(360deg) scale(1.1)';
        setTimeout(() => {
            toggle.style.transform = '';
        }, 400);
    });
})();
