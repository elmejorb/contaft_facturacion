<?php

/** @var \Laravel\Lumen\Routing\Router $router */

$router->get('/', function () use ($router) {
    return response()->json([
        'app'     => 'Conta Movil API',
        'version' => '1.0.0',
        'status'  => 'ok',
    ]);
});

$router->get('/health', function () {
    return response()->json([
        'status'    => 'ok',
        'timestamp' => \Carbon\Carbon::now()->toIso8601String(),
    ]);
});

/* ================================================================
 * SINCRONIZACIÓN BATCH (Electron)
 * Autenticación por email + token_api en el body. NO usa JWT.
 * Contratos compatibles con api-conta — el Electron solo cambia URL base.
 * ================================================================ */
$router->group(['prefix' => 'sync'], function () use ($router) {
    $router->post('electron/validar', 'SyncBatchController@validar');
    $router->post('validar',          'SyncBatchController@validar');

    $router->post('categorias/batch',   'SyncBatchController@categoriasBatch');
    $router->post('productos/batch',    'SyncBatchController@productosBatch');
    $router->post('clientes/batch',     'SyncBatchController@clientesBatch');
    $router->post('proveedores/batch',  'SyncBatchController@proveedoresBatch');
    $router->post('ventas/batch',       'SyncBatchController@ventasBatch');
    $router->post('pagos/batch',        'SyncBatchController@pagosBatch');
    $router->post('pagos/vb6/batch',    'SyncBatchController@pagosBatch');
    $router->post('saldos/batch',       'SyncBatchController@saldosBatch');
    $router->post('cierres-caja/batch', 'SyncBatchController@cierresCajaBatch');

    $router->post('vendedores/batch',                 'SyncVendedorController@vendedoresBatch');
    $router->get('ventas/pendientes',                 'SyncVendedorController@ventasPendientes');
    $router->get('clientes/ediciones-pendientes',     'SyncVendedorController@clientesEdicionesPendientes');
    $router->post('clientes/ediciones-confirmadas',   'SyncVendedorController@clientesEdicionesConfirmadas');
    $router->get('clientes/nuevos',                   'SyncVendedorController@clientesNuevosPendientes');
    $router->post('clientes/confirmar-mapeo',         'SyncVendedorController@clientesConfirmarMapeo');
});

$router->group(['prefix' => 'api'], function () use ($router) {

    // Auth público
    $router->post('auth/login', 'AuthController@login');

    // Auth + recursos protegidos
    $router->group(['middleware' => 'auth'], function () use ($router) {

        // Sesión
        $router->get('auth/me',       'AuthController@me');
        $router->post('auth/refresh', 'AuthController@refresh');
        $router->post('auth/logout',  'AuthController@logout');

        // Dashboard
        $router->get('dashboard/resumen', 'DashboardController@resumen');

        // Clientes
        $router->get('clientes',       'ClienteController@index');
        $router->post('clientes',      'ClienteController@store');
        $router->get('clientes/{id}',  'ClienteController@show');
        $router->put('clientes/{id}',  'ClienteController@update');

        // Productos
        $router->get('productos',      'ProductoController@index');
        $router->get('productos/{id}', 'ProductoController@show');
        $router->get('categorias',     'ProductoController@categorias');

        // Catálogos geográficos (DIAN)
        $router->get('catalogos/departamentos',   'GeoController@departamentos');
        $router->get('catalogos/municipios',      'GeoController@municipios');
        $router->get('catalogos/municipios/{id}', 'GeoController@municipioShow');

        // Ventas
        $router->get('ventas',      'VentaController@index');
        $router->post('ventas',     'VentaController@store');
        $router->get('ventas/{id}', 'VentaController@show');
    });

});
