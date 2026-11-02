"""
2_export_jsonl.py — Exporta las tablas relevantes del Access a JSONL.

JSONL es más robusto que CSV porque los campos con \n o " no rompen el conteo.
Uno por línea: una fila = un objeto JSON.

Uso:
    python 2_export_jsonl.py --mdb <Db.mdb> --bin <mdbtools-win-master>
                             --out <carpeta_destino>
"""
import argparse
import subprocess
from pathlib import Path

TABLAS = [
    'tblDatosEmpresa', 'tblUsuarios', 'tblTiposUsuario', 'tblEmpleados',
    'tblCategoria', 'tblReferencia', 'tblCuentas', 'tblBancos', 'tblEntidades',
    'tblTipoMovimiento',
    'tblArticulos', 'tblClientes', 'tblProveedores',
    'tblVentas', 'tblDetalle_Venta', 'tblPagos',
    'tblPedidos', 'tblDetalle_Pedido',
    'tblControlCaja', 'tblEgresos', 'tblAuxiliarBanco',
    'tblKardex',
    'tblFacturasAnterioresProveedor',
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mdb', required=True)
    ap.add_argument('--bin', required=True)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    binp = Path(args.bin)

    for t in TABLAS:
        out_file = out / f'{t}.jsonl'
        try:
            with out_file.open('w', encoding='utf-8', newline='') as fh:
                r = subprocess.run(
                    [str(binp / 'mdb-json.exe'), args.mdb, t],
                    stdout=fh, stderr=subprocess.PIPE,
                    text=True, encoding='utf-8', errors='replace',
                )
            if r.returncode == 0:
                with out_file.open('r', encoding='utf-8') as f:
                    n = sum(1 for _ in f)
                size_kb = out_file.stat().st_size // 1024
                print(f'  {t:40s}  OK  {n:>7} filas  {size_kb:>7} KB')
            else:
                err = r.stderr.strip()[:80]
                print(f'  {t:40s}  ERR  {err}')
        except Exception as e:
            print(f'  {t:40s}  EXC  {e}')

    print(f'\n[OK] JSONL en {out}')


if __name__ == '__main__':
    main()
