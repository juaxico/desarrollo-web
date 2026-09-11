<html>
    <head> 
        <title>Pagina Principal</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">

        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>  
    </head>

    <body class="d-flex flex-column min-vh-100">

        <!--Navbar-->
        <nav class="navbar navbar-expand-sm bg-dark navbar-dark">
            <div class="container-fluid">

                <a class="navbar-brand" href="index.php">Logo</a>

                <button class="navbar-toggler" type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#collapsibleNavbar">
                    <span class="navbar-toggler-icon"></span>
                </button>

                <div class="collapse navbar-collapse" id="collapsibleNavbar">

                    <ul class="navbar-nav mx-auto">

                        <li class="nav-item dropdown"> 
                            <a class="nav-link dropdown-toggle"
                               href="#"
                               role="button"
                               data-bs-toggle="dropdown">
                                Nosotros
                            </a>

                            <ul class="dropdown-menu">
                                <li>
                                    <a class="dropdown-item" href="Nosotros.php">
                                        Quienes Somos
                                    </a>
                                </li>

                                <li>
                                    <a class="dropdown-item" href="#">
                                        Nuestro Equipo
                                    </a>
                                </li>

                                <li>
                                    <a class="dropdown-item" href="#">
                                        Mision
                                    </a>
                                </li>
                            </ul>
                        </li>

                        <li class="nav-item">
                            <a class="nav-link" href="menu.php">Menu</a>
                        </li>

                        <li class="nav-item">
                            <a class="nav-link" href="Delivery.php">Delivery</a>
                        </li>

                        <li class="nav-item">
                            <a class="nav-link" href="contacto.php">Contacto</a>
                        </li>

                    </ul>

                </div>

                <button type="button"
                        class="btn btn-outline-primary"
                        data-bs-toggle="modal"
                        data-bs-target="#myModal">
                    Acceder
                </button>

            </div>
        </nav>


        <!--Contenido-->
        <div class="container-fluid bg-dark flex-grow-1">

            <a href="nosotros.php">Ir a Nosotros</a><br>
            <a href="menu.php">Ir a Menu</a><br>
            <a href="Delivery.php">Ir a Delivery</a><br>
            <a href="contacto.php">Ir a Contacto</a><br>

        </div>


        <!--Footer-->
        <footer class="container-fluid bg-dark text-white text-center py-2">
            <strong>Carnes2026@gmail.com</strong>
        </footer>


        <!--Modal-->
        <div class="modal fade" id="myModal">

            <div class="modal-dialog">
                <div class="modal-content">

                    <!-- Modal Header -->
                    <div class="modal-header">
                        <h4 class="modal-title">Autenticacion</h4>

                        <button type="button"
                                class="btn-close"
                                data-bs-dismiss="modal">
                        </button>
                    </div>

                    <!-- Modal body -->
                    <div class="modal-body">

                        <form action="nosotros.php">

                            <div class="mb-3 mt-3">

                                <label for="email" class="form-label">
                                    Email:
                                </label>

                                <input type="email"
                                       class="form-control"
                                       id="email"
                                       placeholder="Enter email"
                                       name="email">

                            </div>

                            <div class="mb-3">

                                <label for="pwd" class="form-label">
                                    Password:
                                </label>

                                <input type="password"
                                       class="form-control"
                                       id="pwd"
                                       placeholder="Enter password"
                                       name="pswd">

                            </div>

                            <div class="form-check mb-3">

                                <label class="form-check-label">

                                    <input class="form-check-input"
                                           type="checkbox"
                                           name="remember">

                                    Remember me

                                </label>

                            </div>

                            <button type="submit" class="btn btn-primary">
                                Login
                            </button>

                        </form>

                    </div>

                    <!-- Modal footer -->
                    <div class="modal-footer">

                        <button type="button"
                                class="btn btn-danger"
                                data-bs-dismiss="modal">
                            Close
                        </button>

                    </div>

                </div>
            </div>

        </div>

    </body>
</html>