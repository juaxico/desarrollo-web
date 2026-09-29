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
// CUANDO TERMINA DE CARGAR LA PÁGINA
// ==========================================

document.addEventListener(

    "DOMContentLoaded",

    function () {

        mostrarPedido();


        actualizarContadorPedido();

    }

);