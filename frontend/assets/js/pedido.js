// ==========================================
// OBTENER PEDIDO
// ==========================================

function obtenerPedido() {

    return JSON.parse(
        localStorage.getItem("pedido")
    ) || [];

}


// ==========================================
// GUARDAR PEDIDO
// ==========================================

function guardarPedido(pedido) {

    localStorage.setItem(
        "pedido",
        JSON.stringify(pedido)
    );

}


// ==========================================
// ALERTA BOOTSTRAP
// ==========================================

function mostrarAlertaPedido(nombre) {

    // Busca el contenedor de alertas
    let contenedor =
        document.getElementById("alertas-pedido");


    // Si no existe, lo crea automáticamente
    if (!contenedor) {

        contenedor =
            document.createElement("div");

        contenedor.id =
            "alertas-pedido";

        contenedor.className =
            "position-fixed top-0 end-0 p-3";

        contenedor.style.zIndex =
            "9999";

        contenedor.style.width =
            "370px";

        contenedor.style.maxWidth =
            "100%";

        document.body.appendChild(
            contenedor
        );

    }


    // Crea una nueva alerta
    const alerta =
        document.createElement("div");


    alerta.className =
        "alert alert-success alert-dismissible fade show shadow";


    alerta.setAttribute(
        "role",
        "alert"
    );


    alerta.innerHTML = `

        <strong>
            ✓ Producto agregado
        </strong>

        <br>

        ${nombre} fue agregado al pedido.

        <button
            type="button"
            class="btn-close"
            data-bs-dismiss="alert"
            aria-label="Cerrar"
        >
        </button>

    `;


    // Agrega la alerta
    contenedor.appendChild(
        alerta
    );


    // Desaparece después de 3 segundos
    setTimeout(() => {

        alerta.classList.remove(
            "show"
        );


        setTimeout(() => {

            alerta.remove();

        }, 200);

    }, 3000);

}


// ==========================================
// AGREGAR PRODUCTO AL PEDIDO
// ==========================================

function agregarAlPedido(
    nombre,
    precio,
    imagen
) {

    const pedido =
        obtenerPedido();


    // Busca si el producto ya existe
    const productoExistente =
        pedido.find(

            producto =>
                producto.nombre === nombre

        );


    // Si existe aumenta la cantidad
    if (productoExistente) {

        productoExistente.cantidad++;

        // Si venía de antes sin foto, se la agregamos
        if (!productoExistente.imagen && imagen) {
            productoExistente.imagen = imagen;
        }

    }

    // Si no existe lo agrega
    else {

        pedido.push({

            nombre: nombre,

            precio: precio,

            imagen: imagen || "",

            cantidad: 1

        });

    }


    // Guarda los cambios
    guardarPedido(
        pedido
    );


    // Actualiza contador
    actualizarContadorPedido();


    // Muestra alerta
    mostrarAlertaPedido(
        nombre
    );

}


// ==========================================
// ELIMINAR PRODUCTO
// ==========================================

function eliminarProducto(indice) {

    const pedido =
        obtenerPedido();


    pedido.splice(
        indice,
        1
    );


    guardarPedido(
        pedido
    );


    mostrarPedido();


    actualizarContadorPedido();

}


// ==========================================
// CAMBIAR CANTIDAD
// ==========================================

function cambiarCantidad(
    indice,
    nuevaCantidad
) {

    const pedido =
        obtenerPedido();


    nuevaCantidad =
        Number(nuevaCantidad);


    // Si la cantidad llega a 0
    // elimina el producto

    if (nuevaCantidad <= 0) {

        pedido.splice(
            indice,
            1
        );

    }

    else {

        pedido[indice].cantidad =
            nuevaCantidad;

    }


    guardarPedido(
        pedido
    );


    mostrarPedido();


    actualizarContadorPedido();

}

 // ==========================================
// IMÁGENES DE LOS PRODUCTOS
// (se piden al backend: nombre -> archivo de imagen)
// ==========================================
let imagenesProductos = {};

async function cargarImagenesProductos() {
    try {
        const respuesta = await fetch("/api/productos");
        const lista = await respuesta.json();

        lista.forEach(function (p) {
            imagenesProductos[p.nombre] = p.imagen;
        });

        mostrarPedido(); // vuelve a dibujar, ahora con imágenes
    } catch (error) {
        // si el backend no responde, el pedido se ve igual, solo sin fotos
    }
}

// ==========================================
// MOSTRAR PRODUCTOS EN pedido.html
// ==========================================

function mostrarPedido() {

    /*
        Primero busca lista-pedido.

        También dejamos lista-carrito
        como respaldo por si tu pedido.html
        todavía conserva el ID antiguo.
    */

    const contenedor =
        document.getElementById(
            "lista-pedido"
        ) ||
        document.getElementById(
            "lista-carrito"
        );


    // Si estamos en index, cortes o parrillas
    // este contenedor no existe.
    // No pasa nada: termina la función.

    if (!contenedor) {

        return;

    }


    const pedido =
        obtenerPedido();


    const subtotalElemento =
        document.getElementById(
            "subtotal-pedido"
        ) ||
        document.getElementById(
            "subtotal-carrito"
        );


    const totalElemento =
        document.getElementById(
            "total-pedido"
        ) ||
        document.getElementById(
            "total-carrito"
        );


    // Limpia contenido anterior
    contenedor.innerHTML = "";


    let total = 0;


    // ======================================
    // PEDIDO VACÍO
    // ======================================

    if (pedido.length === 0) {

        contenedor.innerHTML = `

            <div
                class="alert alert-secondary text-center"
            >

                Tu pedido está vacío.

            </div>

        `;


        if (subtotalElemento) {

            subtotalElemento.textContent =
                "$0";

        }


        if (totalElemento) {

            totalElemento.textContent =
                "$0";

        }


        return;

    }


    // ======================================
    // MOSTRAR CADA PRODUCTO
    // ======================================

    pedido.forEach(

        (producto, indice) => {


            const subtotal =
                producto.precio *
                producto.cantidad;


            total += subtotal;
            const archivoImagen = producto.imagen || imagenesProductos[producto.nombre];

const imagenHtml = archivoImagen
    ? `<img
            class="pedido-img"
            src="./assets/imagenes_productos/${encodeURIComponent(archivoImagen)}"
            alt="${producto.nombre}"
       >`
    : "";


            contenedor.innerHTML += `

                <div class="card mb-3">

                    <div class="card-body">


                        <div
                            class="
                                d-flex
                                justify-content-between
                                align-items-start
                                gap-3
                            "
                        >


                            <div class="d-flex align-items-start gap-3">

                                ${imagenHtml}

                                <div>

                                <h4>
                                    ${producto.nombre}
                                </h4>


                                <p>

                                    Precio unitario:

                                    <strong>

                                        $${producto.precio.toLocaleString(
                                            "es-CL"
                                        )}

                                    </strong>

                                </p>

                            </div>

                            </div>


                            <button
                                class="
                                    btn
                                    btn-outline-danger
                                "

                                onclick="
                                    eliminarProducto(
                                        ${indice}
                                    )
                                "
                            >

                                Eliminar

                            </button>

                        </div>


                        <div
                            class="
                                d-flex
                                align-items-center
                                gap-3
                            "
                        >

                            <label>
                                Cantidad:
                            </label>


                            <input
                                type="number"

                                min="1"

                                value="${producto.cantidad}"

                                class="form-control"

                                style="width:90px;"

                                onchange="
                                    cambiarCantidad(
                                        ${indice},
                                        this.value
                                    )
                                "
                            >

                        </div>


                        <p class="mt-3">

                            Subtotal:

                            <strong
                                class="text-danger"
                            >

                                $${subtotal.toLocaleString(
                                    "es-CL"
                                )}

                            </strong>

                        </p>

                    </div>

                </div>

            `;

        }

    );


    // ======================================
    // MOSTRAR SUBTOTAL
    // ======================================

    if (subtotalElemento) {

        subtotalElemento.textContent =

            "$" +
            total.toLocaleString(
                "es-CL"
            );

    }


    // ======================================
    // MOSTRAR TOTAL
    // ======================================

    if (totalElemento) {

        totalElemento.textContent =

            "$" +
            total.toLocaleString(
                "es-CL"
            );

    }

}


// ==========================================
// CONTADOR DEL PEDIDO
// ==========================================

function actualizarContadorPedido() {

    const pedido =
        obtenerPedido();


    let cantidadTotal = 0;


    pedido.forEach(

        producto => {

            cantidadTotal +=
                producto.cantidad;

        }

    );


    const contador =
        document.getElementById(
            "contador-pedido"
        );


    if (contador) {

        contador.textContent =
            cantidadTotal;

    }

}


// ==========================================
// VACIAR PEDIDO COMPLETO
// ==========================================

function vaciarPedido() {

    localStorage.removeItem(
        "pedido"
    );


    mostrarPedido();


    actualizarContadorPedido();

}


// ==========================================
// HACER FUNCIONES ACCESIBLES DESDE HTML
// ==========================================

window.agregarAlPedido =
    agregarAlPedido;


window.eliminarProducto =
    eliminarProducto;


window.cambiarCantidad =
    cambiarCantidad;


window.vaciarPedido =
    vaciarPedido;


// ==========================================
// DATOS DE DESPACHO + CONFIRMAR PEDIDO
// (solo existe en pedido.html)
// ==========================================
function mostrarMensajeDespacho(texto, tipo) {
    const caja = document.getElementById("mensaje-despacho");
    if (!caja) return;
    caja.innerHTML = texto
        ? `<div class="alert alert-${tipo} mb-0"></div>`
        : "";
    if (texto) caja.firstChild.textContent = texto;
}

function precargarDatosUsuario() {
    const campo = document.getElementById("desp-nombre");
    const usuario = window.Auth && window.Auth.usuario();
    if (campo && usuario && !campo.value) {
        campo.value = usuario.nombre;
    }
}

// Flujo integrado: crear el pedido, procesar el pago y recién entonces confirmar.
// La aprobación se realiza mediante el servicio local configurado para esta versión.
const PAGO_PENDIENTE_KEY = "asador_pago_pendiente";
let pedidoPorPagar = null;
let operacionEnCurso = false;

function monedaPedido(monto) {
    return "$" + Number(monto).toLocaleString("es-CL");
}

function guardarPagoPendiente(pedido) {
    pedidoPorPagar = { id: Number(pedido.id), total: Number(pedido.total) };
    sessionStorage.setItem(PAGO_PENDIENTE_KEY, JSON.stringify({
        ...pedidoPorPagar,
        usuarioId: window.Auth.usuario()?.id ?? null
    }));
}

function limpiarPagoPendiente() {
    pedidoPorPagar = null;
    sessionStorage.removeItem(PAGO_PENDIENTE_KEY);
    const url = new URL(window.location.href);
    if (url.searchParams.has("pendiente")) {
        url.searchParams.delete("pendiente");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
}

function crearEstadoDeCompra(titulo, descripcion) {
    const contenedor = document.querySelector(".pedido-contenedor");
    if (!contenedor) return null;
    contenedor.replaceChildren();

    const card = document.createElement("section");
    card.className = "checkout-estado text-center";
    card.setAttribute("aria-live", "polite");
    const insignia = document.createElement("div");
    insignia.className = "checkout-insignia";
    insignia.setAttribute("aria-hidden", "true");
    insignia.textContent = "✓";
    const h = document.createElement("h1");
    h.className = "titulo-seccion mb-3";
    h.textContent = titulo;
    const p = document.createElement("p");
    p.className = "checkout-subtitulo";
    p.textContent = descripcion;
    const acciones = document.createElement("div");
    acciones.className = "checkout-acciones";
    card.append(insignia, h, p, acciones);
    contenedor.append(card);
    return {card, insignia, acciones};
}

function enlaceCheckout(texto, destino, clase) {
    const a = document.createElement("a");
    a.textContent = texto;
    a.href = destino;
    a.className = clase;
    return a;
}

function mostrarProcesandoPago() {
    const ui = crearEstadoDeCompra("Procesando tu pedido", "Estamos verificando el pago. No cierres esta página.");
    if (!ui) return;
    ui.insignia.textContent = "…";
    ui.insignia.classList.add("checkout-cargando");
}

function mostrarPagoPendiente(pedido, error = "") {
    guardarPagoPendiente(pedido);
    const ui = crearEstadoDeCompra("Finalizar pago", `Pedido N° ${pedido.id} · Total: ${monedaPedido(pedido.total)}`);
    if (!ui) return;
    ui.insignia.textContent = "$";
    if (error) {
        const alerta = document.createElement("div");
        alerta.className = "alert alert-warning text-start mt-3";
        alerta.setAttribute("role", "alert");
        alerta.textContent = error;
        ui.card.insertBefore(alerta, ui.acciones);
    }
    const pagar = document.createElement("button");
    pagar.type = "button";
    pagar.className = "btn btn-danger btn-lg";
    pagar.textContent = "Pagar";
    pagar.addEventListener("click", () => procesarPagoPendiente());
    ui.acciones.append(
        pagar,
        enlaceCheckout("Consultar mis pedidos", "mis-pedidos.html", "btn btn-outline-danger"),
        enlaceCheckout("Seguir comprando", "cortes.html", "btn btn-outline-light")
    );
}

function mostrarPedidoConfirmado(pedido) {
    const ui = crearEstadoDeCompra("¡Pedido recibido!", "Tu pedido se registró correctamente.");
    if (!ui) return;
    const numero = document.createElement("p");
    numero.className = "numero-pedido";
    numero.textContent = `Pedido N° ${pedido.id}`;
    const total = document.createElement("p");
    total.className = "total-confirmado";
    total.textContent = `Total: ${monedaPedido(pedido.total)}`;
    const estado = document.createElement("p");
    estado.className = "checkout-exito";
    estado.textContent = "Pago aprobado";
    const despacho = document.createElement("p");
    despacho.textContent = "Te contactaremos al teléfono que indicaste para coordinar el despacho.";
    ui.card.insertBefore(numero, ui.acciones);
    ui.card.insertBefore(total, ui.acciones);
    ui.card.insertBefore(estado, ui.acciones);
    ui.card.insertBefore(despacho, ui.acciones);
    ui.acciones.append(
        enlaceCheckout("Seguir comprando", "cortes.html", "btn btn-danger"),
        enlaceCheckout("Consultar mis pedidos", "mis-pedidos.html", "btn btn-outline-danger")
    );
}

async function procesarPagoPendiente() {
    if (operacionEnCurso || !pedidoPorPagar) return;
    if (!window.Auth.token()) {
        window.Auth.abrirLogin("Inicia sesión para continuar con el pago.", () => procesarPagoPendiente());
        return;
    }
    operacionEnCurso = true;
    const pendiente = { ...pedidoPorPagar };
    // Registramos la operación en la que ocurrió el error. Un 404 del sistema de
    // pagos NO equivale a que el pedido no exista: antes se mezclaban ambos casos.
    let etapa = "consultarPedido";
    mostrarProcesandoPago();
    try {
        // La consulta protege contra una repetición tras un timeout o recarga.
        const actual = await window.Auth.api("/pedidos/" + pendiente.id);
        if (actual.pagoEstado !== "aprobado") {
            etapa = "iniciarPago";
            await window.Auth.api("/pagos/iniciar/" + pendiente.id, {
                method: "POST", body: "{}"
            });
            etapa = "confirmarPago";
            const resultado = await window.Auth.api("/pagos/demo/" + pendiente.id + "/confirmar", {
                method: "POST", body: JSON.stringify({ estado: "aprobado" })
            });
            if (resultado.pagoEstado !== "aprobado") throw new Error("No se pudo aprobar el pago.");
        }
        etapa = "verificarPago";
        const verificado = await window.Auth.api("/pedidos/" + pendiente.id);
        if (verificado.pagoEstado !== "aprobado") {
            throw new Error("Aún no se confirmó el pago. Intenta nuevamente.");
        }
        limpiarPagoPendiente();
        mostrarPedidoConfirmado(verificado);
    } catch (error) {
        // Nunca borra el pedido: permite reintentar sin crear otro ni reservar más stock.
        console.warn("El Asador: no se pudo procesar el pago", {
            etapa, codigo: error.status || null, mensaje: error.message
        });
        let texto;
        if (error.status === 404 && etapa === "consultarPedido") {
            texto = "No encontramos este pedido con tu sesión actual. Consulta Mis pedidos o vuelve a iniciar sesión con la cuenta usada para comprar.";
        } else if (error.status === 404 && (etapa === "iniciarPago" || etapa === "confirmarPago")) {
            texto = "El servicio de pagos no está disponible en este momento. Revisa la configuración del servidor y vuelve a intentarlo.";
        } else if (error.status === 404 && etapa === "verificarPago") {
            texto = "No se pudo consultar el estado final del pago. Consulta Mis pedidos antes de volver a intentarlo.";
        } else {
            texto = "No pudimos completar el pago: " + error.message + ". Puedes reintentarlo sin crear otro pedido.";
        }
        mostrarPagoPendiente(pendiente, texto);
    } finally {
        operacionEnCurso = false;
    }
}

async function confirmarPedido(evento) {
    evento.preventDefault();
    if (operacionEnCurso) return;
    const form = evento.currentTarget;
    mostrarMensajeDespacho("");

    const carrito = obtenerPedido();
    if (!carrito.length) {
        mostrarMensajeDespacho("Tu pedido está vacío. Agrega productos para continuar.", "warning");
        return;
    }
    if (!form.checkValidity()) {
        form.classList.add("was-validated");
        mostrarMensajeDespacho("Completa los datos de despacho.", "warning");
        return;
    }
    if (!window.Auth.token()) {
        window.Auth.abrirLogin("Inicia sesión o crea una cuenta para continuar.", () => {
            precargarDatosUsuario();
            form.requestSubmit();
        });
        return;
    }

    operacionEnCurso = true;
    const boton = document.getElementById("btn-confirmar");
    boton.disabled = true;
    boton.textContent = "Procesando...";
    try {
        const nuevo = await window.Auth.api("/pedidos", {
            method: "POST",
            body: JSON.stringify({
                despacho: {
                    nombre: document.getElementById("desp-nombre").value,
                    direccion: document.getElementById("desp-direccion").value,
                    comuna: document.getElementById("desp-comuna").value,
                    telefono: document.getElementById("desp-telefono").value,
                    notas: document.getElementById("desp-notas").value
                },
                // El servidor calcula el precio oficial de cada artículo.
                items: carrito.map(p => ({ nombre: p.nombre, cantidad: p.cantidad }))
            })
        });
        // El pedido ya existe en el backend: no enviarlo por segunda vez.
        guardarPagoPendiente(nuevo);
        localStorage.removeItem("pedido");
        actualizarContadorPedido();
        operacionEnCurso = false;
        await procesarPagoPendiente();
    } catch (error) {
        if (pedidoPorPagar) {
            mostrarPagoPendiente(pedidoPorPagar, "No pudimos completar el pago. Vuelve a pulsar Pagar.");
        } else {
            mostrarMensajeDespacho(
                error.status && error.status < 500
                    ? error.message
                    : "No se pudo comprobar el resultado de la operación. Revisa Mis pedidos antes de volver a enviarla.",
                "danger"
            );
            // Evita crear involuntariamente otro pedido si hubo una respuesta incierta.
            if (error.status && error.status < 500) {
                boton.disabled = false;
                boton.textContent = "Pagar";
            }
        }
    } finally {
        operacionEnCurso = false;
    }
}

// El carrito y un pedido ya creado son procesos independientes.
// No debemos reemplazar una compra nueva con un pago pendiente guardado.
function mostrarAvisoDePagoAnterior() {
    const contenedor = document.querySelector(".pedido-contenedor");
    if (!contenedor || !window.Auth?.token()) return;
    let pendiente;
    try {
        pendiente = JSON.parse(sessionStorage.getItem(PAGO_PENDIENTE_KEY) || "null");
    } catch {
        return;
    }
    const usuarioId = window.Auth.usuario()?.id ?? null;
    if (!pendiente || pendiente.usuarioId !== usuarioId ||
        !Number.isSafeInteger(Number(pendiente.id)) || Number(pendiente.id) <= 0) return;
    if (document.getElementById("aviso-pago-anterior")) return;

    const aviso = document.createElement("div");
    aviso.id = "aviso-pago-anterior";
    aviso.className = "alert alert-secondary d-flex align-items-center justify-content-between gap-3 flex-wrap";
    const mensaje = document.createElement("span");
    mensaje.textContent = `También tienes un pedido anterior N° ${pendiente.id} por completar.`;
    const enlace = enlaceCheckout(
        "Retomar pedido anterior",
        `pedido.html?pendiente=${encodeURIComponent(pendiente.id)}`,
        "btn btn-outline-danger"
    );
    aviso.append(mensaje, enlace);
    const titulo = contenedor.querySelector("h1");
    if (titulo) titulo.insertAdjacentElement("afterend", aviso);
    else contenedor.prepend(aviso);
}

async function restaurarPagoPendiente() {
    const params = new URLSearchParams(window.location.search);
    const idSolicitado = params.get("pendiente");
    // Solo se reabre un pago al hacer clic explícitamente en "Pagar pedido"
    // desde el historial o en "Retomar pedido anterior". El enlace de la
    // cabecera siempre abre el carrito, aunque existan pedidos sin pagar.
    if (!idSolicitado) {
        mostrarAvisoDePagoAnterior();
        return;
    }
    const id = Number(idSolicitado);
    if (!Number.isSafeInteger(id) || id <= 0) {
        mostrarMensajeDespacho("Número de pedido inválido.", "warning");
        return;
    }
    if (!window.Auth.token()) {
        mostrarMensajeDespacho("Inicia sesión para continuar con el pago.", "warning");
        window.Auth.abrirLogin("Inicia sesión para continuar con el pago.", restaurarPagoPendiente);
        return;
    }
    try {
        const pedido = await window.Auth.api("/pedidos/" + id);
        if (pedido.pagoEstado === "aprobado") {
            limpiarPagoPendiente();
            mostrarPedidoConfirmado(pedido);
        } else if (pedido.estado !== "cancelado") {
            mostrarPagoPendiente(pedido);
        } else {
            limpiarPagoPendiente();
            mostrarMensajeDespacho("Este pedido fue cancelado.", "warning");
        }
    } catch (error) {
        // Conservamos la compra nueva y no descartamos una sesión ajena.
        mostrarMensajeDespacho(error.message, "danger");
    }
}

// ==========================================
// CUANDO TERMINA DE CARGAR LA PÁGINA
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    mostrarPedido();

    cargarImagenesProductos();

    actualizarContadorPedido();

    const formDespacho = document.getElementById("form-despacho");

    if (formDespacho) {
        formDespacho.addEventListener("submit", confirmarPedido);
        precargarDatosUsuario();
        document.addEventListener("auth:cambio", precargarDatosUsuario);
        restaurarPagoPendiente();
    }

});
