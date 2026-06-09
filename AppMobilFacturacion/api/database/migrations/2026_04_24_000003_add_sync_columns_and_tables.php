<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agrega soporte para sincronización desde el Electron (VB6).
 * - Columnas `codvb6` en tablas existentes para upserts por código VB6
 * - Nuevas tablas: proveedores, pagos, saldo_cartera, cierres_caja
 */
class AddSyncColumnsAndTables extends Migration
{
    public function up()
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->string('codvb6', 30)->nullable()->after('codigo_cliente');
            $table->index(['id_empresa', 'codvb6'], 'idx_clientes_codvb6');
        });

        Schema::table('productos', function (Blueprint $table) {
            $table->string('codvb6', 30)->nullable()->after('codigo');
            $table->index(['id_empresa', 'codvb6'], 'idx_productos_codvb6');
        });

        Schema::table('categorias', function (Blueprint $table) {
            $table->string('codvb6', 30)->nullable()->after('nombre');
            $table->index(['id_empresa', 'codvb6'], 'idx_categorias_codvb6');
        });

        Schema::table('ventas', function (Blueprint $table) {
            $table->string('codvb6', 30)->nullable()->after('numero_factura');
            $table->index(['id_empresa', 'codvb6'], 'idx_ventas_codvb6');
        });

        Schema::create('proveedores', function (Blueprint $table) {
            $table->bigIncrements('id_proveedor');
            $table->unsignedBigInteger('id_empresa');
            $table->string('codvb6', 30)->nullable();
            $table->string('codigo_proveedor', 30);
            $table->string('razon_social', 200);
            $table->string('nit', 30)->nullable();
            $table->string('telefonos', 100)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('direccion', 300)->nullable();
            $table->string('nombres_contacto', 150)->nullable();
            $table->string('apellidos_contacto', 150)->nullable();
            $table->string('identificacion_contacto', 30)->nullable();
            $table->string('telefonos_contacto', 100)->nullable();
            $table->string('direccion_contacto', 300)->nullable();
            $table->string('cuenta_numero', 50)->nullable();
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['id_empresa', 'codvb6'], 'idx_proveedores_codvb6');
        });

        Schema::create('pagos', function (Blueprint $table) {
            $table->bigIncrements('id_pago');
            $table->unsignedBigInteger('id_empresa');
            $table->unsignedBigInteger('id_pago_vb6')->nullable();
            $table->string('recibo_caja', 30)->nullable();
            $table->string('codigo_cliente', 30)->nullable();
            $table->string('numero_factura', 50)->nullable();
            $table->decimal('valor_pago', 14, 2)->default(0);
            $table->date('fecha')->nullable();
            $table->string('detalle_pago', 300)->nullable();
            $table->decimal('valor_factura', 14, 2)->default(0);
            $table->decimal('saldo_actual', 14, 2)->default(0);
            $table->decimal('descuento', 14, 2)->default(0);
            $table->decimal('retencion', 14, 2)->default(0);
            $table->decimal('iva_retenido', 14, 2)->default(0);
            $table->decimal('saldo_total', 14, 2)->default(0);
            $table->string('estado', 30)->nullable();
            $table->string('cedula', 30)->nullable();
            $table->string('recibido_de', 150)->nullable();
            $table->timestamps();
            $table->index(['id_empresa', 'id_pago_vb6'], 'idx_pagos_vb6');
            $table->index(['id_empresa', 'numero_factura'], 'idx_pagos_factura');
        });

        Schema::create('saldo_cartera', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('id_empresa');
            $table->string('tipo', 20)->default('cliente'); // cliente | proveedor
            $table->string('codigo_tercero', 30);
            $table->string('nombre_tercero', 200);
            $table->decimal('saldo_total', 14, 2)->default(0);
            $table->timestamps();
            $table->unique(['id_empresa', 'tipo', 'codigo_tercero'], 'uniq_saldo');
        });

        Schema::create('cierres_caja', function (Blueprint $table) {
            $table->bigIncrements('id_cierre');
            $table->unsignedBigInteger('id_empresa');
            $table->string('codvb6', 30)->nullable();
            $table->date('fecha')->nullable();
            $table->dateTime('fecha_cierre')->nullable();
            $table->decimal('venta_contado', 14, 2)->default(0);
            $table->decimal('venta_credito', 14, 2)->default(0);
            $table->decimal('pagos', 14, 2)->default(0);
            $table->decimal('valor_total', 14, 2)->default(0);
            $table->decimal('valor_inicial_caja', 14, 2)->default(0);
            $table->decimal('egresos', 14, 2)->default(0);
            $table->decimal('base', 14, 2)->default(0);
            $table->decimal('billetes', 14, 2)->default(0);
            $table->decimal('monedas', 14, 2)->default(0);
            $table->decimal('cheques', 14, 2)->default(0);
            $table->decimal('saldo_libros', 14, 2)->default(0);
            $table->decimal('diferencia', 14, 2)->default(0);
            $table->decimal('valor_inventario', 14, 2)->default(0);
            $table->decimal('total_venta_dia', 14, 2)->default(0);
            $table->decimal('total_efectivo', 14, 2)->default(0);
            $table->integer('estado')->default(1);
            $table->unsignedBigInteger('id_usuario')->nullable();
            $table->timestamps();
            $table->index(['id_empresa', 'codvb6'], 'idx_cierres_codvb6');
        });

        // Tabla de log dedicada para auditar batch sync del Electron
        Schema::create('sync_batch_log', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('id_empresa');
            $table->string('entidad', 30);  // categorias, productos, etc.
            $table->string('fuente', 20)->default('electron'); // electron, api, etc.
            $table->integer('recibidos')->default(0);
            $table->integer('insertados')->default(0);
            $table->integer('actualizados')->default(0);
            $table->integer('errores')->default(0);
            $table->text('ultimo_error')->nullable();
            $table->timestamp('fecha')->useCurrent();
            $table->index(['id_empresa', 'entidad']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('sync_batch_log');
        Schema::dropIfExists('cierres_caja');
        Schema::dropIfExists('saldo_cartera');
        Schema::dropIfExists('pagos');
        Schema::dropIfExists('proveedores');

        Schema::table('ventas', function (Blueprint $table) {
            $table->dropIndex('idx_ventas_codvb6');
            $table->dropColumn('codvb6');
        });
        Schema::table('categorias', function (Blueprint $table) {
            $table->dropIndex('idx_categorias_codvb6');
            $table->dropColumn('codvb6');
        });
        Schema::table('productos', function (Blueprint $table) {
            $table->dropIndex('idx_productos_codvb6');
            $table->dropColumn('codvb6');
        });
        Schema::table('clientes', function (Blueprint $table) {
            $table->dropIndex('idx_clientes_codvb6');
            $table->dropColumn('codvb6');
        });
    }
}
