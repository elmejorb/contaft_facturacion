<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoSeeder extends Seeder
{
    public function run()
    {
        DB::table('empresas')->insert([
            [
                'id_empresa' => 1,
                'nombre_empresa' => 'Distribuidora Demo S.A.S',
                'nit' => '900123456',
                'direccion' => 'Cra 50 #10-20, Bogotá',
                'telefono' => '3001234567',
                'email' => 'contacto@distribuidoraDemo.com',
                'factura_electronica_activa' => true,
                'dian_email' => 'dian@distribuidoraDemo.com',
                'dian_password' => 'placeholder',
                'token_api' => bin2hex(random_bytes(32)),
                'created_at' => \Carbon\Carbon::now(),
                'updated_at' => \Carbon\Carbon::now(),
            ],
            [
                'id_empresa' => 2,
                'nombre_empresa' => 'Comercializadora El Sol S.A.S',
                'nit' => '901654321',
                'direccion' => 'Cl 72 #11-50, Medellín',
                'telefono' => '3100002222',
                'email' => 'contacto@elsol.com',
                'factura_electronica_activa' => false,
                'dian_email' => null,
                'dian_password' => null,
                'token_api' => bin2hex(random_bytes(32)),
                'created_at' => \Carbon\Carbon::now(),
                'updated_at' => \Carbon\Carbon::now(),
            ],
        ]);

        DB::table('mobile_vendedores')->insert([
            [
                'id' => 1,
                'codigo' => 'V001',
                'nombre' => 'Fernando Rivas',
                'email' => 'fernando@epikom.com',
                'password' => Hash::make('demo1234'),
                'telefono' => '3009876543',
                'cedula' => '1023456789',
                'zona' => 'Zona Centro',
                'id_empresa' => 1,
                'id_vendedor_conta' => null,
                'activo' => true,
                'ultimo_login' => null,
                'created_at' => \Carbon\Carbon::now(),
                'updated_at' => \Carbon\Carbon::now(),
            ],
            [
                'id' => 2,
                'codigo' => 'V002',
                'nombre' => 'María López',
                'email' => 'maria@epikom.com',
                'password' => Hash::make('demo1234'),
                'telefono' => '3011112233',
                'cedula' => '52345678',
                'zona' => 'Zona Norte',
                'id_empresa' => 1,
                'id_vendedor_conta' => null,
                'activo' => true,
                'ultimo_login' => null,
                'created_at' => \Carbon\Carbon::now(),
                'updated_at' => \Carbon\Carbon::now(),
            ],
            [
                'id' => 3,
                'codigo' => 'S001',
                'nombre' => 'Carlos Pérez',
                'email' => 'carlos@elsol.com',
                'password' => Hash::make('demo1234'),
                'telefono' => '3155554444',
                'cedula' => '79988776',
                'zona' => 'Medellín Norte',
                'id_empresa' => 2,
                'id_vendedor_conta' => null,
                'activo' => true,
                'ultimo_login' => null,
                'created_at' => \Carbon\Carbon::now(),
                'updated_at' => \Carbon\Carbon::now(),
            ],
        ]);

        DB::table('categorias')->insert([
            ['id_categoria' => 1, 'id_empresa' => 1, 'nombre' => 'Alimentos', 'estado' => true, 'created_at' => \Carbon\Carbon::now(), 'updated_at' => \Carbon\Carbon::now()],
            ['id_categoria' => 2, 'id_empresa' => 1, 'nombre' => 'Lácteos',   'estado' => true, 'created_at' => \Carbon\Carbon::now(), 'updated_at' => \Carbon\Carbon::now()],
            ['id_categoria' => 3, 'id_empresa' => 1, 'nombre' => 'Higiene',   'estado' => true, 'created_at' => \Carbon\Carbon::now(), 'updated_at' => \Carbon\Carbon::now()],
            ['id_categoria' => 4, 'id_empresa' => 1, 'nombre' => 'Limpieza',  'estado' => true, 'created_at' => \Carbon\Carbon::now(), 'updated_at' => \Carbon\Carbon::now()],
        ]);

        $clientes = [
            ['Distribuidora La Esperanza',  'NIT', '900111222', 'pagos@laesperanza.com',    '3014567890', 'Av. Principal 123, Bogotá'],
            ['Supermercado El Trigal',      'NIT', '900333444', 'compras@eltrigal.com.co',  '3024567891', 'Calle Los Mangos, Medellín'],
            ['Bodegón San Antonio',         'CC',  '12345678',  'sanantonio@mail.com',      '3034567892', 'Av. Bolívar, Cali'],
            ['Panadería Don José',          'CC',  '18765432',  null,                       '3044567893', 'Calle Sucre, Barranquilla'],
            ['Farmacia La Salud S.A.S',     'NIT', '900555666', 'info@lasalud.com',         '3054567894', 'CC Sambil Local 45, Bogotá'],
            ['Ferretería El Tornillo',      'NIT', '900777888', 'ventas@eltornillo.com',    '3064567895', 'Av. Universidad, Medellín'],
        ];

        foreach ($clientes as $i => $c) {
            DB::table('clientes')->insert([
                'id_cliente' => $i + 1,
                'id_empresa' => 1,
                'codigo_cliente' => 'CLI' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'nombre_razon_social' => $c[0],
                'tipo_documento' => $c[1],
                'numero_documento' => $c[2],
                'digito_verificacion' => $c[1] === 'NIT' ? (string) rand(0, 9) : null,
                'telefono' => $c[4],
                'celular' => $c[4],
                'email' => $c[3],
                'direccion' => $c[5],
                'departamento' => 'Cundinamarca',
                'municipio' => 'Bogotá',
                'tipo_responsabilidad' => 'O-13',
                'regimen_tributario' => 'O',
                'tipo_organizacion' => $c[1] === 'NIT' ? '1' : '2',
                'cupo_autorizado' => rand(0, 5) * 500000,
                'estado' => true,
                'created_at' => \Carbon\Carbon::now(),
                'updated_at' => \Carbon\Carbon::now(),
            ]);
        }

        // Vendedor V001 tiene asignados los clientes 1,2,3,5. V002 tiene 4 y 6.
        $asignaciones = [
            ['id_vendedor_mobile' => 1, 'id_cliente' => 1],
            ['id_vendedor_mobile' => 1, 'id_cliente' => 2],
            ['id_vendedor_mobile' => 1, 'id_cliente' => 3],
            ['id_vendedor_mobile' => 1, 'id_cliente' => 5],
            ['id_vendedor_mobile' => 2, 'id_cliente' => 4],
            ['id_vendedor_mobile' => 2, 'id_cliente' => 6],
        ];
        foreach ($asignaciones as $a) {
            DB::table('mobile_vendedor_clientes')->insert([
                'id_vendedor_mobile' => $a['id_vendedor_mobile'],
                'id_cliente'         => $a['id_cliente'],
                'fecha_asignacion'   => \Carbon\Carbon::now(),
            ]);
        }

        $productos = [
            ['HAR-001', 'Harina de Maíz Precocida 1kg',   2500,   1,  120],
            ['ACE-002', 'Aceite Vegetal 1L',              4200,   1,   85],
            ['ARR-003', 'Arroz Blanco 1kg',               1900,   1,  200],
            ['AZU-004', 'Azúcar Refinada 1kg',            1750,   1,   45],
            ['LEC-005', 'Leche en Polvo 900g',            6800,   2,   12],
            ['CAF-006', 'Café Molido 500g',               5500,   1,    0],
            ['PAS-007', 'Pasta Larga 500g',               1300,   1,  180],
            ['SAL-008', 'Salsa de Tomate 500g',           2100,   1,   60],
            ['JAB-009', 'Jabón de Baño 150g',              850,   3,  300],
            ['PAP-010', 'Papel Higiénico 4 rollos',       3400,   3,   75],
            ['DET-011', 'Detergente en Polvo 1kg',        4900,   4,   28],
            ['CLO-012', 'Cloro Líquido 1L',               1600,   4,   90],
        ];

        foreach ($productos as $i => $p) {
            DB::table('productos')->insert([
                'id_producto' => $i + 1,
                'id_empresa' => 1,
                'id_categoria' => $p[3],
                'codigo' => $p[0],
                'nombre' => $p[1],
                'descripcion' => null,
                'precio_costo' => $p[2] * 0.7,
                'precio_venta' => $p[2],
                'precio_venta_2' => $p[2] * 0.97,
                'precio_venta_3' => $p[2] * 0.95,
                'stock' => $p[4],
                'stock_minimo' => 20,
                'unidad_medida' => 'und',
                'porcentaje_iva' => 19,
                'estado' => true,
                'created_at' => \Carbon\Carbon::now(),
                'updated_at' => \Carbon\Carbon::now(),
            ]);
        }

        // ========== DATOS EMPRESA 2 (Comercializadora El Sol) ==========
        DB::table('categorias')->insert([
            ['id_categoria' => 5, 'id_empresa' => 2, 'nombre' => 'Textiles',   'estado' => true, 'created_at' => \Carbon\Carbon::now(), 'updated_at' => \Carbon\Carbon::now()],
            ['id_categoria' => 6, 'id_empresa' => 2, 'nombre' => 'Calzado',    'estado' => true, 'created_at' => \Carbon\Carbon::now(), 'updated_at' => \Carbon\Carbon::now()],
        ]);

        $clientesEmpresa2 = [
            ['Almacenes El Paisa',      'NIT', '901222333', 'ventas@elpaisa.com',    '3001112223', 'Cra 80 #30-20, Medellín'],
            ['Boutique La Moda',        'NIT', '901444555', 'info@lamoda.co',        '3002223334', 'Cl 33 #65-10, Medellín'],
            ['Zapatería Los Pies',      'CC',  '71234567',  null,                    '3003334445', 'Cra 50 #12-30, Itagüí'],
        ];

        foreach ($clientesEmpresa2 as $i => $c) {
            DB::table('clientes')->insert([
                'id_cliente' => 100 + $i + 1,
                'id_empresa' => 2,
                'codigo_cliente' => 'SOL' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'nombre_razon_social' => $c[0],
                'tipo_documento' => $c[1],
                'numero_documento' => $c[2],
                'digito_verificacion' => $c[1] === 'NIT' ? (string) rand(0, 9) : null,
                'telefono' => $c[4],
                'celular' => $c[4],
                'email' => $c[3],
                'direccion' => $c[5],
                'departamento' => 'Antioquia',
                'municipio' => 'Medellín',
                'tipo_responsabilidad' => 'O-13',
                'regimen_tributario' => 'O',
                'tipo_organizacion' => $c[1] === 'NIT' ? '1' : '2',
                'cupo_autorizado' => rand(0, 5) * 500000,
                'estado' => true,
                'created_at' => \Carbon\Carbon::now(),
                'updated_at' => \Carbon\Carbon::now(),
            ]);
        }

        // Vendedor 3 (Carlos, empresa 2) tiene asignados todos los clientes de su empresa
        foreach ([101, 102, 103] as $idCliente) {
            DB::table('mobile_vendedor_clientes')->insert([
                'id_vendedor_mobile' => 3,
                'id_cliente'         => $idCliente,
                'fecha_asignacion'   => \Carbon\Carbon::now(),
            ]);
        }

        $productosEmpresa2 = [
            ['CAM-001', 'Camiseta Cuello V', 25000, 5, 150],
            ['PAN-002', 'Pantalón Jean Hombre', 65000, 5, 80],
            ['TEN-003', 'Tenis Deportivos', 89000, 6, 45],
            ['SAN-004', 'Sandalias Casuales', 32000, 6, 60],
        ];

        foreach ($productosEmpresa2 as $i => $p) {
            DB::table('productos')->insert([
                'id_producto' => 100 + $i + 1,
                'id_empresa' => 2,
                'id_categoria' => $p[3],
                'codigo' => $p[0],
                'nombre' => $p[1],
                'descripcion' => null,
                'precio_costo' => $p[2] * 0.6,
                'precio_venta' => $p[2],
                'precio_venta_2' => $p[2] * 0.95,
                'precio_venta_3' => $p[2] * 0.92,
                'stock' => $p[4],
                'stock_minimo' => 10,
                'unidad_medida' => 'und',
                'porcentaje_iva' => 19,
                'estado' => true,
                'created_at' => \Carbon\Carbon::now(),
                'updated_at' => \Carbon\Carbon::now(),
            ]);
        }

        $this->command->info('');
        $this->command->info('=== Datos demo creados ===');
        $this->command->info('Empresa 1 (Distribuidora Demo, FE activa):');
        $this->command->info('  fernando@epikom.com / demo1234  (V001, Zona Centro)');
        $this->command->info('  maria@epikom.com    / demo1234  (V002, Zona Norte)');
        $this->command->info('Empresa 2 (Comercializadora El Sol, FE inactiva):');
        $this->command->info('  carlos@elsol.com    / demo1234  (S001, Medellín Norte)');
        $this->command->info('');
    }
}
