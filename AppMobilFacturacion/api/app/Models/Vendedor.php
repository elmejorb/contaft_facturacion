<?php

namespace App\Models;

use Illuminate\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Database\Eloquent\Model;
use Tymon\JWTAuth\Contracts\JWTSubject;

class Vendedor extends Model implements AuthenticatableContract, JWTSubject
{
    use Authenticatable;

    protected $table = 'mobile_vendedores';

    protected $primaryKey = 'id';

    protected $fillable = [
        'codigo',
        'nombre',
        'email',
        'password',
        'telefono',
        'cedula',
        'zona',
        'id_empresa',
        'id_vendedor_conta',
        'activo',
        'can_edit_clients',
        'ultimo_login',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'can_edit_clients' => 'boolean',
        'ultimo_login' => 'datetime',
        'id_empresa' => 'integer',
        'id_vendedor_conta' => 'integer',
    ];

    public function getAuthPassword()
    {
        return $this->password;
    }

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [
            'codigo' => $this->codigo,
            'nombre' => $this->nombre,
            'email' => $this->email,
            'id_empresa' => $this->id_empresa,
            'zona' => $this->zona,
        ];
    }

    public function clientesAsignados()
    {
        return $this->hasMany(VendedorCliente::class, 'id_vendedor_mobile');
    }

    public function empresa()
    {
        return $this->belongsTo(Empresa::class, 'id_empresa');
    }
}
