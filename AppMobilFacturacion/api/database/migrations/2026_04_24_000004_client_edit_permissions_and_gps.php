<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * - Permisos de edición por vendedor (mobile_vendedores.can_edit_clients)
 * - Autor del cliente (clientes.creado_por_vendedor_mobile) para distinguir
 *   "propios" vs "asignados"
 * - Posición GPS (clientes.latitud, longitud, precision_gps_metros, gps_capturado_at)
 * - Log de auditoría de ediciones (cliente_ediciones_log)
 */
class ClientEditPermissionsAndGps extends Migration
{
    public function up()
    {
        Schema::table('mobile_vendedores', function (Blueprint $table) {
            $table->boolean('can_edit_clients')->default(true)->after('activo');
        });

        Schema::table('clientes', function (Blueprint $table) {
            $table->unsignedBigInteger('creado_por_vendedor_mobile')->nullable()->after('codvb6');
            $table->decimal('latitud', 10, 7)->nullable()->after('municipio');
            $table->decimal('longitud', 10, 7)->nullable()->after('latitud');
            $table->decimal('precision_gps_metros', 8, 2)->nullable()->after('longitud');
            $table->timestamp('gps_capturado_at')->nullable()->after('precision_gps_metros');
            $table->index('creado_por_vendedor_mobile', 'idx_clientes_creador');
        });

        Schema::create('cliente_ediciones_log', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('id_empresa');
            $table->unsignedBigInteger('id_cliente');
            $table->unsignedBigInteger('id_vendedor_mobile')->nullable();
            $table->string('fuente', 20)->default('mobile'); // mobile, electron, web
            $table->text('campos_cambiados');  // JSON: {campo: {antes, despues}}
            $table->timestamp('fecha')->useCurrent();
            $table->index(['id_empresa', 'id_cliente'], 'idx_log_cliente');
        });
    }

    public function down()
    {
        Schema::dropIfExists('cliente_ediciones_log');
        Schema::table('clientes', function (Blueprint $table) {
            $table->dropIndex('idx_clientes_creador');
            $table->dropColumn([
                'creado_por_vendedor_mobile',
                'latitud',
                'longitud',
                'precision_gps_metros',
                'gps_capturado_at',
            ]);
        });
        Schema::table('mobile_vendedores', function (Blueprint $table) {
            $table->dropColumn('can_edit_clients');
        });
    }
}
