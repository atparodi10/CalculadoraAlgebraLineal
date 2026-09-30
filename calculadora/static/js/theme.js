// DARK MODE TOGGLE — Lineal Tanix
// Persists the user's theme preference in localStorage.
(function() {
    const toggle = document.getElementById('theme-toggle');
    const html = document.documentElement;

    // Apply saved preference or system default
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

        // Smooth animation on toggle button
        toggle.style.transform = 'rotate(360deg) scale(1.1)';
        setTimeout(() => {
            toggle.style.transform = '';
        }, 400);
    });
})();
