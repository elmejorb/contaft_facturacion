<?php

return [
    'defaults' => [
        'guard' => env('AUTH_GUARD', 'api'),
        'passwords' => 'vendedores',
    ],

    'guards' => [
        'api' => [
            'driver' => 'jwt',
            'provider' => 'vendedores',
        ],
    ],

    'providers' => [
        'vendedores' => [
            'driver' => 'eloquent',
            'model' => App\Models\Vendedor::class,
        ],
    ],

    'passwords' => [
        'vendedores' => [
            'provider' => 'vendedores',
            'expire' => 60,
        ],
    ],
];
