<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * empresas.cliente_id_crm — vincula la empresa del hub con el cliente
 * en el CRM de Innovación Digital. El JWT de entitlements trae este id
 * en el payload; el middleware EntitlementsAuth lo usa para resolver
 * qué fila de `empresas` corresponde y auto-provisionar si no existe.
 *
 * Idempotente con Schema::hasColumn.
 */
class AddClienteIdCrmToEmpresas extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('empresas')) return;

        Schema::table('empresas', function (Blueprint $table) {
            if (!Schema::hasColumn('empresas', 'cliente_id_crm')) {
                $table->unsignedBigInteger('cliente_id_crm')->nullable()->after('id_empresa');
                $table->index('cliente_id_crm', 'idx_cliente_id_crm');
            }
        });
    }

    public function down()
    {
        if (!Schema::hasTable('empresas')) return;
        Schema::table('empresas', function (Blueprint $table) {
            if (Schema::hasColumn('empresas', 'cliente_id_crm')) {
                $table->dropIndex('idx_cliente_id_crm');
                $table->dropColumn('cliente_id_crm');
            }
        });
    }
}
