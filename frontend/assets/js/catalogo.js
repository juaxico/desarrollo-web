// ==========================================
// CATÁLOGO DINÁMICO
// Pide los productos al servicio (/api/productos) y arma
// las tarjetas con la API del DOM. Maneja 4 estados:
// cargando, error (con reintento), vacío y datos.
//
// Cada página lo configura con atributos en <div id="catalogo">:
//   data-categorias="vacuno,pollo"     -> categorías que muestra (con filtros)
//   data-nombres="Parrillada,Filete"   -> productos puntuales (sin filtros)
//   data-descripcion="false"           -> oculta la descripción de la tarjeta
//
// Para mostrar los estados en la defensa, agrega a la URL:
//   ?simular=lento   (tarda 2 segundos en cargar)
//   ?simular=error   (falla el servicio)
//   ?simular=vacio   (el servicio responde sin productos)
// ==========================================

(function () {

    const CARPETA_IMAGENES = "./assets/imagenes_productos/";

    const ETIQUETAS = {
        vacuno: "Vacuno",
        parrillada: "Parrilladas",
        pollo: "Pollo",
        pavo: "Pavo",
        cerdo: "Cerdo",
        parrilla: "Parrillas"
    };

    const ORDEN_CATEGORIAS = Object.keys(ETIQUETAS);


    // ---------- utilidades ----------

    // Crea un elemento con clases y texto (textContent: nunca interpreta HTML)
    function crear(etiqueta, clases, texto) {
        const nodo = document.createElement(etiqueta);
        if (clases) nodo.className = clases;
        if (texto !== undefined) nodo.textContent = texto;
        return nodo;
    }

    function esperar(ms) {
        return new Promise(function (resolver) {
            setTimeout(resolver, ms);
        });
    }

    function formatearPrecio(precio) {
        return "$" + Number(precio).toLocaleString("es-CL");
    }


    // ---------- servicio ----------

    async function pedirProductos() {

        const simular = new URLSearchParams(window.location.search).get("simular");

        if (simular === "lento") await esperar(2000);
        if (simular === "error") throw new Error("Falla simulada del servicio.");
        if (simular === "vacio") return [];

        const control = new AbortController();
        const temporizador = setTimeout(function () {
            control.abort();
        }, 8000);

        try {

            const respuesta = await fetch("/api/productos", { signal: control.signal });

            if (!respuesta.ok) {
                throw new Error("El servidor respondió con un error (" + respuesta.status + ").");
            }

            const datos = await respuesta.json();

            if (!Array.isArray(datos)) {
                throw new Error("El servidor respondió con un formato inesperado.");
            }

            return datos;

        } finally {
            clearTimeout(temporizador);
        }
    }

    function mensajeDeError(error) {
        if (error.name === "AbortError") {
            return "El servidor tardó demasiado en responder.";
        }
        if (error instanceof TypeError) {
            return "No pudimos conectar con el servidor.";
        }
        return error.message;
    }


    // ---------- vistas ----------

    function vistaCargando() {
        const caja = crear("div", "catalogo-estado");
        caja.setAttribute("role", "status");

        const rueda = crear("div", "spinner-border text-danger");
        rueda.setAttribute("aria-hidden", "true");

        caja.append(rueda, crear("p", "", "Cargando productos..."));
        return caja;
    }

    function vistaError(mensaje, alReintentar) {
        const caja = crear("div", "catalogo-estado catalogo-estado--error");
        caja.setAttribute("role", "alert");

        const boton = crear("button", "btn btn-danger", "Reintentar");
        boton.type = "button";
        boton.addEventListener("click", alReintentar);

        caja.append(
            crear("p", "", "No pudimos cargar los productos."),
            crear("p", "small", mensaje),
            boton
        );
        return caja;
    }

    function vistaVacia(mensaje) {
        const caja = crear("div", "catalogo-estado");
        caja.append(crear("p", "", mensaje));
        return caja;
    }

    function crearTarjeta(producto, conDescripcion) {

        const columna = crear("div", "col");
        const tarjeta = crear("article", "card-producto card-producto--grid h-100");

        const imagen = crear("img");
        imagen.src = CARPETA_IMAGENES + encodeURIComponent(producto.imagen || "");
        imagen.alt = producto.nombre;
        imagen.loading = "lazy";
        imagen.addEventListener("error", function () {
            imagen.classList.add("sin-imagen");
        });

        tarjeta.append(imagen, crear("h3", "", producto.nombre));

        if (conDescripcion && producto.descripcion) {
            tarjeta.append(crear("p", "descripcion-producto", producto.descripcion));
        }

        tarjeta.append(crear("p", "precio-producto", formatearPrecio(producto.precio)));

        const boton = crear("button", "btn btn-danger", "Agregar al pedido");
        boton.type = "button";
        boton.addEventListener("click", function () {
            agregarAlPedido(producto.nombre, producto.precio, producto.imagen);
        });
        tarjeta.append(boton);

        columna.append(tarjeta);
        return columna;
    }

    function vistaGrilla(productos, conDescripcion) {
        // Grid de Bootstrap: 1 columna en móvil, 2 en tablet, 3 y 4 en escritorio.
        // justify-content-center centra la última fila cuando no se completa.
        const fila = crear("div", "row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-4 justify-content-center");
        productos.forEach(function (p) {
            fila.append(crearTarjeta(p, conDescripcion));
        });
        return fila;
    }


    // ---------- catálogo ----------

    function iniciar() {

        const contenedor = document.getElementById("catalogo");
        if (!contenedor) return;

        const categoriasPermitidas = (contenedor.dataset.categorias || "")
            .split(",").map(function (c) { return c.trim(); }).filter(Boolean);

        const nombresPermitidos = (contenedor.dataset.nombres || "")
            .split(",").map(function (n) { return n.trim(); }).filter(Boolean);

        const conDescripcion = contenedor.dataset.descripcion !== "false";

        const barra = crear("div", "catalogo-filtros");
        barra.setAttribute("role", "group");
        barra.setAttribute("aria-label", "Filtrar por categoría");

        const contador = crear("p", "catalogo-contador");
        contador.setAttribute("aria-live", "polite");

        const zona = crear("div", "catalogo-zona");
        zona.setAttribute("aria-live", "polite");

        contenedor.replaceChildren(barra, contador, zona);

        let productos = [];
        let filtroActual = "todas";


        function mostrarProductos() {

            const visibles = filtroActual === "todas"
                ? productos
                : productos.filter(function (p) { return p.categoria === filtroActual; });

            if (visibles.length === 0) {
                contador.textContent = "";
                zona.replaceChildren(vistaVacia("No hay productos en esta categoría por ahora."));
                return;
            }

            contador.textContent = visibles.length === 1
                ? "1 producto"
                : visibles.length + " productos";

            zona.replaceChildren(vistaGrilla(visibles, conDescripcion));
        }


        function pintarFiltros() {

            barra.replaceChildren();

            const categorias = categoriasPresentes(productos);

            // Con una sola categoría (o productos puntuales) los filtros no aportan
            if (nombresPermitidos.length > 0 || categorias.length < 2) return;

            [["todas", "Todas"]].concat(categorias.map(function (c) {
                return [c, ETIQUETAS[c] || c];
            })).forEach(function (par) {

                const boton = crear("button", "btn btn-outline-danger", par[1]);
                boton.type = "button";
                boton.dataset.filtro = par[0];
                boton.setAttribute("aria-pressed", String(par[0] === filtroActual));

                if (par[0] === filtroActual) boton.classList.add("active");

                boton.addEventListener("click", function () {
                    filtroActual = par[0];

                    barra.querySelectorAll("button").forEach(function (b) {
                        const activo = b.dataset.filtro === filtroActual;
                        b.classList.toggle("active", activo);
                        b.setAttribute("aria-pressed", String(activo));
                    });

                    mostrarProductos();
                });

                barra.append(boton);
            });
        }


        function categoriasPresentes(lista) {
            const presentes = new Set(lista.map(function (p) { return p.categoria; }));
            const conocidas = ORDEN_CATEGORIAS.filter(function (c) { return presentes.has(c); });
            const nuevas = Array.from(presentes).filter(function (c) {
                return !ORDEN_CATEGORIAS.includes(c);
            });
            return conocidas.concat(nuevas);
        }


        function ordenar(lista) {
            // Productos puntuales: en el orden en que se pidieron.
            if (nombresPermitidos.length > 0) {
                return nombresPermitidos
                    .map(function (n) { return lista.find(function (p) { return p.nombre === n; }); })
                    .filter(Boolean);
            }
            // Categorías: por categoría y luego por precio.
            const orden = categoriasPresentes(lista);
            return lista.slice().sort(function (a, b) {
                return (orden.indexOf(a.categoria) - orden.indexOf(b.categoria)) || (a.precio - b.precio);
            });
        }


        async function cargar() {

            barra.replaceChildren();
            contador.textContent = "";
            zona.replaceChildren(vistaCargando());

            try {

                let lista = await pedirProductos();

                if (nombresPermitidos.length > 0) {
                    lista = lista.filter(function (p) { return nombresPermitidos.includes(p.nombre); });
                } else if (categoriasPermitidas.length > 0) {
                    lista = lista.filter(function (p) { return categoriasPermitidas.includes(p.categoria); });
                }

                productos = ordenar(lista);
                filtroActual = "todas";

                if (productos.length === 0) {
                    zona.replaceChildren(vistaVacia("Aún no hay productos disponibles."));
                    return;
                }

                pintarFiltros();
                mostrarProductos();

            } catch (error) {
                zona.replaceChildren(vistaError(mensajeDeError(error), cargar));
            }
        }

        cargar();
    }


    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar);
    } else {
        iniciar();
    }

})();
