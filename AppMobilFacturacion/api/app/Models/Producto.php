<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Producto extends Model
{
    protected $table = 'productos';
    protected $primaryKey = 'id_producto';

    protected $fillable = [
        'id_empresa',
        'id_categoria',
        'codigo',
        'nombre',
        'descripcion',
        'precio_costo',
        'precio_venta',
        'precio_venta_2',
        'precio_venta_3',
        'stock',
        'stock_minimo',
        'unidad_medida',
        'porcentaje_iva',
        'estado',
    ];

    protected $casts = [
        'estado' => 'boolean',
        'precio_costo' => 'decimal:2',
        'precio_venta' => 'decimal:2',
        'precio_venta_2' => 'decimal:2',
        'precio_venta_3' => 'decimal:2',
        'stock' => 'decimal:2',
        'stock_minimo' => 'decimal:2',
        'porcentaje_iva' => 'decimal:2',
    ];
}
