<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VendedorCliente extends Model
{
    protected $table = 'mobile_vendedor_clientes';

    /** La tabla no tiene created_at / updated_at, usamos fecha_asignacion. */
    public $timestamps = false;

    protected $fillable = [
        'id_vendedor_mobile',
        'id_cliente',
        'fecha_asignacion',
    ];

    protected $casts = [
        'fecha_asignacion' => 'datetime',
    ];

    public function vendedor()
    {
        return $this->belongsTo(Vendedor::class, 'id_vendedor_mobile');
    }

    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'id_cliente');
    }
}
