// Menú responsive compartido por las cuatro páginas.
(() => {
    const header = document.getElementById('headerPrincipal');
    const boton = header?.querySelector('.menu-toggle');
    const panel = header?.querySelector('.panel-navegacion');
    if (!header || !boton || !panel) return;

    function cerrarMenu() {
        panel.classList.remove('is-open');
        boton.setAttribute('aria-expanded', 'false');
        boton.setAttribute('aria-label', 'Abrir menú de navegación');
    }

    boton.addEventListener('click', () => {
        const abrir = !panel.classList.contains('is-open');
        panel.classList.toggle('is-open', abrir);
        boton.setAttribute('aria-expanded', String(abrir));
        boton.setAttribute('aria-label', abrir ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
    });

    panel.querySelectorAll('.menu-navegacion a').forEach(enlace => {
        enlace.addEventListener('click', cerrarMenu);
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && panel.classList.contains('is-open')) {
            cerrarMenu();
            boton.focus();
        }
    });
    document.addEventListener('click', e => {
        if (!header.contains(e.target)) cerrarMenu();
    });
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 992) cerrarMenu();
    });
})();
