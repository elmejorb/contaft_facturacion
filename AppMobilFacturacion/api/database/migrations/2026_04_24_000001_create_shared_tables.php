<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * DEV ONLY — Tablas compartidas que en producción Hostinger ya existen
 * porque las crea api-conta. Aquí las replicamos para poder desarrollar
 * localmente. Al desplegar a Hostinger: OMITIR esta migración.
 */
class CreateSharedTables extends Migration
{
    public function up()
    {
        Schema::create('empresas', function (Blueprint $table) {
            $table->bigIncrements('id_empresa');
            $table->string('nombre_empresa', 200);
            $table->string('nit', 30)->nullable();
            $table->string('direccion', 300)->nullable();
            $table->string('telefono', 50)->nullable();
            $table->string('email', 150)->nullable();
            $table->boolean('factura_electronica_activa')->default(false);
            $table->string('dian_email', 150)->nullable();
            $table->string('dian_password', 255)->nullable();
            $table->string('token_api', 255)->nullable();
            $table->timestamps();
        });

        Schema::create('clientes', function (Blueprint $table) {
            $table->bigIncrements('id_cliente');
            $table->unsignedBigInteger('id_empresa');
            $table->string('codigo_cliente', 30)->nullable();
            $table->string('nombre_razon_social', 200);
            $table->string('tipo_documento', 10)->nullable();
            $table->string('numero_documento', 30)->nullable();
            $table->string('digito_verificacion', 5)->nullable();
            $table->string('telefono', 50)->nullable();
            $table->string('celular', 50)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('direccion', 300)->nullable();
            $table->string('departamento', 100)->nullable();
            $table->string('municipio', 100)->nullable();
            $table->string('tipo_responsabilidad', 10)->nullable();
            $table->string('regimen_tributario', 10)->nullable();
            $table->string('tipo_organizacion', 10)->nullable();
            $table->decimal('cupo_autorizado', 14, 2)->default(0);
            $table->boolean('estado')->default(true);
            $table->timestamps();

            $table->index('id_empresa');
            $table->index('numero_documento');
        });

        Schema::create('categorias', function (Blueprint $table) {
            $table->bigIncrements('id_categoria');
            $table->unsignedBigInteger('id_empresa');
            $table->string('nombre', 100);
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index('id_empresa');
        });

        Schema::create('productos', function (Blueprint $table) {
            $table->bigIncrements('id_producto');
            $table->unsignedBigInteger('id_empresa');
            $table->unsignedBigInteger('id_categoria')->nullable();
            $table->string('codigo', 50);
            $table->string('nombre', 200);
            $table->text('descripcion')->nullable();
            $table->decimal('precio_costo', 14, 2)->default(0);
            $table->decimal('precio_venta', 14, 2)->default(0);
            $table->decimal('precio_venta_2', 14, 2)->default(0);
            $table->decimal('precio_venta_3', 14, 2)->default(0);
            $table->decimal('stock', 14, 2)->default(0);
            $table->decimal('stock_minimo', 14, 2)->default(0);
            $table->string('unidad_medida', 20)->default('und');
            $table->decimal('porcentaje_iva', 5, 2)->default(19);
            $table->boolean('estado')->default(true);
            $table->timestamps();

            $table->index('id_empresa');
            $table->index('codigo');
        });

        Schema::create('ventas', function (Blueprint $table) {
            $table->bigIncrements('id_venta');
            $table->unsignedBigInteger('id_empresa');
            $table->unsignedBigInteger('id_cliente');
            $table->unsignedBigInteger('id_vendedor_mobile')->nullable();
            $table->string('numero_factura', 50);
            $table->date('fecha_venta');
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('total_impuestos', 14, 2)->default(0);
            $table->decimal('descuento', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->string('forma_pago', 30)->default('contado');
            $table->text('observaciones')->nullable();
            $table->string('origen', 20)->default('web');
            $table->string('estado', 30)->default('registrada');
            $table->string('cufe', 100)->nullable();
            $table->text('qr_dian')->nullable();
            $table->string('estado_dian', 30)->nullable();
            $table->timestamps();

            $table->index('id_empresa');
            $table->index('id_cliente');
            $table->index('fecha_venta');
        });

        Schema::create('venta_detalles', function (Blueprint $table) {
            $table->bigIncrements('id_detalle');
            $table->unsignedBigInteger('id_venta');
            $table->unsignedBigInteger('id_producto');
            $table->string('nombre_producto', 200);
            $table->decimal('cantidad', 14, 2);
            $table->decimal('precio_unitario', 14, 2);
            $table->decimal('subtotal', 14, 2);
            $table->decimal('descuento', 14, 2)->default(0);
            $table->decimal('porcentaje_iva', 5, 2)->default(19);
            $table->decimal('impuesto', 14, 2)->default(0);
            $table->decimal('total', 14, 2);
            $table->timestamps();

            $table->index('id_venta');
        });
    }

    public function down()
    {
        Schema::dropIfExists('venta_detalles');
        Schema::dropIfExists('ventas');
        Schema::dropIfExists('productos');
        Schema::dropIfExists('categorias');
        Schema::dropIfExists('clientes');
        Schema::dropIfExists('empresas');
    }
}
