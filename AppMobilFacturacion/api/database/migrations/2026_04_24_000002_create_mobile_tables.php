<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tablas exclusivas de la app móvil. Estas SÍ se crean en Hostinger.
 */
class CreateMobileTables extends Migration
{
    public function up()
    {
        Schema::create('mobile_vendedores', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('codigo', 20)->unique();
            $table->string('nombre', 150);
            $table->string('email', 150)->unique();
            $table->string('password', 255);
            $table->string('telefono', 30)->nullable();
            $table->string('cedula', 30)->nullable();
            $table->string('zona', 100)->nullable();
            $table->unsignedBigInteger('id_empresa');
            $table->unsignedBigInteger('id_vendedor_conta')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamp('ultimo_login')->nullable();
            $table->timestamps();

            $table->index('id_empresa');
            $table->index('email');
        });

        Schema::create('mobile_vendedor_clientes', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('id_vendedor_mobile');
            $table->unsignedBigInteger('id_cliente');
            $table->timestamp('fecha_asignacion')->useCurrent();

            $table->unique(['id_vendedor_mobile', 'id_cliente'], 'uniq_vendedor_cliente');
            $table->index('id_vendedor_mobile');
            $table->index('id_cliente');
        });

        Schema::create('mobile_refresh_tokens', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('id_vendedor_mobile');
            $table->string('token_hash', 255);
            $table->string('device_id', 100)->nullable();
            $table->string('device_name', 150)->nullable();
            $table->timestamp('fecha_emision')->useCurrent();
            $table->timestamp('fecha_expiracion');
            $table->timestamp('fecha_revocacion')->nullable();

            $table->index('id_vendedor_mobile');
            $table->index('token_hash');
        });

        Schema::create('mobile_sync_log', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('id_vendedor_mobile');
            $table->string('tipo', 30); // venta, cliente_nuevo, etc.
            $table->string('accion', 30); // crear, actualizar, reenviar
            $table->unsignedBigInteger('id_referencia')->nullable();
            $table->string('estado', 20)->default('ok'); // ok, error
            $table->text('detalle')->nullable();
            $table->string('device_id', 100)->nullable();
            $table->timestamp('fecha')->useCurrent();

            $table->index(['id_vendedor_mobile', 'fecha']);
            $table->index('tipo');
        });
    }

    public function down()
    {
        Schema::dropIfExists('mobile_sync_log');
        Schema::dropIfExists('mobile_refresh_tokens');
        Schema::dropIfExists('mobile_vendedor_clientes');
        Schema::dropIfExists('mobile_vendedores');
    }
}
