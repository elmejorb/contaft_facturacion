<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cliente extends Model
{
    protected $table = 'clientes';
    protected $primaryKey = 'id_cliente';

    protected $fillable = [
        'id_empresa',
        'codigo_cliente',
        'codvb6',
        'creado_por_vendedor_mobile',
        'nombre_razon_social',
        'tipo_documento',
        'numero_documento',
        'digito_verificacion',
        'telefono',
        'celular',
        'email',
        'direccion',
        'departamento',
        'municipio',
        'id_municipio',
        'id_departamento',
        'latitud',
        'longitud',
        'precision_gps_metros',
        'gps_capturado_at',
        'tipo_responsabilidad',
        'regimen_tributario',
        'tipo_organizacion',
        'cupo_autorizado',
        'estado',
    ];

    protected $casts = [
        'estado' => 'boolean',
        'cupo_autorizado' => 'decimal:2',
        'latitud' => 'decimal:7',
        'longitud' => 'decimal:7',
        'precision_gps_metros' => 'decimal:2',
        'gps_capturado_at' => 'datetime',
    ];
}
