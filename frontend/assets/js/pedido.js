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
    precio
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

    }

    // Si no existe lo agrega
    else {

        pedido.push({

            nombre: nombre,

            precio: precio,

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
            const archivoImagen = imagenesProductos[producto.nombre];

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

async function confirmarPedido(evento) {
    evento.preventDefault();

    const form = evento.target;
    mostrarMensajeDespacho("");

    const pedido = obtenerPedido();
    if (pedido.length === 0) {
        mostrarMensajeDespacho("Tu pedido está vacío. Agrega productos antes de confirmar.", "warning");
        return;
    }

    if (!form.checkValidity()) {
        form.classList.add("was-validated");
        mostrarMensajeDespacho("Completa los datos de despacho.", "warning");
        return;
    }

    // Para confirmar hay que tener sesión iniciada
    if (!window.Auth.token()) {
        window.Auth.abrirLogin(
            "Inicia sesión o crea una cuenta para confirmar tu pedido.",
            () => {
                precargarDatosUsuario();
                form.requestSubmit();
            }
        );
        return;
    }

    const boton = document.getElementById("btn-confirmar");
    boton.disabled = true;
    boton.textContent = "Enviando...";

    try {
        const respuesta = await window.Auth.api("/pedidos", {
            method: "POST",
            body: JSON.stringify({
                despacho: {
                    nombre: document.getElementById("desp-nombre").value,
                    direccion: document.getElementById("desp-direccion").value,
                    comuna: document.getElementById("desp-comuna").value,
                    telefono: document.getElementById("desp-telefono").value,
                    notas: document.getElementById("desp-notas").value
                },
                // solo mandamos nombre y cantidad: el precio lo calcula el servidor
                items: pedido.map(p => ({ nombre: p.nombre, cantidad: p.cantidad }))
            })
        });

        localStorage.removeItem("pedido");
        actualizarContadorPedido();
        mostrarPedidoConfirmado(respuesta);
    } catch (error) {
        mostrarMensajeDespacho(error.message, "danger");
        boton.disabled = false;
        boton.textContent = "Confirmar pedido";
    }
}

function mostrarPedidoConfirmado(respuesta) {
    const contenedor = document.querySelector(".pedido-contenedor");
    contenedor.innerHTML = `
        <div class="pedido-confirmado text-center">
            <h1 class="titulo-seccion">¡Pedido recibido!</h1>
            <p class="numero-pedido"></p>
            <p class="total-confirmado"></p>
            <p>Te contactaremos al teléfono que indicaste para coordinar el despacho.</p>
            <a href="cortes.html" class="btn btn-danger">Seguir comprando</a>
        </div>
    `;
    contenedor.querySelector(".numero-pedido").textContent = "Pedido N° " + respuesta.id;
    contenedor.querySelector(".total-confirmado").textContent =
        "Total: $" + respuesta.total.toLocaleString("es-CL");
}

// ==========================================
// CUANDO TERMINA DE CARGAR LA PÁGINA
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    mostrarPedido();

    actualizarContadorPedido();

    const formDespacho = document.getElementById("form-despacho");

    if (formDespacho) {
        formDespacho.addEventListener("submit", confirmarPedido);
        precargarDatosUsuario();
        document.addEventListener("auth:cambio", precargarDatosUsuario);
    }

});
