<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Importa departamentos y municipios de Colombia desde CSV.
 * Formato tab-separated (mismo de api-electronica):
 *
 *   departments.csv:    id \t country_id \t name \t code
 *   municipalities.csv: id \t department_id \t name \t code
 */
class GeoSeeder extends Seeder
{
    public function run()
    {
        $this->seedCsv(
            base_path('database/csv/departments.csv'),
            function (array $row) {
                return [
                    'id'         => (int) $row[0],
                    'country_id' => (int) ($row[1] ?? 46),
                    'name'       => $row[2] ?? '',
                    'code'       => $row[3] ?? null,
                    'created_at' => \Carbon\Carbon::now(),
                    'updated_at' => \Carbon\Carbon::now(),
                ];
            },
            'departments',
        );

        $this->seedCsv(
            base_path('database/csv/municipalities.csv'),
            function (array $row) {
                return [
                    'id'            => (int) $row[0],
                    'department_id' => (int) ($row[1] ?? 0),
                    'name'          => $row[2] ?? '',
                    'code'          => $row[3] ?? null,
                    'created_at'    => \Carbon\Carbon::now(),
                    'updated_at'    => \Carbon\Carbon::now(),
                ];
            },
            'municipalities',
        );
    }

    private function seedCsv(string $path, callable $mapper, string $table): void
    {
        if (!file_exists($path)) {
            $this->command->warn("CSV no encontrado: $path");
            return;
        }

        DB::table($table)->truncate();

        $file = fopen($path, 'r');
        $batch = [];
        $count = 0;

        while (($row = fgetcsv($file, 0, "\t")) !== false) {
            if (empty($row) || $row === [null]) continue;
            $batch[] = $mapper($row);
            $count++;

            if (count($batch) >= 500) {
                DB::table($table)->insert($batch);
                $batch = [];
            }
        }
        if (!empty($batch)) {
            DB::table($table)->insert($batch);
        }

        fclose($file);
        $this->command->info("✓ $table: $count registros");
    }
}
