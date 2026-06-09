<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Empresa extends Model
{
    protected $table = 'empresas';
    protected $primaryKey = 'id_empresa';

    protected $fillable = [
        'nombre_empresa',
        'nit',
        'direccion',
        'telefono',
        'email',
        'factura_electronica_activa',
        'dian_email',
        'dian_password',
        'token_api',
    ];

    protected $hidden = [
        'dian_password',
        'token_api',
    ];

    protected $casts = [
        'factura_electronica_activa' => 'boolean',
    ];
}
