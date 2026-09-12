// ==========================================
// OBTENER CARRITO
// ==========================================

function obtenerCarrito() {

    return JSON.parse(
        localStorage.getItem("carrito")
    ) || [];

}


// ==========================================
// GUARDAR CARRITO
// ==========================================

function guardarCarrito(carrito) {

    localStorage.setItem(
        "carrito",
        JSON.stringify(carrito)
    );

}


// ==========================================
// ALERTA BOOTSTRAP
// ==========================================

function mostrarAlertaCarrito(nombre) {

    // Busca el contenedor de alertas
    let contenedor =
        document.getElementById("alertas-carrito");


    // Si no existe, lo crea automáticamente
    if (!contenedor) {

        contenedor =
            document.createElement("div");

        contenedor.id =
            "alertas-carrito";

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

        ${nombre} fue agregado al carrito.

        <button
            type="button"
            class="btn-close"
            data-bs-dismiss="alert"
            aria-label="Cerrar"
        >
        </button>

    `;


    // Agrega la alerta al contenedor
    contenedor.appendChild(
        alerta
    );


    // La alerta desaparece después de 3 segundos
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
// AGREGAR PRODUCTO AL CARRITO
// ==========================================

function agregarAlCarrito(
    nombre,
    precio
) {

    const carrito =
        obtenerCarrito();


    // Busca si el producto ya existe
    const productoExistente =
        carrito.find(

            producto =>
                producto.nombre === nombre

        );


    // Si ya existe, aumenta la cantidad
    if (productoExistente) {

        productoExistente.cantidad++;

    }

    // Si no existe, lo agrega
    else {

        carrito.push({

            nombre: nombre,

            precio: precio,

            cantidad: 1

        });

    }


    // Guarda los cambios
    guardarCarrito(
        carrito
    );


    // Actualiza número del carrito
    actualizarContadorCarrito();


    // Muestra alerta Bootstrap
    mostrarAlertaCarrito(
        nombre
    );

}


// ==========================================
// ELIMINAR PRODUCTO
// ==========================================

function eliminarProducto(indice) {

    const carrito =
        obtenerCarrito();


    carrito.splice(
        indice,
        1
    );


    guardarCarrito(
        carrito
    );


    mostrarCarrito();

    actualizarContadorCarrito();

}


// ==========================================
// CAMBIAR CANTIDAD
// ==========================================

function cambiarCantidad(
    indice,
    nuevaCantidad
) {

    const carrito =
        obtenerCarrito();


    nuevaCantidad =
        Number(nuevaCantidad);


    // Si la cantidad llega a 0,
    // elimina el producto
    if (nuevaCantidad <= 0) {

        carrito.splice(
            indice,
            1
        );

    }

    else {

        carrito[indice].cantidad =
            nuevaCantidad;

    }


    guardarCarrito(
        carrito
    );


    mostrarCarrito();

    actualizarContadorCarrito();

}


// ==========================================
// MOSTRAR PRODUCTOS EN carrito.html
// ==========================================

function mostrarCarrito() {

    const contenedor =
        document.getElementById(
            "lista-carrito"
        );


    // Si no estamos en carrito.html
    // termina la función
    if (!contenedor) {

        return;

    }


    const carrito =
        obtenerCarrito();


    const subtotalElemento =
        document.getElementById(
            "subtotal-carrito"
        );


    const totalElemento =
        document.getElementById(
            "total-carrito"
        );


    // Limpia el contenido anterior
    contenedor.innerHTML = "";


    let total = 0;


    // ======================================
    // CARRITO VACÍO
    // ======================================

    if (carrito.length === 0) {

        contenedor.innerHTML = `

            <div
                class="alert alert-secondary text-center"
            >

                Tu carrito está vacío.

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

    carrito.forEach(
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
// CONTADOR DEL CARRITO
// ==========================================

function actualizarContadorCarrito() {

    const carrito =
        obtenerCarrito();


    let cantidadTotal = 0;


    carrito.forEach(
        producto => {

            cantidadTotal +=
                producto.cantidad;

        }
    );


    const contador =
        document.getElementById(
            "contador-carrito"
        );


    if (contador) {

        contador.textContent =
            cantidadTotal;

    }

}


// ==========================================
// VACIAR CARRITO COMPLETO
// ==========================================

function vaciarCarrito() {

    localStorage.removeItem(
        "carrito"
    );


    mostrarCarrito();

    actualizarContadorCarrito();

}


// ==========================================
// HACER LAS FUNCIONES ACCESIBLES DESDE HTML
// ==========================================

window.agregarAlCarrito =
    agregarAlCarrito;

window.eliminarProducto =
    eliminarProducto;

window.cambiarCantidad =
    cambiarCantidad;

window.vaciarCarrito =
    vaciarCarrito;


// ==========================================
// CUANDO TERMINA DE CARGAR LA PÁGINA
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        mostrarCarrito();

        actualizarContadorCarrito();

    }
);