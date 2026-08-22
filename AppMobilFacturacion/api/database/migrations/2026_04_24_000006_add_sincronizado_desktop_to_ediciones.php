<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * cliente_ediciones_log necesita 2 columnas para saber qué ediciones ya
 * bajó el desktop y cuándo. Sin ellas, GET /sync/clientes/ediciones-pendientes
 * revienta con "Column not found 'sincronizado_desktop'".
 *
 * Se creó como migración aparte porque la migración 004 original creó la
 * tabla sin estos campos; corregir la 004 rompería instalaciones que ya la
 * corrieron. Esta migración es idempotente (hasColumn check).
 */
class AddSincronizadoDesktopToEdiciones extends Migration
{
    public function up()
    {
        if (Schema::hasTable('cliente_ediciones_log')) {
            Schema::table('cliente_ediciones_log', function (Blueprint $table) {
                if (!Schema::hasColumn('cliente_ediciones_log', 'sincronizado_desktop')) {
                    $table->boolean('sincronizado_desktop')->default(false)->after('fuente');
                }
                if (!Schema::hasColumn('cliente_ediciones_log', 'fecha_sync_desktop')) {
                    $table->timestamp('fecha_sync_desktop')->nullable()->after('sincronizado_desktop');
                }
            });

            // Índice compuesto para el WHERE del endpoint ediciones-pendientes
            $indexExists = collect(
                \Illuminate\Support\Facades\DB::select("SHOW INDEX FROM cliente_ediciones_log WHERE Key_name = 'idx_ediciones_pendientes'")
            )->isNotEmpty();

            if (!$indexExists) {
                Schema::table('cliente_ediciones_log', function (Blueprint $table) {
                    $table->index(['sincronizado_desktop', 'id_empresa', 'id'], 'idx_ediciones_pendientes');
                });
            }
        }
    }

    public function down()
    {
        if (Schema::hasTable('cliente_ediciones_log')) {
            Schema::table('cliente_ediciones_log', function (Blueprint $table) {
                if (Schema::hasColumn('cliente_ediciones_log', 'fecha_sync_desktop')) {
                    $table->dropColumn('fecha_sync_desktop');
                }
                if (Schema::hasColumn('cliente_ediciones_log', 'sincronizado_desktop')) {
                    $table->dropColumn('sincronizado_desktop');
                }
            });
        }
    }
}
