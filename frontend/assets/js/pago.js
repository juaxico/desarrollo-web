// Compatibilidad con enlaces antiguos: el pago se realiza en la pantalla Pedido.
(() => {
    const id = new URLSearchParams(window.location.search).get('pedido');
    const destino = new URL('pedido.html', window.location.href);
    if (/^[1-9]\d*$/.test(id || '')) destino.searchParams.set('pendiente', id);
    window.location.replace(destino.href);
})();
