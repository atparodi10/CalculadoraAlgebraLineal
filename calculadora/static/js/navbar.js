// BARRA DE NAVEGACIÓN — Lineal Tanix
// Controla el menú hamburguesa móvil, efectos de scroll y menús desplegables.
(function() {
    const navbarToggle = document.getElementById('navbar-toggle');
    const navbarMenu = document.getElementById('navbar-menu');
    const navbar = document.getElementById('main-navbar');

    // Alternancia del menú móvil
    navbarToggle.addEventListener('click', () => {
        navbarToggle.classList.toggle('active');
        navbarMenu.classList.toggle('active');
    });

    // Alternancia de desplegable (para móvil; en escritorio CSS :hover lo maneja)
    const dropdownBtns = navbar.querySelectorAll('.navbar__link--dropdown');
    dropdownBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const parent = btn.closest('.navbar__dropdown');
            // Cerrar otros desplegables
            navbar.querySelectorAll('.navbar__dropdown.active').forEach(dd => {
                if (dd !== parent) dd.classList.remove('active');
            });
            parent.classList.toggle('active');
        });
    });

    // Cerrar menú móvil al hacer clic en un enlace regular de navegación
    navbarMenu.querySelectorAll('.navbar__link:not(.navbar__link--dropdown)').forEach(link => {
        link.addEventListener('click', () => {
            navbarToggle.classList.remove('active');
            navbarMenu.classList.remove('active');
        });
    });

    // Cerrar menú móvil al hacer clic en un subenlace desplegable
    navbarMenu.querySelectorAll('.navbar__dropdown-link').forEach(link => {
        link.addEventListener('click', () => {
            navbarToggle.classList.remove('active');
            navbarMenu.classList.remove('active');
        });
    });

    // Cerrar menú móvil y desplegables al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!navbar.contains(e.target)) {
            navbarToggle.classList.remove('active');
            navbarMenu.classList.remove('active');
            navbar.querySelectorAll('.navbar__dropdown.active').forEach(dd => {
                dd.classList.remove('active');
            });
        }
    });

    // Sombra sutil al hacer scroll
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
