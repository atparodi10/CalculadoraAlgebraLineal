// NAVBAR — Lineal Tanix
// Handles mobile hamburger toggle and scroll effects.
(function() {
    const navbarToggle = document.getElementById('navbar-toggle');
    const navbarMenu = document.getElementById('navbar-menu');
    const navbar = document.getElementById('main-navbar');

    // Mobile menu toggle
    navbarToggle.addEventListener('click', () => {
        navbarToggle.classList.toggle('active');
        navbarMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking a link
    navbarMenu.querySelectorAll('.navbar__link').forEach(link => {
        link.addEventListener('click', () => {
            navbarToggle.classList.remove('active');
            navbarMenu.classList.remove('active');
        });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navbar.contains(e.target)) {
            navbarToggle.classList.remove('active');
            navbarMenu.classList.remove('active');
        }
    });

    // Subtle shadow on scroll
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        if (scrollY > 20) {
            navbar.style.boxShadow = 'var(--shadow-md)';
        } else {
            navbar.style.boxShadow = 'var(--shadow-sm)';
        }
        lastScroll = scrollY;
    }, { passive: true });
})();
