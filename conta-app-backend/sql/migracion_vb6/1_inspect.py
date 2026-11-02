"""
1_inspect.py — Inventario rápido del Access del cliente.

Muestra tablas con conteo de filas y el esquema de las tablas clave VB6,
para decidir fecha de corte del kardex y confirmar que no haya sorpresas.

Uso:
    python 1_inspect.py --mdb <path/Db.mdb> --bin <path/mdbtools-win-master>
"""
import argparse
import subprocess
import sys
from pathlib import Path


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True,
                       encoding='utf-8', errors='replace')
    return r.stdout, r.stderr


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mdb', required=True, help='Ruta al .mdb del cliente')
    ap.add_argument('--bin', required=True, help='Ruta a mdbtools-win-master/')
    args = ap.parse_args()

    mdb = args.mdb
    binp = Path(args.bin)
    if not (binp / 'mdb-tables.exe').exists():
        sys.exit(f'ERR: no encuentro mdb-tables.exe en {binp}')

    # Version
    out, _ = run([str(binp / 'mdb-ver.exe'), mdb])
    print(f'[inspect] version: {out.strip()}')

    # Listar tablas (filtrar MSys y errores de conversion)
    out, _ = run([str(binp / 'mdb-tables.exe'), '-1', mdb])
    tablas = [t.strip() for t in out.splitlines()
              if t.strip() and not t.startswith('MSys') and 'conversi' not in t]
    print(f'[inspect] {len(tablas)} tablas de usuario')

    # Contar filas
    filas = {}
    for t in tablas:
        out, _ = run([str(binp / 'mdb-count.exe'), mdb, t])
        try:
            filas[t] = int(out.strip())
        except Exception:
            filas[t] = -1

    print('\n=== TABLAS por filas ===')
    for t, n in sorted(filas.items(), key=lambda kv: -kv[1]):
        print(f'  {t:40s}  {n}')

    # Esquema de las tablas clave VB6
    claves = ['tblVentas', 'tblDetalle_Venta', 'tblArticulos', 'tblClientes',
              'tblPagos', 'tblProveedores', 'tblKardex', 'tblPedidos',
              'tblDetalle_Pedido', 'tblControlCaja', 'tblEgresos',
              'tblAuxiliarBanco', 'tblDatosEmpresa', 'tblUsuarios',
              'tblCategoria']
    print('\n=== ESQUEMA CLAVES ===')
    for ck in claves:
        real = next((t for t in tablas if t.lower() == ck.lower()), None)
        if not real:
            continue
        out, _ = run([str(binp / 'mdb-schema.exe'), '-T', real, mdb, 'mysql'])
        cols = [l.strip().rstrip(',').replace('\t', ' ')
                for l in out.splitlines()
                if l.strip().startswith('`') and 'TABLE' not in l]
        print(f'\n[{real}]  ({filas.get(real)} filas)')
        for c in cols[:30]:
            print(f'    {c}')
        if len(cols) > 30:
            print(f'    ... (+{len(cols)-30} mas)')

    print('\n[OK]')


if __name__ == '__main__':
    main()
