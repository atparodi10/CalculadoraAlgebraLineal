// NAVBAR — Lineal Tanix
// Handles mobile hamburger toggle, scroll effects, and dropdown menus.
(function() {
    const navbarToggle = document.getElementById('navbar-toggle');
    const navbarMenu = document.getElementById('navbar-menu');
    const navbar = document.getElementById('main-navbar');

    // Mobile menu toggle
    navbarToggle.addEventListener('click', () => {
        navbarToggle.classList.toggle('active');
        navbarMenu.classList.toggle('active');
    });

    // Dropdown toggle (for mobile — on desktop, CSS :hover handles it)
    const dropdownBtns = navbar.querySelectorAll('.navbar__link--dropdown');
    dropdownBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const parent = btn.closest('.navbar__dropdown');
            // Close other dropdowns
            navbar.querySelectorAll('.navbar__dropdown.active').forEach(dd => {
                if (dd !== parent) dd.classList.remove('active');
            });
            parent.classList.toggle('active');
        });
    });

    // Close mobile menu when clicking a regular nav link
    navbarMenu.querySelectorAll('.navbar__link:not(.navbar__link--dropdown)').forEach(link => {
        link.addEventListener('click', () => {
            navbarToggle.classList.remove('active');
            navbarMenu.classList.remove('active');
        });
    });

    // Close mobile menu when clicking a dropdown sub-link
    navbarMenu.querySelectorAll('.navbar__dropdown-link').forEach(link => {
        link.addEventListener('click', () => {
            navbarToggle.classList.remove('active');
            navbarMenu.classList.remove('active');
        });
    });

    // Close mobile menu and dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!navbar.contains(e.target)) {
            navbarToggle.classList.remove('active');
            navbarMenu.classList.remove('active');
            navbar.querySelectorAll('.navbar__dropdown.active').forEach(dd => {
                dd.classList.remove('active');
            });
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
