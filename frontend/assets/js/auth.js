// ==========================================
// ACCESO: registro, login, sesión
// Usa la API del backend (/api/auth/...) y guarda el token en localStorage
// ==========================================
(function () {
    const API = "/api";
    const KEY_TOKEN = "asador_token";
    const KEY_USUARIO = "asador_usuario";

    let despuesDeLogin = null; // acción pendiente (ej: confirmar pedido)

    // ---------- sesión ----------
    function token() {
        return localStorage.getItem(KEY_TOKEN);
    }

    function usuario() {
        try {
            return JSON.parse(localStorage.getItem(KEY_USUARIO));
        } catch {
            return null;
        }
    }

    function guardarSesion(data) {
        localStorage.setItem(KEY_TOKEN, data.token);
        localStorage.setItem(KEY_USUARIO, JSON.stringify(data.usuario));
        document.dispatchEvent(new CustomEvent("auth:cambio"));
    }

    function limpiarSesionLocal() {
        localStorage.removeItem(KEY_TOKEN);
        localStorage.removeItem(KEY_USUARIO);
        document.dispatchEvent(new CustomEvent("auth:cambio"));
    }

    let cerrandoSesion = false;
    async function cerrarSesion() {
        if (cerrandoSesion) return;
        if (!token()) { limpiarSesionLocal(); return; }

        cerrandoSesion = true;
        const boton = document.getElementById("btn-logout");
        document.getElementById("error-cerrar-sesion")?.remove();
        if (boton) boton.disabled = true;
        try {
            await api("/auth/logout", { method: "POST", body: "{}" });
            limpiarSesionLocal();
        } catch (error) {
            // Un 401 ya invalida la sesión local; otros fallos permiten reintentar.
            if (error.status !== 401) {
                const aviso = document.createElement("p");
                aviso.id = "error-cerrar-sesion";
                aviso.className = "alert alert-warning small mt-2";
                aviso.setAttribute("role", "alert");
                aviso.textContent = "No se pudo cerrar la sesión en el servidor. Inténtalo nuevamente. " + error.message;
                document.querySelector(".acciones-header")?.appendChild(aviso);
            }
        } finally {
            cerrandoSesion = false;
            if (boton) boton.disabled = false;
        }
    }

    // ---------- llamadas a la API ----------
    async function api(ruta, opciones = {}) {
        const headers = { ...opciones.headers, "Content-Type": "application/json" };
        if (token()) headers.Authorization = "Bearer " + token();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        try {
        const respuesta = await fetch(API + ruta, { ...opciones, headers, signal: controller.signal });
        const data = await respuesta.json().catch(() => { throw new Error("El servidor envió una respuesta inválida. Inténtalo nuevamente."); });
        if (!respuesta.ok) {
            if (respuesta.status === 401 && token()) limpiarSesionLocal(); // token vencido
            const error = new Error(data.error || "Ocurrió un error.");
            error.status = respuesta.status;
            throw error;
        }
        return data;
        } catch (error) {
            if (error.name === "AbortError") throw new Error("El servidor tardó demasiado. Puedes reintentar la operación.");
            if (error instanceof TypeError) throw new Error("No se pudo conectar con el servidor. Inténtalo nuevamente.");
            throw error;
        } finally { clearTimeout(timer); }
    }

    // ---------- modal (se crea solo, así no se repite en cada página) ----------
    function crearModal() {
        const viejo = document.getElementById("myModal");
        if (viejo) viejo.remove();

        document.body.insertAdjacentHTML("beforeend", `
        <div class="modal fade" id="myModal" tabindex="-1" aria-labelledby="tituloAcceso" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="tituloAcceso">Acceder</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                    </div>
                    <div class="modal-body">

                        <div id="aviso-acceso" class="alert alert-warning d-none" role="alert"></div>

                        <ul class="nav nav-tabs mb-3" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" data-bs-toggle="tab"
                                        data-bs-target="#tab-login" type="button" role="tab">Iniciar sesión</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" data-bs-toggle="tab"
                                        data-bs-target="#tab-registro" type="button" role="tab">Crear cuenta</button>
                            </li>
                        </ul>

                        <div class="tab-content">

                            <div class="tab-pane fade show active" id="tab-login" role="tabpanel">
                                <form id="form-login" novalidate>
                                    <div class="mb-3">
                                        <label for="login-email" class="form-label">Correo electrónico</label>
                                        <input type="email" class="form-control" id="login-email"
                                               autocomplete="email" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="login-password" class="form-label">Contraseña</label>
                                        <input type="password" class="form-control" id="login-password"
                                               autocomplete="current-password" required>
                                    </div>
                                    <div class="text-danger small mb-2" id="error-login" role="alert"></div>
                                    <button type="submit" class="btn btn-danger w-100">Iniciar sesión</button>
                                </form>
                            </div>

                            <div class="tab-pane fade" id="tab-registro" role="tabpanel">
                                <form id="form-registro" novalidate>
                                    <div class="mb-3">
                                        <label for="registro-nombre" class="form-label">Nombre</label>
                                        <input type="text" class="form-control" id="registro-nombre"
                                               autocomplete="name" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="registro-email" class="form-label">Correo electrónico</label>
                                        <input type="email" class="form-control" id="registro-email"
                                               autocomplete="email" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="registro-password" class="form-label">Contraseña</label>
                                        <input type="password" class="form-control" id="registro-password"
                                               autocomplete="new-password" minlength="8" required>
                                        <div class="form-text">Mínimo 8 caracteres.</div>
                                    </div>
                                    <div class="text-danger small mb-2" id="error-registro" role="alert"></div>
                                    <button type="submit" class="btn btn-danger w-100">Crear cuenta</button>
                                </form>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>`);

        document.getElementById("form-login").addEventListener("submit", enviarLogin);
        document.getElementById("form-registro").addEventListener("submit", enviarRegistro);
    }

    function cerrarModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById("myModal"));
        if (modal) modal.hide();
    }

    async function enviar(evento, ruta, cuerpo, idError) {
        evento.preventDefault();
        const form = evento.target;
        const error = document.getElementById(idError);
        error.textContent = "";

        const boton = form.querySelector("button[type=submit]");
        boton.disabled = true;
        try {
            guardarSesion(await api(ruta, { method: "POST", body: JSON.stringify(cuerpo) }));
            form.reset();
            cerrarModal();
            if (despuesDeLogin) {
                const accion = despuesDeLogin;
                despuesDeLogin = null;
                accion();
            }
        } catch (e) {
            error.textContent = e.message;
        } finally {
            boton.disabled = false;
        }
    }

    function enviarLogin(e) {
        enviar(e, "/auth/login", {
            email: document.getElementById("login-email").value,
            password: document.getElementById("login-password").value
        }, "error-login");
    }

    function enviarRegistro(e) {
        enviar(e, "/auth/registro", {
            nombre: document.getElementById("registro-nombre").value,
            email: document.getElementById("registro-email").value,
            password: document.getElementById("registro-password").value
        }, "error-registro");
    }

    // Abre el modal (con un aviso opcional y una acción para después de entrar)
    function abrirLogin(aviso, accion) {
        despuesDeLogin = accion || null;
        const caja = document.getElementById("aviso-acceso");
        caja.textContent = aviso || "";
        caja.classList.toggle("d-none", !aviso);
        bootstrap.Modal.getOrCreateInstance(document.getElementById("myModal")).show();
    }

    // ---------- botón del header ----------
    function pintarHeader() {
        const acciones = document.querySelector(".acciones-header");
        if (!acciones) return;

        acciones.querySelector("#menu-usuario")?.remove();
        acciones.querySelector("#btn-acceder")?.remove();
        // botón original del HTML (antes de que lo reemplacemos)
        acciones.querySelector("button[data-bs-target='#myModal']")?.remove();

        const u = usuario();
        if (u && token()) {
            const caja = document.createElement("div");
            caja.id = "menu-usuario";
            caja.className = "dropdown";
            caja.innerHTML = `
                <button class="btn btn-outline-danger dropdown-toggle" type="button"
                        data-bs-toggle="dropdown" aria-expanded="false"></button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="pedido.html">Mi pedido</a></li>
                    <li><a class="dropdown-item" href="mis-pedidos.html">Mis pedidos</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><button class="dropdown-item" type="button" id="btn-logout">Cerrar sesión</button></li>
                </ul>`;
            caja.querySelector("button").textContent = "Hola, " + u.nombre.split(" ")[0];
            acciones.appendChild(caja);
            caja.querySelector("#btn-logout").addEventListener("click", cerrarSesion);
        } else {
            const boton = document.createElement("button");
            boton.id = "btn-acceder";
            boton.type = "button";
            boton.className = "btn btn-outline-danger";
            boton.textContent = "Acceder";
            boton.addEventListener("click", () => abrirLogin());
            acciones.appendChild(boton);
        }
    }

    // ---------- inicio ----------
    crearModal();
    pintarHeader();
    document.addEventListener("auth:cambio", pintarHeader);

    // Si había sesión guardada, confirma que siga vigente
    if (token()) api("/auth/me").catch(() => {});

    window.Auth = { token, usuario, api, abrirLogin, cerrarSesion };
})();
