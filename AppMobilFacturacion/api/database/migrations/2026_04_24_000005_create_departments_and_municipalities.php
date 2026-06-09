<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tablas de geografía compatibles con api-electronica (DIAN).
 * Código DANE oficial.
 *
 * - departments: departamentos de Colombia (~33)
 * - municipalities: municipios de Colombia (~1121)
 *
 * Se agregan también FK id_municipio e id_departamento a clientes
 * (mantenemos `municipio` y `departamento` como texto denormalizado).
 */
class CreateDepartmentsAndMunicipalities extends Migration
{
    public function up()
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('country_id')->nullable();
            $table->string('code', 10)->nullable();  // Código DANE
            $table->string('name', 100);
            $table->timestamps();
            $table->index('name');
        });

        Schema::create('municipalities', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('department_id');
            $table->string('code', 10)->nullable();  // Código DANE (05001, 11001, ...)
            $table->string('name', 150);
            $table->timestamps();
            $table->index('department_id');
            $table->index('name');
        });

        Schema::table('clientes', function (Blueprint $table) {
            $table->unsignedBigInteger('id_municipio')->nullable()->after('municipio');
            $table->unsignedBigInteger('id_departamento')->nullable()->after('id_municipio');
            $table->index('id_municipio', 'idx_clientes_municipio');
        });
    }

    public function down()
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->dropIndex('idx_clientes_municipio');
            $table->dropColumn(['id_municipio', 'id_departamento']);
        });
        Schema::dropIfExists('municipalities');
        Schema::dropIfExists('departments');
    }
}
